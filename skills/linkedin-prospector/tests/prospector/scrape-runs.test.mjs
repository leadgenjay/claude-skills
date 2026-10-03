// scrape-commenters against the actors' real input limits (live input schemas, 2026-10-03):
// post-search takes at most 10 authorUrls per run; post-comments reads input maxItems per post.
// Plus: a run start Apify refuses with a 4xx costs nothing.
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeHome, run, rx, reqs, bodyOf, APIFY } from './helpers.mjs';
import { AUTHOR_URLS_PER_RUN } from '../../scripts/prospector.mjs';

const SEARCH = 'harvestapi~linkedin-post-search';
const COMMENTS = 'harvestapi~linkedin-post-comments';

const creator = (n) => ({ id: n, profile_url: `https://www.linkedin.com/in/c${n}`, name: `C${n}` });
const post = (n, k, comments = k) => ({
  linkedinUrl: `https://www.linkedin.com/posts/c${n}-${k}`, author: { publicIdentifier: `c${n}` }, engagement: { likes: 1, comments },
});
const comment = (postUrl, slug) => ({ postUrl, commentary: 'Nice', actor: { publicIdentifier: slug, linkedinUrl: `https://www.linkedin.com/in/${slug}` } });

// One Apify run that matches only once, so consecutive runs of the same actor get their own items.
const oneRun = (actor, runId, items) => [
  { method: 'POST', urlPattern: rx(`${APIFY}/acts/${actor}/runs?`), times: 1, status: 201, body: { data: { id: runId, status: 'READY', defaultDatasetId: `ds-${runId}` } } },
  { method: 'GET', urlPattern: rx(`${APIFY}/actor-runs/${runId}?`), body: { data: { id: runId, status: 'SUCCEEDED', usageTotalUsd: 0, defaultDatasetId: `ds-${runId}` } } },
  { method: 'GET', urlPattern: rx(`${APIFY}/datasets/ds-${runId}/items`), body: items },
];
const reserveOk = { method: 'POST', urlPattern: rx('/rest/v1/rpc/reserve_spend'), body: { ok: true, run_id: 1 } };
const db = [
  { method: 'POST', urlPattern: rx('/rest/v1/rpc/settle_spend'), body: null },
  { method: 'POST', urlPattern: rx('/rest/v1/li_posts'), body: [] },
  { method: 'POST', urlPattern: rx('/rest/v1/li_prospects'), body: [{ id: 1 }] },
];
const creatorsGet = (list) => ({ method: 'GET', urlPattern: rx('/rest/v1/li_creators?', 'status=eq.approved'), body: list });
const runsOf = (log, actor) => reqs(log, 'POST', `/acts/${actor}/runs?`);

test('46 creators: stage 1 is 5 runs of at most 10 authorUrls, each capped at its own chunk', () => {
  assert.equal(AUTHOR_URLS_PER_RUN, 10);
  const creators = Array.from({ length: 46 }, (_, i) => creator(i + 1));
  const chunkRuns = [0, 1, 2, 3, 4].flatMap((c) => oneRun(SEARCH, `s${c}`,
    creators.slice(c * 10, c * 10 + 10).map((cr) => post(cr.id, 1))));
  const res = run(makeHome({ posts_per_creator: 2, top_posts: 2, comments_per_post: 5 }), ['scrape-commenters'], [
    creatorsGet(creators), reserveOk, ...db, ...chunkRuns,
    ...oneRun(COMMENTS, 'k1', [comment('https://www.linkedin.com/posts/c1-1', 'dana')]),
  ]);
  assert.equal(res.status, 0, res.stderr);
  const starts = runsOf(res.log, SEARCH);
  assert.deepEqual(starts.map((e) => bodyOf(e).authorUrls.length), [10, 10, 10, 10, 6]);
  assert.ok(starts.every((e) => bodyOf(e).authorUrls.length <= AUTHOR_URLS_PER_RUN));
  assert.deepEqual(starts.flatMap((e) => bodyOf(e).authorUrls), creators.map((c) => c.profile_url), 'every creator once, in order');
  assert.deepEqual(starts.map((e) => new URL(e.url).searchParams.get('maxItems')), ['20', '20', '20', '20', '12']);
  assert.deepEqual(reqs(res.log, 'POST', 'rpc/reserve_spend').map(bodyOf).map((r) => r.p_units), [20, 20, 20, 20, 12, 10]);
  assert.equal(runsOf(res.log, COMMENTS).length, 1);
});

test('--dry-run says how many stage-1 runs there will be', () => {
  const res = run(makeHome(), ['scrape-commenters', '--dry-run'], [creatorsGet(Array.from({ length: 46 }, (_, i) => creator(i + 1)))]);
  assert.equal(res.status, 0, res.stderr);
  assert.match(res.stdout, /Stage 1 .*, in 5 run\(s\) of at most 10 creators/);
});

test('a cap refusal on chunk 3 stops stage 1, and comments are scraped from chunks 1-2', () => {
  const creators = Array.from({ length: 25 }, (_, i) => creator(i + 1));
  const res = run(makeHome({ posts_per_creator: 1, top_posts: 30, comments_per_post: 5 }), ['scrape-commenters'], [
    creatorsGet(creators),
    { ...reserveOk, times: 2 },
    { method: 'POST', urlPattern: rx('/rest/v1/rpc/reserve_spend'), times: 1, body: { ok: false, reason: 'total_cap', run_id: 3, spent_usd: 24.99 } },
    reserveOk, ...db,
    ...oneRun(SEARCH, 's0', creators.slice(0, 10).map((c) => post(c.id, 1))),
    ...oneRun(SEARCH, 's1', creators.slice(10, 20).map((c) => post(c.id, 1))),
    ...oneRun(SEARCH, 's2', creators.slice(20).map((c) => post(c.id, 1))),
    ...oneRun(COMMENTS, 'k1', [comment('https://www.linkedin.com/posts/c3-1', 'erin')]),
  ]);
  assert.equal(res.status, 0, res.stderr);
  assert.equal(runsOf(res.log, SEARCH).length, 2, 'no third stage-1 run');
  assert.match(res.stdout, /Stage 1 stopped at run 3 of 3: the spend cap refused it/);
  assert.match(res.stderr, /total_cap_usd/);
  const scraped = bodyOf(runsOf(res.log, COMMENTS)[0]).posts;
  assert.equal(scraped.length, 20);
  assert.deepEqual([...scraped].sort(), creators.slice(0, 20).map((c) => `https://www.linkedin.com/posts/c${c.id}-1`).sort());
});

test('a cap refusal on the first chunk collects nothing and exits non-zero', () => {
  const res = run(makeHome(), ['scrape-commenters'], [
    creatorsGet([creator(1)]),
    { method: 'POST', urlPattern: rx('/rest/v1/rpc/reserve_spend'), body: { ok: false, reason: 'total_cap', run_id: 3, spent_usd: 24.99 } },
  ]);
  assert.notEqual(res.status, 0);
  assert.equal(res.log.filter((e) => /api\.apify\.com/.test(e.url)).length, 0);
});

test('stage 2: input maxItems is comments per post; the run URL caps the total', () => {
  const res = run(makeHome({ posts_per_creator: 3, top_posts: 3, comments_per_post: 7 }), ['scrape-commenters'], [
    creatorsGet([creator(1)]), reserveOk, ...db,
    ...oneRun(SEARCH, 's0', [post(1, 1, 30), post(1, 2, 20), post(1, 3, 10)]),
    ...oneRun(COMMENTS, 'k1', [comment('https://www.linkedin.com/posts/c1-1', 'dana')]),
  ]);
  assert.equal(res.status, 0, res.stderr);
  const [start] = runsOf(res.log, COMMENTS);
  assert.equal(bodyOf(start).maxItems, 7, 'per post');
  const q = new URL(start.url).searchParams;
  assert.equal(q.get('maxItems'), '21', 'total: 3 posts x 7');
  assert.equal(q.get('maxTotalChargeUsd'), '0.084');
  assert.equal(bodyOf(runsOf(res.log, SEARCH)[0]).maxItems, 3, 'post-search input keeps maxItems = units');
});

test('a run start refused with HTTP 400 settles at 0; a 500 settles at the estimate', () => {
  const startFails = (status) => run(makeHome(), ['find-creators'], [
    { method: 'POST', urlPattern: rx('/rest/v1/rpc/reserve_spend'), body: { ok: true, run_id: 31 } },
    { method: 'POST', urlPattern: rx('/rest/v1/rpc/settle_spend'), body: null },
    { method: 'POST', urlPattern: rx(`/acts/${SEARCH}/runs?`), status, body: { error: { type: 'invalid-input', message: 'authorUrls too long' } } },
  ]);
  const refused = startFails(400);
  assert.notEqual(refused.status, 0);
  const s400 = bodyOf(reqs(refused.log, 'POST', 'rpc/settle_spend')[0]);
  assert.equal(s400.p_actual, 0, 'no run exists, nothing charged');
  assert.match(s400.p_error, /HTTP 400/);

  const failed = startFails(500);
  const s500 = bodyOf(reqs(failed.log, 'POST', 'rpc/settle_spend')[0]);
  assert.equal(s500.p_actual, 0.0875, 'a run may exist: counts at the estimate');
});
