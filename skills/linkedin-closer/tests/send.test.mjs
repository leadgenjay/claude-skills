// send: the guards between a stored draft and a message on LinkedIn.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import { main } from '../scripts/closer.mjs';
import { tempHome, useMocks, makeDeps, posts, unipileCalls, accountMock, threadMocks, sendMock, msg } from './harness.mjs';

let home;
beforeEach(() => {
  home = tempHome();
  process.env.LINKEDIN_LEADGEN_HOME = home;
});

const BODY = 'Makes sense. What does your outbound look like today?';

// A prospect who wrote in chat c-<n>, plus our stored draft answering their message m-<n>.
function seedThread(db, n, { minutesAgo = 30, prospect = {}, draft = {} } = {}) {
  const p = db.seed('li_prospects', { public_id: `p${n}`, unipile_provider_id: `prov-${n}`, ...prospect });
  const m = db.seed('li_messages', { prospect_id: p.id, kind: 'reply', external_id: `m-${n}`, target_id: `c-${n}`, body: BODY, ...draft });
  return { p, m, live: [msg(`w-${n}`, 'Thanks for connecting', minutesAgo + 60, true), msg(`m-${n}`, 'Tell me more about it', minutesAgo)] };
}

test('draft_only: send makes zero requests to Unipile and leaves drafts alone', async () => {
  const { deps, db, outputs } = await makeDeps({ closer_mode: 'draft_only' });
  const t = seedThread(db, 1);
  const http = useMocks(home, [accountMock(), ...threadMocks('c-1', 'prov-1', t.live), sendMock()]);
  assert.equal(await main(['send'], deps), 0);
  const reqs = http.requests();
  assert.equal(posts(reqs).length, 0, 'no POST in the request log');
  assert.equal(unipileCalls(reqs).length, 0, 'no Unipile call at all');
  assert.equal(t.m.status, 'draft');
  assert.equal(t.m.attempts, 0, 'never claimed');
  assert.equal(outputs[0].sent, 0);
});

test('a normal send: claim, POST, finish', async () => {
  const { deps, db } = await makeDeps();
  const t = seedThread(db, 1);
  const http = useMocks(home, [accountMock(), ...threadMocks('c-1', 'prov-1', t.live), sendMock()]);
  assert.equal(await main(['send'], deps), 0);
  const sent = posts(http.requests());
  assert.equal(sent.length, 1);
  assert.equal(sent[0].body.form.text, BODY);
  assert.equal(t.m.status, 'sent');
  assert.equal(t.m.sent_via, 'unipile');
  assert.ok(t.m.sent_at);
});

test('do_not_contact prospects are never sent to', async () => {
  const { deps, db } = await makeDeps();
  const t = seedThread(db, 1, { prospect: { status: 'do_not_contact' } });
  const http = useMocks(home, [accountMock(), ...threadMocks('c-1', 'prov-1', t.live), sendMock()]);
  assert.equal(await main(['send'], deps), 0);
  assert.equal(posts(http.requests()).length, 0);
  assert.equal(t.m.status, 'dropped');
});

test('two send passes at once: the claim lets exactly one message out', async () => {
  const { deps, db } = await makeDeps();
  const t = seedThread(db, 1);
  const http = useMocks(home, [accountMock(), ...threadMocks('c-1', 'prov-1', t.live), sendMock()]);
  const codes = await Promise.all([main(['send'], deps), main(['send'], deps)]);
  assert.deepEqual(codes, [0, 0]);
  assert.equal(posts(http.requests()).length, 1);
  assert.equal(t.m.status, 'sent');
  assert.equal(db.calls.filter((c) => c[0] === 'rpc' && c[1] === 'claim_send').length, 2, 'both passes tried to claim');
});

test('lock file deleted mid-run: a second pass gets in, and the claim still stops the double send', async () => {
  const { deps, db } = await makeDeps();
  const t = seedThread(db, 1);
  const http = useMocks(home, [accountMock(), ...threadMocks('c-1', 'prov-1', t.live), sendMock()]);
  assert.equal(await main(['run-begin'], deps), 0);
  assert.equal(await main(['run-begin'], deps), 1, 'refused while the lock is held');
  fs.unlinkSync(path.join(home, 'run.lock'));
  assert.equal(await main(['run-begin'], deps), 0, 'with the lock gone a second pass starts');
  const codes = await Promise.all([main(['send'], deps), main(['send'], deps)]);
  assert.deepEqual(codes, [0, 0]);
  assert.equal(posts(http.requests()).length, 1);
  assert.equal(await main(['run-end'], deps), 0);
});

test('stale draft: a newer message from them drops it for a re-draft, a newer one from us drops it', async () => {
  const { deps, db, outputs } = await makeDeps();
  const a = seedThread(db, 1);
  const b = seedThread(db, 2);
  const http = useMocks(home, [
    accountMock(),
    ...threadMocks('c-1', 'prov-1', [...a.live, msg('m-1b', 'Actually, one more thing first', 5)]),
    ...threadMocks('c-2', 'prov-2', [...b.live, msg('ours', 'Answered by hand already', 5, true)]),
    sendMock(),
  ]);
  assert.equal(await main(['send'], deps), 0);
  assert.equal(posts(http.requests()).length, 0);
  assert.equal(a.m.status, 'dropped');
  assert.equal(b.m.status, 'dropped');
  const dropped = outputs[0].dropped;
  assert.equal(dropped.find((d) => d.id === a.m.id).redraft, true);
  assert.equal(dropped.find((d) => d.id === b.m.id).redraft, undefined);
  assert.equal(a.m.meta.status_reason, 'they wrote again since the draft');

  // The next inbox-export offers the newer message for drafting.
  useMocks(home, [
    accountMock(),
    { method: 'GET', urlPattern: 'chats\\?account_id=', status: 200,
      body: { items: [{ id: 'c-1', attendee_provider_id: 'prov-1', timestamp: new Date().toISOString() }] } },
    ...threadMocks('c-1', 'prov-1', [...a.live, msg('m-1b', 'Actually, one more thing first', 5)]),
  ]);
  assert.equal(await main(['inbox-export'], deps), 0);
  assert.deepEqual(outputs[1].threads.map((x) => x.external_id), ['m-1b']);
});

test('a bot question that slipped through as a draft is escalated, not sent', async () => {
  const { deps, db } = await makeDeps();
  const p = db.seed('li_prospects', { public_id: 'tom', unipile_provider_id: 'prov-b' });
  const m = db.seed('li_messages', { prospect_id: p.id, kind: 'reply', external_id: 'm-b', target_id: 'c-b', body: BODY });
  const http = useMocks(home, [accountMock(), ...threadMocks('c-b', 'prov-b', [msg('m-b', 'Wait, is this a bot?', 10)]), sendMock()]);
  assert.equal(await main(['send'], deps), 0);
  assert.equal(posts(http.requests()).length, 0);
  assert.equal(m.status, 'escalated');
  assert.ok(db.tables.li_alerts.some((x) => x.kind === 'escalation'));
});

test('forced Unipile error (422): back to draft, retried next pass, failed with an alert on the 3rd', async () => {
  const { deps, db, outputs } = await makeDeps();
  const t = seedThread(db, 1);
  const http = useMocks(home, [accountMock(), ...threadMocks('c-1', 'prov-1', t.live), sendMock(422, { type: 'errors/invalid_recipient' })]);
  assert.equal(await main(['send'], deps), 0);
  assert.equal(t.m.status, 'draft');
  assert.equal(t.m.attempts, 1);
  assert.equal(outputs[0].retry.length, 1);
  assert.equal(await main(['send'], deps), 0);
  assert.equal(t.m.status, 'draft');
  assert.equal(db.tables.li_alerts.length, 0);
  assert.equal(await main(['send'], deps), 0);
  assert.equal(t.m.status, 'failed');
  assert.equal(t.m.attempts, 3);
  assert.ok(db.tables.li_alerts.some((x) => x.kind === 'send_failed'));
  assert.equal(await main(['send'], deps), 0);
  assert.equal(posts(http.requests()).length, 3, 'three attempts, then never again');
});

test('stuck in sending over 15 minutes: failed with an alert, never re-sent', async () => {
  const { deps, db } = await makeDeps();
  const t = seedThread(db, 1, { draft: { status: 'sending', attempts: 1, claimed_at: new Date(Date.now() - 16 * 60000).toISOString() } });
  const fresh = seedThread(db, 2, { draft: { status: 'sending', attempts: 1, claimed_at: new Date(Date.now() - 5 * 60000).toISOString() } });
  const http = useMocks(home, [accountMock(), ...threadMocks('c-1', 'prov-1', t.live), ...threadMocks('c-2', 'prov-2', fresh.live), sendMock()]);
  assert.equal(await main(['send'], deps), 0);
  assert.equal(t.m.status, 'failed');
  assert.equal(fresh.m.status, 'sending', 'a recent claim is left alone');
  assert.ok(db.tables.li_alerts.some((x) => x.kind === 'send_stuck' && x.prospect_id === t.p.id));
  assert.equal(posts(http.requests()).length, 0);
});

test('no response from Unipile: the row stays in sending, is alerted, and is never re-sent', async () => {
  const { deps, db } = await makeDeps();
  const t = seedThread(db, 1);
  // No mock for the POST: http.mjs throws as it would on a timeout.
  const http = useMocks(home, [accountMock(), ...threadMocks('c-1', 'prov-1', t.live)]);
  assert.equal(await main(['send'], deps), 0);
  assert.equal(t.m.status, 'sending');
  assert.ok(db.tables.li_alerts.some((x) => x.kind === 'send_unconfirmed'));
  assert.equal(await main(['send'], deps), 0);
  assert.equal(http.requests().filter((r) => r.method === 'POST').length, 1);
});

test('daily DM cap: counts the rolling 24 hours', async () => {
  const { deps, db, outputs } = await makeDeps({ closer_replies_per_day: 2 });
  db.seed('li_messages', { kind: 'reply', external_id: 'earlier', status: 'sent', body: 'x', sent_at: new Date(Date.now() - 3600000).toISOString() });
  db.seed('li_messages', { kind: 'reply', external_id: 'yesterday', status: 'sent', body: 'x', sent_at: new Date(Date.now() - 25 * 3600000).toISOString() });
  const a = seedThread(db, 1);
  const b = seedThread(db, 2);
  const http = useMocks(home, [accountMock(), ...threadMocks('c-1', 'prov-1', a.live), ...threadMocks('c-2', 'prov-2', b.live), sendMock()]);
  assert.equal(await main(['send'], deps), 0);
  assert.equal(posts(http.requests()).length, 1);
  assert.equal(a.m.status, 'sent');
  assert.equal(b.m.status, 'draft', 'over the cap waits for tomorrow');
  assert.match(outputs[0].skipped[0].reason, /daily cap/);
});

test('never a third unanswered message', async () => {
  const { deps, db, outputs } = await makeDeps();
  const t = seedThread(db, 1);
  const later = (min) => new Date(Date.parse(t.m.created_at) + min * 60000).toISOString();
  db.seed('li_messages', { prospect_id: t.p.id, kind: 'reply', external_id: 's1', status: 'sent', body: 'x', sent_at: later(1) });
  db.seed('li_messages', { prospect_id: t.p.id, kind: 'reply', external_id: 's2', status: 'sent', body: 'x', sent_at: later(2) });
  const http = useMocks(home, [accountMock(), ...threadMocks('c-1', 'prov-1', t.live), sendMock()]);
  assert.equal(await main(['send'], deps), 0);
  assert.equal(posts(http.requests()).length, 0);
  assert.equal(t.m.status, 'dropped');
  assert.match(outputs[0].dropped[0].reason, /unanswered/);
});

test('auth failure mid-pass (401 on send): exit 2, alert, row back to draft, nothing else sent', async () => {
  const { deps, db } = await makeDeps();
  const a = seedThread(db, 1);
  const b = seedThread(db, 2);
  const http = useMocks(home, [accountMock(), ...threadMocks('c-1', 'prov-1', a.live), ...threadMocks('c-2', 'prov-2', b.live), sendMock(401, { type: 'errors/unauthorized' })]);
  assert.equal(await main(['send'], deps), 2);
  assert.equal(posts(http.requests()).length, 1, 'stopped at the first refusal');
  assert.equal(a.m.status, 'draft');
  assert.equal(b.m.status, 'draft');
  assert.ok(db.tables.li_alerts.some((x) => x.kind === 'auth_failed'));
});

test('auth failure: account status CREDENTIALS stops before any send', async () => {
  const { deps, db } = await makeDeps();
  const t = seedThread(db, 1);
  const http = useMocks(home, [accountMock('CREDENTIALS'), ...threadMocks('c-1', 'prov-1', t.live), sendMock()]);
  assert.equal(await main(['send'], deps), 2);
  assert.equal(posts(http.requests()).length, 0);
  assert.equal(t.m.status, 'draft');
  assert.ok(db.tables.li_alerts.some((x) => x.kind === 'auth_failed'));
});
