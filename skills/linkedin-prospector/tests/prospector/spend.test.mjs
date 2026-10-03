import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { makeHome, run, rx, reqs, bodyOf, APIFY } from './helpers.mjs';
import { estimateCost, unitsThatFit, COMMENT_WITH_PROFILE_PRICE_USD, POST_SEARCH_PRICE_PER_POST_USD } from '../../scripts/apify.mjs';

const apifyCalls = (log) => log.filter((e) => /api\.apify\.com/.test(e.url));

test('unit prices and the estimate match the plan example', () => {
  assert.equal(POST_SEARCH_PRICE_PER_POST_USD, 0.00175);
  assert.equal(COMMENT_WITH_PROFILE_PRICE_USD, 0.004);
  assert.equal(estimateCost(100, POST_SEARCH_PRICE_PER_POST_USD), 0.175);
  assert.equal(estimateCost(1800, COMMENT_WITH_PROFILE_PRICE_USD), 7.2);
  assert.equal(unitsThatFit(10, COMMENT_WITH_PROFILE_PRICE_USD), 2500);
});

test('over the per-run cap: refused, exit non-zero, no Apify request', () => {
  const home = makeHome({ niche_keywords: ['a', 'b'], per_run_cap_usd: 0.1 });
  const res = run(home, ['find-creators'], [
    { method: 'POST', urlPattern: rx('/rest/v1/rpc/reserve_spend'), body: { ok: false, reason: 'per_run_cap', run_id: 9, spent_usd: 0 } },
  ]);
  assert.notEqual(res.status, 0);
  assert.equal(apifyCalls(res.log).length, 0, 'no Apify call of any kind');
  const reserve = bodyOf(reqs(res.log, 'POST', 'rpc/reserve_spend')[0]);
  assert.equal(reserve.p_est, 0.175);
  assert.equal(reserve.p_per_run_cap, 0.1);
  assert.match(res.stderr, /Split it/);
});

test('over the total cap: refused, exit non-zero, no Apify request', () => {
  const home = makeHome();
  const res = run(home, ['scrape-commenters'], [
    { method: 'GET', urlPattern: rx('/rest/v1/li_creators?', 'status=eq.approved'), body: [{ id: 1, profile_url: 'https://www.linkedin.com/in/alice', name: 'Alice' }] },
    { method: 'POST', urlPattern: rx('/rest/v1/rpc/reserve_spend'), body: { ok: false, reason: 'total_cap', run_id: 10, spent_usd: 24.99 } },
  ]);
  assert.notEqual(res.status, 0);
  assert.equal(apifyCalls(res.log).length, 0);
  assert.match(res.stderr, /total_cap_usd/);
});

test('--dry-run prints the estimate and makes no reservation and no Apify call', () => {
  const home = makeHome();
  const res = run(home, ['scrape-commenters', '--dry-run'], [
    { method: 'GET', urlPattern: rx('/rest/v1/li_creators?', 'status=eq.approved'), body: [{ id: 1, profile_url: 'https://www.linkedin.com/in/alice' }] },
  ]);
  assert.equal(res.status, 0, res.stderr);
  assert.equal(apifyCalls(res.log).length, 0);
  assert.equal(reqs(res.log, 'POST', 'rpc/reserve_spend').length, 0);
  assert.match(res.stdout, /1800 units x \$0\.004 = \$7\.20/);
});

test('a failed Apify run is settled at its estimate', () => {
  const home = makeHome();
  const res = run(home, ['find-creators'], [
    { method: 'POST', urlPattern: rx('/rest/v1/rpc/reserve_spend'), body: { ok: true, run_id: 11 } },
    { method: 'POST', urlPattern: rx('/acts/harvestapi~linkedin-post-search/runs?'), status: 500, body: { error: 'boom' } },
    { method: 'POST', urlPattern: rx('/rest/v1/rpc/settle_spend'), body: null },
  ]);
  assert.notEqual(res.status, 0);
  const settle = bodyOf(reqs(res.log, 'POST', 'rpc/settle_spend')[0]);
  assert.equal(settle.p_run_id, 11);
  assert.equal(settle.p_actual, 0.0875);
  assert.match(settle.p_error, /HTTP 500/);
});

test('a run still going at the deadline is aborted by its own id, settled at the estimate, and not re-run', async () => {
  const home = makeHome();
  const mockFile = path.join(home, 'inproc-mock.json');
  const logFile = path.join(home, 'inproc-http.log');
  fs.writeFileSync(mockFile, JSON.stringify([
    { method: 'POST', urlPattern: rx('/rest/v1/rpc/reserve_spend'), body: { ok: true, run_id: 21 } },
    { method: 'POST', urlPattern: rx('/rest/v1/rpc/settle_spend'), body: null },
    { method: 'POST', urlPattern: rx(`${APIFY}/acts/harvestapi~linkedin-post-search/runs?`), status: 201, body: { data: { id: 'r9', status: 'RUNNING', defaultDatasetId: 'd9' } } },
    { method: 'GET', urlPattern: rx(`${APIFY}/actor-runs/r9?`), body: { data: { id: 'r9', status: 'RUNNING', usageTotalUsd: 0.01 } } },
    { method: 'POST', urlPattern: rx(`${APIFY}/actor-runs/r9/abort`), body: { data: { id: 'r9', status: 'ABORTING' } } },
  ]));
  Object.assign(process.env, {
    LINKEDIN_LEADGEN_HOME: home,
    LINKEDIN_LEADGEN_MOCK: mockFile,
    LINKEDIN_LEADGEN_HTTP_LOG: logFile,
    SUPABASE_URL: 'https://db.test',
    SUPABASE_SERVICE_KEY: 'test-service-key',
    APIFY_TOKEN: 'test-apify-token',
  });
  const { runActor } = await import('../../scripts/apify.mjs');
  await assert.rejects(
    runActor({ step: 't', actor: 'harvestapi~linkedin-post-search', input: {}, units: 100, unitPriceUsd: 0.00175, deadlineMs: 30, waitSecs: 0 }),
    /aborted/,
  );
  const log = fs.readFileSync(logFile, 'utf8').trim().split('\n').map((l) => JSON.parse(l));
  assert.equal(reqs(log, 'POST', 'actor-runs/r9/abort').length, 1, 'aborted by run id');
  assert.equal(reqs(log, 'POST', '/acts/').length, 1, 'never started a second run');
  assert.equal(reqs(log, 'GET', 'datasets/').length, 0);
  const settle = bodyOf(reqs(log, 'POST', 'rpc/settle_spend')[0]);
  assert.equal(settle.p_run_id, 21);
  assert.equal(settle.p_actual, 0.175, 'counts at the estimate');
  assert.match(settle.p_error, /aborted/);
});

test('a run that ends FAILED is settled from its own record and not re-run', () => {
  const home = makeHome();
  const res = run(home, ['find-creators'], [
    { method: 'POST', urlPattern: rx('/rest/v1/rpc/reserve_spend'), body: { ok: true, run_id: 22 } },
    { method: 'POST', urlPattern: rx('/rest/v1/rpc/settle_spend'), body: null },
    { method: 'POST', urlPattern: rx('/acts/harvestapi~linkedin-post-search/runs?'), status: 201, body: { data: { id: 'r7', status: 'READY' } } },
    { method: 'GET', urlPattern: rx('/actor-runs/r7?'), body: { data: { id: 'r7', status: 'FAILED', usageTotalUsd: 0.02 } } },
  ]);
  assert.notEqual(res.status, 0);
  assert.equal(reqs(res.log, 'POST', '/acts/').length, 1);
  const settle = bodyOf(reqs(res.log, 'POST', 'rpc/settle_spend')[0]);
  assert.equal(settle.p_actual, 0.0875, 'never below the estimate');
  assert.match(settle.p_error, /FAILED/);
});
