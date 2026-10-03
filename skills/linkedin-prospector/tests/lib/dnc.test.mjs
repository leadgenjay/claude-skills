import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { assertContactable, markDoNotContact, DoNotContactError } from '../../scripts/lib/dnc.mjs';
import { setupEnv } from './_env.mjs';

let env;
afterEach(() => env?.cleanup());

function fakeAimfox({ failRemove = false, failBlacklist = false } = {}) {
  const calls = [];
  return {
    calls,
    async removeFromAudience(campaignId, urn) {
      calls.push(['remove', campaignId, urn]);
      if (failRemove) throw new Error('Aimfox returned 500');
      return { ok: true };
    },
    async addToBlacklist(urn) {
      calls.push(['blacklist', urn]);
      if (failBlacklist) return { ok: false, error: 'Aimfox returned 422' };
      return { ok: true };
    },
  };
}

function mocks(before, after) {
  return [
    { method: 'GET', urlPattern: '/rest/v1/li_prospects\\?id=eq.7', status: 200, body: [before] },
    { method: 'PATCH', urlPattern: '/rest/v1/li_prospects\\?id=eq.7$', status: 200, body: [after] },
    { method: 'PATCH', urlPattern: '/rest/v1/li_messages\\?prospect_id=eq.7&status=eq.draft$', status: 200, body: [] },
    { method: 'POST', urlPattern: '/rest/v1/li_alerts$', status: 201, body: [{ id: 1 }] },
  ];
}
const dncRow = { id: 7, public_id: 'jane-doe', status: 'do_not_contact', aimfox_lead_urn: 'urn:li:member:7' };

test('assertContactable refuses a do_not_contact row and passes any other', () => {
  assert.throws(() => assertContactable({ id: 7, public_id: 'jane-doe', status: 'do_not_contact' }), (err) => {
    assert.ok(err instanceof DoNotContactError);
    assert.equal(err.prospectId, 7);
    assert.match(err.message, /jane-doe is marked do_not_contact/);
    return true;
  });
  for (const status of ['approved', 'pushed', 'replied']) {
    assert.doesNotThrow(() => assertContactable({ id: 1, status }));
  }
});

test('assertContactable refuses a missing row or one read without status', () => {
  assert.throws(() => assertContactable(undefined), /needs the prospect row/);
  assert.throws(() => assertContactable({ id: 1, public_id: 'x' }), /include status/);
});

test('markDoNotContact sets the flag, drops drafts, removes from the audience and blacklists', async () => {
  env = setupEnv(mocks({ status: 'pushed' }, dncRow));
  const aimfox = fakeAimfox();
  const res = await markDoNotContact(7, 'said stop', { aimfox, campaignId: 'camp-1' });
  assert.equal(res.aimfoxRemoved, true);
  assert.equal(res.aimfoxBlacklisted, true);
  assert.deepEqual(aimfox.calls, [['remove', 'camp-1', 'urn:li:member:7'], ['blacklist', 'urn:li:member:7']]);
  const patches = env.log().filter((e) => e.method === 'PATCH').map((e) => [e.url.split('/rest/v1/')[1], JSON.parse(e.body)]);
  assert.deepEqual(patches, [
    ['li_prospects?id=eq.7', { status: 'do_not_contact', dnc_reason: 'said stop' }],
    ['li_messages?prospect_id=eq.7&status=eq.draft', { status: 'dropped' }],
  ]);
  assert.equal(env.needsYou(), '', 'no alert when Aimfox calls succeed');
});

test('markDoNotContact takes the campaign id from config.json', async () => {
  env = setupEnv(mocks({ status: 'pushed' }, dncRow), { config: { aimfox_campaign_id: 'from-config' } });
  const aimfox = fakeAimfox();
  await markDoNotContact(7, 'stop', { aimfox });
  assert.deepEqual(aimfox.calls[0], ['remove', 'from-config', 'urn:li:member:7']);
});

test('Aimfox failures keep the flag and write an alert for each', async () => {
  env = setupEnv(mocks({ status: 'replied' }, dncRow));
  const res = await markDoNotContact(7, 'stop', { aimfox: fakeAimfox({ failRemove: true, failBlacklist: true }), campaignId: 'c' });
  assert.equal(res.prospect.status, 'do_not_contact');
  assert.equal(res.aimfoxRemoved, false);
  assert.equal(res.aimfoxBlacklisted, false);
  const kinds = env.log().filter((e) => e.url.endsWith('/li_alerts')).map((e) => JSON.parse(e.body).kind);
  assert.deepEqual(kinds, ['dnc_aimfox_remove_failed', 'dnc_aimfox_blacklist_failed']);
  assert.match(env.needsYou(), /removing them from Aimfox campaign c failed: Aimfox returned 500/);
});

test('a pushed prospect with no Aimfox id alerts instead of calling Aimfox', async () => {
  env = setupEnv(mocks({ status: 'pushing' }, { ...dncRow, aimfox_lead_urn: null }));
  const aimfox = fakeAimfox();
  await markDoNotContact(7, 'stop', { aimfox, campaignId: 'c' });
  assert.deepEqual(aimfox.calls, []);
  assert.match(env.needsYou(), /dnc_aimfox_unknown/);
});

test('push_failed and pushing leads with an Aimfox id are still removed and blacklisted', async () => {
  for (const status of ['push_failed', 'pushing']) {
    env = setupEnv(mocks({ status }, { ...dncRow, status: 'do_not_contact' }));
    const aimfox = fakeAimfox();
    await markDoNotContact(7, 'stop', { aimfox, campaignId: 'c' });
    assert.deepEqual(aimfox.calls.map((c) => c[0]), ['remove', 'blacklist'], status);
    env.cleanup();
  }
  env = null;
});

test('a push_failed lead with no Aimfox id alerts for a manual check', async () => {
  env = setupEnv(mocks({ status: 'push_failed' }, { ...dncRow, aimfox_lead_urn: null }));
  await markDoNotContact(7, 'stop', { aimfox: fakeAimfox(), campaignId: 'c' });
  assert.match(env.needsYou(), /dnc_aimfox_unknown/);
});

test('a never-pushed prospect needs no Aimfox call and no alert', async () => {
  env = setupEnv(mocks({ status: 'qualified' }, { ...dncRow, aimfox_lead_urn: null }));
  const aimfox = fakeAimfox();
  await markDoNotContact(7, 'stop', { aimfox, campaignId: 'c' });
  assert.deepEqual(aimfox.calls, []);
  assert.equal(env.needsYou(), '');
});
