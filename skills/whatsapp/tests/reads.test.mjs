// Phase A tests: every read guard, each with a positive control in the same setup.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, statSync, writeFileSync, mkdirSync, utimesSync, lutimesSync, symlinkSync } from 'node:fs';
import { join } from 'node:path';
import { fakeUnipile, run, tmpCache, testEnv, accountsOk, chat, group, people, me, WA, TEST_KEY } from './harness.mjs';

const JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff]), Buffer.alloc(97, 1)]); // 100 bytes

// ---- base URL guard ----

test('WA_API_BASE without WA_TEST=1 is refused and no request is made', async () => {
  const f = await fakeUnipile({ 'GET accounts': accountsOk });
  const r = await run(['health'], { WA_API_BASE: f.base });
  await f.close();
  assert.equal(r.code, 1);
  assert.match(r.stderr, /WA_TEST is not 1/);
  assert.equal(f.hits.length, 0);
});

test('WA_TEST=1 with a host outside the allowlist is refused before any request', async () => {
  // A real listener on ::1, which is loopback but not on the allowlist: if the guard
  // regressed, this server would record the request.
  const f = await fakeUnipile({ 'GET accounts': accountsOk }, '::1');
  const r = await run(['health'], { WA_TEST: '1', WA_API_BASE: f.base });
  await f.close();
  assert.equal(r.code, 1);
  assert.match(r.stderr, /not loopback/);
  assert.equal(f.hits.length, 0);
});

test('WA_TEST=1 with a loopback host is used, and the API key is sent', async () => {
  const f = await fakeUnipile({ 'GET accounts': accountsOk });
  const r = await run(['health'], testEnv(f.base, tmpCache()));
  await f.close();
  assert.equal(r.code, 0, r.stderr);
  assert.equal(f.hits[0].key, TEST_KEY);
});

// ---- health ----

test('health: pinned account missing fails', async () => {
  const f = await fakeUnipile({ 'GET accounts': { items: [{ id: 'other', type: 'WHATSAPP', sources: [{ id: 'other_MESSAGING', status: 'OK' }] }] } });
  const r = await run(['health'], testEnv(f.base, tmpCache()));
  await f.close();
  assert.equal(r.code, 1);
  assert.match(r.stderr, /not in Unipile/);
});

test('health: pinned account present but not OK fails', async () => {
  const f = await fakeUnipile({ 'GET accounts': { items: [{ id: WA, type: 'WHATSAPP', sources: [{ id: `${WA}_MESSAGING`, status: 'CREDENTIALS' }] }] } });
  const r = await run(['health'], testEnv(f.base, tmpCache()));
  await f.close();
  assert.equal(r.code, 1);
  assert.match(r.stderr, /CREDENTIALS, not OK/);
});

test('health: pinned account OK passes', async () => {
  const f = await fakeUnipile({ 'GET accounts': accountsOk });
  const r = await run(['health'], testEnv(f.base, tmpCache()));
  await f.close();
  assert.equal(r.code, 0, r.stderr);
  assert.equal(r.json.status, 'OK');
});

// ---- inbox / find ----

function inboxRoutes() {
  return {
    [`GET chats?account_id=${WA}&limit=50`]: { items: [chat('c1', { unread_count: 2 }), group('g1', { unread_count: 5 })], cursor: 'p2' },
    [`GET chats?account_id=${WA}&limit=50&cursor=p2`]: { items: [chat('c2'), chat('c3', { unread_count: 1 })], cursor: null },
    'GET chats/c1/attendees': people(me, { id: 'a1', name: 'Maria Lopez', is_self: 0 }),
    'GET chats/c2/attendees': people(me, { id: 'a2', name: 'Sam Patel', is_self: 0 }),
    'GET chats/c3/attendees': people(me, { id: 'a3', name: 'Sam Rivera', is_self: 0 }),
  };
}

test('inbox: 1:1 names come from attendees, groups keep their name, cursor is followed', async () => {
  const f = await fakeUnipile(inboxRoutes());
  const r = await run(['inbox', '--limit', '10'], testEnv(f.base, tmpCache()));
  await f.close();
  assert.equal(r.code, 0, r.stderr);
  assert.deepEqual(r.json.map((c) => c.name), ['Maria Lopez', 'Group g1', 'Sam Patel', 'Sam Rivera']);
  assert.deepEqual(r.json.map((c) => c.is_group), [false, true, false, false]);
});

test('inbox: --unread --dms keeps only unread 1:1s', async () => {
  const f = await fakeUnipile(inboxRoutes());
  const r = await run(['inbox', '--unread', '--dms'], testEnv(f.base, tmpCache()));
  await f.close();
  assert.equal(r.code, 0, r.stderr);
  assert.deepEqual(r.json.map((c) => c.chat_id), ['c1', 'c3']);
});

test('find: every match is returned, never just the first', async () => {
  const f = await fakeUnipile(inboxRoutes());
  const r = await run(['find', '--name', 'sam'], testEnv(f.base, tmpCache()));
  await f.close();
  assert.equal(r.code, 0, r.stderr);
  assert.deepEqual(r.json.matches.map((c) => c.name).sort(), ['Sam Patel', 'Sam Rivera']);
  assert.equal(r.json.scanned, 4);
  assert.equal(r.json.more, false);
});

test('find: a walk capped by --pages says more chats exist', async () => {
  const f = await fakeUnipile(inboxRoutes());
  const r = await run(['find', '--name', 'zzz', '--pages', '1'], testEnv(f.base, tmpCache()));
  await f.close();
  assert.equal(r.code, 0, r.stderr);
  assert.deepEqual(r.json.matches, []);
  assert.equal(r.json.scanned, 2);
  assert.equal(r.json.more, true, 'an empty result from a capped walk is not "no such person"');
});

test('inbox: one failing attendee lookup costs that chat its name, not the whole command', async () => {
  const routes = inboxRoutes();
  routes['GET chats/c2/attendees'] = () => ({ status: 429, json: { error: 'rate limited' } });
  const f = await fakeUnipile(routes);
  const r = await run(['inbox'], testEnv(f.base, tmpCache()));
  await f.close();
  assert.equal(r.code, 0, r.stderr);
  const c2 = r.json.find((c) => c.chat_id === 'c2');
  assert.equal(c2.name, 'c2@s.whatsapp.net');
  assert.match(c2.name_error, /429/);
  assert.equal(r.json.find((c) => c.chat_id === 'c1').name, 'Maria Lopez');
});

// ---- thread ----

test('thread: oldest first, senders resolved per message in a group, flags carried', async () => {
  const msg = (id, ts, o = {}) => ({ id, timestamp: ts, text: id, attachments: [], ...o });
  const f = await fakeUnipile({
    'GET chats/g1/messages?limit=30': { items: [ // newest first, as Unipile returns
      msg('m4', '2026-10-06T10:04:00Z', { sender_attendee_id: 'ghost', sender_id: 'raw-sender-id' }),
      msg('m3', '2026-10-06T10:03:00Z', { is_sender: 1 }),
      msg('m2', '2026-10-06T10:02:00Z', { sender_attendee_id: 'a2', deleted: 1, is_event: 1 }),
      msg('m1', '2026-10-06T10:01:00Z', { sender_attendee_id: 'a1', is_view_once: 1,
        attachments: [{ id: 'x1', type: 'img', mimetype: 'image/jpeg', file_size: 100, unavailable: true }] }),
    ] },
    'GET chats/g1/attendees': people(me, { id: 'a1', name: 'Maria Lopez' }, { id: 'a2', name: 'Sam Patel' }),
    'GET chats/g1': group('g1'),
  });
  const r = await run(['thread', '--chat', 'g1'], testEnv(f.base, tmpCache()));
  await f.close();
  assert.equal(r.code, 0, r.stderr);
  assert.deepEqual(r.json.map((m) => m.id), ['m1', 'm2', 'm3', 'm4']);
  assert.deepEqual(r.json.map((m) => m.from), ['Maria Lopez', 'Sam Patel', 'me', 'raw-sender-id']);
  assert.deepEqual(r.json[0].attachments[0], { id: 'x1', type: 'img', mimetype: 'image/jpeg', file_size: 100, unavailable: true, view_once: true });
  assert.equal(r.json[1].deleted, true);
  assert.equal(r.json[1].is_event, true);
  assert.equal(r.json[2].deleted, false);
});

test('thread: in a 1:1 the other person is named and your own messages are "me"', async () => {
  const f = await fakeUnipile({
    'GET chats/c1/messages?limit=30': { items: [
      { id: 'm2', timestamp: '2026-10-06T10:02:00Z', text: 'hi', is_sender: 1, sender_attendee_id: 'att-me' },
      { id: 'm1', timestamp: '2026-10-06T10:01:00Z', text: 'yo', sender_attendee_id: 'a1' },
    ] },
    'GET chats/c1/attendees': people(me, { id: 'a1', name: 'Maria Lopez', is_self: 0 }),
    'GET chats/c1': chat('c1'),
  });
  const r = await run(['thread', '--chat', 'c1'], testEnv(f.base, tmpCache()));
  await f.close();
  assert.equal(r.code, 0, r.stderr);
  assert.deepEqual(r.json.map((m) => [m.id, m.from]), [['m1', 'Maria Lopez'], ['m2', 'me']]);
});

// ---- media ----

function mediaRoutes({ goodBytes = JPEG } = {}) {
  const att = (id, o = {}) => ({ id, type: 'img', mimetype: 'image/jpeg', file_size: JPEG.length, unavailable: false, ...o });
  return {
    'GET chats/c1': chat('c1'),
    'GET chats/c1/messages?limit=30': { items: [
      { id: 'm1', timestamp: '2026-10-06T10:01:00Z', attachments: [att('good')] },
      { id: 'm2', timestamp: '2026-10-06T10:02:00Z', is_view_once: 1, attachments: [att('once')] },
      { id: 'm3', timestamp: '2026-10-06T10:03:00Z', attachments: [att('gone', { unavailable: true })] },
      { id: 'm4', timestamp: '2026-10-06T10:04:00Z', attachments: [att('huge', { file_size: 50 * 1024 * 1024 })] },
      { id: 'm5', timestamp: '2026-10-06T10:05:00Z', attachments: [att('stick', { sticker: true })] },
      { id: 'm6', timestamp: '2026-10-06T10:06:00Z', attachments: [att('short')] },
      { id: 'm7', timestamp: '2026-10-06T10:07:00Z', attachments: [{ id: 'vid', type: 'video', mimetype: 'video/mp4', file_size: 10 }] },
    ] },
    'GET messages/m1/attachments/good': () => ({ body: goodBytes, type: 'image/jpeg' }),
    'GET messages/m6/attachments/short': () => ({ body: JPEG.subarray(0, 40), type: 'image/jpeg' }),
  };
}

test('media: saves the good image, skips view-once/unavailable/oversize/sticker/video, fails a short download', async () => {
  const cache = tmpCache();
  const f = await fakeUnipile(mediaRoutes());
  const r = await run(['media', '--chat', 'c1'], testEnv(f.base, cache));
  await f.close();
  assert.equal(r.code, 1, 'a failed item makes the run exit non-zero');
  const { saved, skipped, failed } = r.json;
  assert.deepEqual(saved.map((s) => s.attachment_id), ['good']);
  assert.deepEqual(Object.fromEntries(skipped.map((s) => [s.attachment_id, s.reason])), {
    once: 'view_once', gone: 'unavailable', huge: 'over 10 MB', stick: 'sticker', vid: 'type video not requested',
  });
  assert.deepEqual(failed.map((s) => s.attachment_id), ['short']);
  assert.equal(f.hits.filter((h) => h.path.startsWith('messages/')).length, 2, 'skipped items are never downloaded');

  const dir = join(cache, 'media', 'c1');
  assert.deepEqual(readdirSync(dir), ['m1-good.jpg'], 'no final file and no .part for the failed download');
  assert.equal(statSync(join(dir, 'm1-good.jpg')).size, JPEG.length);
  assert.equal(statSync(join(dir, 'm1-good.jpg')).mode & 0o777, 0o600);
  assert.equal(statSync(dir).mode & 0o777, 0o700);
  assert.equal(statSync(join(cache, 'media')).mode & 0o777, 0o700);
});

test('media: an attachment of unknown size is cut off at the cap, leaving nothing behind', async () => {
  const cache = tmpCache();
  const f = await fakeUnipile({
    'GET chats/c1': chat('c1'),
    'GET chats/c1/messages?limit=30': { items: [{ id: 'm1', timestamp: '2026-10-06T10:01:00Z',
      attachments: [{ id: 'big', type: 'img', mimetype: 'image/jpeg', file_size: null }] }] },
    'GET messages/m1/attachments/big': () => ({ body: Buffer.alloc(300, 7), type: 'image/jpeg' }),
  });
  // --max-mb 0.0001 is about 104 bytes
  const r = await run(['media', '--chat', 'c1', '--max-mb', '0.0001'], testEnv(f.base, cache));
  await f.close();
  assert.equal(r.code, 1);
  assert.match(r.json.failed[0].error, /over the cap/);
  assert.deepEqual(readdirSync(join(cache, 'media', 'c1')), []);
});

test('media: --message that is not in the window fails instead of returning empty', async () => {
  const f = await fakeUnipile(mediaRoutes());
  const r = await run(['media', '--chat', 'c1', '--message', 'nope'], testEnv(f.base, tmpCache()));
  await f.close();
  assert.equal(r.code, 1);
  assert.match(r.stderr, /not in the last 30 messages/);
});

test('reads only: every request any command makes is a GET', async () => {
  const routes = { ...inboxRoutes(), ...mediaRoutes(), 'GET accounts': accountsOk,
    'GET chats/c1/attendees': people(me, { id: 'a1', name: 'Maria Lopez', is_self: 0 }) };
  const f = await fakeUnipile(routes);
  const env = testEnv(f.base, tmpCache());
  for (const args of [['health'], ['inbox'], ['find', '--name', 'a'], ['thread', '--chat', 'c1'], ['media', '--chat', 'c1']]) {
    await run(args, env);
  }
  await f.close();
  assert.ok(f.hits.length > 10, `expected real traffic, saw ${f.hits.length}`);
  assert.deepEqual([...new Set(f.hits.map((h) => h.method))], ['GET']);
});

test('media: a truncated file already in the cache is downloaded again', async () => {
  const cache = tmpCache();
  const dir = join(cache, 'media', 'c1');
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'm1-good.jpg'), JPEG.subarray(0, 10));
  const f = await fakeUnipile(mediaRoutes());
  const r = await run(['media', '--chat', 'c1', '--message', 'm1'], testEnv(f.base, cache));
  await f.close();
  assert.equal(r.code, 0, r.stderr);
  assert.equal(r.json.saved[0].from_cache, undefined);
  assert.equal(statSync(join(dir, 'm1-good.jpg')).size, JPEG.length);
});

test('media: a complete cached file is reused without a download', async () => {
  const cache = tmpCache();
  const dir = join(cache, 'media', 'c1');
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'm1-good.jpg'), JPEG);
  const f = await fakeUnipile(mediaRoutes());
  const r = await run(['media', '--chat', 'c1', '--message', 'm1'], testEnv(f.base, cache));
  await f.close();
  assert.equal(r.code, 0, r.stderr);
  assert.equal(r.json.saved[0].from_cache, true);
  assert.equal(f.hits.filter((h) => h.path.startsWith('messages/')).length, 0);
});

test('media: old files and stray .part files are swept, fresh ones kept', async () => {
  const cache = tmpCache();
  const other = join(cache, 'media', 'old-chat');
  mkdirSync(other, { recursive: true });
  writeFileSync(join(other, 'stale.jpg'), 'x');
  writeFileSync(join(other, 'fresh.jpg'), 'x');
  writeFileSync(join(other, 'half.jpg.part'), 'x');
  mkdirSync(join(other, 'a-subfolder'));
  symlinkSync('/nonexistent/target', join(other, 'dangling-link'));
  const eightDaysAgo = (Date.now() - 8 * 24 * 3600 * 1000) / 1000;
  utimesSync(join(other, 'stale.jpg'), eightDaysAgo, eightDaysAgo);
  // The folder and the link are stale too, so only the plain-file rule can be what spares them.
  utimesSync(join(other, 'a-subfolder'), eightDaysAgo, eightDaysAgo);
  lutimesSync(join(other, 'dangling-link'), eightDaysAgo, eightDaysAgo);
  const f = await fakeUnipile(mediaRoutes());
  await run(['media', '--chat', 'c1', '--message', 'm1'], testEnv(f.base, cache));
  await f.close();
  assert.deepEqual(readdirSync(other).sort(), ['a-subfolder', 'dangling-link', 'fresh.jpg'],
    'only stale and partial plain files go; folders and links are left alone and do not crash the sweep');
});

test('WA_CACHE_DIR is ignored without WA_TEST=1: the real cache under HOME is used', async () => {
  const cache = tmpCache();
  const home = tmpCache();
  const r = await run(['media', '--chat', 'c1'], { HOME: home, WA_CACHE_DIR: cache, UNIPILE_DSN: '127.0.0.1:1' });
  assert.notEqual(r.code, 0, 'no server there, so the run fails after setting up the cache');
  assert.equal(existsSync(join(cache, 'media')), false, 'override not honored');
  assert.equal(existsSync(join(home, '.cache', 'whatsapp-skill', 'media')), true, 'default location used');
});
