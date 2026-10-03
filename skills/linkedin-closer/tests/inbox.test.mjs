// inbox-export and draft-import.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { main } from '../scripts/closer.mjs';
import {
  tempHome, useMocks, makeDeps, inboxState, threadMocks, unipileCalls, accountMock, chatsMock, messagesMock, profileMock, msg, sendMock, posts,
} from './harness.mjs';

let home;
beforeEach(() => {
  home = tempHome();
  process.env.LINKEDIN_LEADGEN_HOME = home;
});

const chat = (id, provider, extra = {}) => ({ id, attendee_provider_id: provider, name: `Chat ${id}`,
  timestamp: new Date().toISOString(), read_only: 0, disabledFeatures: [], ...extra });

test('inbox-export skips non-replyable chats without reading them', async () => {
  const { deps, outputs } = await makeDeps();
  const http = useMocks(home, [
    accountMock(),
    chatsMock([
      chat('ro', 'p-ro', { read_only: 1 }),
      chat('nr', 'p-nr', { disabledFeatures: ['reply'] }),
      chat('sp', 'p-sp', { content_type: 'sponsored' }),
      chat('ok', 'p-ok'),
    ]),
    messagesMock('ok', [msg('m-ok', 'Hi, tell me more?', 30)]),
    profileMock('p-ok', 'nobody-here'),
  ]);
  assert.equal(await main(['inbox-export'], deps), 0);
  const out = outputs[0];
  assert.deepEqual(out.threads.map((t) => t.chat_id), ['ok']);
  assert.deepEqual(out.skipped.map((s) => s.chat_id).sort(), ['nr', 'ro', 'sp']);
  const read = unipileCalls(http.requests()).map((r) => r.url);
  for (const id of ['ro', 'nr', 'sp']) assert.ok(!read.some((u) => u.includes(`/chats/${id}/`)), `read ${id}`);
});

test('inbox-export: waiting-on-us only, oldest first, matched or tagged not_from_campaign, dnc and handled excluded', async () => {
  const { deps, db, outputs } = await makeDeps();
  const ana = db.seed('li_prospects', { public_id: 'ana', name: 'Ana', unipile_provider_id: 'p-ana' });
  const ben = db.seed('li_prospects', { public_id: 'ben-k', name: 'Ben', unipile_provider_id: null });
  db.seed('li_prospects', { public_id: 'dee', unipile_provider_id: 'p-dee', status: 'do_not_contact' });
  db.seed('li_messages', { kind: 'reply', external_id: 'm-old', status: 'sent', body: 'x', prospect_id: null });
  useMocks(home, [
    accountMock(),
    chatsMock([chat('c-ana', 'p-ana'), chat('c-ben', 'p-ben'), chat('c-x', 'p-x'), chat('c-us', 'p-us'),
      chat('c-dee', 'p-dee'), chat('c-old', 'p-old')]),
    messagesMock('c-ana', [msg('a1', 'Thanks for connecting', 300, true), msg('a2', 'Sounds interesting, how does it work?', 60)]),
    messagesMock('c-ben', [msg('b1', 'Hey Ben', 900, true), msg('b2', 'Sure, tell me more', 500)]),
    messagesMock('c-x', [msg('x1', 'Hi there, quick question for you', 120)]),
    messagesMock('c-us', [msg('u1', 'hello', 120), msg('u2', 'Our reply', 100, true)]),
    messagesMock('c-dee', [msg('d1', 'whatever', 50)]),
    messagesMock('c-old', [msg('m-old', 'already answered', 50)]),
    profileMock('p-ben', 'Ben-K'),
    profileMock('p-x', 'stranger'),
  ]);
  assert.equal(await main(['inbox-export'], deps), 0);
  const out = outputs[0];
  assert.deepEqual(out.threads.map((t) => t.chat_id), ['c-ben', 'c-x', 'c-ana'], 'oldest waiting first');
  const byChat = Object.fromEntries(out.threads.map((t) => [t.chat_id, t]));
  assert.equal(byChat['c-ana'].prospect_id, ana.id);
  assert.equal(byChat['c-ana'].not_from_campaign, false);
  assert.equal(byChat['c-ana'].external_id, 'a2');
  assert.equal(byChat['c-ben'].prospect_id, ben.id, 'matched through the profile public id');
  assert.equal(byChat['c-x'].not_from_campaign, true);
  assert.equal(byChat['c-x'].will_auto_send, false, 'campaign_only never auto-sends to strangers');
  assert.ok(byChat['c-ana'].messages.length === 2, 'live thread included');
  assert.ok(out.skipped.some((s) => s.chat_id === 'c-dee' && s.reason === 'do_not_contact'));
  assert.ok(out.skipped.some((s) => s.chat_id === 'c-old'));
  assert.equal(db.tables.li_prospects.find((p) => p.id === ben.id).unipile_provider_id, 'p-ben');
  assert.ok(db.tables.li_prospects.find((p) => p.id === ana.id).last_inbound_at, 'last_inbound_at recorded');
});

test('inbox-export writes --out to a file', async () => {
  const { deps } = await makeDeps();
  delete deps.out;
  useMocks(home, [accountMock(), chatsMock([])]);
  const file = path.join(home, 'inbox.json');
  assert.equal(await main(['inbox-export', '--out', file], deps), 0);
  assert.deepEqual(JSON.parse(fs.readFileSync(file, 'utf8')).threads, []);
});

function draftsFile(rows) {
  const file = path.join(home, `drafts-${Math.random().toString(36).slice(2)}.json`);
  fs.writeFileSync(file, JSON.stringify(rows));
  return file;
}

test('inbox-export remembers what it exported, and draft-import only accepts those exact messages', async () => {
  const { deps, db, outputs } = await makeDeps();
  const ana = db.seed('li_prospects', { public_id: 'ana', unipile_provider_id: 'p-ana' });
  useMocks(home, [accountMock(), chatsMock([chat('c-ana', 'p-ana')]),
    messagesMock('c-ana', [msg('a1', 'Thanks for connecting', 300, true), msg('a2', 'How does it work?', 60)])]);
  assert.equal(await main(['inbox-export'], deps), 0);
  const body = 'It starts from who already comments on posts in your niche. Who do you sell to?';
  const file = draftsFile([
    { chat_id: 'c-ana', external_id: 'a1', classification: 'question', action: 'reply', body, reason: 'old id' },
    { chat_id: 'c-zzz', external_id: 'z1', classification: 'question', action: 'reply', body, reason: 'not exported' },
    { chat_id: 'c-ana', external_id: 'a2', classification: 'question', action: 'reply', body, reason: 'answers how it works' },
  ]);
  assert.equal(await main(['draft-import', file], deps), 1);
  assert.deepEqual(outputs[1].rejected.map((r) => r.row), [0, 1]);
  assert.match(outputs[1].rejected[0].problems.join(), /their last message/);
  assert.match(outputs[1].rejected[1].problems.join(), /not in the latest inbox-export/);
  const row = db.tables.li_messages[0];
  assert.equal(db.tables.li_messages.length, 1);
  assert.equal(row.prospect_id, ana.id, 'prospect comes from the export, not the row');
  assert.equal(row.external_id, 'a2');
  assert.equal(row.target_id, 'c-ana');
  assert.equal(row.status, 'draft');
  assert.equal(row.meta.classification, 'question');
  assert.equal(row.meta.not_from_campaign, false);
});

test('draft-import refuses to run with no inbox-export behind it', async () => {
  const { deps, errors } = await makeDeps();
  useMocks(home, []);
  assert.equal(await main(['draft-import', draftsFile([])], deps), 1);
  assert.match(errors.join(), /run inbox-export first/);
});

test('draft-import: stop sets do_not_contact with no reply, bot escalates, price needs the link, bad drafts reported per row', async () => {
  const { deps, db, dnc, outputs } = await makeDeps();
  const sam = db.seed('li_prospects', { public_id: 'sam', unipile_provider_id: 'p-sam' });
  const tom = db.seed('li_prospects', { public_id: 'tom' });
  const mel = db.seed('li_prospects', { public_id: 'mel' });
  const dana = db.seed('li_prospects', { public_id: 'dana' });
  useMocks(home, threadMocks('c-sam', 'p-sam', [msg('m-sam', 'Stop messaging me.', 10)]));
  inboxState(home, {
    'c-sam': { external_id: 'm-sam', prospect_id: sam.id, answered_text: 'Stop messaging me.' },
    'c-tom': { external_id: 'm-tom', prospect_id: tom.id, answered_text: 'Wait, is this a bot?' },
    'c-mel': { external_id: 'm-mel', prospect_id: mel.id, answered_text: 'How much does it cost?' },
    'c-mel2': { external_id: 'm-mel2', prospect_id: mel.id, answered_text: 'What is the pricing?' },
    'c-dana': { external_id: 'm-dana', prospect_id: dana.id, answered_text: 'Sounds good' },
    'c-dana2': { external_id: 'm-dana2', prospect_id: dana.id, answered_text: 'Sounds good' },
    'c-z': { external_id: 'm-z', prospect_id: null, answered_text: 'hi' },
  });
  const file = draftsFile([
    { chat_id: 'c-sam', external_id: 'm-sam', classification: 'not_interested', action: 'dnc', reason: 'said stop messaging me' },
    { chat_id: 'c-tom', external_id: 'm-tom', classification: 'question', action: 'escalate', reason: 'asked if this is a bot' },
    { chat_id: 'c-mel', external_id: 'm-mel', classification: 'question', action: 'reply',
      body: 'Depends on setup, the latest pricing is at https://example.com/pricing. Which part were you curious about?' },
    { chat_id: 'c-mel2', external_id: 'm-mel2', classification: 'question', action: 'reply',
      body: 'It depends on what you need. What are you trying to fix first?' },
    { chat_id: 'c-dana', external_id: 'm-dana', classification: 'interested', action: 'reply', body: 'Our plan is $1,500 per month. Want in?' },
    { chat_id: 'c-dana2', external_id: 'm-dana2', classification: 'interested', action: 'reply', body: 'Grab a time here https://example.com/book' },
    { chat_id: 'c-z', external_id: 'm-z', classification: 'chatty', action: 'reply', body: 'Hi?' },
  ]);
  assert.equal(await main(['draft-import', file], deps), 1, 'rejected rows make the exit code 1');
  const out = outputs[0];
  assert.deepEqual(out.stored.map((s) => s.row), [0, 1, 2]);
  assert.deepEqual(out.rejected.map((r) => r.row), [3, 4, 5, 6]);
  assert.match(out.rejected[0].problems.join(), /needs your offer_url or booking_link/, 'a price question without the link is refused');
  assert.match(out.rejected[1].problems.join(), /price/);
  assert.match(out.rejected[2].problems.join(), /bare link/);
  assert.match(out.rejected[3].problems.join(), /classification/);

  const msgs = db.tables.li_messages;
  assert.deepEqual(dnc.marked.map((d) => d.prospectId), [sam.id]);
  assert.equal(db.tables.li_prospects.find((p) => p.id === sam.id).status, 'do_not_contact');
  const samRows = msgs.filter((m) => m.prospect_id === sam.id);
  assert.ok(samRows.every((m) => m.status === 'dropped' && m.body === ''), 'stop creates no reply');
  assert.equal(msgs.find((m) => m.external_id === 'm-tom').status, 'escalated');
  assert.ok(db.tables.li_alerts.some((a) => a.kind === 'escalation' && a.prospect_id === tom.id));
  assert.equal(msgs.find((m) => m.external_id === 'm-mel').status, 'draft');
  assert.ok(!msgs.some((m) => m.external_id.startsWith('m-dana')), 'rejected drafts store nothing');
});

test('draft-import twice for the same message keeps one row', async () => {
  const { deps, db, outputs } = await makeDeps();
  const p = db.seed('li_prospects', { public_id: 'ana' });
  useMocks(home, []);
  inboxState(home, { c1: { external_id: 'm1', prospect_id: p.id, answered_text: 'tell me more' } });
  const row = { chat_id: 'c1', external_id: 'm1', classification: 'interested', action: 'reply', body: 'Nice. What does your current setup look like?' };
  assert.equal(await main(['draft-import', draftsFile([row])], deps), 0);
  assert.equal(await main(['draft-import', draftsFile([row])], deps), 1);
  assert.match(outputs[1].rejected[0].problems.join(), /already exists/);
  assert.equal(db.tables.li_messages.length, 1);
});

const strangerRow = { chat_id: 'c-x', external_id: 'mx', classification: 'question', action: 'reply',
  body: 'We help agencies book calls with outbound. What do you do?' };

test('campaign_only: an unmatched chat is drafted, never sent, and alerted', async () => {
  const { deps, db } = await makeDeps({ reply_scope: 'campaign_only' });
  const http = useMocks(home, [accountMock(), ...threadMocks('c-x', 'p-x', [msg('mx', 'hey, what is this about?', 30)]), sendMock()]);
  inboxState(home, { 'c-x': { external_id: 'mx', prospect_id: null, answered_text: 'hey, what is this about?' } });
  assert.equal(await main(['draft-import', draftsFile([strangerRow])], deps), 0);
  const row = db.tables.li_messages[0];
  assert.equal(row.status, 'escalated');
  assert.ok(row.body.length > 0, 'the draft text is kept for the human');
  assert.ok(db.tables.li_alerts.some((a) => a.kind === 'unmatched_chat'));

  // Even a draft-status row for a stranger (config changed after drafting) is never sent.
  db.seed('li_messages', { kind: 'reply', external_id: 'mx2', target_id: 'c-x', body: 'Hello, what do you do?', status: 'draft' });
  assert.equal(await main(['send'], deps), 0);
  assert.equal(posts(http.requests()).length, 0, 'no POST to Unipile');
  assert.equal(db.tables.li_messages.find((m) => m.external_id === 'mx2').status, 'escalated');
  assert.equal(db.tables.li_alerts.filter((a) => a.kind === 'unmatched_chat').length, 2);
});

test('reply_scope all: an unmatched chat is sent', async () => {
  const { deps, db } = await makeDeps({ reply_scope: 'all' });
  const http = useMocks(home, [accountMock(), ...threadMocks('c-x', 'p-x', [msg('mx', 'hey, what is this about?', 30)]), sendMock()]);
  inboxState(home, { 'c-x': { external_id: 'mx', prospect_id: null, answered_text: 'hey, what is this about?' } });
  assert.equal(await main(['draft-import', draftsFile([strangerRow])], deps), 0);
  assert.equal(db.tables.li_messages[0].status, 'draft');
  assert.equal(await main(['send'], deps), 0);
  const sent = posts(http.requests());
  assert.equal(sent.length, 1);
  assert.match(sent[0].url, /chats\/c-x\/messages$/);
  assert.equal(sent[0].body.form.text, strangerRow.body);
  assert.equal(db.tables.li_messages[0].status, 'sent');
});

test('the 16 labelled fixture threads through draft-import: dnc, escalate, skip and reply each land as expected', async () => {
  const fixture = JSON.parse(fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures', 'threads.json'), 'utf8'));
  const { deps, db, dnc, outputs } = await makeDeps();
  const state = {};
  const rows = [];
  const actionFor = { send: 'reply', price: 'reply', escalate: 'escalate', dnc: 'dnc', skip: 'skip' };
  const mocks = [];
  for (const t of fixture.threads) {
    const p = db.seed('li_prospects', { public_id: t.id, unipile_provider_id: `p-${t.id}` });
    mocks.push(...threadMocks(`c-${t.id}`, `p-${t.id}`, [msg(`m-${t.id}`, t.messages[t.messages.length - 1].text, 10)]));
    state[`c-${t.id}`] = { external_id: `m-${t.id}`, prospect_id: p.id, answered_text: t.messages[t.messages.length - 1].text };
    rows.push({ chat_id: `c-${t.id}`, external_id: `m-${t.id}`, classification: t.class, action: actionFor[t.expected.handling],
      body: t.good_draft ?? undefined, reason: t.expected.reason ?? t.class });
  }
  useMocks(home, mocks);
  inboxState(home, state);
  assert.equal(await main(['draft-import', draftsFile(rows)], deps), 0, JSON.stringify(outputs[0]?.rejected));
  const byThread = (id) => db.tables.li_messages.find((m) => m.external_id === `m-${id}`);
  for (const t of fixture.threads) {
    const m = byThread(t.id);
    const expected = { send: 'draft', price: 'draft', escalate: 'escalated', dnc: 'dropped', skip: 'dropped' }[t.expected.handling];
    assert.equal(m.status, expected, `${t.id} ${t.class}`);
    if (t.expected.handling === 'price') assert.match(m.body, /https?:\/\//);
    if (m.status === 'draft') assert.ok(m.body.length <= 250);
  }
  assert.equal(dnc.marked.length, 2, 'both not_interested threads are do_not_contact');
  assert.equal(db.tables.li_alerts.filter((a) => a.kind === 'escalation').length, 3, 'bot question and both personal threads');

  // Every bad sample draft is refused through the importer too.
  const bad = [];
  for (const t of fixture.threads) {
    for (const b of t.bad_drafts) bad.push({ chat_id: `c-${t.id}`, external_id: `m-${t.id}`, classification: t.class, action: 'reply', body: b.body });
  }
  const fresh = await makeDeps();
  for (const t of fixture.threads) fresh.db.seed('li_prospects', { public_id: t.id });
  assert.equal(await main(['draft-import', draftsFile(bad)], fresh.deps), 1);
  assert.equal(fresh.outputs[0].rejected.length, bad.length);
});
