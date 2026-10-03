// scrape-commenters upsert, qualify-import and write-import.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { makeHome, run, rx, reqs, bodyOf, apifyRunMocks } from './helpers.mjs';

const post = (author, n, comments) => ({
  linkedinUrl: `https://www.linkedin.com/posts/${author}-${n}`,
  author: { publicIdentifier: author },
  engagement: { likes: 10, comments },
});
const comment = (postUrl, slug, text) => ({
  postUrl,
  commentary: text,
  actor: { publicIdentifier: slug, name: slug.toUpperCase(), position: 'Founder at X', linkedinUrl: `https://www.linkedin.com/in/${slug}` },
});

test('scrape-commenters upserts on normalized public_id, keeps the first source, skips self and creators', () => {
  const home = makeHome({ posts_per_creator: 2, top_posts: 1, comments_per_post: 5 });
  const p1 = 'https://www.linkedin.com/posts/alice-1';
  const res = run(home, ['scrape-commenters'], [
    { method: 'GET', urlPattern: rx('/rest/v1/li_creators?', 'status=eq.approved'), body: [{ id: 1, profile_url: 'https://www.linkedin.com/in/alice' }] },
    { method: 'POST', urlPattern: rx('rpc/reserve_spend'), body: { ok: true, run_id: 1 } },
    { method: 'POST', urlPattern: rx('/rest/v1/rpc/settle_spend'), body: null },
    // alice-1 appears twice: one post row, one top-post slot
    ...apifyRunMocks('harvestapi~linkedin-post-search', [post('alice', 1, 40), post('alice', 2, 3), post('alice', 1, 40), post('stranger', 1, 99)]),
    { method: 'POST', urlPattern: rx('/rest/v1/li_posts'), body: [{ id: 11, post_url: p1, creator_id: 1 }, { id: 12, post_url: 'https://www.linkedin.com/posts/alice-2', creator_id: 1 }] },
    ...apifyRunMocks('harvestapi~linkedin-post-comments', [
        comment(p1, 'Bob-Smith', 'Great take'),
        comment(p1, 'bob-smith', 'Second comment, same person'),
        comment(p1, 'me-myself', 'my own comment'),
        comment(p1, 'alice', 'creator replying'),
        comment(p1, 'carol', 'Agreed'),
        comment(p1, 'bad&slug', 'decoded ampersand'),
        { postUrl: p1, commentary: 'hash', actor: { linkedinUrl: 'https://www.linkedin.com/in/x%23y' } },
    ]),
    { method: 'POST', urlPattern: rx('/rest/v1/li_prospects'), body: [{ id: 1 }] },
  ]);
  assert.equal(res.status, 0, res.stderr);

  const runs = reqs(res.log, 'POST', '/runs?').map(bodyOf);
  const postRows = bodyOf(reqs(res.log, 'POST', '/rest/v1/li_posts')[0]);
  assert.deepEqual(postRows.map((r) => r.post_url), [p1, 'https://www.linkedin.com/posts/alice-2'], 'posts deduped by post_url');
  assert.deepEqual(runs[0].authorUrls, ['https://www.linkedin.com/in/alice']);
  assert.equal(runs[0].maxItems, 2);
  assert.deepEqual(runs[1].posts, [p1], 'top post by comments among the creator\'s own posts');
  assert.equal(runs[1].maxItems, 5);

  const reserves = reqs(res.log, 'POST', 'rpc/reserve_spend').map(bodyOf);
  assert.deepEqual(reserves.map((r) => [r.p_units, r.p_est]), [[2, 0.0035], [5, 0.02]]);

  const ins = reqs(res.log, 'POST', '/rest/v1/li_prospects');
  assert.equal(ins.length, 1);
  assert.match(ins[0].url, /on_conflict=public_id/);
  const rows = bodyOf(ins[0]);
  assert.deepEqual(rows.map((r) => r.public_id), ['bob-smith', 'carol'], 'slugs with & or # never stored');
  assert.match(res.stdout, /2 skipped for an unusable profile id/);
  assert.equal(rows[0].comment_text, 'Great take', 'first source kept');
  assert.equal(rows[0].source_post_id, 11);
  assert.equal(rows[0].source_creator_id, 1);
});

function writeFile(home, name, data) {
  const f = path.join(home, name);
  fs.writeFileSync(f, JSON.stringify(data));
  return f;
}

test('qualify-import scores against the threshold, reports bad rows, and only touches new prospects', () => {
  const home = makeHome({ qualify_threshold: 60 });
  const file = writeFile(home, 'q.json', [
    { id: 1, icp_score: 80, icp_reason: 'Founder of a B2B agency' },
    { id: 2, icp_score: 40, icp_reason: 'Student' },
    { id: 3, icp_score: 90, icp_reason: 'hard reject: sells the same offer' },
    { id: 4, icp_score: 150, icp_reason: 'bad' },
  ]);
  const res = run(home, ['qualify-import', file], [
    { method: 'PATCH', urlPattern: rx('/rest/v1/li_prospects?', 'status=eq.new'), body: [{ id: 1 }] },
  ]);
  assert.equal(res.status, 1, 'invalid row makes the exit non-zero');
  assert.match(res.stdout, /row 3 \(id 4\): REJECTED icp_score/);
  const patches = reqs(res.log, 'PATCH', '/rest/v1/li_prospects?');
  assert.ok(patches.every((p) => /status=eq\.new/.test(p.url)));
  assert.deepEqual(patches.map((p) => bodyOf(p).status), ['qualified', 'rejected', 'rejected']);
});

test('write-import: passing welcome → approved; a second validation failure leaves the prospect qualified', () => {
  const home = makeHome();
  const file = writeFile(home, 'w.json', [
    { id: 1, welcome_message: 'Your point on reply rates stuck with me. What is your current reply rate?' },
    { id: 2, welcome_message: 'Check out mysite.com and tell me what you think?' },
    { id: 3, welcome_message: 'x'.repeat(401) },
    { id: 4, welcome_message: 'Hi there, how is it going?', connect_note: 'Hi!' },
  ]);
  const res = run(home, ['write-import', file], [
    {
      method: 'GET',
      urlPattern: rx('/rest/v1/li_prospects?'),
      body: [1, 2, 3, 4].map((id) => ({ id, public_id: `p${id}`, status: 'qualified' })),
    },
    // prospect 2 already failed once
    { method: 'GET', urlPattern: rx('/rest/v1/li_messages?'), body: [{ id: 52, prospect_id: 2, body: 'old', status: 'failed', attempts: 1 }] },
    { method: 'POST', urlPattern: rx('/rest/v1/li_messages'), body: [{ id: 99 }] },
    { method: 'PATCH', urlPattern: rx('/rest/v1/li_messages?'), body: [{ id: 52 }] },
    { method: 'PATCH', urlPattern: rx('/rest/v1/li_prospects?'), body: [{ id: 1 }] },
  ]);
  assert.equal(res.status, 1);

  const promoted = reqs(res.log, 'PATCH', '/rest/v1/li_prospects?');
  assert.deepEqual(promoted.map((p) => [p.url.match(/id=eq\.(\d+)/)[1], bodyOf(p).status]), [['1', 'approved']]);
  assert.match(promoted[0].url, /status=eq\.qualified/);

  const inserted = reqs(res.log, 'POST', '/rest/v1/li_messages').map(bodyOf);
  assert.deepEqual(inserted.map((m) => [m.prospect_id, m.kind, m.external_id, m.status, m.attempts]), [
    [1, 'welcome', 'welcome:1', 'draft', undefined],
    [3, 'welcome', 'welcome:3', 'failed', 1],
    [4, 'welcome', 'welcome:4', 'failed', 1],
  ]);
  assert.match(reqs(res.log, 'GET', '/rest/v1/li_messages?')[0].url, /external_id=in\.\(%22welcome%3A1%22%2C%22welcome%3A2%22/,
    'in.() values are URL-encoded');
  const second = reqs(res.log, 'PATCH', '/rest/v1/li_messages?', 'id=eq.52').map(bodyOf);
  assert.deepEqual(second.map((m) => [m.status, m.attempts]), [['failed', 2]]);
  assert.deepEqual(reqs(res.log, 'POST', '/rest/v1/li_alerts').map(bodyOf).map((a) => [a.kind, a.prospect_id]), [['welcome_rejected', 2]]);
  assert.match(res.stdout, /connect_note is not allowed/);
});

test('write-export leaves out prospects whose welcome failed twice', () => {
  const home = makeHome();
  const res = run(home, ['write-export'], [
    { method: 'GET', urlPattern: rx('/rest/v1/li_prospects?', 'status=eq.qualified'), body: [1, 2, 3].map((id) => ({ id, public_id: `p${id}` })) },
    {
      method: 'GET',
      urlPattern: rx('/rest/v1/li_messages?'),
      body: [
        { id: 52, prospect_id: 2, body: 'bad twice', status: 'failed', attempts: 2 },
        { id: 53, prospect_id: 3, body: 'bad once', status: 'failed', attempts: 1 },
      ],
    },
  ]);
  assert.equal(res.status, 0, res.stderr);
  const exported = JSON.parse(res.stdout);
  assert.deepEqual(exported.prospects.map((p) => p.id), [1, 3]);
  assert.equal(exported.prospects[1].previous_rejected_welcome, 'bad once');
});

test('write-import: the same id twice in one file, the last row wins and the earlier one is reported', () => {
  const home = makeHome();
  const file = writeFile(home, 'dup.json', [
    { id: 1, welcome_message: 'First draft, about your post. How is it going?' },
    { id: 1, welcome_message: 'Second draft, about your reply-rate point. What changed for you?' },
  ]);
  const res = run(home, ['write-import', file], [
    { method: 'GET', urlPattern: rx('/rest/v1/li_prospects?'), body: [{ id: 1, public_id: 'p1', status: 'qualified' }] },
    { method: 'GET', urlPattern: rx('/rest/v1/li_messages?'), body: [] },
    { method: 'POST', urlPattern: rx('/rest/v1/li_messages'), body: [{ id: 99 }] },
    { method: 'PATCH', urlPattern: rx('/rest/v1/li_prospects?'), body: [{ id: 1 }] },
  ]);
  assert.equal(res.status, 0, res.stderr);
  assert.match(res.stdout, /row 0 \(id 1\): ignored, id 1 appears again later/);
  const inserted = reqs(res.log, 'POST', '/rest/v1/li_messages').map(bodyOf);
  assert.deepEqual(inserted.map((m) => m.body), ['Second draft, about your reply-rate point. What changed for you?']);
});
