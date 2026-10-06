// Configuration tests: the config file, WA_ACCOUNT_ID, the optional blocklist, chat
// ownership on reads, and the commands that must stay offline. Every refusal is paired
// with an accepted control.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fakeUnipile, run, tmpCache, testEnv, writeConfig, accountsOk, chat, people, me, WA, TEST_KEY } from './harness.mjs';

const FILE_KEY = 'file-key-not-real';
const linkedin = { id: 'acct-li-1', type: 'LINKEDIN', name: 'Alex on LinkedIn', sources: [{ id: 'acct-li-1_MESSAGING', status: 'OK' }] };
const secondWa = { id: 'acct-wa-test-2', type: 'WHATSAPP', name: '15550100001', sources: [{ id: 'acct-wa-test-2_MESSAGING', status: 'OK' }] };

/** Test env without the API key or account id, so the config file is what supplies them. */
const bare = (base, cache) => {
  const e = testEnv(base, cache);
  delete e.WA_ACCOUNT_ID;
  return { ...e, UNIPILE_API_KEY: undefined };
};

// ---- the config file ----

test('config: keys are read from ~/.config/whatsapp-skill/.env', async () => {
  const f = await fakeUnipile({ 'GET accounts': accountsOk });
  const home = tmpCache();
  writeConfig(home, { UNIPILE_API_KEY: FILE_KEY, WA_ACCOUNT_ID: WA });
  const r = await run(['health'], bare(f.base, tmpCache()), home);
  await f.close();
  assert.equal(r.code, 0, r.stderr);
  assert.equal(f.hits[0].key, FILE_KEY);
  assert.equal(r.json.config_file, join(home, '.config', 'whatsapp-skill', '.env'));
  assert.equal(r.json.config_file_found, true);
});

test('config: the environment wins over the file, key by key', async () => {
  const f = await fakeUnipile({ 'GET accounts': accountsOk });
  const home = tmpCache();
  writeConfig(home, { UNIPILE_API_KEY: FILE_KEY, WA_ACCOUNT_ID: WA });
  const r = await run(['health'], { ...bare(f.base, tmpCache()), UNIPILE_API_KEY: TEST_KEY }, home);
  await f.close();
  assert.equal(r.code, 0, r.stderr);
  assert.equal(f.hits[0].key, TEST_KEY);
});

test('config: WA_CONFIG and WA_BLOCKLIST expand a leading ~/', async () => {
  const f = await fakeUnipile({ 'GET accounts': accountsOk });
  const home = tmpCache();
  mkdirSync(join(home, 'custom'));
  mkdirSync(join(home, 'lists'));
  writeFileSync(join(home, 'lists', 'b.txt'), 'Acmemail\n');
  writeFileSync(join(home, 'custom', 'wa.env'), `UNIPILE_API_KEY=${FILE_KEY}\nWA_ACCOUNT_ID=${WA}\nWA_BLOCKLIST=~/lists/b.txt\n`, { mode: 0o600 });
  const r = await run(['health'], { ...bare(f.base, tmpCache()), WA_CONFIG: '~/custom/wa.env' }, home);
  await f.close();
  assert.equal(r.code, 0, r.stderr);
  assert.equal(f.hits[0].key, FILE_KEY);
  assert.equal(r.json.blocklist, join(home, 'lists', 'b.txt'));
});

test('config: no file and no key names the file to create; a WA_CONFIG that does not exist refuses', async () => {
  const f = await fakeUnipile({ 'GET accounts': accountsOk });
  const home = tmpCache();
  const none = await run(['health'], { ...bare(f.base, tmpCache()), WA_ACCOUNT_ID: WA }, home);
  const named = await run(['health'], { ...testEnv(f.base, tmpCache()), WA_CONFIG: '~/nope.env' }, home);
  const control = await run(['health'], testEnv(f.base, tmpCache()), home);
  await f.close();
  assert.equal(none.code, 1);
  assert.match(none.stderr, new RegExp(`Missing UNIPILE_API_KEY: set it in ${join(home, '.config', 'whatsapp-skill', '.env')}`));
  assert.equal(named.code, 1);
  assert.match(named.stderr, /WA_CONFIG points at .*nope\.env, which does not exist/);
  assert.equal(control.code, 0, control.stderr);
  assert.equal(control.json.config_file_found, false);
});

test('config: a file other users can read is refused before any request; mode 600 is accepted', async () => {
  for (const mode of [0o644, 0o640, 0o604]) {
    const f = await fakeUnipile({ 'GET accounts': accountsOk });
    const home = tmpCache();
    writeConfig(home, { UNIPILE_API_KEY: FILE_KEY, WA_ACCOUNT_ID: WA }, mode);
    const r = await run(['health'], bare(f.base, tmpCache()), home);
    await f.close();
    assert.equal(r.code, 1, mode.toString(8));
    assert.match(r.stderr, /chmod 600/);
    assert.equal(f.hits.length, 0, `mode ${mode.toString(8)} made a request`);
  }
  const f = await fakeUnipile({ 'GET accounts': accountsOk });
  const home = tmpCache();
  writeConfig(home, { UNIPILE_API_KEY: FILE_KEY, WA_ACCOUNT_ID: WA }, 0o600);
  const ok = await run(['health'], bare(f.base, tmpCache()), home);
  await f.close();
  assert.equal(ok.code, 0, ok.stderr);
});

// ---- the account ----

test('account: missing WA_ACCOUNT_ID refuses and lists only WhatsApp accounts as lines to paste', async () => {
  const f = await fakeUnipile({ 'GET accounts': { items: [...accountsOk.items, linkedin, secondWa] } });
  const env = { ...testEnv(f.base, tmpCache()), WA_ACCOUNT_ID: undefined };
  const h = await run(['health'], env);
  const i = await run(['inbox'], env);
  await f.close();
  for (const r of [h, i]) {
    assert.equal(r.code, 1);
    assert.match(r.stderr, /WA_ACCOUNT_ID is not set/);
    assert.match(r.stderr, new RegExp(`WA_ACCOUNT_ID=${WA}`));
    assert.match(r.stderr, /WA_ACCOUNT_ID=acct-wa-test-2/);
    assert.doesNotMatch(r.stderr, /acct-li-1/);
  }
  assert.equal(f.hits.filter((x) => x.path.startsWith('chats')).length, 0, 'no chat is read without an account');
});

test('account: missing WA_ACCOUNT_ID with no WhatsApp connected says to connect one', async () => {
  const f = await fakeUnipile({ 'GET accounts': { items: [linkedin] } });
  const r = await run(['health'], { ...testEnv(f.base, tmpCache()), WA_ACCOUNT_ID: undefined });
  await f.close();
  assert.equal(r.code, 1);
  assert.match(r.stderr, /No WhatsApp account is connected/);
});

test('account: set and present passes; absent or not WhatsApp refuses', async () => {
  const f = await fakeUnipile({ 'GET accounts': { items: [...accountsOk.items, linkedin] } });
  const ok = await run(['health'], testEnv(f.base, tmpCache()));
  const absent = await run(['health'], { ...testEnv(f.base, tmpCache()), WA_ACCOUNT_ID: 'acct-gone' });
  const li = await run(['health'], { ...testEnv(f.base, tmpCache()), WA_ACCOUNT_ID: 'acct-li-1' });
  await f.close();
  assert.equal(ok.code, 0, ok.stderr);
  assert.equal(ok.json.account_id, WA);
  assert.equal(absent.code, 1);
  assert.match(absent.stderr, /acct-gone is not in Unipile/);
  assert.match(absent.stderr, new RegExp(`WA_ACCOUNT_ID=${WA}`));
  assert.equal(li.code, 1);
  assert.match(li.stderr, /is a LINKEDIN account, not WhatsApp/);
});

// ---- chat ownership on reads ----

test('thread and media: another account\'s chat is refused before any message is read', async () => {
  const msgs = { items: [{ id: 'm1', timestamp: '2026-10-06T10:01:00Z', text: 'hi', attachments: [
    { id: 'p1', type: 'img', mimetype: 'image/jpeg', file_size: 3 }] }] };
  const routes = (accountId) => ({
    'GET chats/c9': chat('c9', { account_id: accountId }),
    'GET chats/c9/messages?limit=30': msgs,
    'GET chats/c9/attendees': people(me),
    'GET messages/m1/attachments/p1': () => ({ body: Buffer.from([1, 2, 3]), type: 'image/jpeg' }),
  });
  const reads = (f) => f.hits.filter((h) => h.path.includes('/messages') || h.path.startsWith('messages/') || h.path.endsWith('/attendees')).length;

  const other = await fakeUnipile(routes('acct-li-1'));
  const t = await run(['thread', '--chat', 'c9'], testEnv(other.base, tmpCache()));
  const m = await run(['media', '--chat', 'c9'], testEnv(other.base, tmpCache()));
  await other.close();
  assert.equal(t.code, 1);
  assert.match(t.stderr, /not the configured WhatsApp account/);
  assert.equal(m.code, 1);
  assert.match(m.stderr, /not the configured WhatsApp account/);
  assert.equal(reads(other), 0);

  const own = await fakeUnipile(routes(WA));
  const t2 = await run(['thread', '--chat', 'c9'], testEnv(own.base, tmpCache()));
  const m2 = await run(['media', '--chat', 'c9'], testEnv(own.base, tmpCache()));
  await own.close();
  assert.equal(t2.code, 0, t2.stderr);
  assert.equal(m2.code, 0, m2.stderr);
  assert.equal(m2.json.saved.length, 1);
});

// ---- health ----

test('health: reports the config it read and which keys are set, never their values', async () => {
  const f = await fakeUnipile({ 'GET accounts': accountsOk });
  const home = tmpCache();
  writeConfig(home, { UNIPILE_API_KEY: FILE_KEY, UNIPILE_DSN: 'api0.example.invalid:1', WA_ACCOUNT_ID: WA });
  const r = await run(['health'], bare(f.base, tmpCache()), home);
  await f.close();
  assert.equal(r.code, 0, r.stderr);
  assert.equal(r.json.ok, true);
  assert.deepEqual(r.json.keys_present, { UNIPILE_API_KEY: true, UNIPILE_DSN: true, WA_ACCOUNT_ID: true, WA_BLOCKLIST: false });
  assert.equal(r.json.blocklist, 'off');
  assert.equal(r.json.status, 'OK');
  assert.ok(!r.stdout.includes(FILE_KEY) && !r.stderr.includes(FILE_KEY), 'the key value is never printed');
});

// ---- the blocklist ----

test('blocklist: every misconfiguration fails health and draft; a good .txt and a good .mjs pass', async () => {
  const dir = tmpCache();
  const p = (name, body) => { const x = join(dir, name); writeFileSync(x, body); return x; };
  const bad = {
    'empty value': '   ',
    'comments only': p('empty.txt', '# nothing here\n\n'),
    'missing file': join(dir, 'missing.txt'),
    'wrong extension': p('words.json', '["Acme"]'),
    'module without vendorHit': p('nohit.mjs', 'export const VENDORS = [];\n'),
    'relative path': 'lists/words.txt',
  };
  const good = {
    txt: p('good.txt', 'Acmemail\n'),
    mjs: p('good.mjs', "export const vendorHit = (t) => (/\\bacmemail\\b/i.test(t) ? 'Acmemail' : null);\n"),
  };
  const routes = {
    'GET accounts': accountsOk,
    'GET chats/c1': chat('c1'),
    'GET chats/c1/attendees': people(me, { id: 'a1', name: 'Maria Lopez', is_self: 0 }),
    'GET chats/c1/messages?limit=1': { items: [{ id: 'm0', timestamp: '2026-10-06T10:00:00Z', text: 'hi' }] },
  };
  const f = await fakeUnipile(routes);
  const reply = p('reply.txt', 'hello there');
  const vendorReply = p('vendor.txt', 'our Acmemail boxes');
  for (const [name, value] of Object.entries(bad)) {
    const env = { ...testEnv(f.base, tmpCache()), WA_BLOCKLIST: value };
    const h = await run(['health'], env);
    const d = await run(['draft', '--chat', 'c1', '--text-file', reply, '--after', 'm0'], env);
    assert.equal(h.code, 1, `health, ${name}`);
    assert.equal(d.code, 1, `draft, ${name}`);
    assert.match(d.stderr, /blocklist could not load/, name);
  }
  for (const [name, value] of Object.entries(good)) {
    const env = { ...testEnv(f.base, tmpCache()), WA_BLOCKLIST: value };
    const h = await run(['health'], env);
    const clean = await run(['draft', '--chat', 'c1', '--text-file', reply, '--after', 'm0'], env);
    const hit = await run(['draft', '--chat', 'c1', '--text-file', vendorReply, '--after', 'm0'], env);
    assert.equal(h.code, 0, `${name}: ${h.stderr}`);
    assert.equal(h.json.blocklist, value);
    assert.equal(clean.code, 0, `${name}: ${clean.stderr}`);
    assert.equal(hit.code, 1, name);
    assert.match(hit.stderr, /"Acmemail", which is on your WA_BLOCKLIST/, name);
  }
  await f.close();
  assert.equal(f.hits.filter((h) => h.method === 'POST').length, 0);
});

// ---- offline commands ----

test('drafts and abandon work offline, with no account and no reachable API', async () => {
  const cache = tmpCache();
  mkdirSync(join(cache, 'drafts'), { recursive: true });
  const id = '2026-10-06-0000beef';
  writeFileSync(join(cache, 'drafts', `${id}.json`), JSON.stringify({ draft_id: id, chat_id: 'c1', to: 'Maria Lopez', text: 'hi', state: 'unconfirmed' }));
  const env = { WA_TEST: '1', WA_API_BASE: 'http://127.0.0.1:1/api/v1', WA_CACHE_DIR: cache, UNIPILE_API_KEY: undefined };
  const list = await run(['drafts'], env);
  const a = await run(['abandon', '--draft', id], env);
  assert.equal(list.code, 0, list.stderr);
  assert.equal(list.json[0].state, 'unconfirmed');
  assert.equal(a.code, 0, a.stderr);
  assert.equal(JSON.parse(readFileSync(join(cache, 'drafts', `${id}.json`), 'utf8')).state, 'abandoned');
  // Control: a command that needs the network fails in the same setup.
  const h = await run(['health'], env);
  assert.equal(h.code, 1);
});
