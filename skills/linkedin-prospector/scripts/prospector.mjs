#!/usr/bin/env node
// linkedin-prospector CLI. Scripts move data; Claude does the judgment (qualify, write) through the
// *-export / *-import pairs. Usage: node scripts/prospector.mjs <command> [flags]
//
//   setup-check                      verify config, keys, tables and functions
//   find-creators [--dry-run]        discover creators (or take config.creator_urls)
//   scrape-commenters [--dry-run]    scrape commenters on approved creators' top posts
//   qualify-export [--out f]         new prospects as JSON for Claude to score
//   qualify-import <file>            store scores; below threshold → rejected
//   write-export [--out f]           qualified prospects as JSON for Claude to write welcomes
//   write-import <file>              validate and store welcomes; passing → approved
//   review                           print the latest batch
//   push [--start]                   add approved prospects to the Aimfox campaign
//   sync                             move statuses from Aimfox interactions
//   status                           counts, spend, campaign state
//   dnc <public_id> <reason>         mark do-not-contact (also removes + blacklists in Aimfox)

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { loadConfig, loadEnv, requireEnv, homeDir, ConfigError } from './lib/config.mjs';
import { select, insert, update, rpc, inList } from './lib/db.mjs';
import { alert, printOpenAlerts } from './lib/alerts.mjs';
import { acquire, release } from './lib/lock.mjs';
import { assertContactable, markDoNotContact } from './lib/dnc.mjs';
import * as aimfox from './lib/aimfox.mjs';
import {
  runActor, apifyMe, formatEstimate, estimateCost, unitsThatFit,
  postSearchInput, postCommentsInput,
  POST_SEARCH_ACTOR, POST_COMMENTS_ACTOR, POST_SEARCH_PRICE_PER_POST_USD, COMMENT_WITH_PROFILE_PRICE_USD,
} from './apify.mjs';
import { validateWelcome, validateWriteRow } from './validate.mjs';

const SCRIPT = fileURLToPath(import.meta.url);

export const MIN_CREATOR_POSTS = 3;
export const DISCOVERY_POSTS_PER_KEYWORD = 50;
export const PUSH_BATCH_SIZE = 25;
export const WELCOME_MAX_FAILURES = 2;

const DEFAULT_POSTS_PER_CREATOR = 10;
const DEFAULT_TOP_POSTS = 30;
const DEFAULT_COMMENTS_PER_POST = 60;
const DEFAULT_QUALIFY_THRESHOLD = 60;
const EXPORT_LIMIT = 200;

// Statuses sync may move a prospect through, in order. sync only ever moves forward.
const SYNC_RANK = { pushed: 0, connect_sent: 1, accepted: 2, welcome_sent: 3, replied: 4 };

class Refusal extends Error {
  constructor(message) {
    super(message);
    this.name = 'Refusal';
  }
}

// ---- pure helpers (exported for tests) -----------------------------------------------------------

export function normalizePublicId(urlOrId) {
  return aimfox.publicIdFromProfileUrl(urlOrId);
}

// A LinkedIn slug as stored: letters, digits, _ and -. Anything else (a decoded & or #, a slash) is
// refused at upsert so it can never reach a PostgREST filter or an Aimfox path.
const PUBLIC_ID_RE = /^[\p{L}\p{N}_-]+$/u;
export function isValidPublicId(id) {
  return typeof id === 'string' && PUBLIC_ID_RE.test(id);
}

export function canonicalProfileUrl(urlOrId) {
  const id = normalizePublicId(urlOrId);
  return id ? `https://www.linkedin.com/in/${id}` : null;
}

export function median(values) {
  if (!values.length) return 0;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function num(v) {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v))) return Number(v);
  return 0;
}

// One harvestapi/linkedin-post-search item, read in one place.
// UNVERIFIED item fields — build step 3 confirms: author.{publicIdentifier, linkedinUrl, name, info},
// engagement.{likes, comments}, linkedinUrl (post), postedAt.{date|timestamp}.
export function postFromItem(item) {
  const author = item?.author ?? {};
  const authorUrl = author.linkedinUrl ?? author.url ?? author.profileUrl ?? item?.authorUrl ?? null;
  const authorPublicId = (author.publicIdentifier ?? normalizePublicId(authorUrl))?.toLowerCase() ?? null;
  const eng = item?.engagement ?? {};
  const reactions = num(eng.likes ?? eng.reactionsCount ?? item?.numLikes ?? item?.reactionsCount ?? item?.totalReactionCount);
  const comments = num(eng.comments ?? eng.commentsCount ?? item?.numComments ?? item?.commentsCount);
  const postedAt = item?.postedAt?.date ?? item?.postedAt?.timestamp ?? item?.postedAt ?? null;
  return {
    postUrl: item?.linkedinUrl ?? item?.url ?? item?.postUrl ?? null,
    authorPublicId,
    authorName: author.name ?? null,
    authorHeadline: author.info ?? author.headline ?? author.position ?? null,
    postedAt: typeof postedAt === 'number' ? new Date(postedAt).toISOString() : postedAt,
    reactions,
    comments,
  };
}

// One harvestapi/linkedin-post-comments item, read in one place.
// UNVERIFIED item fields — build step 4 confirms: actor.{publicIdentifier, linkedinUrl, name,
// position}, commentary, postUrl | query.post; with main-profile enrichment actor.profile.* may
// carry company and location. A urn-style linkedinUrl (ACoAA…) without publicIdentifier yields an
// unstable id, which step 4 must check.
export function commentFromItem(item) {
  const actor = item?.actor ?? item?.author ?? {};
  const profile = actor.profile ?? item?.profile ?? {};
  const url = actor.linkedinUrl ?? actor.url ?? profile.linkedinUrl ?? null;
  const publicId = (actor.publicIdentifier ?? profile.publicIdentifier ?? normalizePublicId(url))?.toLowerCase() ?? null;
  const company = profile.currentPosition?.[0]?.companyName ?? profile.experience?.[0]?.companyName ?? actor.company ?? null;
  const location = profile.location?.linkedinText ?? profile.location?.text ?? (typeof profile.location === 'string' ? profile.location : null)
    ?? actor.location ?? null;
  return {
    publicId,
    profileUrl: publicId ? canonicalProfileUrl(publicId) : url,
    name: actor.name ?? profile.name ?? null,
    headline: actor.position ?? actor.headline ?? profile.headline ?? null,
    company,
    location,
    text: item?.commentary ?? item?.text ?? item?.comment ?? null,
    postUrl: item?.postUrl ?? item?.query?.post ?? item?.post?.url ?? null,
  };
}

// Group posts by author, score = median(reactions + 2 x comments), at least minPosts posts,
// the user's own profile dropped, top N approved.
export function scoreCreators(posts, { selfProfileUrl, topN, minPosts = MIN_CREATOR_POSTS } = {}) {
  const self = normalizePublicId(selfProfileUrl);
  const byAuthor = new Map();
  for (const p of posts) {
    if (!isValidPublicId(p.authorPublicId) || p.authorPublicId === self) continue;
    let g = byAuthor.get(p.authorPublicId);
    if (!g) {
      g = { publicId: p.authorPublicId, name: p.authorName, headline: p.authorHeadline, posts: new Map() };
      byAuthor.set(p.authorPublicId, g);
    }
    g.posts.set(p.postUrl ?? `${g.posts.size}`, p);
  }
  const scored = [];
  for (const g of byAuthor.values()) {
    const list = [...g.posts.values()];
    if (list.length < minPosts) continue;
    const m = median(list.map((p) => p.reactions + 2 * p.comments));
    scored.push({
      publicId: g.publicId,
      profileUrl: canonicalProfileUrl(g.publicId),
      name: g.name,
      headline: g.headline,
      postsSampled: list.length,
      medianEngagement: m,
      score: m,
      posts: list,
    });
  }
  scored.sort((a, b) => b.score - a.score || b.postsSampled - a.postsSampled || a.publicId.localeCompare(b.publicId));
  return scored.map((c, i) => ({ ...c, approved: i < topN }));
}

// ---- small IO helpers ----------------------------------------------------------------------------

const out = (s = '') => process.stdout.write(`${s}\n`);
const err = (s = '') => process.stderr.write(`${s}\n`);

function writeJsonOut(obj, outFile) {
  const text = JSON.stringify(obj, null, 2);
  if (outFile) {
    fs.writeFileSync(outFile, text + '\n');
    err(`wrote ${outFile}`);
  } else {
    out(text);
  }
}

function readJsonFile(file) {
  if (!file) throw new Refusal('give the results file: <command> <file.json>');
  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    throw new Refusal(`could not read ${file} as JSON: ${e.message}`);
  }
  const rows = Array.isArray(parsed) ? parsed : parsed?.results;
  if (!Array.isArray(rows)) throw new Refusal(`${file} must hold a JSON list, or {"results": [...]}`);
  return rows;
}

// PostgREST returns at most 1000 rows per request; read a full set page by page (query must order).
async function selectAll(table, query) {
  const rows = [];
  for (let offset = 0; ; offset += 1000) {
    const page = await select(table, `${query}&limit=1000&offset=${offset}`);
    rows.push(...page);
    if (page.length < 1000) return rows;
  }
}

function welcomeExternalId(prospectId) {
  return `welcome:${prospectId}`;
}

async function welcomeRows(prospectIds) {
  if (!prospectIds.length) return new Map();
  const rows = await select('li_messages',
    `kind=eq.welcome&external_id=${inList(prospectIds.map(welcomeExternalId))}&select=id,prospect_id,body,status,attempts`);
  return new Map(rows.map((r) => [r.prospect_id, r]));
}

function isAuthError(e) {
  return Boolean(e?.auth) || e?.status === 401 || e?.status === 403;
}

// ---- setup-check ---------------------------------------------------------------------------------

const TABLES = ['li_creators', 'li_posts', 'li_prospects', 'li_messages', 'li_alerts', 'li_runs', 'li_campaign_state'];

async function cmdSetupCheck() {
  const results = [];
  const check = async (name, fn) => {
    try {
      const note = await fn();
      results.push({ name, ok: true, note });
    } catch (e) {
      results.push({ name, ok: false, note: e.message });
    }
  };

  let cfg = null;
  await check('config.json', async () => { cfg = loadConfig(); return 'valid'; });
  await check('.env keys', async () => {
    requireEnv('APIFY_TOKEN', 'SUPABASE_URL', 'SUPABASE_SERVICE_KEY', 'AIMFOX_API_KEY');
    return 'present';
  });
  await check('.env is git-ignored', async () => {
    const home = homeDir();
    const inRepo = spawnSync('git', ['-C', home, 'rev-parse', '--is-inside-work-tree'], { encoding: 'utf8' });
    if (inRepo.status !== 0) return 'folder is not a git repo';
    const tracked = spawnSync('git', ['-C', home, 'ls-files', '--error-unmatch', '.env'], { encoding: 'utf8' });
    if (tracked.status === 0) {
      throw new Error(`${home}/.env is tracked by git, so ignoring it is not enough. In ${home} run: git rm --cached .env `
        + '(then add .env to .gitignore and commit). If it was ever pushed, rotate every key in it.');
    }
    const ignored = spawnSync('git', ['-C', home, 'check-ignore', '-q', '.env']);
    if (ignored.status !== 0) throw new Error(`${home} is a git repo and .env is not ignored; add .env to .gitignore`);
    return 'ignored';
  });
  for (const t of TABLES) await check(`table ${t}`, async () => { await select(t, 'select=*&limit=1'); return 'exists'; });
  await check('function daily_count', async () => { await rpc('daily_count', { p_kind: 'welcome' }); return 'exists'; });
  await check('function claim_message', async () => { await rpc('claim_message', { p_id: -1 }); return 'exists'; });
  // What every send calls. Each probe uses id -1, which matches no row, so nothing is claimed or changed.
  await check('function claim_send', async () => { await rpc('claim_send', { p_id: -1 }); return 'exists'; });
  await check('function finish_message', async () => { await rpc('finish_message', { p_id: -1, p_outcome: 'error' }); return 'exists'; });
  await check('function unanswered_streak', async () => { await rpc('unanswered_streak', { p_prospect: -1 }); return 'exists'; });
  await check('Apify token', async () => { await apifyMe(); return 'accepted'; });
  await check('Aimfox key', async () => { const a = await aimfox.listAccounts(); return `${a.length} account(s)`; });
  if (cfg?.aimfox_campaign_id) {
    await check('Aimfox campaign', async () => {
      const f = aimfox.campaignFacts(await aimfox.getCampaign(cfg.aimfox_campaign_id));
      const show = (v) => (v === null ? 'API does not say' : v ? 'yes' : 'NO');
      return `state ${f.state ?? 'unknown'}; message step is {{welcome_message}}: ${show(f.welcomeTokenOk)}; `
        + `connect note blank: ${show(f.connectNoteBlank)}; stop on reply: ${show(f.stopOnReply)}; `
        + `change detection: ${f.fingerprint ? 'available' : 'not available'}`;
    });
  } else {
    results.push({ name: 'Aimfox campaign', ok: false, note: 'aimfox_campaign_id is not set in config.json' });
  }

  for (const r of results) out(`${r.ok ? 'ok  ' : 'FAIL'} ${r.name}: ${r.note}`);
  const failed = results.filter((r) => !r.ok).length;
  out(failed ? `\n${failed} check(s) failed.` : '\nAll checks passed.');
  return failed ? 1 : 0;
}

// ---- find-creators -------------------------------------------------------------------------------

function printCapHelp(reason, units, unitPrice, cfg) {
  if (reason === 'per_run_cap') {
    const fit = unitsThatFit(cfg.per_run_cap_usd, unitPrice);
    err(`Split it: runs of at most ${fit} units each fit the $${cfg.per_run_cap_usd} per-run cap `
      + `(${Math.ceil(units / Math.max(fit, 1))} batches). The total cap still applies across all of them.`);
  } else {
    err(`Raise total_cap_usd in config.json on purpose if you want to spend more.`);
  }
}

async function cmdFindCreators({ dryRun }) {
  const cfg = loadConfig();
  const self = normalizePublicId(cfg.self_profile_url);

  if (cfg.creator_urls?.length) {
    const bad = cfg.creator_urls.filter((u) => !isValidPublicId(normalizePublicId(u)));
    for (const u of bad) out(`  skipped ${u}: not a LinkedIn profile URL`);
    const rows = cfg.creator_urls
      .filter((u) => isValidPublicId(normalizePublicId(u)))
      .map((u) => canonicalProfileUrl(u))
      .filter((u) => normalizePublicId(u) !== self)
      .map((profile_url) => ({ profile_url, status: 'approved', discovered_via: 'config' }));
    out(`Using the ${rows.length} creator(s) from config.creator_urls; discovery skipped, no Apify cost.`);
    if (dryRun) return 0;
    await insert('li_creators', rows, { onConflict: 'profile_url' });
    for (const r of rows) out(`  approved ${r.profile_url}`);
    return 0;
  }

  const keywords = cfg.niche_keywords ?? [];
  if (!keywords.length) throw new Refusal('niche_keywords is empty in config.json; add search terms or creator_urls');
  const units = keywords.length * DISCOVERY_POSTS_PER_KEYWORD;
  out(formatEstimate({ actor: POST_SEARCH_ACTOR, units, unitPriceUsd: POST_SEARCH_PRICE_PER_POST_USD }));
  if (dryRun) return 0;

  const run = await runActor({
    step: 'find-creators',
    actor: POST_SEARCH_ACTOR,
    input: postSearchInput({ keywords, maxPosts: DISCOVERY_POSTS_PER_KEYWORD }),
    units,
    unitPriceUsd: POST_SEARCH_PRICE_PER_POST_USD,
  });
  if (!run.ok) {
    printCapHelp(run.reason, units, POST_SEARCH_PRICE_PER_POST_USD, cfg);
    return 1;
  }

  const posts = run.items.map(postFromItem).filter((p) => p.postUrl);
  const scored = scoreCreators(posts, { selfProfileUrl: cfg.self_profile_url, topN: cfg.creators_top_n });
  if (!scored.length) {
    out(`No creator had ${MIN_CREATOR_POSTS}+ posts in the results. Try broader niche_keywords.`);
    return 0;
  }

  // A creator the user rejected stays rejected.
  const existing = await select('li_creators', `profile_url=${inList(scored.map((c) => c.profileUrl))}&select=profile_url,status`);
  const rejected = new Set(existing.filter((r) => r.status === 'rejected').map((r) => r.profile_url));
  const creatorRows = scored.filter((c) => !rejected.has(c.profileUrl)).map((c) => ({
    profile_url: c.profileUrl,
    name: c.name,
    headline: c.headline,
    posts_sampled: c.postsSampled,
    median_engagement: c.medianEngagement,
    score: c.score,
    status: c.approved ? 'approved' : 'candidate',
    discovered_via: 'search',
  }));
  const stored = await insert('li_creators', creatorRows, { onConflict: 'profile_url' });
  const idByUrl = new Map(stored.map((r) => [r.profile_url, r.id]));
  const postRows = scored.filter((c) => idByUrl.has(c.profileUrl)).flatMap((c) => c.posts.map((p) => ({
    creator_id: idByUrl.get(c.profileUrl),
    post_url: p.postUrl,
    posted_at: p.postedAt,
    reactions: p.reactions,
    comments: p.comments,
  })));
  const uniquePosts = [...new Map(postRows.map((r) => [r.post_url, r])).values()];
  if (uniquePosts.length) await insert('li_posts', uniquePosts, { onConflict: 'post_url' });

  out(`\n${'creator'.padEnd(40)} ${'posts'.padStart(5)} ${'median'.padStart(8)}  status`);
  for (const c of scored) {
    const status = rejected.has(c.profileUrl) ? 'rejected (kept)' : c.approved ? 'approved' : 'candidate';
    out(`${(c.name ? `${c.name} (${c.publicId})` : c.publicId).slice(0, 40).padEnd(40)} ${String(c.postsSampled).padStart(5)} `
      + `${String(c.medianEngagement).padStart(8)}  ${status}`);
  }
  return 0;
}

// ---- scrape-commenters ---------------------------------------------------------------------------

async function cmdScrapeCommenters({ dryRun }) {
  const cfg = loadConfig();
  const postsPerCreator = cfg.posts_per_creator ?? DEFAULT_POSTS_PER_CREATOR;
  const topPosts = cfg.top_posts ?? DEFAULT_TOP_POSTS;
  const commentsPerPost = cfg.comments_per_post ?? DEFAULT_COMMENTS_PER_POST;

  const creators = await select('li_creators', 'status=eq.approved&select=id,profile_url,name');
  if (!creators.length) throw new Refusal('no approved creators; run find-creators first');

  const units1 = creators.length * postsPerCreator;
  const units2Max = topPosts * commentsPerPost;
  out(`Stage 1 ${formatEstimate({ actor: POST_SEARCH_ACTOR, units: units1, unitPriceUsd: POST_SEARCH_PRICE_PER_POST_USD })}`);
  out(`Stage 2 ${formatEstimate({ actor: POST_COMMENTS_ACTOR, units: units2Max, unitPriceUsd: COMMENT_WITH_PROFILE_PRICE_USD })} (at most)`);
  out(`Total at most $${(estimateCost(units1, POST_SEARCH_PRICE_PER_POST_USD) + estimateCost(units2Max, COMMENT_WITH_PROFILE_PRICE_USD)).toFixed(2)}`);
  if (dryRun) return 0;

  const creatorByPublicId = new Map(creators.map((c) => [normalizePublicId(c.profile_url), c]));
  const run1 = await runActor({
    step: 'scrape-commenters:posts',
    actor: POST_SEARCH_ACTOR,
    input: postSearchInput({ authorUrls: creators.map((c) => c.profile_url), maxPosts: postsPerCreator }),
    units: units1,
    unitPriceUsd: POST_SEARCH_PRICE_PER_POST_USD,
  });
  if (!run1.ok) {
    printCapHelp(run1.reason, units1, POST_SEARCH_PRICE_PER_POST_USD, cfg);
    return 1;
  }
  // One row per post_url: a duplicate would break the upsert and could take two top-post slots.
  const posts = [...new Map(run1.items.map(postFromItem)
    .filter((p) => p.postUrl && creatorByPublicId.has(p.authorPublicId))
    .map((p) => [p.postUrl, p])).values()];
  if (!posts.length) {
    out('The creators had no recent posts in the results; nothing to scrape.');
    return 0;
  }
  const storedPosts = await insert('li_posts', posts.map((p) => ({
    creator_id: creatorByPublicId.get(p.authorPublicId).id,
    post_url: p.postUrl,
    posted_at: p.postedAt,
    reactions: p.reactions,
    comments: p.comments,
  })), { onConflict: 'post_url' });
  const postByUrl = new Map(storedPosts.map((r) => [r.post_url, r]));

  const picked = [...posts].sort((a, b) => b.comments - a.comments).slice(0, topPosts);
  const units2 = picked.length * commentsPerPost;
  const run2 = await runActor({
    step: 'scrape-commenters:comments',
    actor: POST_COMMENTS_ACTOR,
    input: postCommentsInput({ postUrls: picked.map((p) => p.postUrl), maxItems: units2 }),
    units: units2,
    unitPriceUsd: COMMENT_WITH_PROFILE_PRICE_USD,
  });
  if (!run2.ok) {
    printCapHelp(run2.reason, units2, COMMENT_WITH_PROFILE_PRICE_USD, cfg);
    return 1;
  }

  const self = normalizePublicId(cfg.self_profile_url);
  const seen = new Set();
  const prospects = [];
  let badIds = 0;
  for (const c of run2.items.map(commentFromItem)) {
    if (c.publicId && !isValidPublicId(c.publicId)) {
      badIds++;
      continue;
    }
    if (!c.publicId || c.publicId === self || creatorByPublicId.has(c.publicId) || seen.has(c.publicId)) continue;
    seen.add(c.publicId);
    const post = c.postUrl ? postByUrl.get(c.postUrl) : null;
    prospects.push({
      public_id: c.publicId,
      profile_url: c.profileUrl,
      name: c.name,
      headline: c.headline,
      company: c.company,
      location: c.location,
      comment_text: c.text,
      source_post_id: post?.id ?? null,
      source_creator_id: post?.creator_id ?? null,
    });
  }
  // ignoreDuplicates: a prospect already stored keeps its first source (and its status).
  const inserted = prospects.length ? await insert('li_prospects', prospects, { onConflict: 'public_id', ignoreDuplicates: true }) : [];
  out(`${run2.items.length} comment rows from ${picked.length} posts, ${prospects.length} unique commenters, `
    + `${inserted.length} new prospects stored${badIds ? `, ${badIds} skipped for an unusable profile id` : ''}.`);
  return 0;
}

// ---- qualify -------------------------------------------------------------------------------------

async function cmdQualifyExport({ outFile }) {
  const cfg = loadConfig();
  const rows = await select('li_prospects',
    `status=eq.new&select=id,public_id,profile_url,name,headline,company,location,comment_text,source_creator_id&order=id&limit=${EXPORT_LIMIT}`);
  const creatorIds = [...new Set(rows.map((r) => r.source_creator_id).filter(Boolean))];
  const creators = creatorIds.length ? await select('li_creators', `id=${inList(creatorIds)}&select=id,name,profile_url`) : [];
  const creatorById = new Map(creators.map((c) => [c.id, c]));
  writeJsonOut({
    task: 'qualify',
    instructions: 'Score each prospect 0-100 against icp_description from headline, company and comment_text, with a '
      + 'one-line reason. Hard rejects (the source creator or their team, sellers of the same offer, non-English '
      + 'comments, anyone matching disqualifiers) get icp_score 0 and an icp_reason starting "hard reject: ". Save '
      + '[{id, icp_score, icp_reason}] as JSON and run qualify-import <file>.',
    threshold: cfg.qualify_threshold ?? DEFAULT_QUALIFY_THRESHOLD,
    icp_description: cfg.icp_description ?? '',
    offer: cfg.offer ?? '',
    disqualifiers: cfg.disqualifiers ?? [],
    result_format: [{ id: 0, icp_score: 0, icp_reason: 'one line' }],
    prospects: rows.map((r) => ({
      ...r,
      source_creator: creatorById.get(r.source_creator_id)?.name ?? creatorById.get(r.source_creator_id)?.profile_url ?? null,
    })),
  }, outFile);
  return 0;
}

export function validateQualifyRow(row) {
  const errors = [];
  if (!Number.isInteger(row?.id)) errors.push('id must be an integer prospect id');
  if (!Number.isInteger(row?.icp_score) || row.icp_score < 0 || row.icp_score > 100) errors.push('icp_score must be a whole number 0-100');
  if (typeof row?.icp_reason !== 'string' || row.icp_reason.trim() === '') errors.push('icp_reason is required');
  else if (/\n/.test(row.icp_reason.trim())) errors.push('icp_reason must be one line');
  if (row?.hard_reject !== undefined && typeof row.hard_reject !== 'boolean') errors.push('hard_reject must be true or false');
  return errors;
}

async function cmdQualifyImport(file) {
  const cfg = loadConfig();
  const threshold = cfg.qualify_threshold ?? DEFAULT_QUALIFY_THRESHOLD;
  const rows = readJsonFile(file);
  let bad = 0;
  const tally = { qualified: 0, rejected: 0, skipped: 0 };
  for (const [i, row] of rows.entries()) {
    const errors = validateQualifyRow(row);
    if (errors.length) {
      bad++;
      out(`row ${i} (id ${row?.id ?? '?'}): REJECTED ${errors.join('; ')}`);
      continue;
    }
    const hardReject = row.hard_reject === true || /^hard reject:/i.test(row.icp_reason.trim());
    const status = hardReject || row.icp_score < threshold ? 'rejected' : 'qualified';
    const updated = await update('li_prospects', `id=eq.${row.id}&status=eq.new`,
      { icp_score: row.icp_score, icp_reason: row.icp_reason.trim(), status });
    if (!updated.length) {
      tally.skipped++;
      out(`row ${i} (id ${row.id}): skipped, prospect is no longer new`);
    } else {
      tally[status]++;
    }
  }
  out(`${tally.qualified} qualified, ${tally.rejected} rejected, ${tally.skipped} skipped, ${bad} invalid row(s).`);
  return bad ? 1 : 0;
}

// ---- write ---------------------------------------------------------------------------------------

async function cmdWriteExport({ outFile }) {
  const cfg = loadConfig();
  const rows = await select('li_prospects',
    `status=eq.qualified&select=id,public_id,profile_url,name,headline,company,location,comment_text,icp_reason&order=id&limit=${EXPORT_LIMIT}`);
  const welcomes = await welcomeRows(rows.map((r) => r.id));
  const ready = [];
  for (const r of rows) {
    const w = welcomes.get(r.id);
    if (w?.status === 'failed' && w.attempts >= WELCOME_MAX_FAILURES) continue; // stays qualified, never pushed
    ready.push({ ...r, previous_rejected_welcome: w?.status === 'failed' ? w.body : undefined });
  }
  writeJsonOut({
    task: 'write',
    instructions: 'For each prospect write one welcome message, sent by Aimfox after they accept a blank '
      + 'connection request: one specific line about their comment or profile, then one easy question. No link '
      + 'or domain, no pitch, at most 400 characters, in the voice of tone_samples. Never include a connect_note. '
      + 'A row with previous_rejected_welcome failed validation once; a second failure leaves it unsent. Save '
      + '[{id, welcome_message}] as JSON and run write-import <file>.',
    max_chars: 400,
    offer: cfg.offer ?? '',
    tone_samples: cfg.tone_samples ?? [],
    result_format: [{ id: 0, welcome_message: '...' }],
    prospects: ready,
  }, outFile);
  return 0;
}

async function cmdWriteImport(file) {
  // The same id twice in one file: the last row wins, and the earlier one is reported.
  const all = readJsonFile(file);
  const lastIndex = new Map();
  all.forEach((r, i) => { if (Number.isInteger(r?.id)) lastIndex.set(r.id, i); });
  const rows = []; // [index in the file, row]
  for (const [i, r] of all.entries()) {
    if (Number.isInteger(r?.id) && lastIndex.get(r.id) !== i) {
      out(`row ${i} (id ${r.id}): ignored, id ${r.id} appears again later in the file and the later row is used`);
    } else {
      rows.push([i, r]);
    }
  }
  const ids = rows.map(([, r]) => r?.id).filter(Number.isInteger);
  const prospects = ids.length ? await select('li_prospects', `id=${inList(ids)}&select=id,public_id,status`) : [];
  const prospectById = new Map(prospects.map((p) => [p.id, p]));
  const welcomes = await welcomeRows(ids);
  const tally = { approved: 0, failed: 0, gaveUp: 0, skipped: 0 };

  for (const [i, row] of rows) {
    const label = `row ${i} (id ${row?.id ?? '?'})`;
    if (!Number.isInteger(row?.id)) {
      tally.failed++;
      out(`${label}: REJECTED id must be an integer prospect id`);
      continue;
    }
    const p = prospectById.get(row.id);
    if (!p) {
      tally.skipped++;
      out(`${label}: skipped, no such prospect`);
      continue;
    }
    try {
      assertContactable(p);
    } catch (e) {
      tally.skipped++;
      out(`${label}: skipped, ${e.message}`);
      continue;
    }
    if (p.status !== 'qualified') {
      tally.skipped++;
      out(`${label}: skipped, status is ${p.status} (only qualified prospects take a welcome)`);
      continue;
    }
    const existing = welcomes.get(row.id);
    const body = typeof row.welcome_message === 'string' ? row.welcome_message.trim() : '';
    const v = validateWriteRow({ ...row, welcome_message: body });

    if (v.ok) {
      const patch = { body, status: 'draft' };
      if (existing) await update('li_messages', { id: existing.id }, patch);
      else await insert('li_messages', { prospect_id: row.id, kind: 'welcome', external_id: welcomeExternalId(row.id), ...patch });
      await update('li_prospects', `id=eq.${row.id}&status=eq.qualified`, { status: 'approved' });
      tally.approved++;
      continue;
    }

    const failures = (existing?.status === 'failed' ? existing.attempts : 0) + 1;
    const patch = { body, status: 'failed', attempts: failures };
    if (existing) await update('li_messages', { id: existing.id }, patch);
    else await insert('li_messages', { prospect_id: row.id, kind: 'welcome', external_id: welcomeExternalId(row.id), ...patch });
    if (failures >= WELCOME_MAX_FAILURES) {
      tally.gaveUp++;
      out(`${label}: REJECTED again (${v.errors.join('; ')}); left at qualified and will not be pushed`);
      await alert('welcome_rejected',
        `The welcome for ${p.public_id} failed validation twice (${v.errors.join('; ')}). It stays qualified and is not pushed.`, row.id);
    } else {
      tally.failed++;
      out(`${label}: REJECTED ${v.errors.join('; ')}; rewrite it and import again`);
    }
  }
  out(`${tally.approved} approved, ${tally.failed} to rewrite, ${tally.gaveUp} given up, ${tally.skipped} skipped.`);
  return tally.failed || tally.gaveUp ? 1 : 0;
}

// ---- review --------------------------------------------------------------------------------------

async function cmdReview() {
  const rows = await select('li_prospects',
    'status=in.(approved,pushing,pushed,connect_sent,accepted,welcome_sent)&select=id,public_id,name,headline,status,updated_at&order=updated_at.desc&limit=25');
  if (!rows.length) {
    out('Nothing approved or pushed yet.');
    return 0;
  }
  const welcomes = await welcomeRows(rows.map((r) => r.id));
  for (const r of rows) {
    out(`${r.public_id}  [${r.status}]  ${r.name ?? ''}${r.headline ? ` - ${r.headline}` : ''}`);
    out(`  ${welcomes.get(r.id)?.body ?? '(no welcome stored)'}`);
  }
  out(`\nTo stop anyone: node ${path.relative(process.cwd(), SCRIPT)} dnc <public_id> <reason>`);
  return 0;
}

// ---- push ----------------------------------------------------------------------------------------

function failedChecks(f) {
  const bad = [];
  if (f.welcomeTokenOk === false) bad.push('the message step after acceptance is not exactly {{welcome_message}}');
  if (f.connectNoteBlank === false) bad.push('the Connect step has a note; invites must be blank');
  if (f.stopOnReply === false) bad.push('"stop sequence on reply" is off');
  return bad;
}

// Hourly runs hit the same condition again and again; one open alert of a kind is enough.
async function alertOnce(kind, message, prospectId = null) {
  const q = `kind=eq.${encodeURIComponent(kind)}&resolved_at=is.null&select=id&limit=1`
    + (prospectId ? `&prospect_id=eq.${prospectId}` : '');
  let open = [];
  try {
    open = await select('li_alerts', q);
  } catch {
    open = [];
  }
  if (!open.length) await alert(kind, message, prospectId);
}

async function refuse(kind, message) {
  await alertOnce(kind, message);
  throw new Refusal(message);
}

// (c)+(d): read the custom variable back; match → pushed, otherwise remove, push_failed, alert.
async function verifyAndFinish(campaignId, row, urn, body) {
  let got;
  try {
    got = (await aimfox.getCustomVariables(campaignId, urn))?.[aimfox.WELCOME_VARIABLE];
  } catch (e) {
    if (isAuthError(e)) throw e;
    got = undefined;
  }
  if (typeof got === 'string' && got.trim() !== '' && got.trim() === String(body).trim()) {
    await update('li_prospects', `id=eq.${row.id}&status=eq.pushing`, { status: 'pushed', aimfox_lead_urn: urn });
    return 'pushed';
  }
  // Remove the lead; if that fails, blacklist it so no campaign step can reach it with a bad message.
  let outcome = 'removed from the campaign';
  try {
    await aimfox.removeFromAudience(campaignId, urn);
  } catch (e) {
    if (isAuthError(e)) throw e;
    try {
      await aimfox.addToBlacklist(urn);
      outcome = 'could not be removed from the campaign, so it was blacklisted in Aimfox instead; remove it from the campaign by hand';
    } catch (e2) {
      if (isAuthError(e2)) throw e2;
      outcome = 'COULD NOT be removed or blacklisted; remove it from the campaign in Aimfox by hand now';
    }
  }
  await update('li_prospects', `id=eq.${row.id}&status=eq.pushing`,
    { status: 'push_failed', push_attempts: (row.push_attempts ?? 0) + 1, aimfox_lead_urn: urn });
  await alert('push_failed',
    `${row.public_id}: the welcome message read back from Aimfox did not match what was stored, so the lead `
    + `${outcome}. It will not be pushed again.`, row.id);
  return 'push_failed';
}

// A re-run first settles every row a crash left at `pushing`.
async function reconcilePushing(campaignId) {
  const rows = await selectAll('li_prospects', 'status=eq.pushing&select=id,public_id,profile_url,status,push_attempts,aimfox_lead_urn&order=id');
  if (!rows.length) return { pushed: 0, failed: 0, requeued: 0 };
  const audience = await aimfox.listAudience(campaignId);
  const welcomes = await welcomeRows(rows.map((r) => r.id));
  const tally = { pushed: 0, failed: 0, requeued: 0 };
  for (const row of rows) {
    const entry = audience.find((e) => (row.aimfox_lead_urn && e.urn === row.aimfox_lead_urn) || e.publicId === row.public_id);
    if (entry?.urn) {
      const r = await verifyAndFinish(campaignId, row, entry.urn, welcomes.get(row.id)?.body ?? '');
      if (r === 'pushed') tally.pushed++; else tally.failed++;
    } else if ((row.push_attempts ?? 0) >= 2) {
      await update('li_prospects', `id=eq.${row.id}&status=eq.pushing`, { status: 'push_failed' });
      await alert('push_failed', `${row.public_id}: two push attempts stopped before the lead reached Aimfox. It will not be pushed again.`, row.id);
      tally.failed++;
    } else {
      await update('li_prospects', `id=eq.${row.id}&status=eq.pushing`, { status: 'approved' });
      tally.requeued++;
    }
  }
  out(`Reconciled ${rows.length} interrupted push(es): ${tally.pushed} pushed, ${tally.requeued} back to approved, ${tally.failed} failed.`);
  return tally;
}

// (a)–(d) for one prospect.
async function pushOne(campaignId, row, body) {
  const claimed = await update('li_prospects', `id=eq.${row.id}&status=eq.approved&push_attempts=eq.${row.push_attempts ?? 0}`,
    { status: 'pushing', push_attempts: (row.push_attempts ?? 0) + 1 });
  if (!claimed.length) return 'skipped';
  const current = { ...row, ...claimed[0] };

  let entry;
  try {
    entry = await aimfox.addToAudience(campaignId, {
      profileUrl: row.profile_url || canonicalProfileUrl(row.public_id),
      customVariables: { [aimfox.WELCOME_VARIABLE]: body },
    });
  } catch (e) {
    if (!(e instanceof aimfox.AimfoxError) || isAuthError(e)) throw e; // no answer: stop, the next run reconciles
    await alert('push_error', `${row.public_id}: Aimfox refused the audience add (${e.message}). The next push reconciles it.`, row.id);
    return 'error';
  }
  if (!entry?.urn) {
    entry = (await aimfox.listAudience(campaignId)).find((e) => e.publicId === row.public_id);
  }
  if (!entry?.urn) {
    await alert('push_error', `${row.public_id}: added to Aimfox but its lead id could not be found. The next push reconciles it.`, row.id);
    return 'error';
  }
  if (!aimfox.AUDIENCE_ADD_TAKES_VARIABLES) {
    await aimfox.setCustomVariables(campaignId, entry.urn, { [aimfox.WELCOME_VARIABLE]: body });
  }
  return verifyAndFinish(campaignId, current, entry.urn, body);
}

async function pushBatch(campaignId) {
  // status=eq.approved excludes do_not_contact in the same query; assertContactable re-checks each row.
  const rows = await select('li_prospects',
    `status=eq.approved&select=id,public_id,profile_url,status,push_attempts,aimfox_lead_urn&order=id&limit=${PUSH_BATCH_SIZE}`);
  const welcomes = await welcomeRows(rows.map((r) => r.id));
  const tally = { pushed: 0, push_failed: 0, skipped: 0, error: 0 };
  for (const row of rows) {
    try {
      assertContactable(row);
    } catch (e) {
      tally.skipped++;
      out(`skipped ${row.public_id}: ${e.message}`);
      continue;
    }
    const w = welcomes.get(row.id);
    if (!w || w.status !== 'draft') {
      tally.skipped++;
      out(`skipped ${row.public_id}: no welcome message stored`);
      continue;
    }
    // Re-validated right before enrolling (length, links, secrets), whatever write-import let through.
    const v = validateWelcome(w.body);
    if (!v.ok) {
      tally.skipped++;
      out(`skipped ${row.public_id}: stored welcome refused (${v.errors.join('; ')})`);
      await alert('welcome_blocked', `${row.public_id}: the stored welcome was refused right before enrolling `
        + `(${v.errors.join('; ')}). It was not sent to Aimfox. Rewrite it.`, row.id);
      continue;
    }
    tally[await pushOne(campaignId, row, w.body)]++;
  }
  out(`Batch: ${tally.pushed} pushed, ${tally.push_failed} failed read-back, ${tally.error} errors, ${tally.skipped} skipped.`);
  return { ...tally, selected: rows.length };
}

// The start flow. This script never starts a campaign and never takes a typed confirmation (a
// script cannot tell a person at a terminal from Claude). Instead:
//   PAUSED  → enroll the batch, record awaiting_start with the fingerprint, print the checklist and
//             ask the user to press Start in Aimfox themselves.
//   RUNNING → if it was awaiting_start and the fingerprint is unchanged, the user's Start is the
//             confirmation (confirmed_at). A RUNNING campaign this skill never recorded as paused
//             and awaiting Start is refused before any reconcile or audience call.
async function cmdPush({ start }) {
  if (start) out('push --start is the same as push now: you start the campaign yourself, in Aimfox.');
  const cfg = loadConfig();
  const campaignId = cfg.aimfox_campaign_id;
  if (!campaignId) throw new Refusal('aimfox_campaign_id is not set in config.json');
  if (!(await acquire('push'))) throw new Refusal('another push is running (push.lock); try again when it finishes');
  try {
    let [state] = await select('li_campaign_state', { campaign_id: campaignId });
    const facts = aimfox.campaignFacts(await aimfox.getCampaign(campaignId));

    const bad = failedChecks(facts);
    if (bad.length) await refuse('push_refused', `Aimfox campaign ${campaignId} is not set up right: ${bad.join('; ')}. Fix it in Aimfox.`);

    state = await recordStartIfSeen(campaignId, state, facts);

    if (facts.state === 'PAUSED') {
      await reconcilePushing(campaignId);
      const batch = await pushBatch(campaignId);
      const wasWaiting = Boolean(state?.awaiting_start) && (state.fingerprint ?? null) === (facts.fingerprint ?? null);
      // Merge upsert: loop_installed_at is kept. A re-paused campaign needs a fresh Start.
      await insert('li_campaign_state', {
        campaign_id: campaignId,
        fingerprint: facts.fingerprint,
        awaiting_start: wasWaiting ? state.awaiting_start : new Date().toISOString(),
        confirmed_at: null,
      }, { onConflict: 'campaign_id' });
      await printChecklist(campaignId, facts);
      if (batch.pushed > 0 || !wasWaiting) {
        await alert('awaiting_start', `Aimfox campaign ${campaignId} is paused with leads waiting. Open it in Aimfox, check the `
          + 'Connect step has no note, the message step is exactly {{welcome_message}} and "stop sequence on reply" is on, '
          + 'then press Start yourself.');
      }
      return 0;
    }

    if (facts.state !== 'RUNNING') {
      await refuse('push_refused', `Aimfox campaign ${campaignId} is ${facts.state ?? 'in an unknown state'}; expected PAUSED or RUNNING.`);
    }
    if (!state?.confirmed_at) {
      await refuse('campaign_not_confirmed', `Aimfox campaign ${campaignId} is running, but this skill never recorded it paused `
        + 'and waiting for your Start, so nothing is added. Pause it in Aimfox, then run push again.');
    }
    if (!state.fingerprint) {
      await reconcilePushing(campaignId);
      const waiting = await select('li_prospects', 'status=eq.approved&select=id&limit=1');
      if (waiting.length) {
        await alertOnce('batch_waiting', `A batch of approved prospects is waiting. Aimfox does not show whether campaign ${campaignId} `
          + 'was edited, so each batch goes in while it is paused: pause it in Aimfox, run push, check the steps, press Start.');
        out('Batch waiting: pause the campaign in Aimfox, then run push (see needs-you.md).');
      }
      return 0;
    }
    if (facts.fingerprint !== state.fingerprint) {
      await refuse('campaign_changed', `Aimfox campaign ${campaignId} was edited after you started it, so no more leads are added. `
        + 'Pause it in Aimfox, re-check its steps, then run push again and press Start.');
    }

    await reconcilePushing(campaignId);
    await pushBatch(campaignId);
    return 0;
  } finally {
    release('push');
  }
}

// RUNNING after awaiting_start, with the definition unchanged: the user's Start is the confirmation.
// Called by push and sync. Returns the state as it now stands.
async function recordStartIfSeen(campaignId, state, facts) {
  if (facts.state !== 'RUNNING' || !state?.awaiting_start || state.confirmed_at) return state;
  if ((state.fingerprint ?? null) !== (facts.fingerprint ?? null)) {
    await refuse('campaign_changed', `Aimfox campaign ${campaignId} was edited between the last batch and Start, so the Start is `
      + 'not taken as confirmation and nothing is added. Pause it in Aimfox, re-check its steps, then run push again.');
  }
  const now = new Date().toISOString();
  await update('li_campaign_state', { campaign_id: campaignId }, { confirmed_at: now, awaiting_start: null });
  out(`Aimfox campaign ${campaignId} is running: your Start is recorded.`);
  if (!state.fingerprint) {
    out('Aimfox does not show whether the campaign is edited later, so each later batch goes in while you pause it.');
  }
  printLoop(state);
  return { ...state, confirmed_at: now, awaiting_start: null };
}

async function printChecklist(campaignId, facts) {
  const show = (v) => (v === null ? 'Aimfox does not say, check it' : v ? 'looks right' : 'WRONG');
  out('');
  out(`Aimfox campaign ${campaignId} is paused. Before it sends anything, check three things in Aimfox:`);
  out(`  1. The Connect step has no note (a blank invite): ${show(facts.connectNoteBlank)}`);
  out(`  2. The message step after acceptance is exactly {{welcome_message}}: ${show(facts.welcomeTokenOk)}`);
  out(`  3. "Stop sequence on reply" is ON: ${show(facts.stopOnReply)}`);
  const [sample] = await select('li_prospects', 'status=eq.pushed&select=id,public_id,name&order=updated_at.desc&limit=1');
  if (sample) {
    const body = (await welcomeRows([sample.id])).get(sample.id)?.body;
    if (body) out(`  Open the preview for ${sample.name ?? sample.public_id}; the message after acceptance should read:\n    ${body}`);
  }
  out('Now open Aimfox, check these three, and press Start yourself. The next push or sync records it.');
}

function printLoop(state) {
  if (state?.loop_installed_at) {
    out(`A scheduled run loop was already installed at ${state.loop_installed_at}; not installing another.`);
    return;
  }
  // The skill (SKILL.md "run") installs the loop on this line; the script cannot schedule Claude Code itself.
  out('INSTALL_LOOP: schedule the linkedin-closer "run" procedure hourly (/loop 1h, or the cron line in the README).');
  out('After it is scheduled, record it: node scripts/prospector.mjs loop-installed');
}

async function cmdLoopInstalled() {
  const cfg = loadConfig();
  if (!cfg.aimfox_campaign_id) throw new Refusal('aimfox_campaign_id is not set in config.json');
  const [state] = await select('li_campaign_state', { campaign_id: cfg.aimfox_campaign_id });
  if (!state?.confirmed_at) throw new Refusal('the campaign is not started yet: press Start in Aimfox, then run push or sync');
  if (state.loop_installed_at) throw new Refusal(`a run loop is already recorded (since ${state.loop_installed_at}); not installing another`);
  await update('li_campaign_state', { campaign_id: cfg.aimfox_campaign_id }, { loop_installed_at: new Date().toISOString() });
  out('Recorded: the hourly run loop is installed.');
  return 0;
}

// ---- sync ----------------------------------------------------------------------------------------

async function cmdSync() {
  const cfg = loadConfig();
  const campaignId = cfg.aimfox_campaign_id;
  if (!campaignId) throw new Refusal('aimfox_campaign_id is not set in config.json');

  // A campaign waiting for the user's Start: seeing it RUNNING and unchanged records the Start.
  const [state] = await select('li_campaign_state', { campaign_id: campaignId });
  if (state?.awaiting_start && !state.confirmed_at) {
    try {
      await recordStartIfSeen(campaignId, state, aimfox.campaignFacts(await aimfox.getCampaign(campaignId)));
    } catch (e) {
      if (!(e instanceof Refusal)) throw e;
      out(`Start not recorded: ${e.message}`);
    }
  }

  const prospects = await selectAll('li_prospects',
    'status=in.(pushed,connect_sent,accepted,welcome_sent,replied)&select=id,public_id,status,aimfox_lead_urn&order=id');
  if (!prospects.length) {
    out('No pushed prospects to sync.');
    return 0;
  }
  const byUrn = new Map(prospects.filter((p) => p.aimfox_lead_urn).map((p) => [p.aimfox_lead_urn, p]));
  const byPublicId = new Map(prospects.map((p) => [p.public_id, p]));
  const find = (e) => (e.urn && byUrn.get(e.urn)) || (e.publicId && byPublicId.get(e.publicId)) || null;

  const interactions = await aimfox.listInteractions({ campaignId });
  const target = new Map(); // prospect id → { status, welcomeAt }
  for (const it of interactions) {
    if (!it.kind || (it.campaignId && String(it.campaignId) !== String(campaignId))) continue;
    const p = find(it);
    if (!p) continue;
    const t = target.get(p.id) ?? { status: p.status, welcomeAt: null };
    if (SYNC_RANK[it.kind] > SYNC_RANK[t.status]) t.status = it.kind;
    if (it.kind === 'welcome_sent') t.welcomeAt = it.at ?? t.welcomeAt ?? new Date().toISOString();
    target.set(p.id, t);
  }

  const tally = { moved: 0, welcomesSent: 0, removed: 0, dnc: 0 };
  for (const p of prospects) {
    const t = target.get(p.id);
    if (!t) continue;
    if (t.welcomeAt) {
      const sent = await update('li_messages', `prospect_id=eq.${p.id}&kind=eq.welcome&status=eq.draft`,
        { status: 'sent', sent_at: t.welcomeAt, sent_via: 'aimfox' });
      tally.welcomesSent += sent.length;
    }
    if (SYNC_RANK[t.status] <= SYNC_RANK[p.status]) continue;
    const moved = await update('li_prospects', `id=eq.${p.id}&status=eq.${p.status}`, { status: t.status });
    if (!moved.length) continue;
    tally.moved++;
    if (t.status === 'replied' && p.aimfox_lead_urn) {
      // Second guard on top of Aimfox's stop-on-reply: no further step can fire.
      try {
        await aimfox.removeFromAudience(campaignId, p.aimfox_lead_urn);
        tally.removed++;
      } catch (e) {
        if (isAuthError(e)) throw e;
        await alert('sync_remove_failed', `${p.public_id} replied but could not be removed from Aimfox campaign ${campaignId} `
          + `(${e.message}). Remove them by hand so no further step fires.`, p.id);
      }
    }
  }

  // A "not interested" label in Aimfox makes the prospect do-not-contact.
  const leads = await aimfox.searchLeads({ campaign_id: campaignId });
  for (const lead of leads) {
    if (!lead.labels.some((l) => /not\s*interested/.test(l))) continue;
    const p = find(lead);
    if (!p) continue;
    await markDoNotContact(p.id, 'Aimfox label: not interested', { campaignId });
    tally.dnc++;
  }

  out(`Sync: ${tally.moved} status change(s), ${tally.welcomesSent} welcome(s) marked sent, `
    + `${tally.removed} replied lead(s) removed from the campaign, ${tally.dnc} marked do-not-contact.`);
  return 0;
}

// ---- dnc, status ---------------------------------------------------------------------------------

async function cmdDnc(publicIdArg, reasonParts) {
  const publicId = normalizePublicId(publicIdArg);
  const reason = reasonParts.join(' ').trim();
  if (!publicId || !reason) throw new Refusal('usage: dnc <public_id or profile URL> <reason>');
  if (!isValidPublicId(publicId)) throw new Refusal(`${publicIdArg} is not a LinkedIn profile id (letters, digits, - and _ only)`);
  const [row] = await select('li_prospects', { public_id: publicId, select: 'id,status' });
  if (!row) {
    // Not scraped yet: store them as do-not-contact so a later scrape keeps them that way.
    await insert('li_prospects', { public_id: publicId, profile_url: canonicalProfileUrl(publicId), status: 'do_not_contact', dnc_reason: reason },
      { onConflict: 'public_id' });
    out(`${publicId} stored as do-not-contact.`);
    return 0;
  }
  const res = await markDoNotContact(row.id, reason);
  out(`${publicId} is do-not-contact.${res.aimfoxRemoved ? ' Removed from the Aimfox campaign.' : ''}`
    + `${res.aimfoxBlacklisted ? ' Blacklisted in Aimfox.' : ''}`);
  return 0;
}


async function cmdStatus() {
  const cfg = loadConfig();
  const prospects = await selectAll('li_prospects', 'select=status&order=id');
  const counts = {};
  for (const p of prospects) counts[p.status] = (counts[p.status] ?? 0) + 1;
  out(`Prospects: ${prospects.length}`);
  for (const [s, n] of Object.entries(counts).sort((a, b) => b[1] - a[1])) out(`  ${s.padEnd(16)} ${n}`);

  const runs = await selectAll('li_runs', 'select=est_cost_usd,actual_cost_usd,error&order=id');
  const spent = runs.filter((r) => r.error !== 'over_cap')
    .reduce((s, r) => s + Number(r.actual_cost_usd ?? r.est_cost_usd ?? 0), 0);
  out(`Apify spend: $${spent.toFixed(2)} of $${cfg.total_cap_usd} total cap (per-run cap $${cfg.per_run_cap_usd}); `
    + `${runs.filter((r) => r.error === 'over_cap').length} refused run(s).`);

  if (cfg.aimfox_campaign_id) {
    const [state] = await select('li_campaign_state', { campaign_id: cfg.aimfox_campaign_id });
    out(`Campaign ${cfg.aimfox_campaign_id}: ${state?.confirmed_at ? `started ${state.confirmed_at}` : 'not started'}`
      + `${state?.confirmed_at ? `, change detection ${state.fingerprint ? 'on' : 'off (each batch waits for you)'}` : ''}`
      + `${state?.loop_installed_at ? `, run loop since ${state.loop_installed_at}` : ''}.`);
  }
  return 0;
}

// ---- entry ---------------------------------------------------------------------------------------

export async function main(argv) {
  const [cmd, ...rest] = argv;
  const flags = new Set(rest.filter((a) => a.startsWith('--')));
  const outIdx = rest.indexOf('--out');
  const outFile = outIdx >= 0 ? rest[outIdx + 1] : undefined;
  const positional = rest.filter((a, i) => !a.startsWith('--') && !(outIdx >= 0 && i === outIdx + 1));

  loadEnv();
  await printOpenAlerts();

  switch (cmd) {
    case 'setup-check': return cmdSetupCheck();
    case 'find-creators': return cmdFindCreators({ dryRun: flags.has('--dry-run') });
    case 'scrape-commenters': return cmdScrapeCommenters({ dryRun: flags.has('--dry-run') });
    case 'qualify-export': return cmdQualifyExport({ outFile });
    case 'qualify-import': return cmdQualifyImport(positional[0]);
    case 'write-export': return cmdWriteExport({ outFile });
    case 'write-import': return cmdWriteImport(positional[0]);
    case 'review': return cmdReview();
    case 'push': return cmdPush({ start: flags.has('--start') });
    case 'loop-installed': return cmdLoopInstalled();
    case 'sync': return cmdSync();
    case 'status': return cmdStatus();
    case 'dnc': return cmdDnc(positional[0], positional.slice(1));
    default:
      err('usage: node scripts/prospector.mjs <setup-check|find-creators|scrape-commenters|qualify-export|qualify-import|'
        + 'write-export|write-import|review|push|sync|status|dnc> [args]');
      return 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main(process.argv.slice(2)).then((code) => {
    process.exitCode = code ?? 0;
  }, (e) => {
    if (e instanceof Refusal) err(`Refused: ${e.message}`);
    else if (e instanceof ConfigError) err(e.message);
    else if (isAuthError(e)) err(`Auth failure, stopping: ${e.message}`);
    else err(`Error: ${e.message}`);
    process.exitCode = isAuthError(e) ? 2 : 1;
  });
}
