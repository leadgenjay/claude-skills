import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { scoreCreators, postFromItem, median, normalizePublicId } from '../../scripts/prospector.mjs';
import { makeHome, run, rx, reqs, bodyOf, apifyRunMocks } from './helpers.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ITEMS = JSON.parse(fs.readFileSync(path.join(HERE, 'fixtures/post-search-items.json'), 'utf8'));

test('median handles odd and even counts', () => {
  assert.equal(median([120, 60, 120]), 120);
  assert.equal(median([12, 20, 30, 40]), 25);
  assert.equal(median([]), 0);
});

test('public ids are normalized from URLs', () => {
  assert.equal(normalizePublicId('https://www.linkedin.com/in/Me-Myself/?utm=x'), 'me-myself');
  assert.equal(normalizePublicId('https://linkedin.com/in/j%C3%B6rg/'), 'jörg');
});

test('creator score is median(reactions + 2 x comments), 3+ posts, self dropped, top N approved', () => {
  const scored = scoreCreators(ITEMS.map(postFromItem), {
    selfProfileUrl: 'https://www.linkedin.com/in/me-myself/',
    topN: 2,
  });
  const ids = scored.map((c) => c.publicId);
  assert.deepEqual(ids, ['dave', 'alice', 'carol']);
  assert.ok(!ids.includes('me-myself'), 'own profile excluded');
  assert.ok(!ids.includes('bob'), 'fewer than 3 posts excluded');
  assert.deepEqual(scored.map((c) => c.score), [200, 120, 25]);
  assert.deepEqual(scored.map((c) => c.approved), [true, true, false]);
});

test('find-creators stores the scored creators from a mocked Apify run', () => {
  const home = makeHome();
  const res = run(home, ['find-creators'], [
    { method: 'POST', urlPattern: rx('/rest/v1/rpc/reserve_spend'), body: { ok: true, run_id: 7 } },
    ...apifyRunMocks('harvestapi~linkedin-post-search', ITEMS, { cost: 0.03 }),
    { method: 'POST', urlPattern: rx('/rest/v1/rpc/settle_spend'), body: null },
    { method: 'GET', urlPattern: rx('/rest/v1/li_creators?'), body: [] },
    {
      method: 'POST',
      urlPattern: rx('/rest/v1/li_creators'),
      body: [
        { id: 1, profile_url: 'https://www.linkedin.com/in/dave' },
        { id: 2, profile_url: 'https://www.linkedin.com/in/alice' },
        { id: 3, profile_url: 'https://www.linkedin.com/in/carol' },
      ],
    },
    { method: 'POST', urlPattern: rx('/rest/v1/li_posts'), body: [] },
  ]);
  assert.equal(res.status, 0, res.stderr);

  const apifyRun = reqs(res.log, 'POST', 'acts/harvestapi~linkedin-post-search/runs?');
  assert.equal(apifyRun.length, 1);
  assert.equal(bodyOf(apifyRun[0]).maxItems, 50, 'maxItems always set in the input');
  assert.match(apifyRun[0].url, /[?&]maxItems=50(&|$)/, 'and as the platform cap');
  assert.match(apifyRun[0].url, /[?&]maxTotalChargeUsd=0\.0875(&|$)/, 'charge capped at the estimate');
  assert.equal(reqs(res.log, 'GET', 'runs/last').length, 0, 'never reads "last run of the actor"');
  assert.equal(reqs(res.log, 'GET', 'datasets/ds-run-harvestapi~linkedin-post-search/items').length, 1, 'items from this run');

  const creators = bodyOf(reqs(res.log, 'POST', '/rest/v1/li_creators')[0]);
  assert.deepEqual(creators.map((c) => [c.profile_url.split('/in/')[1], c.status]),
    [['dave', 'approved'], ['alice', 'approved'], ['carol', 'candidate']]);
  assert.ok(!JSON.stringify(creators).includes('me-myself'));

  const settle = bodyOf(reqs(res.log, 'POST', 'rpc/settle_spend')[0]);
  assert.deepEqual(settle, { p_run_id: 7, p_actual: 0.03, p_error: null }, 'settled with the run record cost');

  const posts = bodyOf(reqs(res.log, 'POST', '/rest/v1/li_posts')[0]);
  assert.equal(posts.length, 10, 'posts of the three scored creators');
});

test('find-creators uses config creator_urls instead of discovery, with no Apify call', () => {
  const home = makeHome({ creator_urls: ['https://www.linkedin.com/in/Zed/', 'https://www.linkedin.com/in/me-myself'] });
  const res = run(home, ['find-creators'], [
    { method: 'POST', urlPattern: rx('/rest/v1/li_creators'), body: [{ id: 1 }] },
  ]);
  assert.equal(res.status, 0, res.stderr);
  assert.equal(reqs(res.log, 'POST', 'api.apify.com').length + reqs(res.log, 'GET', 'api.apify.com').length, 0);
  const rows = bodyOf(reqs(res.log, 'POST', '/rest/v1/li_creators')[0]);
  assert.deepEqual(rows, [{ profile_url: 'https://www.linkedin.com/in/zed', status: 'approved', discovered_via: 'config' }]);
});
