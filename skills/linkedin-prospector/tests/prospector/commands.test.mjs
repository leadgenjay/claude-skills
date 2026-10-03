// dnc, status, and the open-alerts banner every entry point prints first.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { makeHome, run, rx, reqs, bodyOf, AIMFOX, CAMPAIGN } from './helpers.mjs';

test('dnc on a known prospect sets the flag and removes + blacklists them in Aimfox', () => {
  const home = makeHome();
  const res = run(home, ['dnc', 'https://www.linkedin.com/in/P9/', 'asked', 'to', 'stop'], [
    { method: 'GET', urlPattern: rx('/rest/v1/li_prospects?', 'public_id=eq.p9'), body: [{ id: 9, status: 'pushed' }] },
    { method: 'GET', urlPattern: rx('/rest/v1/li_prospects?', 'id=eq.9'), body: [{ status: 'pushed' }] },
    { method: 'PATCH', urlPattern: rx('/rest/v1/li_prospects?', 'id=eq.9'), body: [{ id: 9, public_id: 'p9', status: 'do_not_contact', aimfox_lead_urn: 'u9' }] },
    { method: 'PATCH', urlPattern: rx('/rest/v1/li_messages?'), body: [] },
    { method: 'DELETE', urlPattern: rx(`${AIMFOX}/campaigns/${CAMPAIGN}/audience/u9`), body: null },
    { method: 'POST', urlPattern: rx(`${AIMFOX}/blacklist`), body: {} },
  ]);
  assert.equal(res.status, 0, res.stderr);
  assert.deepEqual(bodyOf(reqs(res.log, 'PATCH', 'li_prospects?', 'id=eq.9')[0]), { status: 'do_not_contact', dnc_reason: 'asked to stop' });
  assert.equal(reqs(res.log, 'DELETE', '/audience/u9').length, 1);
  assert.equal(reqs(res.log, 'POST', '/blacklist').length, 1);
});

test('dnc on someone not scraped yet stores them as do-not-contact', () => {
  const home = makeHome();
  const res = run(home, ['dnc', 'Newbie', 'competitor'], [
    { method: 'GET', urlPattern: rx('/rest/v1/li_prospects?'), body: [] },
    { method: 'POST', urlPattern: rx('/rest/v1/li_prospects'), body: [{ id: 10 }] },
  ]);
  assert.equal(res.status, 0, res.stderr);
  assert.deepEqual(bodyOf(reqs(res.log, 'POST', 'li_prospects')[0]),
    { public_id: 'newbie', profile_url: 'https://www.linkedin.com/in/newbie', status: 'do_not_contact', dnc_reason: 'competitor' });
});

test('status prints counts and spend, after the open alerts', () => {
  const home = makeHome();
  const res = run(home, ['status'], [
    { method: 'GET', urlPattern: rx('/rest/v1/li_alerts?'), body: [{ id: 3, kind: 'push_failed', prospect_id: 1, body: 'p1 failed read-back' }] },
    { method: 'GET', urlPattern: rx('/rest/v1/li_prospects?'), body: [{ status: 'new' }, { status: 'new' }, { status: 'pushed' }] },
    { method: 'GET', urlPattern: rx('/rest/v1/li_runs?'), body: [{ est_cost_usd: 1, actual_cost_usd: 0.5 }, { est_cost_usd: 2, actual_cost_usd: null }, { est_cost_usd: null, error: 'over_cap' }] },
    { method: 'GET', urlPattern: rx('/rest/v1/li_campaign_state?'), body: [] },
  ]);
  assert.equal(res.status, 0, res.stderr);
  assert.match(res.stderr, /1 open alert need/);
  assert.match(res.stderr, /#3 push_failed \(prospect 1\)/);
  assert.match(res.stdout, /Prospects: 3/);
  assert.match(res.stdout, /Apify spend: \$2\.50 of \$25 total cap/);
  assert.match(res.stdout, /1 refused run/);
});

test('dnc refuses an id with characters a LinkedIn slug never has', () => {
  const home = makeHome();
  const res = run(home, ['dnc', 'a&b', 'reason'], []);
  assert.notEqual(res.status, 0);
  assert.equal(reqs(res.log, 'POST', 'li_prospects').length + reqs(res.log, 'PATCH', 'li_prospects').length, 0);
});

test('setup-check on a home where .env is tracked by git says to run git rm --cached .env', () => {
  const home = makeHome();
  const git = (...a) => spawnSync('git', ['-C', home, ...a], { encoding: 'utf8' });
  git('init', '-q');
  fs.writeFileSync(`${home}/.gitignore`, '.env\n');
  git('add', '-f', '.env');
  const res = run(home, ['setup-check'], [
    { method: 'GET', urlPattern: rx('/rest/v1/li_'), body: [] },
    { method: 'POST', urlPattern: rx('/rest/v1/rpc/'), body: 0 },
    { method: 'GET', urlPattern: rx('https://api.apify.com/v2/users/me'), body: { data: {} } },
    { method: 'GET', urlPattern: rx(`${AIMFOX}/accounts`), body: [] },
    { method: 'GET', urlPattern: rx(`${AIMFOX}/campaigns/${CAMPAIGN}`), body: { state: 'PAUSED' } },
  ]);
  assert.notEqual(res.status, 0);
  assert.match(res.stdout, /FAIL \.env is git-ignored: .*tracked by git.*git rm --cached \.env/);
});

test('setup-check probes claim_send, and a schema without it fails at setup', () => {
  const base = [
    { method: 'GET', urlPattern: rx('/rest/v1/li_'), body: [] },
    { method: 'GET', urlPattern: rx('https://api.apify.com/v2/users/me'), body: { data: {} } },
    { method: 'GET', urlPattern: rx(`${AIMFOX}/accounts`), body: [] },
    { method: 'GET', urlPattern: rx(`${AIMFOX}/campaigns/${CAMPAIGN}`), body: { state: 'PAUSED' } },
  ];
  const ok = run(makeHome(), ['setup-check'], [{ method: 'POST', urlPattern: rx('/rest/v1/rpc/'), body: 'busy' }, ...base]);
  assert.equal(ok.status, 0, ok.stdout + ok.stderr);
  assert.deepEqual(bodyOf(reqs(ok.log, 'POST', 'rpc/claim_send')[0]), { p_id: -1 });
  for (const fn of ['daily_count', 'claim_message', 'claim_send', 'finish_message', 'unanswered_streak']) {
    assert.match(ok.stdout, new RegExp(`ok +function ${fn}: exists`));
  }

  const missing = run(makeHome(), ['setup-check'], [
    { method: 'POST', urlPattern: rx('/rest/v1/rpc/claim_send'), status: 404, body: { code: 'PGRST202', message: 'Could not find the function public.claim_send' } },
    { method: 'POST', urlPattern: rx('/rest/v1/rpc/'), body: 0 },
    ...base,
  ]);
  assert.notEqual(missing.status, 0);
  assert.match(missing.stdout, /FAIL function claim_send: .*Could not find the function/);
});
