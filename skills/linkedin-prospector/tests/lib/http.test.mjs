import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { request, HttpError, USER_AGENT, redactUrl } from '../../scripts/lib/http.mjs';
import { setupEnv } from './_env.mjs';

let env;
afterEach(() => env?.cleanup());

test('offline with no mock: every request throws and nothing is fetched', async () => {
  env = setupEnv();
  env.noMocks();
  await assert.rejects(request('GET', 'https://api.apify.com/v2/users/me'), (err) => {
    assert.ok(err instanceof HttpError);
    assert.match(err.message, /offline mode/);
    return true;
  });
  const [entry] = env.log();
  assert.equal(entry.error, 'offline');
  assert.equal(entry.mocked, false);
});

test('mock: serves the first matching entry, filters by method, honours times', async () => {
  env = setupEnv([
    { method: 'POST', urlPattern: '/v2/campaigns/\\d+/audience', status: 500, body: { error: 'boom' }, times: 1 },
    { method: 'POST', urlPattern: '/v2/campaigns/\\d+/audience', status: 201, body: { ok: true } },
    { method: 'GET', urlPattern: '/v2/campaigns/42$', status: 200, body: { id: 42, state: 'PAUSED' } },
  ]);
  const first = await request('POST', 'https://api.aimfox.com/api/v2/campaigns/42/audience', { body: { urn: 'u' } });
  assert.deepEqual(first, { status: 500, body: { error: 'boom' }, headers: {} });
  const second = await request('POST', 'https://api.aimfox.com/api/v2/campaigns/42/audience', { body: { urn: 'u' } });
  assert.equal(second.status, 201);
  const get = await request('get', 'https://api.aimfox.com/api/v2/campaigns/42');
  assert.equal(get.body.state, 'PAUSED');
});

test('mock: an unmatched request throws instead of reaching the network', async () => {
  env = setupEnv([{ method: 'GET', urlPattern: 'only-this', status: 200, body: {} }]);
  await assert.rejects(request('DELETE', 'https://api.aimfox.com/api/v2/blacklist'), /no mock matched DELETE/);
  assert.equal(env.log()[0].error, 'no mock matched');
});

test('request log: one line per call, secrets in the query redacted, headers never written', async () => {
  env = setupEnv([{ urlPattern: 'apify\\.com', status: 200, body: { data: [] } }]);
  await request('POST', 'https://api.apify.com/v2/acts/x/runs?token=SECRET123&maxItems=5', {
    headers: { Authorization: 'Bearer SECRET456' },
    body: { maxItems: 5 },
  });
  const raw = JSON.stringify(env.log());
  assert.ok(!raw.includes('SECRET123'), 'query token leaked into the log');
  assert.ok(!raw.includes('SECRET456'), 'header leaked into the log');
  const [entry] = env.log();
  assert.equal(entry.method, 'POST');
  assert.match(entry.url, /token=REDACTED/);
  assert.match(entry.url, /maxItems=5/);
  assert.equal(entry.body, '{"maxItems":5}');
  assert.equal(entry.status, 200);
  assert.equal(entry.mocked, true);
  assert.equal(entry.ua, USER_AGENT);
});

test('a caller-set User-Agent is kept, not doubled', async () => {
  env = setupEnv([{ urlPattern: '.', status: 204 }]);
  await request('GET', 'https://example.test/x', { headers: { 'user-agent': 'custom/2' } });
  assert.equal(env.log()[0].ua, 'custom/2');
});

test('redactUrl leaves ordinary parameters alone', () => {
  assert.equal(redactUrl('https://x.test/a?limit=5&api_key=k'), 'https://x.test/a?limit=5&api_key=REDACTED');
  assert.equal(redactUrl('not a url'), 'not a url');
});

test('a FormData body goes through untouched and its fields are logged', async () => {
  env = setupEnv([{ method: 'POST', urlPattern: '/chats/abc/messages$', status: 201, body: { message_id: 'm1' } }]);
  const form = new FormData();
  form.append('text', 'Thanks, what time works?');
  form.append('attachments', new Blob(['x']), 'a.txt');
  const res = await request('POST', 'https://api1.unipile.com:13111/api/v1/chats/abc/messages', { body: form });
  assert.equal(res.status, 201);
  assert.deepEqual(env.log()[0].body, { form: { text: 'Thanks, what time works?', attachments: '[file a.txt]' } });
});
