// comments-export, comments-import, comments-post.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import { main } from '../scripts/closer.mjs';
import { tempHome, useMocks, makeDeps, commentsState, posts, unipileCalls, accountMock, ownPostsMocks, ME } from './harness.mjs';

let home;
beforeEach(() => {
  home = tempHome();
  process.env.LINKEDIN_LEADGEN_HOME = home;
});

const URN = 'urn:li:activity:111';
const post = { id: 'post-1', social_id: URN, text: 'Five things I learned running outbound this year' };
const comment = (id, text, author = 'them-1', extra = {}) => ({ id, text, author: `Name ${author}`,
  author_details: { id: author, name: `Name ${author}`, headline: 'Founder' }, date: new Date().toISOString(), ...extra });

function file(rows) {
  const f = path.join(home, `replies-${Math.random().toString(36).slice(2)}.json`);
  fs.writeFileSync(f, JSON.stringify({ replies: rows }));
  return f;
}

test('comments-export: top-level comments from others with no reply from us', async () => {
  const { deps, db, outputs } = await makeDeps();
  db.seed('li_messages', { kind: 'comment_reply', external_id: 'c-done', status: 'sent', body: 'x' });
  const dnc = db.seed('li_prospects', { public_id: 'dee', unipile_provider_id: 'dee-prov', status: 'do_not_contact' });
  useMocks(home, [accountMock(), ...ownPostsMocks([post], { [URN]: [
    comment('c-new', 'This is great, how do you pick the list?'),
    comment('c-mine', 'Thanks all', ME),
    comment('c-reply', 'agreed', 'them-2', { parent_id: 'c-new' }),
    comment('c-answered', 'Love it', 'them-3'),
    comment('our-answer', 'Thanks!', ME, { parent_id: 'c-answered' }),
    comment('c-done', 'Saw this already'),
    comment('c-dee', 'nice', dnc.unipile_provider_id),
  ] })]);
  assert.equal(await main(['comments-export'], deps), 0);
  const out = outputs[0];
  assert.deepEqual(out.comments.map((c) => c.comment_id), ['c-new']);
  assert.equal(out.comments[0].post_id, URN);
  const remembered = JSON.parse(fs.readFileSync(path.join(home, 'closer-comments-export.json'), 'utf8'));
  assert.deepEqual(Object.keys(remembered.comments), ['c-new']);
  assert.ok(out.skipped.some((s) => s.comment_id === 'c-dee'));
});

test('comments-import: engagement-only validation, complaint skipped with an alert, nothing drafted for it', async () => {
  const { deps, db, outputs } = await makeDeps();
  useMocks(home, []);
  const p = db.seed('li_prospects', { public_id: 'kim' });
  commentsState(home, Object.fromEntries(['c1', 'c2', 'c3', 'c4', 'c5'].map((id) => [id, { post_id: URN, prospect_id: id === 'c1' ? p.id : null }])));
  const f = file([
    { comment_id: 'c1', post_id: URN, action: 'reply', body: 'Good question. I start from who already engages with the topic. What niche are you in?' },
    { comment_id: 'c2', post_id: URN, action: 'skip', reason: 'complaint: says our service never delivered' },
    { comment_id: 'c3', post_id: URN, action: 'reply', body: 'DM me and I will send you the template' },
    { comment_id: 'c4', post_id: URN, action: 'reply', body: 'Full guide at https://example.com/book, enjoy!' },
    { comment_id: 'c5', post_id: 'urn:li:activity:999', action: 'reply', body: 'Thanks!' },
    { comment_id: 'c6', post_id: URN, action: 'reply', body: 'Thanks!' },
  ]);
  assert.equal(await main(['comments-import', f], deps), 1);
  const out = outputs[0];
  assert.deepEqual(out.stored.map((s) => s.comment_id), ['c1', 'c2']);
  assert.deepEqual(out.rejected.map((r) => r.comment_id), ['c3', 'c4', 'c5', 'c6']);
  assert.match(out.rejected[2].problems.join(), /post_id must be/);
  assert.match(out.rejected[3].problems.join(), /not in the latest comments-export/);
  const rows = db.tables.li_messages;
  assert.equal(rows.find((r) => r.external_id === 'c1').status, 'draft');
  assert.equal(rows.find((r) => r.external_id === 'c1').prospect_id, p.id);
  assert.equal(rows.find((r) => r.external_id === 'c1').target_id, URN);
  assert.equal(rows.find((r) => r.external_id === 'c1').kind, 'comment_reply');
  const c2 = rows.find((r) => r.external_id === 'c2');
  assert.equal(c2.status, 'escalated');
  assert.equal(c2.body, '');
  assert.ok(db.tables.li_alerts.some((a) => a.kind === 'comment_skipped' && /never delivered/.test(a.body)));
});

function seedCommentDraft(db, id, body = 'Thanks Sam, what made you try it?') {
  return db.seed('li_messages', { kind: 'comment_reply', external_id: id, target_id: URN, body });
}

test('comments-post: posts each reply once, threaded under the comment; a second pass posts nothing', async () => {
  const { deps, db } = await makeDeps();
  const a = seedCommentDraft(db, 'c1');
  const http = useMocks(home, [accountMock(), ...ownPostsMocks([post], { [URN]: [comment('c1', 'Great post')] })]);
  assert.equal(await main(['comments-post'], deps), 0);
  const sent = posts(http.requests());
  assert.equal(sent.length, 1);
  assert.match(sent[0].url, /posts\/urn%3Ali%3Aactivity%3A111\/comments$/);
  const body = JSON.parse(sent[0].body);
  assert.equal(body.comment_id, 'c1');
  assert.equal(body.account_id, 'acc-test');
  assert.equal(a.status, 'sent');
  assert.equal(await main(['comments-post'], deps), 0);
  assert.equal(posts(http.requests()).length, 1);
});

test('comments-post: a complaint that reached a draft is not answered in public and is alerted', async () => {
  const { deps, db } = await makeDeps();
  const a = seedCommentDraft(db, 'c1');
  const http = useMocks(home, [accountMock(), ...ownPostsMocks([post], { [URN]: [comment('c1', 'Honestly this company is a scam, still waiting on my refund')] })]);
  assert.equal(await main(['comments-post'], deps), 0);
  assert.equal(posts(http.requests()).length, 0);
  assert.equal(a.status, 'escalated');
  assert.ok(db.tables.li_alerts.some((x) => x.kind === 'comment_complaint'));
});

test('comments-post: daily comment cap', async () => {
  const { deps, db, outputs } = await makeDeps({ comment_replies_per_day: 1 });
  const a = seedCommentDraft(db, 'c1');
  const b = seedCommentDraft(db, 'c2');
  const http = useMocks(home, [accountMock(), ...ownPostsMocks([post], { [URN]: [comment('c1', 'Nice'), comment('c2', 'Useful')] })]);
  assert.equal(await main(['comments-post'], deps), 0);
  assert.equal(posts(http.requests()).length, 1);
  assert.equal(a.status, 'sent');
  assert.equal(b.status, 'draft');
  assert.match(outputs[0].skipped[0].reason, /daily cap/);
});

test('comments-post in draft_only: zero requests to Unipile', async () => {
  const { deps, db } = await makeDeps({ closer_mode: 'draft_only' });
  const a = seedCommentDraft(db, 'c1');
  const http = useMocks(home, [accountMock(), ...ownPostsMocks([post], { [URN]: [comment('c1', 'Nice')] })]);
  assert.equal(await main(['comments-post'], deps), 0);
  assert.equal(posts(http.requests()).length, 0);
  assert.equal(unipileCalls(http.requests()).length, 0);
  assert.equal(a.status, 'draft');
});

test('comments-post: two passes at once post the reply once', async () => {
  const { deps, db } = await makeDeps();
  seedCommentDraft(db, 'c1');
  const http = useMocks(home, [accountMock(), ...ownPostsMocks([post], { [URN]: [comment('c1', 'Nice')] })]);
  await Promise.all([main(['comments-post'], deps), main(['comments-post'], deps)]);
  assert.equal(posts(http.requests()).length, 1);
});
