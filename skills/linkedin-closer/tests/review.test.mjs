// Code-review fixes: do_not_contact before the row, strangers made do_not_contact, comment shapes
// failing closed, the atomic daily cap, 429/403/5xx handling, group chats, and time ordering.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import { main } from '../scripts/closer.mjs';
import {
  tempHome, useMocks, makeDeps, inboxState, posts, accountMock, chatsMock, threadMocks, attendeesMock, messagesMock,
  profileMock, ownPostsMocks, sendMock, msg, ME,
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

const BODY = 'Makes sense. What does your outbound look like today?';
const stopRow = (chat, ext) => ({ chat_id: chat, external_id: ext, classification: 'not_interested', action: 'dnc', reason: 'said stop' });

test('do_not_contact runs before the row is stored: a failure stores nothing and the stop comes back next export', async () => {
  const { deps, db, outputs } = await makeDeps();
  const sam = db.seed('li_prospects', { public_id: 'sam', unipile_provider_id: 'p-sam' });
  useMocks(home, threadMocks('c-sam', 'p-sam', [msg('m-sam', 'Stop messaging me.', 10)]));
  inboxState(home, { 'c-sam': { external_id: 'm-sam', prospect_id: sam.id, answered_text: 'Stop messaging me.' } });
  const working = deps.dnc;
  deps.dnc = { async markDoNotContact() { throw new Error('the database update failed'); } };
  assert.equal(await main(['draft-import', json([stopRow('c-sam', 'm-sam')])], deps), 1);
  assert.match(outputs[0].rejected[0].problems.join(), /could not mark do_not_contact/);
  assert.equal(db.tables.li_messages.length, 0, 'no row, so the thread is exported again');

  deps.dnc = working;
  assert.equal(await main(['draft-import', json([stopRow('c-sam', 'm-sam')])], deps), 0);
  assert.equal(sam.status, 'do_not_contact');
  assert.equal(db.tables.li_messages.length, 1);
});

test('a dnc row that hits an existing row (409) still applies do_not_contact', async () => {
  const { deps, db, dnc, outputs } = await makeDeps();
  const sam = db.seed('li_prospects', { public_id: 'sam', unipile_provider_id: 'p-sam' });
  db.seed('li_messages', { prospect_id: sam.id, kind: 'reply', external_id: 'm-sam', status: 'dropped', body: '' });
  useMocks(home, threadMocks('c-sam', 'p-sam', [msg('m-sam', 'Stop messaging me.', 10)]));
  inboxState(home, { 'c-sam': { external_id: 'm-sam', prospect_id: sam.id, answered_text: 'Stop messaging me.' } });
  assert.equal(await main(['draft-import', json([stopRow('c-sam', 'm-sam')])], deps), 0);
  assert.equal(dnc.marked.length, 1);
  assert.equal(sam.status, 'do_not_contact');
  assert.match(outputs[0].stored[0].note, /do_not_contact applied/);
});

test('a stranger who says stop gets a do_not_contact prospect row, and their next message is not offered', async () => {
  const { deps, db, outputs } = await makeDeps({ reply_scope: 'all' });
  const chat = { id: 'c-x', attendee_provider_id: 'p-x', timestamp: new Date().toISOString() };
  useMocks(home, [accountMock(), chatsMock([chat]), ...threadMocks('c-x', 'p-x', [msg('m-x', 'Stop messaging me.', 10)]), profileMock('p-x', 'Xavier-Q')]);
  assert.equal(await main(['inbox-export'], deps), 0);
  assert.equal(outputs[0].threads[0].not_from_campaign, true);
  assert.equal(await main(['draft-import', json([stopRow('c-x', 'm-x')])], deps), 0);
  const p = db.tables.li_prospects.find((x) => x.public_id === 'xavier-q');
  assert.ok(p, 'a prospect row was created');
  assert.equal(p.status, 'do_not_contact');
  assert.equal(p.unipile_provider_id, 'p-x');

  useMocks(home, [accountMock(), chatsMock([chat]),
    ...threadMocks('c-x', 'p-x', [msg('m-x', 'Stop messaging me.', 10), msg('m-x2', 'I said stop', 2)])]);
  assert.equal(await main(['inbox-export'], deps), 0);
  assert.deepEqual(outputs[2].threads, []);
  assert.ok(outputs[2].skipped.some((s) => s.chat_id === 'c-x' && s.reason === 'do_not_contact'));
});

const URN = 'urn:li:activity:9';
const URN2 = 'urn:li:activity:10';
const post = (urn) => ({ id: urn, social_id: urn, text: 'post' });
const comment = (id, author, extra = {}) => ({ id, text: 'Great point', author_details: author ? { id: author, name: author } : undefined, ...extra });

test('comments: a post holding a comment with no author id is skipped and alerted; other posts still export', async () => {
  const { deps, db, outputs } = await makeDeps();
  useMocks(home, [accountMock(), ...ownPostsMocks([post(URN), post(URN2)], {
    [URN]: [comment('c-null', null), comment('c-a', 'them-a')],
    [URN2]: [comment('c-b', 'them-b')],
  })]);
  assert.equal(await main(['comments-export'], deps), 0);
  assert.deepEqual(outputs[0].comments.map((c) => c.comment_id), ['c-b']);
  assert.ok(db.tables.li_alerts.some((a) => a.kind === 'comment_shape_unknown' && a.body.includes(URN)));
});

test('comments: with no id for our own account nothing is exported or posted', async () => {
  const { deps, db, outputs } = await makeDeps();
  const draft = db.seed('li_messages', { kind: 'comment_reply', external_id: 'c-a', target_id: URN, body: 'Thanks, what made you try it?' });
  const mocks = ownPostsMocks([post(URN)], { [URN]: [comment('c-a', 'them-a')] });
  mocks[0] = { method: 'GET', urlPattern: 'users/me\\?account_id=', status: 200, body: { name: 'no ids here' } };
  const http = useMocks(home, [accountMock(), ...mocks]);
  assert.equal(await main(['comments-export'], deps), 0);
  assert.deepEqual(outputs[0].comments, []);
  assert.equal(await main(['comments-post'], deps), 0);
  assert.equal(posts(http.requests()).length, 0);
  assert.equal(draft.status, 'draft', 'left for a pass that can see our own id');
  assert.equal(db.tables.li_alerts.filter((a) => a.kind === 'comment_shape_unknown').length, 2);
});

test('comments-post: a draft on a post skipped for a null author waits, nothing is posted', async () => {
  const { deps, db } = await makeDeps();
  const draft = db.seed('li_messages', { kind: 'comment_reply', external_id: 'c-a', target_id: URN, body: 'Thanks, what made you try it?' });
  const http = useMocks(home, [accountMock(), ...ownPostsMocks([post(URN)], { [URN]: [comment('c-a', 'them-a'), comment('c-null', null)] })]);
  assert.equal(await main(['comments-post'], deps), 0);
  assert.equal(posts(http.requests()).length, 0);
  assert.equal(draft.status, 'draft');
});

function seedThread(db, n) {
  const p = db.seed('li_prospects', { public_id: `p${n}`, unipile_provider_id: `prov-${n}` });
  const m = db.seed('li_messages', { prospect_id: p.id, kind: 'reply', external_id: `m-${n}`, target_id: `c-${n}`, body: BODY });
  return { p, m, mocks: threadMocks(`c-${n}`, `prov-${n}`, [msg(`m-${n}`, 'Tell me more', 30)]) };
}

test('atomic daily cap: two passes at once with one slot left send exactly one message', async () => {
  const { deps, db } = await makeDeps({ closer_replies_per_day: 1 });
  const a = seedThread(db, 1);
  const b = seedThread(db, 2);
  const http = useMocks(home, [accountMock(), ...a.mocks, ...b.mocks, sendMock()]);
  await Promise.all([main(['send'], deps), main(['send'], deps)]);
  assert.equal(posts(http.requests()).length, 1);
  assert.equal([a.m, b.m].filter((m) => m.status === 'sent').length, 1);
  assert.equal([a.m, b.m].filter((m) => m.status === 'draft').length, 1, 'the other waits for tomorrow');
});

test('an unconfirmed send (5xx) counts toward the cap, stays in sending, is alerted, and is never retried', async () => {
  const { deps, db, outputs } = await makeDeps({ closer_replies_per_day: 1 });
  const a = seedThread(db, 1);
  const b = seedThread(db, 2);
  const http = useMocks(home, [accountMock(), ...a.mocks, ...b.mocks, sendMock(502, { error: 'bad gateway' })]);
  assert.equal(await main(['send'], deps), 0);
  assert.equal(a.m.status, 'sending');
  assert.equal(b.m.status, 'draft');
  assert.equal(posts(http.requests()).length, 1, 'the second draft is held by the cap');
  assert.equal(outputs[0].unconfirmed.length, 1);
  assert.ok(db.tables.li_alerts.some((x) => x.kind === 'send_unconfirmed'));
  assert.equal(await main(['send'], deps), 0);
  assert.equal(posts(http.requests()).length, 1, 'nothing retried or added on the next pass');
});

for (const status of [429, 403]) {
  test(`Unipile ${status}: the pass stops, no attempt is spent, one alert`, async () => {
    const { deps, db, outputs } = await makeDeps();
    const a = seedThread(db, 1);
    const b = seedThread(db, 2);
    const http = useMocks(home, [accountMock(), ...a.mocks, ...b.mocks, sendMock(status, { type: 'errors/too_many_requests' })]);
    assert.equal(await main(['send'], deps), 0);
    assert.equal(posts(http.requests()).length, 1, 'stopped after the first refusal');
    assert.equal(a.m.status, 'draft');
    assert.equal(a.m.attempts, 0, 'the claim was handed back');
    assert.equal(b.m.status, 'draft');
    assert.equal(db.tables.li_alerts.filter((x) => x.kind === 'unipile_throttled').length, 1);
    assert.match(outputs[0].stopped, new RegExp(String(status)));
  });
}

test('group chats are skipped by inbox-export and escalated at send', async () => {
  const { deps, db, outputs } = await makeDeps({ reply_scope: 'all' });
  const chat = (id, provider) => ({ id, attendee_provider_id: provider, timestamp: new Date().toISOString() });
  useMocks(home, [accountMock(), chatsMock([chat('c-g', 'p-g'), chat('c-1', 'p-1')]),
    attendeesMock('c-g', ['p-g', 'p-h']),
    messagesMock('c-g', [msg('g1', 'hey all', 10)]),
    messagesMock('c-1', [msg('o1', 'hello?', 10)]),
    profileMock('p-1', 'one')]);
  assert.equal(await main(['inbox-export'], deps), 0);
  assert.deepEqual(outputs[0].threads.map((t) => t.chat_id), ['c-1']);
  assert.ok(outputs[0].skipped.some((s) => s.chat_id === 'c-g' && s.reason === 'group chat'));

  const p = db.seed('li_prospects', { public_id: 'g', unipile_provider_id: 'p-g' });
  const m = db.seed('li_messages', { prospect_id: p.id, kind: 'reply', external_id: 'g1', target_id: 'c-g', body: BODY });
  const http = useMocks(home, [accountMock(), attendeesMock('c-g', ['p-g', 'p-h']), ...threadMocks('c-g', 'p-g', [msg('g1', 'hey all', 10)]), sendMock()]);
  assert.equal(await main(['send'], deps), 0);
  assert.equal(posts(http.requests()).length, 0);
  assert.equal(m.status, 'escalated');
  assert.match(m.meta.status_reason, /group chat/);
});

test('messages are ordered by time, not by the text of the timestamp', async () => {
  const { deps, outputs } = await makeDeps({ reply_scope: 'all' });
  const chat = { id: 'c-1', attendee_provider_id: 'p-1', timestamp: new Date().toISOString() };
  // 12:00+05:00 is 07:00Z, before their 08:00Z message, though it sorts after it as text.
  const ours = { id: 'u1', text: 'Thanks for connecting', is_sender: 1, sender_id: ME, timestamp: '2026-10-03T12:00:00+05:00' };
  const theirs = { id: 't1', text: 'What do you do?', is_sender: 0, sender_id: 'p-1', timestamp: '2026-10-03T08:00:00Z' };
  useMocks(home, [accountMock(), chatsMock([chat]), messagesMock('c-1', [theirs, ours]), profileMock('p-1', 'one')]);
  assert.equal(await main(['inbox-export'], deps), 0);
  assert.deepEqual(outputs[0].threads.map((t) => t.external_id), ['t1'], 'their message is the newest, so we owe a reply');
  assert.deepEqual(outputs[0].threads[0].messages.map((x) => x.id), ['u1', 't1']);
});

test('a 1:1 chat whose attendee list includes us without is_self is not a group chat', async () => {
  const { deps, db, outputs } = await makeDeps({ reply_scope: 'all' });
  const chat = { id: 'c-1', attendee_provider_id: 'p-1', timestamp: new Date().toISOString() };
  const noSelfFlag = (extra) => ({ method: 'GET', urlPattern: 'chats/c-1/attendees$', status: 200,
    body: { items: [{ provider_id: 'p-1' }, extra] } });
  for (const us of [{ provider_id: ME }, { provider_id: 'other-id-space', public_identifier: 'Me-Public' },
    { provider_id: 'x', profile_url: 'https://www.linkedin.com/in/me-public/' }]) {
    useMocks(home, [accountMock(), chatsMock([chat]), noSelfFlag(us), messagesMock('c-1', [msg('o1', 'hello?', 10)]), profileMock('p-1', 'one')]);
    assert.equal(await main(['inbox-export'], deps), 0);
    assert.deepEqual(outputs.at(-1).threads.map((t) => t.chat_id), ['c-1'], JSON.stringify(us));
  }
  assert.equal(db.tables.li_alerts.filter((a) => a.kind === 'group_chat_skipped').length, 0);
});

test('group chats skipped: one open group_chat_skipped alert with a count, not one per pass', async () => {
  const { deps, db } = await makeDeps();
  const chat = (id) => ({ id, attendee_provider_id: `p-${id}`, timestamp: new Date().toISOString() });
  const mocks = () => [accountMock(), chatsMock([chat('g1'), chat('g2')]),
    attendeesMock('g1', ['a', 'b']), attendeesMock('g2', ['c', 'd']),
    messagesMock('g1', [msg('m1', 'hi all', 10)]), messagesMock('g2', [msg('m2', 'hi all', 10)])];
  useMocks(home, mocks());
  assert.equal(await main(['inbox-export'], deps), 0);
  useMocks(home, mocks());
  assert.equal(await main(['inbox-export'], deps), 0);
  const alerts = db.tables.li_alerts.filter((a) => a.kind === 'group_chat_skipped');
  assert.equal(alerts.length, 1);
  assert.match(alerts[0].body, /^2 chats waiting on you were skipped as group chats/);
});

test('our own comment reply is recognised when it carries only a public identifier', async () => {
  const { deps, db, outputs } = await makeDeps();
  const ourReply = (parent) => ({ id: `r-${parent}`, text: 'Thanks!', parent_id: parent,
    author_details: { public_identifier: 'me-public', name: 'Us' } });
  const ourTopLevel = { id: 'c-ours', text: 'Thanks everyone', author_details: { profile_url: 'https://www.linkedin.com/in/Me-Public' } };
  const draft = db.seed('li_messages', { kind: 'comment_reply', external_id: 'c-answered', target_id: URN, body: 'Thanks, what made you try it?' });
  const http = useMocks(home, [accountMock(),
    { method: 'GET', urlPattern: 'users/me\\?account_id=', status: 200, body: { provider_id: ME, id: ME, public_identifier: 'me-public' } },
    ...ownPostsMocks([post(URN)], { [URN]: [
      comment('c-answered', 'them-a'), ourReply('c-answered'), ourTopLevel, comment('c-open', 'them-b'),
    ] })]);
  assert.equal(await main(['comments-export'], deps), 0);
  assert.deepEqual(outputs[0].comments.map((c) => c.comment_id), ['c-open'], 'our reply and our own comment are not candidates');
  assert.equal(await main(['comments-post'], deps), 0);
  assert.equal(posts(http.requests()).length, 0);
  assert.equal(draft.status, 'dropped', 'already answered by us');
});

test('disguised dots are refused in replies and comments; a sentence break is not', async () => {
  const { validateReply, validateCommentReply } = await import('../scripts/closer.mjs');
  for (const d of ['evil . io', 'evil[.]io', 'evil(.)io', 'evil d0t io', 'evil。io']) {
    assert.ok(validateReply(`My notes: ${d}, want them?`, { allowedLinks: ['https://example.com/book'] }).length > 0, `reply ${d}`);
    assert.match(validateCommentReply(`My notes: ${d}`).join(), /link or domain/, `comment ${d}`);
  }
  assert.deepEqual(validateReply('Agreed. The list is the hard part. What did you try?'), []);
  assert.deepEqual(validateCommentReply('Agreed. The list is the hard part. What did you try?'), []);
});

test('price leftovers: grand next to a number, any number near a billing period', async () => {
  const { hasPriceFigure } = await import('../scripts/closer.mjs');
  for (const p of ['five grand', '3 grand', 'a couple grand', '49 a month', '20 per month', '99 monthly', '10 bucks one-time',
    '15/mo', 'about 30 dollars a year', '12 a year', '60 per year']) {
    assert.ok(hasPriceFigure(p), p);
  }
  for (const ok of ['a 20 minute call', 'the grand opening', 'we booked 12 calls last month']) assert.ok(!hasPriceFigure(ok), ok);
});

test('stranger stop: identity is read live; a tampered export or a taken public id leaves the victim untouched and alerts', async () => {
  const { deps, db, dnc, outputs } = await makeDeps({ reply_scope: 'all' });
  const victim = db.seed('li_prospects', { public_id: 'victim', unipile_provider_id: 'p-victim', status: 'replied' });
  const stop = [{ chat_id: 'c-x', external_id: 'm-x', classification: 'not_interested', action: 'dnc', reason: 'stop' }];
  const live = (pub) => [...threadMocks('c-x', 'p-x', [msg('m-x', 'Stop messaging me.', 10)]), profileMock('p-x', pub)];

  // 1. The export file was edited to name the victim; the live chat is someone else.
  useMocks(home, live('stranger-real'));
  inboxState(home, { 'c-x': { external_id: 'm-x', prospect_id: null, public_id: 'victim', provider_id: 'p-x', answered_text: 'Stop' } });
  assert.equal(await main(['draft-import', json(stop)], deps), 1);
  assert.match(outputs[0].rejected[0].problems.join(), /export names victim but the live chat is stranger-real/);

  // 2. The live profile itself claims the victim's public id, but the victim row belongs to another account.
  useMocks(home, live('victim'));
  inboxState(home, { 'c-x': { external_id: 'm-x', prospect_id: null, public_id: null, provider_id: 'p-x', answered_text: 'Stop' } });
  assert.equal(await main(['draft-import', json(stop)], deps), 1);
  assert.match(outputs[1].rejected[0].problems.join(), /already belongs to a different LinkedIn account/);

  assert.equal(victim.status, 'replied');
  assert.equal(victim.unipile_provider_id, 'p-victim');
  assert.equal(dnc.marked.length, 0);
  assert.equal(db.tables.li_prospects.length, 1, 'no row created');
  assert.equal(db.tables.li_messages.length, 0);
  assert.equal(db.tables.li_alerts.filter((a) => a.kind === 'dnc_identity_conflict').length, 2);
});

test('comments-post: a commenter marked do_not_contact after the export gets no reply', async () => {
  const { deps, db } = await makeDeps();
  const draft = db.seed('li_messages', { kind: 'comment_reply', external_id: 'c-1', target_id: URN, body: 'Thanks, what made you try it?', prospect_id: null });
  db.seed('li_prospects', { public_id: 'kim', unipile_provider_id: null, status: 'do_not_contact' });
  const http = useMocks(home, [accountMock(), ...ownPostsMocks([post(URN)], { [URN]: [
    { id: 'c-1', text: 'Nice', author_details: { id: 'other-id', profile_url: 'https://www.linkedin.com/in/kim' } },
  ] })]);
  assert.equal(await main(['comments-post'], deps), 0);
  assert.equal(posts(http.requests()).length, 0);
  assert.equal(draft.status, 'dropped');
});
