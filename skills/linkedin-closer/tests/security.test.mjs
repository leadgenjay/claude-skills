// Security-review fixes: link allowlist and secrets at import and send, the prospect derived by the
// script and never by Claude's row, failed lookups skipped, do_not_contact by public id, and the
// alerts resolve / note commands.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import { main } from '../scripts/closer.mjs';
import {
  tempHome, useMocks, makeDeps, inboxState, commentsState, posts, accountMock, chatsMock, threadMocks, chatMock,
  messagesMock, profileMock, ownPostsMocks, sendMock, msg,
} from './harness.mjs';

let home;
beforeEach(() => {
  home = tempHome();
  process.env.LINKEDIN_LEADGEN_HOME = home;
});

function json(rows) {
  const f = path.join(home, `rows-${Math.random().toString(36).slice(2)}.json`);
  fs.writeFileSync(f, JSON.stringify(rows));
  return f;
}

const reply = (chat, ext, body, extra = {}) => ({ chat_id: chat, external_id: ext, classification: 'question', action: 'reply', body, reason: 'r', ...extra });

test('draft-import refuses a secret in a reply, by token shape and by configured value', async () => {
  const { deps, db, outputs } = await makeDeps();
  const p = db.seed('li_prospects', { public_id: 'ana' });
  useMocks(home, []);
  inboxState(home, Object.fromEntries(['1', '2', '3'].map((n) => [`c${n}`, { external_id: `m${n}`, prospect_id: p.id, answered_text: 'hi' }])));
  const f = json([
    reply('c1', 'm1', 'Here is the key apify_api_abcdef123456, does it work?'),
    reply('c2', 'm2', 'Use test-service to log in, ok?'),
    reply('c3', 'm3', 'Happy to help. What are you working on?'),
  ]);
  assert.equal(await main(['draft-import', f], deps), 1);
  assert.deepEqual(outputs[0].rejected.map((r) => r.row), [0, 1]);
  assert.match(outputs[0].rejected[0].problems.join(), /an Apify token/);
  assert.match(outputs[0].rejected[1].problems.join(), /the value of SUPABASE_SERVICE_KEY/);
  assert.ok(!JSON.stringify(outputs[0]).includes('test-service'), 'the secret itself is never echoed');
  assert.deepEqual(db.tables.li_messages.map((m) => m.external_id), ['m3']);
});

test('send re-checks secrets and links on the stored row: nothing goes out', async () => {
  const { deps, db } = await makeDeps();
  const p = db.seed('li_prospects', { public_id: 'ana', unipile_provider_id: 'prov-1' });
  const a = db.seed('li_messages', { prospect_id: p.id, kind: 'reply', external_id: 'm1', target_id: 'c-1', body: 'Key sb_secret_abc123 here, ok?' });
  const b = db.seed('li_messages', { prospect_id: p.id, kind: 'reply', external_id: 'm2', target_id: 'c-2', body: 'See https://examp1e.com/book and tell me?' });
  const http = useMocks(home, [accountMock(),
    ...threadMocks('c-1', 'prov-1', [msg('m1', 'can you send it?', 10)]),
    ...threadMocks('c-2', 'prov-1', [msg('m2', 'link?', 10)]), sendMock()]);
  assert.equal(await main(['send'], deps), 0);
  assert.equal(posts(http.requests()).length, 0);
  assert.equal(a.status, 'dropped');
  assert.equal(b.status, 'dropped');
  assert.equal(db.tables.li_alerts.filter((x) => x.kind === 'invalid_draft').length, 2);
});

test('comment import refuses a secret', async () => {
  const { deps, outputs } = await makeDeps();
  useMocks(home, []);
  commentsState(home, { c1: { post_id: 'urn:li:activity:1', prospect_id: null } });
  const f = json([{ comment_id: 'c1', post_id: 'urn:li:activity:1', action: 'reply', body: 'Thanks! token eyJhbGciOiJIUzI1.eyJzdWIiOiIxMjM0 lol' }]);
  assert.equal(await main(['comments-import', f], deps), 1);
  assert.match(outputs[0].rejected[0].problems.join(), /a JWT/);
});

test('a forged prospect_id in an import row is ignored: the prospect comes from the export', async () => {
  const { deps, db } = await makeDeps();
  const real = db.seed('li_prospects', { public_id: 'real' });
  const other = db.seed('li_prospects', { public_id: 'other' });
  useMocks(home, []);
  inboxState(home, { c1: { external_id: 'm1', prospect_id: real.id, answered_text: 'hi' } });
  assert.equal(await main(['draft-import', json([reply('c1', 'm1', 'Glad you asked. What are you working on?', { prospect_id: other.id })])], deps), 0);
  assert.equal(db.tables.li_messages[0].prospect_id, real.id);
});

test('a dnc row can only mark the prospect the live chat belongs to, while their message is still last', async () => {
  const { deps, db, dnc, outputs } = await makeDeps();
  const sam = db.seed('li_prospects', { public_id: 'sam', unipile_provider_id: 'p-sam' });
  const kim = db.seed('li_prospects', { public_id: 'kim', unipile_provider_id: 'p-kim' });
  useMocks(home, [
    // c-forged: the export says Kim, but the live chat is Sam's.
    ...threadMocks('c-forged', 'p-sam', [msg('m-f', 'stop', 5)]),
    // c-moved: Kim wrote again after the export.
    ...threadMocks('c-moved', 'p-kim', [msg('m-old', 'not interested', 30), msg('m-new', 'actually, wait, tell me more', 5)]),
    // c-broken: the live read fails.
    { method: 'GET', urlPattern: 'chats/c-broken$', status: 500, body: { error: 'boom' } },
  ]);
  inboxState(home, {
    'c-forged': { external_id: 'm-f', prospect_id: kim.id, answered_text: 'stop' },
    'c-moved': { external_id: 'm-old', prospect_id: kim.id, answered_text: 'not interested' },
    'c-broken': { external_id: 'm-b', prospect_id: kim.id, answered_text: 'stop' },
  });
  const dncRow = (chat, ext) => ({ chat_id: chat, external_id: ext, classification: 'not_interested', action: 'dnc', reason: 'stop' });
  assert.equal(await main(['draft-import', json([dncRow('c-forged', 'm-f'), dncRow('c-moved', 'm-old'), dncRow('c-broken', 'm-b')])], deps), 1);
  const problems = outputs[0].rejected.map((r) => r.problems.join());
  assert.match(problems[0], /does not belong to the exported prospect/);
  assert.match(problems[1], /no longer the last one/);
  assert.match(problems[2], /could not confirm the chat live/);
  assert.equal(dnc.marked.length, 0, 'nobody was marked');
  assert.equal(sam.status, 'welcome_sent');
  assert.equal(kim.status, 'welcome_sent');
});

test('send re-derives the prospect from the live chat: a mismatch or a failed lookup escalates and sends nothing', async () => {
  const { deps, db } = await makeDeps({ reply_scope: 'all' });
  const ana = db.seed('li_prospects', { public_id: 'ana', unipile_provider_id: 'prov-ana' });
  db.seed('li_prospects', { public_id: 'bob', unipile_provider_id: 'prov-bob' });
  const body = 'Good question. What are you working on?';
  const forged = db.seed('li_messages', { prospect_id: ana.id, kind: 'reply', external_id: 'm1', target_id: 'c-bob', body });
  const stranger = db.seed('li_messages', { prospect_id: null, kind: 'reply', external_id: 'm2', target_id: 'c-ana', body });
  const broken = db.seed('li_messages', { prospect_id: ana.id, kind: 'reply', external_id: 'm3', target_id: 'c-broken', body });
  const http = useMocks(home, [accountMock(),
    ...threadMocks('c-bob', 'prov-bob', [msg('m1', 'hi', 10)]),
    ...threadMocks('c-ana', 'prov-ana', [msg('m2', 'hi', 10)]),
    { method: 'GET', urlPattern: 'chats/c-broken$', status: 500, body: {} },
    messagesMock('c-broken', [msg('m3', 'hi', 10)]),
    sendMock()]);
  assert.equal(await main(['send'], deps), 0);
  assert.equal(posts(http.requests()).length, 0);
  for (const m of [forged, stranger, broken]) assert.equal(m.status, 'escalated', `row ${m.external_id}`);
  assert.equal(db.tables.li_alerts.filter((a) => a.kind === 'identity_check_failed').length, 3);
});

test('send drops a draft whose chat is no longer replyable', async () => {
  const { deps, db } = await makeDeps();
  const p = db.seed('li_prospects', { public_id: 'ana', unipile_provider_id: 'prov-1' });
  const m = db.seed('li_messages', { prospect_id: p.id, kind: 'reply', external_id: 'm1', target_id: 'c-1', body: 'Sure. What do you sell?' });
  const http = useMocks(home, [accountMock(), chatMock('c-1', 'prov-1', { read_only: 1 }), messagesMock('c-1', [msg('m1', 'hi', 10)]), sendMock()]);
  assert.equal(await main(['send'], deps), 0);
  assert.equal(posts(http.requests()).length, 0);
  assert.equal(m.status, 'dropped');
});

test('inbox-export: a failed profile lookup skips the thread with an alert, never exports it as a stranger', async () => {
  const { deps, db, outputs } = await makeDeps();
  const chat = (id, provider) => ({ id, attendee_provider_id: provider, timestamp: new Date().toISOString() });
  useMocks(home, [accountMock(),
    chatsMock([chat('c-err', 'p-err'), chat('c-nopub', 'p-nopub'), chat('c-ok', 'p-ok')]),
    messagesMock('c-err', [msg('e1', 'hello?', 30)]),
    messagesMock('c-nopub', [msg('n1', 'hello?', 30)]),
    messagesMock('c-ok', [msg('o1', 'hello?', 30)]),
    { method: 'GET', urlPattern: 'users/p-err\\?', status: 500, body: { error: 'boom' } },
    { method: 'GET', urlPattern: 'users/p-nopub\\?', status: 200, body: { provider_id: 'p-nopub' } },
    profileMock('p-ok', 'stranger')]);
  assert.equal(await main(['inbox-export'], deps), 0);
  const out = outputs[0];
  assert.deepEqual(out.threads.map((t) => t.chat_id), ['c-ok']);
  assert.ok(out.skipped.some((s) => s.chat_id === 'c-err' && /could not tell who this is/.test(s.reason)));
  assert.ok(out.skipped.some((s) => s.chat_id === 'c-nopub'));
  assert.equal(db.tables.li_alerts.filter((a) => a.kind === 'lookup_failed').length, 2);
  const state = JSON.parse(fs.readFileSync(path.join(home, 'closer-inbox-export.json'), 'utf8'));
  assert.deepEqual(Object.keys(state.chats), ['c-ok']);
});

test('comments-export: a do_not_contact author is skipped when matched only by public id', async () => {
  const { deps, db, outputs } = await makeDeps();
  db.seed('li_prospects', { public_id: 'dee', unipile_provider_id: null, status: 'do_not_contact' });
  const URN = 'urn:li:activity:5';
  const c = (id, author, url) => ({ id, text: 'nice post', author_details: { id: author, name: author, profile_url: url } });
  useMocks(home, [accountMock(), ...ownPostsMocks([{ id: 'p', social_id: URN, text: 'post' }], {
    [URN]: [c('c-dee', 'unknown-provider', 'https://www.linkedin.com/in/Dee/'), c('c-ok', 'someone', 'https://www.linkedin.com/in/someone')],
  })]);
  assert.equal(await main(['comments-export'], deps), 0);
  assert.deepEqual(outputs[0].comments.map((x) => x.comment_id), ['c-ok']);
  assert.ok(outputs[0].skipped.some((s) => s.comment_id === 'c-dee' && s.reason === 'do_not_contact'));
});

test('alerts resolve <id> and note <public_id> <text>', async () => {
  const { deps, db, outputs, errors } = await makeDeps();
  const p = db.seed('li_prospects', { public_id: 'ana-k' });
  const a = db.seed('li_alerts', { kind: 'escalation', body: 'x' });
  useMocks(home, []);
  assert.equal(await main(['alerts', 'resolve', String(a.id)], deps), 0);
  assert.ok(a.resolved_at);
  assert.equal(await main(['alerts', 'resolve', String(a.id)], deps), 1, 'already resolved');
  assert.match(errors.join(), /no open alert/);
  assert.equal(await main(['alerts', 'resolve', 'abc'], deps), 1);
  assert.equal(await main(['note', 'https://linkedin.com/in/Ana-K/', 'they', 'booked,', 'check', 'your', 'calendar'], deps), 0);
  const noteRow = db.tables.li_alerts.find((x) => x.kind === 'note');
  assert.equal(noteRow.prospect_id, p.id);
  assert.equal(noteRow.body, 'ana-k: they booked, check your calendar');
  assert.equal(p.status, 'welcome_sent', 'a note never changes the prospect');
  assert.equal(await main(['note', 'ana-k'], deps), 1, 'text is required');
  assert.deepEqual(outputs.at(-1), { noted: 'ana-k', prospect_id: p.id });
});
