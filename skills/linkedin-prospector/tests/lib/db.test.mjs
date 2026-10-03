import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { select, insert, update, rpc, toQuery, inList, DbError } from '../../scripts/lib/db.mjs';
import { setupEnv, SUPABASE } from './_env.mjs';

let env;
afterEach(() => env?.cleanup());

test('toQuery: objects become equality filters, null becomes is.null, strings pass through', () => {
  assert.equal(toQuery({ status: 'new', resolved_at: null, select: 'id,public_id', order: 'id.asc', limit: 5 }),
    'status=eq.new&resolved_at=is.null&select=id%2Cpublic_id&order=id.asc&limit=5');
  assert.equal(toQuery('?status=neq.do_not_contact'), 'status=neq.do_not_contact');
});

test('select sends the service key and returns rows', async () => {
  env = setupEnv([{ method: 'GET', urlPattern: '/rest/v1/li_prospects\\?status=eq.new', status: 200, body: [{ id: 1 }] }]);
  assert.deepEqual(await select('li_prospects', { status: 'new' }), [{ id: 1 }]);
  const [entry] = env.log();
  assert.equal(entry.url, `${SUPABASE}/rest/v1/li_prospects?status=eq.new`);
});

test('insert with onConflict asks for an upsert that keeps the first row', async () => {
  env = setupEnv([{ method: 'POST', urlPattern: '/rest/v1/li_prospects\\?on_conflict=public_id$', status: 201, body: [{ id: 3 }] }]);
  const rows = await insert('li_prospects', [{ public_id: 'a' }], { onConflict: 'public_id', ignoreDuplicates: true });
  assert.deepEqual(rows, [{ id: 3 }]);
  assert.equal(env.log()[0].body, '[{"public_id":"a"}]');
});

test('update refuses to run with no filter', async () => {
  env = setupEnv([]);
  await assert.rejects(update('li_prospects', {}, { status: 'new' }), /no filter given/);
  await assert.rejects(update('li_prospects', { select: 'id' }, { status: 'new' }), /no filter given/);
  assert.equal(env.log().length, 0);
});

test('a non-2xx answer throws DbError with status and body', async () => {
  env = setupEnv([{ method: 'POST', urlPattern: '/rest/v1/li_prospects', status: 409,
    body: { code: '23505', message: 'duplicate key value violates unique constraint' } }]);
  await assert.rejects(insert('li_prospects', { public_id: 'a' }), (err) => {
    assert.ok(err instanceof DbError);
    assert.equal(err.status, 409);
    assert.equal(err.body.code, '23505');
    assert.match(err.message, /409: duplicate key/);
    return true;
  });
});

test('rpc posts the arguments to /rpc/<fn>', async () => {
  env = setupEnv([{ method: 'POST', urlPattern: '/rest/v1/rpc/claim_message$', status: 200, body: true }]);
  assert.equal(await rpc('claim_message', { p_id: 9 }), true);
  assert.equal(env.log()[0].body, '{"p_id":9}');
});

test('missing Supabase credentials fail before any request', async () => {
  env = setupEnv([]);
  delete process.env.SUPABASE_SERVICE_KEY;
  await assert.rejects(select('li_alerts'), /missing SUPABASE_SERVICE_KEY/);
  assert.equal(env.log().length, 0);
});

const AWKWARD = ['a,b', '(x)', 'say "hi"', 'a&b', '#1', 'back\\slash', 'plain'];
const EXPECTED_LIST = 'in.("a,b","(x)","say \\"hi\\"","a&b","#1","back\\\\slash","plain")';

test('inList quotes every value, escapes quotes and backslashes, and URL-encodes the whole list', () => {
  const v = inList(AWKWARD);
  assert.equal(decodeURIComponent(v), EXPECTED_LIST);
  assert.ok(!/[&#,"\s]/.test(v), `raw delimiter left in ${v}`);
  assert.equal(inList([]), 'in.()');
  assert.equal(decodeURIComponent(inList([5, 7])), 'in.("5","7")');
  assert.throws(() => inList('a,b'), /array/);
});

test('inList survives the trip through a real query string', async () => {
  env = setupEnv([{ method: 'GET', urlPattern: '/rest/v1/li_prospects', status: 200, body: [] }]);
  await select('li_prospects', `public_id=${inList(AWKWARD)}&select=id`);
  const url = new URL(env.log()[0].url);
  assert.deepEqual([...url.searchParams.keys()], ['public_id', 'select']);
  assert.equal(url.searchParams.get('public_id'), EXPECTED_LIST);
  assert.equal(url.hash, '');
});

test('a list value in an object filter becomes the same in.() filter', () => {
  const params = new URLSearchParams(toQuery({ public_id: AWKWARD, select: 'id' }));
  assert.equal(params.get('public_id'), EXPECTED_LIST);
  assert.equal(params.get('select'), 'id');
});
