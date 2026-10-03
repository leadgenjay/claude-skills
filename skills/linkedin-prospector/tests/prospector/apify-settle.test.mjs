// What a run is settled at, and what an ABORTED or TIMED-OUT run still yields. runActor runs in this
// process against a mock file; the total-cap consequence is checked against the real reserve_spend
// and settle_spend in a throwaway local Postgres database.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { makeHome, rx, reqs, bodyOf, APIFY } from './helpers.mjs';
import { chargedUsd, eventChargeUsd, COMMENT_WITH_PROFILE_PRICE_USD } from '../../scripts/apify.mjs';

const SCHEMA = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../schema.sql');
const ACTOR = 'harvestapi~linkedin-post-comments';

async function runInProcess(mocks, args) {
  const home = makeHome();
  const mockFile = path.join(home, 'mock.json');
  const logFile = path.join(home, 'http.log');
  fs.writeFileSync(mockFile, JSON.stringify([
    { method: 'POST', urlPattern: rx('/rest/v1/rpc/reserve_spend'), body: { ok: true, run_id: 31 } },
    { method: 'POST', urlPattern: rx('/rest/v1/rpc/settle_spend'), body: null },
    ...mocks,
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
  let result;
  let error;
  try {
    result = await runActor({ step: 't', actor: ACTOR, input: {}, unitPriceUsd: COMMENT_WITH_PROFILE_PRICE_USD, waitSecs: 0, ...args });
  } catch (e) {
    error = e;
  }
  const log = fs.readFileSync(logFile, 'utf8').trim().split('\n').map((l) => JSON.parse(l));
  return { result, error, log, settle: bodyOf(reqs(log, 'POST', 'rpc/settle_spend')[0]) };
}

const runMocks = (status, items, record = {}) => [
  { method: 'POST', urlPattern: rx(`${APIFY}/acts/${ACTOR}/runs?`), status: 201, body: { data: { id: 'r1', status: 'READY', defaultDatasetId: 'd1' } } },
  { method: 'GET', urlPattern: rx(`${APIFY}/actor-runs/r1?`), body: { data: { id: 'r1', status, defaultDatasetId: 'd1', ...record } } },
  ...(items === null
    ? [{ method: 'GET', urlPattern: rx(`${APIFY}/datasets/d1/items`), status: 500, body: { error: 'gone' } }]
    : [{ method: 'GET', urlPattern: rx(`${APIFY}/datasets/d1/items`), body: items }]),
];

const items = (n) => Array.from({ length: n }, (_, i) => ({ commentary: `c${i}` }));

test('settled cost is the largest of usage, event charges and items x unit price', () => {
  assert.equal(chargedUsd({ usageTotalUsd: 0.05 }, 1800, 0.004), 7.2);
  assert.equal(chargedUsd({ usageTotalUsd: 9 }, 10, 0.004), 9);
  const run = {
    usageTotalUsd: 0.05,
    chargedEventCounts: { 'comment-result': 1000, 'profile-main': 1000, 'actor-start': 1 },
    pricingInfo: { pricingPerEvent: { actorChargeEvents: { 'comment-result': { eventPriceUsd: 0.002 }, 'profile-main': { eventPriceUsd: 0.002 } } } },
  };
  assert.equal(eventChargeUsd(run), 4);
  assert.equal(chargedUsd(run, 10, 0.004), 4, 'event charges win over a low usage figure');
  assert.equal(eventChargeUsd({ usageTotalUsd: 1 }), null);
});

test('usageTotalUsd $0.05 with 1,800 items back: settled at the item figure, and the total cap then refuses the next run', async () => {
  const { result, settle } = await runInProcess(runMocks('SUCCEEDED', items(1800), { usageTotalUsd: 0.05 }), { units: 1800 });
  assert.equal(result.ok, true);
  assert.equal(result.items.length, 1800);
  assert.deepEqual(settle, { p_run_id: 31, p_actual: 7.2, p_error: null });

  // Feed that exact settlement into the real SQL functions: $7.20 spent of a $10 total cap, so a
  // $3 run must be refused. Settled at $0.05 instead, the same run would have passed.
  const own = `li_prospector_settle_${process.pid}`;
  const psql = (db, ...a) => spawnSync('psql', ['-U', 'postgres', '-X', '-q', '-At', '-v', 'ON_ERROR_STOP=1', '-d', db, ...a], { encoding: 'utf8' });
  const created = psql('postgres', '-c', `create database ${own}`);
  assert.equal(created.status, 0, `needs the local Postgres the runner uses: ${created.stderr}`);
  try {
    assert.equal(psql(own, '-f', SCHEMA).status, 0);
    const q = (sql) => {
      const r = psql(own, '-c', sql);
      assert.equal(r.status, 0, r.stderr);
      return r.stdout.trim();
    };
    const first = JSON.parse(q(`select reserve_spend('scrape', '${ACTOR}', 7.2, 10, 10, 1800)`));
    assert.equal(first.ok, true);
    q(`select settle_spend(${first.run_id}, ${settle.p_actual}, null)`);
    const next = JSON.parse(q(`select reserve_spend('scrape', '${ACTOR}', 3, 10, 10, 750)`));
    assert.deepEqual([next.ok, next.reason], [false, 'total_cap']);
    q(`update li_runs set actual_cost_usd = 0.05 where id = ${first.run_id}`);
    const undercounted = JSON.parse(q(`select reserve_spend('scrape', '${ACTOR}', 3, 10, 10, 750)`));
    assert.equal(undercounted.ok, true, 'the under-count would have let it through');
  } finally {
    psql('postgres', '-c', `drop database if exists ${own}`);
  }
});

for (const status of ['ABORTED', 'TIMED-OUT']) {
  test(`a run ending ${status} keeps the items it returned and settles on them`, async () => {
    const { result, error, settle, log } = await runInProcess(runMocks(status, items(300), { usageTotalUsd: 0.4 }), { units: 1800 });
    assert.equal(error, undefined);
    assert.equal(result.ok, true);
    assert.equal(result.items.length, 300);
    assert.equal(settle.p_actual, 1.2, '300 x $0.004 beats the $0.40 usage figure');
    assert.match(settle.p_error, new RegExp(`partial: run ${status}`));
    assert.equal(reqs(log, 'POST', '/acts/').length, 1, 'not re-run');
  });

  test(`a run ending ${status} whose dataset cannot be read throws and counts at least its estimate`, async () => {
    const { error, settle } = await runInProcess(runMocks(status, null, { usageTotalUsd: 0.4 }), { units: 1800 });
    assert.ok(error);
    assert.equal(settle.p_actual, 7.2);
    assert.match(settle.p_error, /HTTP 500/);
  });
}
