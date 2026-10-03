import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { reserveSpend, settleSpend } from '../../scripts/lib/spend.mjs';
import { setupEnv } from './_env.mjs';

let env;
afterEach(() => env?.cleanup());
const config = { per_run_cap_usd: 10, total_cap_usd: 25 };

test('reserveSpend sends the estimate and both caps to reserve_spend', async () => {
  env = setupEnv([{ method: 'POST', urlPattern: '/rpc/reserve_spend$', status: 200, body: { ok: true, run_id: 7 } }]);
  const res = await reserveSpend({ step: 'scrape-commenters', actor: 'harvestapi/linkedin-post-comments', units: 1800, unitPriceUsd: 0.004, config });
  assert.deepEqual(res, { ok: true, runId: 7, estUsd: 7.2 });
  assert.deepEqual(JSON.parse(env.log()[0].body), {
    p_step: 'scrape-commenters', p_actor: 'harvestapi/linkedin-post-comments', p_est: 7.2,
    p_per_run_cap: 10, p_total_cap: 25, p_units: 1800,
  });
});

test('reserveSpend reads caps from config.json when none are passed', async () => {
  env = setupEnv([{ method: 'POST', urlPattern: '/rpc/reserve_spend$', status: 200, body: { ok: true, run_id: 1 } }],
    { config: { per_run_cap_usd: 1, total_cap_usd: 2 } });
  await reserveSpend({ step: 's', actor: 'a', units: 1, unitPriceUsd: 0.5 });
  const body = JSON.parse(env.log()[0].body);
  assert.equal(body.p_per_run_cap, 1);
  assert.equal(body.p_total_cap, 2);
});

test('a refusal comes back as ok:false with the reason', async () => {
  env = setupEnv([{ method: 'POST', urlPattern: '/rpc/reserve_spend$', status: 200,
    body: { ok: false, reason: 'per_run_cap', run_id: 8, spent_usd: 0 } }]);
  const res = await reserveSpend({ step: 's', actor: 'a', units: 2750, unitPriceUsd: 0.004, config });
  assert.deepEqual(res, { ok: false, reason: 'per_run_cap', runId: 8, estUsd: 11, spentUsd: 0 });
});

test('an unexpected answer throws rather than being read as permission', async () => {
  env = setupEnv([{ method: 'POST', urlPattern: '/rpc/reserve_spend$', status: 200, body: { ok: 'yes' } }]);
  await assert.rejects(reserveSpend({ step: 's', actor: 'a', units: 1, unitPriceUsd: 1, config }), /unexpected answer/);
});

test('bad units are refused before any request', async () => {
  env = setupEnv([]);
  await assert.rejects(reserveSpend({ step: 's', actor: 'a', units: NaN, unitPriceUsd: 1, config }), /units/);
  assert.equal(env.log().length, 0);
});

test('settleSpend records the actual cost', async () => {
  env = setupEnv([{ method: 'POST', urlPattern: '/rpc/settle_spend$', status: 204 }]);
  await settleSpend(7, 6.9);
  assert.deepEqual(JSON.parse(env.log()[0].body), { p_run_id: 7, p_actual: 6.9, p_error: null });
});
