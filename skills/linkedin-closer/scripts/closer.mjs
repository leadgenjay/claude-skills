#!/usr/bin/env node
// linkedin-closer: reads LinkedIn DM replies and comments on your own posts through Unipile,
// hands the waiting threads to Claude as JSON, stores Claude's drafts, and sends them.
//
//   node scripts/closer.mjs <command>
//     setup-check              check the prospector is installed beside this skill, keys work
//     inbox-export [--out f]   chats waiting on us, oldest first, with the live thread
//     draft-import <file>      store Claude's drafts (validated per row)
//     send                     send stored drafts (skipped entirely in closer_mode draft_only)
//     comments-export [--out f] unanswered top-level comments on your recent posts
//     comments-import <file>   store Claude's comment replies (validated per row)
//     comments-post            post stored comment replies (skipped in draft_only)
//     booked <public_id>       mark a meeting booked
//     alerts [resolve <id>]    print the open alerts, or mark one handled
//     note <public_id> <text>  put a reminder on the needs-you list
//     run-begin                take the run lock and print the ordered stage list
//     run-end                  release the run lock
//
// Exit codes: 0 ok, 1 refused or failed (including any rejected import row), 2 auth failure
// (Unipile CREDENTIALS or a 401 anywhere): the whole pass stops.
//
// The shared library lives in the linkedin-prospector skill and is imported by relative path,
// so both skills must be installed side by side.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const PROSPECTOR_DIR = path.resolve(HERE, '../../linkedin-prospector');
export const LIB_DIR = path.join(PROSPECTOR_DIR, 'scripts', 'lib');
const LIB_FILES = ['config.mjs', 'http.mjs', 'db.mjs', 'alerts.mjs', 'lock.mjs', 'dnc.mjs', 'unipile.mjs', 'secrets.mjs', '../validate.mjs'];

export const MAX_REPLY_CHARS = 250;
export const STUCK_MINUTES = 15;
export const INBOX_LOOKBACK_DAYS = 30;
export const OWN_POSTS_CHECKED = 10;
export const CLASSES = ['interested', 'question', 'objection', 'not_interested', 'vendor_pitch',
  'referral', 'out_of_office', 'personal'];
// reply = a draft to send; escalate = no reply, a human answers (bot question, complaint, legal,
// personal); dnc = do_not_contact, no reply ever; skip = nothing to answer (out of office).
export const DM_ACTIONS = ['reply', 'escalate', 'dnc', 'skip'];
// reply = a public engagement reply; skip = no public reply, listed on needs-you with the reason.
export const COMMENT_ACTIONS = ['reply', 'skip'];

// ---------------------------------------------------------------- validation (pure)

// Link detection reuses the prospector's containsUrl (scheme, www., bare domains on common TLDs),
// plus any dotted word and a spelled-out "dot". No whitespace after a literal dot, or every
// sentence break would count as a domain.
const VALIDATE_FILE = path.join(PROSPECTOR_DIR, 'scripts', 'validate.mjs');
const prospectorValidate = fs.existsSync(VALIDATE_FILE) ? await import(pathToFileURL(VALIDATE_FILE).href) : null;
const DOTTED_RE = /\b[\w-]+\.[a-z]{2,24}\b/i;
// Disguised dots: [dot] (dot) [.] (.), "dot" or "d0t" between words, a dot with spaces on both
// sides ("evil . io"; a sentence break has no space before its dot), and the full-width 。.
const SPELLED_DOT_RE = /\b[\w-]+(?:\s*(?:\[dot\]|\(dot\)|\[\.\]|\(\.\)|。)\s*|\s+(?:dot|d0t)\s+|\s+\.\s+)[a-z]{2,24}\b/i;

const PRICE_RES = [
  /\p{Sc}\s*\d/u,
  /\b\d+(?:\.\d+)?\s*k\b/i,
  /\b\d{3,}\b/,
  /\d[\d,.]*\s*(?:usd|eur|gbp|dollars?|bucks|euros?|pounds?)\b/i,
  /\d[\d,.]*\s*(?:\/|per|a|an|each)\s*(?:month|mo|year|yr|annum|week|wk|day|seat|user|lead|meeting|call)\b/i,
  /\d[\d,.]*\s*(?:monthly|yearly|annually)\b/i,
  /\b(?:hundred|thousand|grand)\b[^.?!]{0,40}?\b(?:dollars?|bucks|a month|per month|a year|per year|monthly|yearly)\b/i,
  /(?:\d|\b(?:one|two|three|four|five|six|seven|eight|nine|ten|few|several|couple))\s*grand\b/i,
  // Any number, even two digits, within three words of a billing period: "49 a month", "10 bucks one-time".
  /\d[\d,.]*\s*k?\b(?:\W+[\w'-]+){0,3}?\W+(?:one[- ]time|per month|a month|monthly|a year|per year|yearly|annually)\b|\d[\d,.]*\s*k?\s*\/\s*mo\b/i,
];
const OFFER_IN_PUBLIC_RES = [
  /\b(?:dm|message|inbox|pm)\s+me\b/i,
  /\bsen[dt]\s+(?:me|you)\s+an?\s+(?:dm|message|pm)\b/i,
  /\b(?:i'?ll|let me|i will)\s+(?:dm|message|pm)\s+you\b/i,
  /\bcheck\s+(?:your|my)\s+(?:dms?|inbox)\b/i,
  /\bbook\s+(?:a|an|your)\s+(?:call|meeting|demo|consult\w*)\b/i,
  /\b(?:hop|jump|get)\s+on\s+a\s+call\b/i,
  /\b(?:calendar|booking)\s+link\b/i,
  /\b(?:our|my)\s+(?:offer|program|service|services|course|agency)\b/i,
  /\b(?:discount|free trial|sign up|signup)\b/i,
];

// Backstops on the message being answered, applied right before anything is sent.
export const BOT_RE = /\b(?:are|r)\s+(?:you|u)\s+(?:a\s+|an\s+)?(?:bot|ai|robot|automated|real)\b|\bis\s+this\s+(?:a\s+|an\s+)?(?:bot|ai|robot|automated|real\s+person)\b|\b(?:talking|speaking)\s+to\s+(?:a\s+|an\s+)?(?:bot|ai|robot|human|real\s+person)\b/i;
export const LEGAL_RE = /\b(?:lawyer|attorney|legal action|lawsuit|sue you|gdpr|cease and desist)\b/i;
export const STOP_RE = /\b(?:stop\s+(?:messaging|contacting|emailing|spamming|sending)|unsubscribe|remove me|leave me alone|do\s+not\s+(?:contact|message)|don'?t\s+(?:contact|message)\s+me)\b/i;
// A price question: the reply must carry the offer link (and, like every reply, no number).
export const PRICE_QUESTION_RE = /\b(?:how much|price|prices|pricing|cost|costs|rates?|fees?)\b/i;
export const COMPLAINT_RE = /\b(?:scam\w*|fraud\w*|refund\w*|rip[- ]?off|terrible|worst|awful|disappointed|disappointing|complain\w*|lawsuit|lawyer|never (?:got|received)|waste of (?:money|time)|unprofessional|spamm\w*)\b/i;

export function looksLikeLink(text) {
  const s = String(text ?? '');
  return Boolean(prospectorValidate?.containsUrl(s)) || DOTTED_RE.test(s) || SPELLED_DOT_RE.test(s);
}

const trimToken = (t) => t.replace(/^[("'«<[]+/u, '').replace(/[.,;:!?)"'»>\]]+$/u, '');

/** Every link-like token in the text, trailing punctuation trimmed. */
export function linkTokens(text) {
  return String(text ?? '').split(/\s+/).map(trimToken).filter((t) => t && looksLikeLink(t));
}

/** host + path, lowercased host without www. and without a trailing slash; null if unparseable. */
export function normalizeLink(link) {
  try {
    const u = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(link) ? link : `https://${link}`);
    return `${u.hostname.toLowerCase().replace(/^www\./, '')}${u.pathname.replace(/\/+$/, '')}`;
  } catch {
    return null;
  }
}

export function endsOnBareLink(text) {
  const words = String(text ?? '').trim().split(/\s+/);
  const last = trimToken(words[words.length - 1] ?? '');
  return last !== '' && looksLikeLink(last);
}

export function hasPriceFigure(text) {
  return PRICE_RES.some((re) => re.test(String(text ?? '')));
}

/**
 * Problems with a DM reply draft; an empty list means it may be stored. The only links allowed
 * are allowedLinks (offer_url and booking_link), compared by host and path, so a lookalike
 * domain or a link quoted from the thread is refused.
 */
export function validateReply(body, { requireLink = false, allowedLinks = [] } = {}) {
  const problems = [];
  const text = typeof body === 'string' ? body.trim() : '';
  if (!text) return ['body is empty'];
  if ([...text].length > MAX_REPLY_CHARS) problems.push(`over ${MAX_REPLY_CHARS} characters (${[...text].length})`);
  const allowed = new Set(allowedLinks.filter(Boolean).map(normalizeLink).filter(Boolean));
  const links = linkTokens(text);
  const foreign = links.filter((l) => !allowed.has(normalizeLink(l)));
  if (foreign.length) problems.push(`contains a link that is not your offer_url or booking_link: ${foreign.join(', ')}`);
  if (SPELLED_DOT_RE.test(text)) problems.push('spells out a domain ("dot"); only your offer_url or booking_link may appear');
  if (endsOnBareLink(text)) problems.push('ends on a bare link; put the link mid-message and end with one easy question');
  if (hasPriceFigure(text)) problems.push('quotes a price or a figure; point to the offer link instead of a number');
  if (requireLink && links.length === foreign.length) {
    problems.push(allowed.size
      ? 'a price question needs your offer_url or booking_link in the reply'
      : 'a price question needs a link, but offer_url and booking_link are both empty in config.json');
  }
  return problems;
}

/** Problems with a public comment reply: engagement only, so no link of any kind, no offer, no DM ask. */
export function validateCommentReply(body, { forbiddenLinks = [] } = {}) {
  const problems = [];
  const text = typeof body === 'string' ? body.trim() : '';
  if (!text) return ['body is empty'];
  if ([...text].length > MAX_REPLY_CHARS) problems.push(`over ${MAX_REPLY_CHARS} characters (${[...text].length})`);
  if (looksLikeLink(text) || forbiddenLinks.some((l) => l && text.includes(l))) problems.push('contains a link or domain; comment replies are engagement only');
  if (hasPriceFigure(text)) problems.push('quotes a price or a figure');
  if (OFFER_IN_PUBLIC_RES.some((re) => re.test(text))) problems.push('pitches an offer or asks for a DM; comment replies are engagement only');
  return problems;
}

// ---------------------------------------------------------------- setup

export function missingPrerequisites(libDir = LIB_DIR) {
  return LIB_FILES.filter((f) => !fs.existsSync(path.join(libDir, f)));
}

class SetupError extends Error {}

function prerequisiteMessage(missing) {
  return `linkedin-closer needs the linkedin-prospector skill installed in the same skills folder `
    + `(looked for ${PROSPECTOR_DIR}; missing ${missing.join(', ')}). Install linkedin-prospector `
    + 'beside linkedin-closer, run its setup, then run this command again.';
}

async function loadLib() {
  const missing = missingPrerequisites();
  if (missing.length) throw new SetupError(prerequisiteMessage(missing));
  const imp = (f) => import(pathToFileURL(path.join(LIB_DIR, f)).href);
  const [config, db, alerts, lock, dnc, uni, secrets] = await Promise.all(
    ['config.mjs', 'db.mjs', 'alerts.mjs', 'lock.mjs', 'dnc.mjs', 'unipile.mjs', 'secrets.mjs'].map(imp));
  return { config, db, alerts, lock, dnc, uni, secrets };
}

// ---------------------------------------------------------------- helpers

export function isAuthError(err) {
  return err?.name === 'AuthError' || (err?.name === 'DbError' && err?.status === 401);
}

function accountId(cfg) {
  if (!cfg.unipile_account_id) throw new SetupError('unipile_account_id is empty in config.json; run setup first');
  return cfg.unipile_account_id;
}

// inbox-export and comments-export remember what they handed out, so an import row can only
// answer the exact message or comment that was exported, and its prospect comes from here.
function statePath(ctx, name) {
  return path.join(ctx.config.homeDir(), `closer-${name}-export.json`);
}

function writeState(ctx, name, state) {
  fs.mkdirSync(path.dirname(statePath(ctx, name)), { recursive: true });
  fs.writeFileSync(statePath(ctx, name), JSON.stringify(state));
}

function readState(ctx, name, cmd) {
  try {
    return JSON.parse(fs.readFileSync(statePath(ctx, name), 'utf8'));
  } catch {
    throw new SetupError(`no ${cmd} found; run ${cmd} first and draft from its output`);
  }
}

function readRows(file, key) {
  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (err) {
    throw new SetupError(`cannot read ${file}: ${err.message}`);
  }
  const rows = Array.isArray(parsed) ? parsed : parsed?.[key];
  if (!Array.isArray(rows)) throw new SetupError(`${file} must hold a list, or an object with a "${key}" list`);
  return rows;
}

const clip = (s, n = 120) => {
  const t = String(s ?? '').replace(/\s+/g, ' ').trim();
  return t.length > n ? `${t.slice(0, n - 1)}…` : t;
};

// Drafts move out of 'draft' only through a match on status, so two passes never clobber.
// The reason is kept in meta for the record.
async function setStatus(ctx, row, from, to, reason) {
  const patch = { status: to };
  if (reason) patch.meta = { ...(row.meta ?? {}), status_reason: reason };
  return ctx.db.update('li_messages', { id: row.id, status: from }, patch);
}

const offerLinks = (cfg) => [cfg.offer_url, cfg.booking_link].filter(Boolean);

function secretProblems(ctx, text, label) {
  try {
    ctx.secrets.assertNoSecrets(text, label);
    return [];
  } catch (err) {
    if (err?.name !== 'SecretLeakError') throw err;
    return [err.message];
  }
}

// Every rule a DM reply must pass, at import and again right before it is sent.
function replyProblems(ctx, body, { requireLink = false, label = 'reply' } = {}) {
  return [...validateReply(body, { requireLink, allowedLinks: offerLinks(ctx.cfg) }), ...secretProblems(ctx, body, label)];
}

function commentProblems(ctx, body, label = 'comment reply') {
  return [...validateCommentReply(body, { forbiddenLinks: offerLinks(ctx.cfg) }), ...secretProblems(ctx, body, label)];
}

async function expireStuck(ctx) {
  const ids = (await ctx.db.rpc('expire_stuck_sends', { p_minutes: STUCK_MINUTES })) ?? [];
  const list = (Array.isArray(ids) ? ids : [ids]).map((v) => (typeof v === 'object' && v ? Object.values(v)[0] : v));
  for (const id of list) {
    const [row] = await ctx.db.select('li_messages', { id, select: 'id,kind,prospect_id,body' });
    await ctx.alerts.alert('send_stuck',
      `A ${row?.kind ?? 'message'} (id ${id}) was claimed for sending over ${STUCK_MINUTES} minutes ago and never `
      + 'finished. It may have gone out, so it is marked failed and will not be retried. Check the conversation '
      + `on LinkedIn. Text: "${clip(row?.body)}"`, row?.prospect_id ?? null);
  }
  return list;
}

// Who a chat belongs to, derived from the live chat's attendee and never from a stored row or
// from Claude's output. Returns { chat, prospect } (prospect null for a stranger); throws when the
// chat cannot be read or names nobody.
// Every id our own account is known by, read once per command.
async function ownIds(ctx) {
  ctx.selfIds ??= ctx.uni.selfIds(await ctx.uni.ownProfile(accountId(ctx.cfg)));
  return ctx.selfIds;
}

// One open alert of a kind at a time, so a repeating condition is visible without flooding.
async function alertOnce(ctx, kind, body) {
  if ((await ctx.alerts.openAlerts()).some((a) => a.kind === kind)) return;
  await ctx.alerts.alert(kind, body);
}

async function liveIdentity(ctx, chatId) {
  const chat = await ctx.uni.chat(chatId);
  const providerId = chat?.attendee_provider_id;
  if (!providerId) throw new Error('the live chat has no attendee id');
  if ((await ctx.uni.otherAttendees(chatId, await ownIds(ctx))).length > 1) throw new Error('it is a group chat');
  const [prospect] = await ctx.db.select('li_prospects', { unipile_provider_id: providerId, select: 'id,public_id,status' });
  return { chat, prospect: prospect ?? null };
}

const sameId = (a, b) => String(a ?? '') === String(b ?? '');

// A dnc row may only mark the prospect this chat belongs to right now, and only while the message
// it answers is still their last one.
async function dncLiveProblems(ctx, chatId, externalId, prospectId) {
  try {
    const { prospect } = await liveIdentity(ctx, chatId);
    if (!sameId(prospect?.id, prospectId)) return ['the live chat does not belong to the exported prospect; nothing was marked'];
    const msgs = await ctx.uni.messages(chatId);
    const last = msgs[msgs.length - 1];
    if (!last || last.from !== 'them' || !sameId(last.id, externalId)) {
      return ['their message is no longer the last one in the chat; export again'];
    }
    return [];
  } catch (err) {
    if (isAuthError(err)) throw err;
    return [`could not confirm the chat live (${err.message}); nothing was marked`];
  }
}

// ---------------------------------------------------------------- inbox

async function inboxExport(ctx) {
  const { cfg, db, uni } = ctx;
  const acct = accountId(cfg);
  await uni.assertAccountHealthy(acct);
  const since = new Date(ctx.now() - INBOX_LOOKBACK_DAYS * 86400000).toISOString();
  const chats = await uni.allChats(acct, { sinceIso: since });

  const skipped = [];
  const waiting = [];
  for (const c of chats) {
    if (uni.chatReplyDisabled(c)) {
      skipped.push({ chat_id: c.id, reason: uni.chatReplyDisabledReason(c) });
      continue;
    }
    const msgs = await uni.messages(c.id);
    const last = msgs[msgs.length - 1];
    if (!last || last.from !== 'them') continue;
    if ((await uni.otherAttendees(c.id, await ownIds(ctx))).length > 1) {
      skipped.push({ chat_id: c.id, reason: 'group chat' });
      continue;
    }
    waiting.push({ chat: c, msgs, last, providerId: c.attendee_provider_id ?? last.sender_id ?? null });
  }

  // Group detection rests on an unverified attendee shape; if it guessed wrong, every 1:1 chat
  // would vanish here, so the skips are always visible.
  const groups = skipped.filter((x) => x.reason === 'group chat').length;
  if (groups) {
    await alertOnce(ctx, 'group_chat_skipped',
      `${groups} chat${groups === 1 ? '' : 's'} waiting on you ${groups === 1 ? 'was' : 'were'} skipped as group chats. `
      + 'If those are really one-to-one conversations, the attendee check is wrong: answer them yourself and report it.');
  }

  // Already drafted, escalated, dropped or sent for this exact message: not exported again.
  const handled = new Set();
  if (waiting.length) {
    const rows = await db.select('li_messages',
      `kind=eq.reply&external_id=${ctx.db.inList(waiting.map((w) => w.last.id))}&select=external_id`);
    for (const r of rows) handled.add(r.external_id);
  }

  const todo = waiting.filter((w) => {
    if (!handled.has(w.last.id)) return true;
    skipped.push({ chat_id: w.chat.id, reason: 'already handled for this message' });
    return false;
  });

  // Match to prospects by Unipile provider id, then by public id from the profile.
  const byProvider = new Map();
  const providerIds = [...new Set(todo.map((w) => w.providerId).filter(Boolean))];
  if (providerIds.length) {
    const rows = await db.select('li_prospects',
      `unipile_provider_id=${ctx.db.inList(providerIds)}&select=id,public_id,name,headline,company,status,unipile_provider_id,last_inbound_at`);
    for (const p of rows) byProvider.set(p.unipile_provider_id, p);
  }
  // A chat whose person cannot be identified is skipped with an alert, never exported as a
  // stranger: a failed lookup must not turn a do_not_contact prospect into a fresh contact.
  for (const w of todo) {
    if (byProvider.has(w.providerId)) continue;
    if (!w.providerId) {
      w.lookupFailed = 'the chat has no attendee id';
      continue;
    }
    let pub = null;
    try {
      pub = (await uni.profile(w.providerId, acct))?.public_identifier ?? null;
      if (!pub) w.lookupFailed = 'the profile has no public id';
      else w.publicId = String(pub).toLowerCase();
    } catch (err) {
      if (isAuthError(err)) throw err;
      w.lookupFailed = `the profile lookup failed (${err.message})`;
    }
    if (!pub) continue;
    const [p] = await db.select('li_prospects', {
      public_id: String(pub).toLowerCase(),
      select: 'id,public_id,name,headline,company,status,unipile_provider_id,last_inbound_at',
    });
    if (p) {
      byProvider.set(w.providerId, p);
      if (!p.unipile_provider_id) await db.update('li_prospects', { id: p.id }, { unipile_provider_id: w.providerId });
    }
  }

  const threads = [];
  for (const w of todo) {
    if (w.lookupFailed) {
      skipped.push({ chat_id: w.chat.id, reason: `could not tell who this is: ${w.lookupFailed}` });
      await ctx.alerts.alert('lookup_failed',
        `Chat ${w.chat.id} was not drafted because ${w.lookupFailed}. It is retried next pass; answer it yourself if it keeps failing.`);
      continue;
    }
    const p = byProvider.get(w.providerId) ?? null;
    if (p?.status === 'do_not_contact') {
      skipped.push({ chat_id: w.chat.id, reason: 'do_not_contact' });
      continue;
    }
    if (p && w.last.at && !(Date.parse(p.last_inbound_at) >= Date.parse(w.last.at))) {
      await db.update('li_prospects', { id: p.id }, { last_inbound_at: w.last.at });
    }
    const notFromCampaign = !p;
    threads.push({
      chat_id: w.chat.id,
      external_id: w.last.id,
      waiting_since: w.last.at,
      prospect_id: p?.id ?? null,
      public_id: p?.public_id ?? null,
      name: p?.name ?? w.chat.name ?? null,
      headline: p?.headline ?? null,
      company: p?.company ?? null,
      not_from_campaign: notFromCampaign,
      will_auto_send: cfg.closer_mode === 'send' && (!notFromCampaign || cfg.reply_scope === 'all'),
      messages: w.msgs.slice(-20).map((m) => ({ id: m.id, from: m.from, at: m.at, text: m.text })),
    });
  }
  threads.sort((a, b) => (Date.parse(a.waiting_since) || 0) - (Date.parse(b.waiting_since) || 0));
  const byChat = new Map(todo.map((w) => [w.chat.id, w]));
  writeState(ctx, 'inbox', {
    generated_at: new Date(ctx.now()).toISOString(),
    chats: Object.fromEntries(threads.map((t) => {
      const w = byChat.get(t.chat_id);
      return [t.chat_id, { external_id: t.external_id, prospect_id: t.prospect_id, public_id: t.public_id ?? w.publicId ?? null,
        provider_id: w.providerId, answered_text: w.last.text }];
    })),
  });

  ctx.out({
    generated_at: new Date(ctx.now()).toISOString(),
    closer_mode: cfg.closer_mode,
    reply_scope: cfg.reply_scope,
    offer: cfg.offer ?? '',
    offer_url: cfg.offer_url ?? '',
    booking_link: cfg.booking_link ?? '',
    tone_samples: cfg.tone_samples ?? [],
    classes: CLASSES,
    actions: DM_ACTIONS,
    result_row_shape: {
      chat_id: 'from the thread', external_id: 'from the thread', classification: CLASSES.join('|'),
      action: DM_ACTIONS.join('|'), body: 'the reply, only for action reply', reason: 'one line',
    },
    threads,
    skipped,
  });
  return 0;
}

// Marks the person behind an exported chat do_not_contact and returns their prospect id. A
// stranger (no prospect row) gets a do_not_contact row so their next message is not answered.
// Their identity is read live from the chat, never from the export file, and an existing row is
// only ever marked when it is unmistakably the same person.
async function applyDnc(ctx, exported, r) {
  const reason = r.reason || `asked to stop (${r.classification})`;
  if (exported.prospect_id != null) {
    await ctx.dnc.markDoNotContact(exported.prospect_id, reason);
    return exported.prospect_id;
  }
  const refuse = async (why) => {
    await ctx.alerts.alert('dnc_identity_conflict',
      `A stop request in chat ${r.chat_id} was not recorded: ${why}. Mark the person do-not-contact yourself.`);
    throw new Error(why);
  };
  const providerId = (await ctx.uni.chat(r.chat_id))?.attendee_provider_id;
  if (!providerId) return refuse('the live chat names no attendee');
  const livePub = (await ctx.uni.profile(providerId, accountId(ctx.cfg)))?.public_identifier;
  if (!livePub) return refuse('the profile has no public id');
  const publicId = String(livePub).toLowerCase();
  if (exported.public_id && exported.public_id !== publicId) {
    return refuse(`the export names ${exported.public_id} but the live chat is ${publicId}`);
  }
  const [inserted] = await ctx.db.insert('li_prospects', {
    public_id: publicId, unipile_provider_id: providerId, status: 'do_not_contact', dnc_reason: reason,
  }, { onConflict: 'public_id', ignoreDuplicates: true });
  if (inserted) return inserted.id;
  // A row with that public id already exists: same person only if it has no provider id yet or ours.
  const [existing] = await ctx.db.select('li_prospects', { public_id: publicId, select: 'id,public_id,status,unipile_provider_id' });
  if (!existing) return refuse(`could not store a do_not_contact row for ${publicId}`);
  if (existing.unipile_provider_id && existing.unipile_provider_id !== providerId) {
    return refuse(`${publicId} already belongs to a different LinkedIn account in your prospects`);
  }
  if (!existing.unipile_provider_id) await ctx.db.update('li_prospects', { id: existing.id, unipile_provider_id: null }, { unipile_provider_id: providerId });
  await ctx.dnc.markDoNotContact(existing.id, reason);
  return existing.id;
}

async function draftImport(ctx, file) {
  if (!file) throw new SetupError('usage: draft-import <file>');
  const { cfg, db, alerts } = ctx;
  const rows = readRows(file, 'drafts');
  const state = readState(ctx, 'inbox', 'inbox-export');
  const stored = [];
  const rejected = [];
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i] ?? {};
    const problems = [];
    const exported = r.chat_id ? state.chats?.[r.chat_id] : null;
    if (!r.chat_id) problems.push('chat_id is missing');
    else if (!exported) problems.push('this chat is not in the latest inbox-export; export again and draft from that');
    else if (String(r.external_id ?? '') !== String(exported.external_id)) {
      problems.push(`external_id must be their last message from the latest inbox-export (${exported.external_id})`);
    }
    if (!CLASSES.includes(r.classification)) problems.push(`classification must be one of ${CLASSES.join(', ')}`);
    if (!DM_ACTIONS.includes(r.action)) problems.push(`action must be one of ${DM_ACTIONS.join(', ')}`);
    if (r.action === 'reply') {
      problems.push(...replyProblems(ctx, r.body, {
        requireLink: PRICE_QUESTION_RE.test(exported?.answered_text ?? ''), label: `reply in chat ${r.chat_id}` }));
    }
    // The prospect comes from the saved export, never from the row.
    const prospectId = exported?.prospect_id ?? null;
    let prospect = null;
    if (!problems.length && prospectId != null) {
      [prospect] = await db.select('li_prospects', { id: prospectId, select: 'id,public_id,status' });
      if (prospect?.status === 'do_not_contact' && r.action !== 'dnc') problems.push('prospect is do_not_contact; nothing may be drafted');
    }
    if (!problems.length && r.action === 'dnc') {
      problems.push(...await dncLiveProblems(ctx, r.chat_id, r.external_id, prospectId));
    }
    if (problems.length) {
      rejected.push({ row: i, chat_id: r.chat_id ?? null, problems });
      continue;
    }

    const who = prospect?.public_id ?? `chat ${r.chat_id}`;
    let status = 'dropped';
    let body = '';
    if (r.action === 'reply') {
      body = r.body.trim();
      status = prospectId == null && cfg.reply_scope !== 'all' ? 'escalated' : 'draft';
    } else if (r.action === 'escalate') {
      status = 'escalated';
    }

    // do_not_contact is applied BEFORE the row is stored: if it fails, nothing is stored and the
    // thread is offered again next export, so a stop request can never be lost behind a row.
    let rowProspectId = prospectId;
    if (r.action === 'dnc') {
      try {
        rowProspectId = await applyDnc(ctx, exported, r);
      } catch (err) {
        if (isAuthError(err)) throw err;
        rejected.push({ row: i, chat_id: r.chat_id, problems: [`could not mark do_not_contact (${err.message}); nothing stored, so it comes back in the next export`] });
        continue;
      }
    }

    const row = {
      prospect_id: rowProspectId, kind: 'reply', external_id: String(r.external_id),
      target_id: String(r.chat_id), body, status,
      meta: { classification: r.classification, action: r.action, reason: r.reason ?? null, not_from_campaign: prospectId == null },
    };
    try {
      await db.insert('li_messages', row);
    } catch (err) {
      if (isAuthError(err)) throw err;
      if (err.status === 409 && r.action === 'dnc') {
        // A row from an earlier import exists; do_not_contact was still applied just above.
        stored.push({ row: i, chat_id: r.chat_id, action: r.action, status: 'dropped', note: 'row already existed; do_not_contact applied' });
        continue;
      }
      if (err.status === 409) {
        rejected.push({ row: i, chat_id: r.chat_id, problems: ['a row for this message already exists'] });
        continue;
      }
      throw err;
    }

    if (r.action === 'escalate') {
      await alerts.alert('escalation', `${who} needs a human reply (${r.classification}): ${r.reason || 'no reason given'}`, prospectId);
    } else if (status === 'escalated') {
      await alerts.alert('unmatched_chat',
        `${who} is not from your campaign, so the reply was drafted but not sent (reply_scope is campaign_only). `
        + `Send it yourself if it fits: "${body}"`, null);
    }
    stored.push({ row: i, chat_id: r.chat_id, action: r.action, status });
  }
  ctx.out({ stored, rejected });
  return rejected.length ? 1 : 0;
}

// Claims one draft under the atomic daily cap, sends it, and records the outcome. Returns
// 'sent'; 'unconfirmed' (no clear answer: it may have gone out, so it stays in sending and is
// never retried); 'next' (move on); or 'stop' (end this pass: cap reached, or Unipile is
// throttling or restricting the account).
async function claimAndSend(ctx, m, cap, label, send, report) {
  const { db, alerts } = ctx;
  const claim = await db.rpc('claim_send', { p_id: m.id, p_daily_cap: cap });
  if (claim === 'cap') {
    report.skipped.push({ id: m.id, reason: `daily cap of ${cap} reached` });
    return 'stop';
  }
  if (claim === 'dropped') {
    report.dropped.push({ id: m.id, reason: 'do_not_contact' });
    return 'next';
  }
  if (claim !== 'claimed') {
    report.skipped.push({ id: m.id, reason: 'claimed by another pass' });
    return 'next';
  }
  try {
    await send();
  } catch (err) {
    const status = err?.status;
    if (isAuthError(err) || status === 429 || status === 403) {
      // Not this message's fault: hand the claim back without spending an attempt.
      await db.update('li_messages', { id: m.id, status: 'sending' }, { status: 'draft', attempts: m.attempts ?? 0, claimed_at: null });
      if (isAuthError(err)) throw err;
      await alerts.alert('unipile_throttled',
        `Unipile answered ${status} to ${label}, a rate limit or an account restriction. Sending stopped for this pass; `
        + 'the drafts wait for the next one.');
      report.stopped = `Unipile answered ${status}`;
      return 'stop';
    }
    if (err?.name === 'UnipileError' && status >= 400 && status < 500) {
      const st = await db.rpc('finish_message', { p_id: m.id, p_outcome: 'error' });
      if (st === 'failed') {
        await alerts.alert('send_failed', `${label} failed 3 times and is given up: ${err.message}`, m.prospect_id);
        report.failed.push({ id: m.id, error: err.message });
      } else {
        report.retry.push({ id: m.id, error: err.message });
      }
      return 'next';
    }
    // A 5xx or no response at all: the message may have gone out. It stays in 'sending' and
    // expire_stuck_sends turns it into failed with an alert; it is never re-sent.
    await alerts.alert('send_unconfirmed',
      `${label} got no clear answer from Unipile (${err.message}). It will not be retried; check LinkedIn to see whether it went out.`,
      m.prospect_id);
    report.unconfirmed.push({ id: m.id, error: err.message });
    return 'unconfirmed';
  }
  await db.rpc('finish_message', { p_id: m.id, p_outcome: 'sent' });
  await db.update('li_messages', { id: m.id }, { sent_via: 'unipile' });
  return 'sent';
}

async function sendReplies(ctx) {
  const { cfg, db, uni, alerts } = ctx;
  if (cfg.closer_mode === 'draft_only') {
    ctx.out({ closer_mode: 'draft_only', sent: 0, note: 'closer_mode is draft_only: drafts are stored, nothing is sent' });
    return 0;
  }
  const report = { sent: [], dropped: [], escalated: [], retry: [], failed: [], unconfirmed: [], skipped: [] };
  report.expired = await expireStuck(ctx);
  const drafts = await db.select('li_messages', 'kind=eq.reply&status=eq.draft&order=id.asc');
  if (!drafts.length) {
    ctx.out(report);
    return 0;
  }
  await uni.assertAccountHealthy(accountId(cfg));
  const cap = cfg.closer_replies_per_day;
  let used = Number(await db.rpc('daily_count', { p_kind: 'reply' })) || 0;
  report.cap = { limit: cap, used_before: used };
  const liveCache = new Map();
  const identityCache = new Map();

  for (const m of drafts) {
    if (used >= cap) {
      report.skipped.push({ id: m.id, reason: `daily cap of ${cap} replies reached` });
      continue;
    }
    // Re-derive who this chat belongs to from the live chat; a stored prospect_id is never trusted.
    let ident = identityCache.get(m.target_id);
    if (!ident) {
      try {
        ident = await liveIdentity(ctx, m.target_id);
      } catch (err) {
        if (isAuthError(err)) throw err;
        ident = { error: err.message };
      }
      identityCache.set(m.target_id, ident);
    }
    if (ident.error || !sameId(ident.prospect?.id, m.prospect_id)) {
      const why = ident.error
        ? `could not confirm who chat ${m.target_id} belongs to (${ident.error})`
        : `chat ${m.target_id} belongs to ${ident.prospect ? `prospect ${ident.prospect.id}` : 'no prospect'}, not the one this draft names`;
      await setStatus(ctx, m, 'draft', 'escalated', why);
      await alerts.alert('identity_check_failed', `Reply ${m.id} was not sent: ${why}. Check the chat yourself.`, m.prospect_id);
      report.escalated.push({ id: m.id, reason: why });
      continue;
    }
    const prospect = ident.prospect;
    if (uni.chatReplyDisabled(ident.chat)) {
      await setStatus(ctx, m, 'draft', 'dropped', uni.chatReplyDisabledReason(ident.chat));
      report.dropped.push({ id: m.id, reason: uni.chatReplyDisabledReason(ident.chat) });
      continue;
    }
    if (prospect && prospect.status === 'do_not_contact') {
      await setStatus(ctx, m, 'draft', 'dropped', 'do_not_contact');
      report.dropped.push({ id: m.id, reason: 'do_not_contact' });
      continue;
    }
    if (!prospect && cfg.reply_scope !== 'all') {
      await setStatus(ctx, m, 'draft', 'escalated', 'not_from_campaign');
      await alerts.alert('unmatched_chat',
        `Chat ${m.target_id} is not from your campaign, so this reply was not sent (reply_scope is campaign_only). `
        + `Send it yourself if it fits: "${m.body}"`, null);
      report.escalated.push({ id: m.id, reason: 'not_from_campaign' });
      continue;
    }
    if (prospect && Number(await db.rpc('unanswered_streak', { p_prospect: prospect.id })) >= 2) {
      await setStatus(ctx, m, 'draft', 'dropped', 'two messages from us are already unanswered');
      report.dropped.push({ id: m.id, reason: 'two messages from us are already unanswered' });
      continue;
    }

    // Re-read the live chat right before sending.
    if (!liveCache.has(m.target_id)) liveCache.set(m.target_id, await uni.messages(m.target_id));
    const live = liveCache.get(m.target_id);
    const idx = live.findIndex((x) => x.id === m.external_id);
    const after = idx === -1 ? [] : live.slice(idx + 1);
    if (idx === -1) {
      await setStatus(ctx, m, 'draft', 'dropped', 'the message being answered is no longer in the live chat');
      report.dropped.push({ id: m.id, reason: 'the message being answered is no longer in the live chat' });
      continue;
    }
    if (after.some((x) => x.from === 'us')) {
      await setStatus(ctx, m, 'draft', 'dropped', 'a newer message from us is already in the chat');
      report.dropped.push({ id: m.id, reason: 'a newer message from us is already in the chat' });
      continue;
    }
    if (after.some((x) => x.from === 'them')) {
      await setStatus(ctx, m, 'draft', 'dropped', 'they wrote again since the draft');
      report.dropped.push({ id: m.id, reason: 'they wrote again since the draft', redraft: true });
      continue;
    }
    const answered = live[idx].text;
    const backstop = BOT_RE.test(answered) ? 'asks whether this is a bot'
      : LEGAL_RE.test(answered) ? 'mentions something legal'
        : STOP_RE.test(answered) ? 'reads like a request to stop' : null;
    if (backstop) {
      await setStatus(ctx, m, 'draft', 'escalated', backstop);
      await alerts.alert('escalation', `${prospect?.public_id ?? `Chat ${m.target_id}`} ${backstop}, so no reply was sent: "${clip(answered)}"`, m.prospect_id);
      report.escalated.push({ id: m.id, reason: backstop });
      continue;
    }
    const problems = replyProblems(ctx, m.body, { requireLink: PRICE_QUESTION_RE.test(answered), label: `reply ${m.id}` });
    if (problems.length) {
      await setStatus(ctx, m, 'draft', 'dropped', problems.join('; '));
      await alerts.alert('invalid_draft', `Reply ${m.id} was not sent: ${problems.join('; ')}`, m.prospect_id);
      report.dropped.push({ id: m.id, reason: problems.join('; ') });
      continue;
    }

    const outcome = await claimAndSend(ctx, m, cap, `reply ${m.id} to chat ${m.target_id}`,
      () => uni.sendMessage(m.target_id, m.body), report);
    if (outcome === 'stop') break;
    if (outcome === 'sent' || outcome === 'unconfirmed') used++;
    if (outcome === 'sent') report.sent.push({ id: m.id, chat_id: m.target_id });
  }
  ctx.out(report);
  return 0;
}

// ---------------------------------------------------------------- comments

// UNVERIFIED comment shapes: Unipile's comment objects are read for an author id under
// author_details.id / author_id and a parent under parent_id / parent_comment_id / reply_to.
// Build step 10 confirms these on the test account.
const authorIdOf = (c) => c?.author_details?.id ?? c?.author_id ?? c?.author?.id ?? null;
// UNVERIFIED too: the author's public id, from author_details.public_identifier or the /in/ slug
// of author_details.profile_url.
const authorPublicIdOf = (c) => {
  const direct = c?.author_details?.public_identifier ?? c?.author_details?.public_id;
  if (direct) return String(direct).toLowerCase();
  const m = String(c?.author_details?.profile_url ?? '').match(/linkedin\.com\/in\/([^/?#]+)/i);
  return m ? decodeURIComponent(m[1]).toLowerCase() : null;
};
const parentIdOf = (c) => c?.parent_id ?? c?.parent_comment_id ?? c?.reply_to ?? c?.in_reply_to ?? null;

// Ours if any of the author's ids (provider id, member id, public identifier, profile slug)
// is one of our own.
function isMine(ctx, c, mine) {
  const a = c?.author_details ?? {};
  return ctx.uni.isSelf({
    provider_id: authorIdOf(c), member_id: a.member_id, public_identifier: authorPublicIdOf(c), profile_url: a.profile_url,
  }, mine);
}

// Do-not-contact for a comment is decided from the live author, by provider id and by public id,
// never from the prospect_id stored with the draft.
async function authorIsDoNotContact(ctx, c) {
  const checks = [['unipile_provider_id', authorIdOf(c)], ['public_id', authorPublicIdOf(c)]].filter(([, v]) => v);
  for (const [col, value] of checks) {
    const rows = await ctx.db.select('li_prospects', { [col]: value, status: 'do_not_contact', select: 'id' });
    if (rows.length) return true;
  }
  return false;
}

function commentAnswered(ctx, c, all, mine) {
  return all.some((x) => parentIdOf(x) === c.id && isMine(ctx, x, mine))
    || (c.replies ?? []).some((r) => isMine(ctx, r, mine));
}

// The comment shapes are unverified, so this fails closed: with no id for our own account nothing
// can tell our replies from theirs, and a post holding any comment without an author id is left
// alone, each with an alert. Either would otherwise answer the same comment again every pass.
async function readOwnComments(ctx) {
  const acct = accountId(ctx.cfg);
  const { me, posts } = await ctx.uni.listOwnPosts(acct, { limit: OWN_POSTS_CHECKED });
  const mine = ctx.uni.selfIds(me);
  const byComment = new Map();
  const perPost = [];
  const skippedPosts = new Set();
  if (!mine.size) {
    await ctx.alerts.alert('comment_shape_unknown',
      'Unipile returned no id for your own LinkedIn account, so your replies cannot be told apart from other '
      + 'comments. No comment was exported or answered this pass.');
    return { mine, perPost, byComment, skippedPosts, blocked: true };
  }
  for (const post of posts) {
    const urn = post.social_id;
    if (!urn) continue;
    const comments = await ctx.uni.postComments(urn, acct);
    if (comments.some((c) => !authorIdOf(c) && !authorPublicIdOf(c))) {
      await ctx.alerts.alert('comment_shape_unknown',
        `A comment on your post ${urn} has no author id, so nothing on that post was exported or answered this pass.`);
      skippedPosts.add(urn);
      continue;
    }
    perPost.push({ post, urn, comments });
    for (const c of comments) byComment.set(c.id, { post, urn, comment: c, comments });
  }
  return { mine, perPost, byComment, skippedPosts, blocked: false };
}

async function commentsExport(ctx) {
  const { cfg, db, uni } = ctx;
  await uni.assertAccountHealthy(accountId(cfg));
  const { mine, perPost } = await readOwnComments(ctx);
  const candidates = [];
  for (const { post, urn, comments } of perPost) {
    for (const c of comments) {
      if (parentIdOf(c) || isMine(ctx, c, mine) || commentAnswered(ctx, c, comments, mine)) continue;
      candidates.push({ post, urn, c });
    }
  }
  const handled = new Set();
  if (candidates.length) {
    const rows = await db.select('li_messages',
      `kind=eq.comment_reply&external_id=${ctx.db.inList(candidates.map((x) => x.c.id))}&select=external_id`);
    for (const r of rows) handled.add(r.external_id);
  }
  // Matched by provider id and by public id, so a do_not_contact prospect is caught either way.
  const authorIds = [...new Set(candidates.map((x) => authorIdOf(x.c)).filter(Boolean))];
  const publicIds = [...new Set(candidates.map((x) => authorPublicIdOf(x.c)).filter(Boolean))];
  const byProvider = new Map();
  const byPublic = new Map();
  const cols = 'select=id,public_id,status,unipile_provider_id';
  if (authorIds.length) {
    for (const p of await db.select('li_prospects', `unipile_provider_id=${ctx.db.inList(authorIds)}&${cols}`)) byProvider.set(p.unipile_provider_id, p);
  }
  if (publicIds.length) {
    for (const p of await db.select('li_prospects', `public_id=${ctx.db.inList(publicIds)}&${cols}`)) byPublic.set(p.public_id, p);
  }
  const comments = [];
  const skipped = [];
  for (const { post, urn, c } of candidates) {
    if (handled.has(c.id)) continue;
    const viaProvider = byProvider.get(authorIdOf(c)) ?? null;
    const viaPublic = byPublic.get(authorPublicIdOf(c)) ?? null;
    const p = viaProvider ?? viaPublic;
    if (viaProvider?.status === 'do_not_contact' || viaPublic?.status === 'do_not_contact') {
      skipped.push({ comment_id: c.id, reason: 'do_not_contact' });
      continue;
    }
    comments.push({
      comment_id: c.id,
      post_id: urn,
      post_excerpt: clip(post.text, 200),
      author_name: c.author_details?.name ?? c.author ?? null,
      author_headline: c.author_details?.headline ?? null,
      prospect_id: p?.id ?? null,
      at: c.date ?? c.timestamp ?? null,
      text: c.text ?? '',
    });
  }
  comments.sort((a, b) => String(a.at ?? '').localeCompare(String(b.at ?? '')));
  writeState(ctx, 'comments', {
    generated_at: new Date(ctx.now()).toISOString(),
    comments: Object.fromEntries(comments.map((c) => [c.comment_id, { post_id: c.post_id, prospect_id: c.prospect_id }])),
  });
  ctx.out({
    generated_at: new Date(ctx.now()).toISOString(),
    closer_mode: cfg.closer_mode,
    actions: COMMENT_ACTIONS,
    rules: 'Public replies are engagement only: no link, no offer, no price, no DM ask, at most 250 characters. '
      + 'A complaint, criticism or pointed question about your company is action "skip" with a reason, and no reply.',
    result_row_shape: { comment_id: 'from the export', post_id: 'from the export',
      action: COMMENT_ACTIONS.join('|'), body: 'the reply, only for action reply', reason: 'one line' },
    comments,
    skipped,
  });
  return 0;
}

async function commentsImport(ctx, file) {
  if (!file) throw new SetupError('usage: comments-import <file>');
  const { cfg, db, alerts } = ctx;
  const rows = readRows(file, 'replies');
  const state = readState(ctx, 'comments', 'comments-export');
  const stored = [];
  const rejected = [];
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i] ?? {};
    const problems = [];
    const exported = r.comment_id ? state.comments?.[r.comment_id] : null;
    if (!r.comment_id) problems.push('comment_id is missing');
    else if (!exported) problems.push('this comment is not in the latest comments-export; export again and draft from that');
    else if (String(r.post_id ?? '') !== String(exported.post_id)) problems.push(`post_id must be ${exported.post_id}, as in the export`);
    if (!COMMENT_ACTIONS.includes(r.action)) problems.push(`action must be one of ${COMMENT_ACTIONS.join(', ')}`);
    if (r.action === 'reply') problems.push(...commentProblems(ctx, r.body, `comment reply to ${r.comment_id}`));
    if (problems.length) {
      rejected.push({ row: i, comment_id: r.comment_id ?? null, problems });
      continue;
    }
    const prospectId = exported.prospect_id ?? null;
    const status = r.action === 'reply' ? 'draft' : 'escalated';
    try {
      await db.insert('li_messages', {
        prospect_id: prospectId, kind: 'comment_reply', external_id: String(r.comment_id),
        target_id: String(exported.post_id), body: r.action === 'reply' ? r.body.trim() : '', status,
        meta: { action: r.action, reason: r.reason ?? null },
      });
    } catch (err) {
      if (isAuthError(err)) throw err;
      if (err.status === 409) {
        rejected.push({ row: i, comment_id: r.comment_id, problems: ['a row for this comment already exists'] });
        continue;
      }
      throw err;
    }
    if (r.action === 'skip') {
      await alerts.alert('comment_skipped',
        `A comment on your post ${exported.post_id} got no public reply: ${r.reason || 'no reason given'}. Reply yourself if it needs one.`,
        prospectId);
    }
    stored.push({ row: i, comment_id: r.comment_id, action: r.action, status });
  }
  ctx.out({ stored, rejected });
  return rejected.length ? 1 : 0;
}

async function commentsPost(ctx) {
  const { cfg, db, uni, alerts } = ctx;
  if (cfg.closer_mode === 'draft_only') {
    ctx.out({ closer_mode: 'draft_only', posted: 0, note: 'closer_mode is draft_only: comment replies are stored, nothing is posted' });
    return 0;
  }
  const report = { posted: [], dropped: [], escalated: [], retry: [], failed: [], unconfirmed: [], skipped: [] };
  report.expired = await expireStuck(ctx);
  const drafts = await db.select('li_messages', 'kind=eq.comment_reply&status=eq.draft&order=id.asc');
  if (!drafts.length) {
    ctx.out(report);
    return 0;
  }
  const acct = accountId(cfg);
  await uni.assertAccountHealthy(acct);
  const cap = cfg.comment_replies_per_day;
  let used = Number(await db.rpc('daily_count', { p_kind: 'comment_reply' })) || 0;
  report.cap = { limit: cap, used_before: used };
  const live = await readOwnComments(ctx);
  if (live.blocked) {
    ctx.out({ ...report, stopped: 'own account id unknown' });
    return 0;
  }

  for (const m of drafts) {
    if (used >= cap) {
      report.skipped.push({ id: m.id, reason: `daily cap of ${cap} comment replies reached` });
      continue;
    }
    const found = live.byComment.get(m.external_id);
    if (!found && live.skippedPosts.has(m.target_id)) {
      report.skipped.push({ id: m.id, reason: 'its post was skipped this pass (a comment without an author id)' });
      continue;
    }
    if (!found) {
      await setStatus(ctx, m, 'draft', 'dropped', 'the comment is no longer on your recent posts');
      report.dropped.push({ id: m.id, reason: 'the comment is no longer on your recent posts' });
      continue;
    }
    if (commentAnswered(ctx, found.comment, found.comments, live.mine)) {
      await setStatus(ctx, m, 'draft', 'dropped', 'already answered');
      report.dropped.push({ id: m.id, reason: 'already answered' });
      continue;
    }
    if (await authorIsDoNotContact(ctx, found.comment)) {
      await setStatus(ctx, m, 'draft', 'dropped', 'do_not_contact');
      report.dropped.push({ id: m.id, reason: 'do_not_contact' });
      continue;
    }
    const text = found.comment.text ?? '';
    const problems = commentProblems(ctx, m.body, `comment reply ${m.id}`);
    if (COMPLAINT_RE.test(text) || LEGAL_RE.test(text) || problems.length) {
      const why = problems.length ? problems.join('; ') : 'the comment reads as a complaint';
      await setStatus(ctx, m, 'draft', 'escalated', why);
      await alerts.alert('comment_complaint',
        `No public reply was posted to a comment on ${found.urn} (${why}): "${clip(text)}". Reply yourself.`, m.prospect_id);
      report.escalated.push({ id: m.id, reason: why });
      continue;
    }

    const outcome = await claimAndSend(ctx, m, cap, `comment reply ${m.id} on ${found.urn}`,
      () => uni.postComment(found.urn, m.body, acct, { commentId: m.external_id }), report);
    if (outcome === 'stop') break;
    if (outcome === 'sent' || outcome === 'unconfirmed') used++;
    if (outcome === 'sent') report.posted.push({ id: m.id, post_urn: found.urn });
  }
  ctx.out(report);
  return 0;
}

// ---------------------------------------------------------------- the rest

const normalizePublicId = (v) => String(v).trim().toLowerCase().replace(/^.*linkedin\.com\/in\//, '').replace(/[/?#].*$/, '');

async function booked(ctx, publicId) {
  if (!publicId) throw new SetupError('usage: booked <public_id>');
  const id = normalizePublicId(publicId);
  const [p] = await ctx.db.select('li_prospects', { public_id: id, select: 'id,public_id,status' });
  if (!p) throw new SetupError(`no prospect with public id ${id}`);
  if (p.status === 'do_not_contact') throw new SetupError(`${id} is do_not_contact; not changed`);
  await ctx.db.update('li_prospects', { id: p.id }, { status: 'meeting_booked' });
  ctx.out({ public_id: id, status: 'meeting_booked' });
  return 0;
}

// The hourly pass. find-creators and scrape-commenters spend money and are never in it; booked
// is only ever marked by the user.
// alerts            open alerts were already printed by main()
// alerts resolve <id>  mark one alert handled, once the user says it is
async function alertsCmd(ctx, sub, id) {
  if (sub === undefined) return 0;
  if (sub !== 'resolve' || !/^\d+$/.test(String(id ?? ''))) throw new SetupError('usage: alerts [resolve <id>]');
  const row = await ctx.alerts.resolveAlert(Number(id));
  if (!row) throw new SetupError(`no open alert with id ${id}`);
  ctx.out({ resolved: Number(id) });
  return 0;
}

// note <public_id> <text>: a reminder for the user on the needs-you list, such as "they booked,
// check your calendar". It never changes the prospect.
async function note(ctx, publicId, ...words) {
  const text = words.join(' ').trim();
  if (!publicId || !text) throw new SetupError('usage: note <public_id> <text>');
  const id = normalizePublicId(publicId);
  const [p] = await ctx.db.select('li_prospects', { public_id: id, select: 'id,public_id' });
  await ctx.alerts.alert('note', `${id}: ${text}`, p?.id ?? null);
  ctx.out({ noted: id, prospect_id: p?.id ?? null });
  return 0;
}

export function stageList() {
  const P = `node "${path.join(PROSPECTOR_DIR, 'scripts', 'prospector.mjs')}"`;
  const C = `node "${path.join(HERE, 'closer.mjs')}"`;
  return [
    { stage: 'prospector sync', commands: [`${P} sync`] },
    { stage: 'prospector qualify', commands: [`${P} qualify-export`, `${P} qualify-import <file>`] },
    { stage: 'prospector write', commands: [`${P} write-export`, `${P} write-import <file>`] },
    { stage: 'prospector push', commands: [`${P} push`] },
    { stage: 'closer inbox', commands: [`${C} inbox-export`, `${C} draft-import <file>`, `${C} send`] },
    { stage: 'closer comments', commands: [`${C} comments-export`, `${C} comments-import <file>`, `${C} comments-post`] },
  ];
}

// Prints one stage per line, then the rules, as plain text.
async function runBegin(ctx) {
  if (!(await ctx.lock.acquire('run'))) {
    const h = ctx.lock.holder('run');
    ctx.err(`A run is already active (pid ${h?.pid ?? 'unknown'}, started ${h?.startedAt ?? 'at an unknown time'}). `
      + 'This pass stops here. Do not delete the lock; a stale one is replaced on its own after 2 hours.\n');
    return 1;
  }
  const C = `node "${path.join(HERE, 'closer.mjs')}"`;
  const lines = stageList().map((s, i) => `${i + 1}. ${s.stage}: ${s.commands.join(' ; then ')}`);
  ctx.write([
    ...lines,
    '',
    'A command that exits 1: note it and go on to the next stage.',
    `A command that exits 2 (auth failure): skip every remaining stage and run ${C} run-end.`,
    `Always finish with ${C} run-end.`,
  ].join('\n') + '\n');
  return 0;
}

async function runEnd(ctx) {
  const removed = ctx.lock.release('run');
  ctx.out({ lock: removed ? 'released' : 'was not held' });
  return 0;
}

async function setupCheck(ctx) {
  const { cfg, db, uni, config } = ctx;
  config.requireEnv('SUPABASE_URL', 'SUPABASE_SERVICE_KEY', 'UNIPILE_DSN', 'UNIPILE_API_KEY');
  const acct = await uni.assertAccountHealthy(accountId(cfg));
  await db.select('li_messages', { select: 'id', limit: 1 });
  await db.rpc('daily_count', { p_kind: 'reply' });
  ctx.out({
    ok: true,
    prospector: PROSPECTOR_DIR,
    unipile_account: acct.name ?? acct.id,
    closer_mode: cfg.closer_mode,
    reply_scope: cfg.reply_scope,
    warning: cfg.reply_scope === 'all'
      ? 'reply_scope is all: everyone in your inbox gets automatic replies, including customers and friends.'
      : undefined,
  });
  return 0;
}

const COMMANDS = {
  'setup-check': setupCheck,
  'inbox-export': inboxExport,
  'draft-import': draftImport,
  send: sendReplies,
  'comments-export': commentsExport,
  'comments-import': commentsImport,
  'comments-post': commentsPost,
  booked,
  alerts: alertsCmd,
  note,
  'run-begin': runBegin,
  'run-end': runEnd,
};
const NO_CONFIG = new Set(['alerts', 'note', 'run-begin', 'run-end']);

/**
 * Runs one command and resolves to its exit code. deps overrides any library module
 * ({ db, alerts, dnc, uni, lock, config }) plus cfg, now, out and err; tests use this.
 */
export async function main(argv, deps = {}) {
  const err = deps.err ?? ((s) => process.stderr.write(s));
  const [cmd, ...rest] = argv;
  if (!cmd || !COMMANDS[cmd]) {
    err(`usage: closer.mjs <${Object.keys(COMMANDS).join('|')}>\n`);
    return 1;
  }
  let outFile = null;
  const args = [];
  for (let i = 0; i < rest.length; i++) {
    if (rest[i] === '--out') outFile = rest[++i];
    else args.push(rest[i]);
  }

  let ctx;
  try {
    const lib = deps.lib ?? await loadLib();
    ctx = {
      ...lib,
      ...deps,
      now: deps.now ?? (() => Date.now()),
      err,
      write: deps.write ?? ((text) => process.stdout.write(text)),
      out: deps.out ?? ((obj) => {
        const text = JSON.stringify(obj, null, 2) + '\n';
        if (outFile) fs.writeFileSync(outFile, text);
        else process.stdout.write(text);
      }),
    };
    await ctx.alerts.printOpenAlerts();
    if (!NO_CONFIG.has(cmd)) ctx.cfg = deps.cfg ?? ctx.config.loadConfig();
    return await COMMANDS[cmd](ctx, ...args);
  } catch (e) {
    if (isAuthError(e)) {
      err(`Stopped: ${e.message}. Nothing more is sent this pass. Reconnect the account, then run again.\n`);
      try {
        await ctx?.alerts?.alert('auth_failed', `${cmd} stopped the pass: ${e.message}. Reconnect the account in Unipile or fix the key in .env.`);
      } catch {
        // the alert path is best effort; the exit code still stops the pass
      }
      return 2;
    }
    if (e instanceof SetupError || e?.name === 'ConfigError') {
      err(`${e.message}\n`);
      return 1;
    }
    err(`${cmd} failed: ${e?.message ?? e}\n`);
    return 1;
  }
}

// Compared by real path: a symlinked skills folder or /tmp -> /private/tmp must still run.
const realpath = (p) => {
  try {
    return fs.realpathSync(p);
  } catch {
    return path.resolve(p);
  }
};
const isMain = process.argv[1] && realpath(process.argv[1]) === realpath(fileURLToPath(import.meta.url));
if (isMain) {
  process.exitCode = await main(process.argv.slice(2));
}
