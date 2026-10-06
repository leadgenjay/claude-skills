// Phase B tests: draft, send, verify, abandon. Every refusal is paired with a positive
// control in the same setup, and the fake server counts POSTs, so "nothing was sent"
// is measured rather than assumed.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync, readFileSync, existsSync, statSync, readdirSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { fakeUnipile, run, tmpCache, testEnv, accountsOk, people, me, formText, WA } from './harness.mjs';
import { checkText, writeJsonAtomic } from '../scripts/wa.mjs';

/** A .txt blocklist in a fresh folder; returns its path. */
function blocklist(words = ['Acmemail', 'Mission Box']) {
  const p = join(tmpCache(), 'blocked.txt');
  writeFileSync(p, `# words no reply may contain\n${words.join('\n')}\n`);
  return p;
}

/**
 * A stateful fake WhatsApp: one chat whose message list grows when a POST lands.
 * Options shape what the read-back after a send looks like.
 */
function world({ chat = {}, getMessage, postStatus = 200, postReply, postDelayMs = 0 } = {}) {
  const state = {
    msgs: [{ id: 'm0', timestamp: '2026-10-06T10:00:00Z', text: 'can you send the link?', is_sender: 0, sender_attendee_id: 'a1' }],
    posts: 0,
  };
  const c1 = { id: 'c1', type: 0, name: null, read_only: 0, account_id: WA, provider_id: 'x@s.whatsapp.net', ...chat };
  const newestFirst = () => [...state.msgs].reverse();
  const routes = {
    'GET accounts': accountsOk,
    'GET chats/c1': () => ({ json: c1 }),
    'GET chats/c1/attendees': people(me, { id: 'a1', name: 'Maria Lopez', is_self: 0 }),
    'GET chats/c1/messages?limit=1': () => ({ json: { items: newestFirst().slice(0, 1) } }),
    'GET chats/c1/messages?limit=20': () => ({ json: { items: newestFirst().slice(0, 20) } }),
    'POST chats/c1/messages': async (req, url, raw) => {
      state.posts++;
      if (postDelayMs) await new Promise((r) => setTimeout(r, postDelayMs));
      if (postStatus !== 200) return { status: postStatus, json: { error: 'nope' } };
      const sent = { id: `sent${state.posts}`, timestamp: new Date().toISOString(), text: formText(raw), is_sender: 1 };
      state.msgs.push(sent);
      return { json: postReply ?? { object: 'MessageSent', message_id: sent.id } };
    },
  };
  // Default read-back: the message exists and is exactly what was sent.
  routes['GET messages/sent1'] = getMessage ?? (() => ({ json: state.msgs.find((m) => m.id === 'sent1') }));
  return { routes, state };
}

async function setup(opts = {}) {
  const w = world(opts);
  const f = await fakeUnipile(w.routes);
  const cache = tmpCache();
  const env = { ...testEnv(f.base, cache), WA_VERIFY_DELAY_MS: '5', ...(opts.env ?? {}) };
  // --after defaults to the chat's current newest message, as if Claude had just read the thread.
  const draftText = async (text, extra = [], after = w.state.msgs.at(-1)?.id ?? 'none') => {
    const file = join(tmpCache(), 'reply.txt');
    writeFileSync(file, text);
    return run(['draft', '--chat', 'c1', '--text-file', file, '--after', after, ...extra], env);
  };
  const draftFile = (id) => join(cache, 'drafts', `${id}.json`);
  return { f, w, cache, env, draftText, draftFile };
}

const posts = (f) => f.hits.filter((h) => h.method === 'POST').length;

// ---- draft ----

test('draft: clean text is stored, nothing is sent, and a 10-character confirm code comes back', async () => {
  const s = await setup();
  const r = await s.draftText('Sure, here it is: https://example.com/x');
  await s.f.close();
  assert.equal(r.code, 0, r.stderr);
  assert.match(r.json.confirm, /^[0-9a-f]{10}$/);
  assert.equal(r.json.to, 'Maria Lopez');
  assert.equal(posts(s.f), 0);
  const d = JSON.parse(readFileSync(s.draftFile(r.json.draft_id), 'utf8'));
  assert.equal(d.state, 'drafted');
  assert.equal(d.snapshot_message_id, 'm0');
  assert.equal(statSync(s.draftFile(r.json.draft_id)).mode & 0o777, 0o600);
  assert.equal(statSync(join(s.cache, 'drafts')).mode & 0o777, 0o700);
});

test('draft: text rules, each refusal next to an accepted control', async () => {
  const s = await setup();
  const cases = [
    ['', false], ['   \n', false],
    ['x'.repeat(4001), false], ['x'.repeat(4000), true],
    ['this is **big**', false], ['this is *big* in WhatsApp', true],
    ['snake__case', false],
    ['see [the doc](https://a.b)', false], ['see https://a.b', true],
    ['# Heading\nbody', false], ['#1 priority', true],
    ['run `this`', false],
    ['| a | b |\n|---|---|', false], ['a | b', true],
    ['done \u2014 thanks', false], ['done, thanks', true],
  ];
  for (const [text, ok] of cases) {
    const r = await s.draftText(text);
    assert.equal(r.code === 0, ok, `${JSON.stringify(text.slice(0, 30))} expected ${ok ? 'accepted' : 'refused'}: ${r.stderr}`);
  }
  await s.f.close();
  assert.equal(posts(s.f), 0);
});

test('draft: groups need --group; read-only chats never; another account never', async () => {
  for (const [chat, extra, ok, why] of [
    [{ type: 1, provider_id: 'g@g.us', name: 'Team' }, [], false, /group chat/],
    [{ type: 1, provider_id: 'g@g.us', name: 'Team' }, ['--group'], true, null],
    [{ read_only: 1 }, [], false, /read-only/],
    [{ read_only: 2 }, [], false, /read-only/],
    [{ account_id: 'someone-else' }, [], false, /not the configured WhatsApp account/],
    [{ account_id: undefined }, [], false, /\(none given\)/],
    [{ provider_id: 'status@broadcast' }, [], false, /not a person or a group/],
    [{ provider_id: '1203630@newsletter' }, [], false, /not a person or a group/],
    [{ provider_id: '1234@lid' }, [], true, null],
    [{}, [], true, null],
  ]) {
    const s = await setup({ chat });
    const r = await s.draftText('ok', extra);
    await s.f.close();
    assert.equal(r.code === 0, ok, `${JSON.stringify(chat)} ${extra}: ${r.stderr}`);
    if (why) assert.match(r.stderr, why);
  }
});

test('checkText: a blocklist that will not load refuses everything; none configured passes', async () => {
  const bad = await checkText('hello', { loadList: async () => { throw new Error('missing file'); } });
  const none = await checkText('hello', { loadList: async () => null });
  const hit = await checkText('ask Acme', { loadList: async () => ({ path: 'x', hit: (t) => (/acme/i.test(t) ? 'Acme' : null) }) });
  assert.match(bad.join(';'), /blocklist could not load/);
  assert.deepEqual(none, []);
  assert.match(hit.join(';'), /"Acme", which is on your WA_BLOCKLIST/);
});

test('draft: a .txt blocklist refuses its words whole-word only, and no list allows them', async () => {
  const list = blocklist();
  const withList = await setup({ env: { WA_BLOCKLIST: list } });
  const cases = [
    ['our Acmemail boxes are capped', false], ['acmemail again', false], ['acmemailer is a different word', true],
    ['the Mission Box team', false], ['a mission boxing match', true],
  ];
  for (const [text, ok] of cases) {
    const r = await withList.draftText(text);
    assert.equal(r.code === 0, ok, `${text}: ${r.stderr}`);
    if (!ok) assert.match(r.stderr, /on your WA_BLOCKLIST/);
  }
  await withList.f.close();
  const noList = await setup();
  const r = await noList.draftText('our Acmemail boxes are capped');
  await noList.f.close();
  assert.equal(r.code, 0, `no WA_BLOCKLIST means no word check: ${r.stderr}`);
});

test('a blocklist that is set but missing: draft refuses, reads still work, health says why', async () => {
  const s = await setup({ env: { WA_BLOCKLIST: join(tmpCache(), 'gone.txt') } });
  s.w.routes['GET chats?account_id=' + WA + '&limit=50'] = { items: [{ id: 'c1', type: 0, timestamp: '2026-10-06T10:00:00Z' }] };
  s.w.routes['GET chats/c1/messages?limit=30'] = { items: [] };
  const d = await s.draftText('hello');
  const h = await run(['health'], s.env);
  const i = await run(['inbox'], s.env);
  const m = await run(['media', '--chat', 'c1'], s.env);
  await s.f.close();
  assert.equal(d.code, 1);
  assert.match(d.stderr, /blocklist could not load/);
  assert.equal(h.code, 1);
  assert.match(h.stderr, /cannot be read/);
  assert.equal(i.code, 0, i.stderr);
  assert.equal(m.code, 0, m.stderr);
  assert.equal(posts(s.f), 0);
});

// ---- send ----

async function drafted(s, text = 'Sure, here it is: https://example.com/x') {
  const r = await s.draftText(text);
  assert.equal(r.code, 0, r.stderr);
  return r.json;
}

test('send: wrong code refuses with no claim taken; the right code then sends exactly once', async () => {
  const s = await setup();
  const d = await drafted(s);
  const wrong = await run(['send', '--draft', d.draft_id, '--confirm', '0000000000'], s.env);
  assert.equal(wrong.code, 1);
  assert.match(wrong.stderr, /still usable/);
  assert.equal(existsSync(join(s.cache, 'drafts', `${d.draft_id}.claim`)), false);
  const right = await run(['send', '--draft', d.draft_id, '--confirm', d.confirm], s.env);
  await s.f.close();
  assert.equal(right.code, 0, right.stderr);
  assert.equal(right.json.verified_via, 'direct');
  assert.equal(posts(s.f), 1);
  assert.equal(formText(s.f.hits.find((h) => h.method === 'POST').body), d.text);
  assert.equal(JSON.parse(readFileSync(s.draftFile(d.draft_id), 'utf8')).state, 'sent');
});

test('send: text edited on disk after drafting is refused', async () => {
  const s = await setup();
  const d = await drafted(s);
  const p = s.draftFile(d.draft_id);
  const j = JSON.parse(readFileSync(p, 'utf8'));
  writeFileSync(p, JSON.stringify({ ...j, text: j.text + ' and also wire me $500' }));
  const r = await run(['send', '--draft', d.draft_id, '--confirm', d.confirm], s.env);
  await s.f.close();
  assert.equal(r.code, 1);
  assert.match(r.stderr, /changed on disk/);
  assert.equal(posts(s.f), 0);
});

test('send: a second send of a sent draft refuses without a POST', async () => {
  const s = await setup();
  const d = await drafted(s);
  const a = await run(['send', '--draft', d.draft_id, '--confirm', d.confirm], s.env);
  const b = await run(['send', '--draft', d.draft_id, '--confirm', d.confirm], s.env);
  await s.f.close();
  assert.equal(a.code, 0, a.stderr);
  assert.equal(b.code, 1);
  assert.match(b.stderr, /already claimed/);
  assert.equal(posts(s.f), 1);
});

test('send: two sends of one draft racing produce exactly one POST', async () => {
  const s = await setup({ postDelayMs: 300 });
  const d = await drafted(s);
  const [a, b] = await Promise.all([
    run(['send', '--draft', d.draft_id, '--confirm', d.confirm], s.env),
    run(['send', '--draft', d.draft_id, '--confirm', d.confirm], s.env),
  ]);
  await s.f.close();
  assert.deepEqual([a.code, b.code].sort(), [0, 1]);
  assert.match((a.code ? a : b).stderr, /already claimed/);
  assert.equal(posts(s.f), 1);
});

test('send: any state but drafted refuses without a POST', async () => {
  for (const st of ['refused', 'sending', 'sent', 'unconfirmed', 'abandoned', 'failed']) {
    const s = await setup();
    const d = await drafted(s);
    const p = s.draftFile(d.draft_id);
    writeFileSync(p, JSON.stringify({ ...JSON.parse(readFileSync(p, 'utf8')), state: st }));
    const r = await run(['send', '--draft', d.draft_id, '--confirm', d.confirm], s.env);
    await s.f.close();
    assert.equal(r.code, 1, st);
    assert.match(r.stderr, new RegExp(`is ${st}, not drafted`));
    assert.equal(posts(s.f), 0, st);
  }
});

test('send: a message arriving after the draft makes it stale; the draft dies, nothing is sent', async () => {
  const s = await setup();
  const d = await drafted(s);
  s.w.state.msgs.push({ id: 'm1', timestamp: '2026-10-06T10:05:00Z', text: 'actually never mind', is_sender: 0 });
  const r = await run(['send', '--draft', d.draft_id, '--confirm', d.confirm], s.env);
  await s.f.close();
  assert.equal(r.code, 1);
  assert.match(r.stderr, /someone wrote in the chat/);
  assert.equal(posts(s.f), 0);
  assert.equal(JSON.parse(readFileSync(s.draftFile(d.draft_id), 'utf8')).state, 'refused');
});

test('send: the text is re-checked at send time; a blocklist gone missing since drafting refuses', async () => {
  const list = blocklist();
  const s = await setup({ env: { WA_BLOCKLIST: list } });
  const d = await drafted(s);
  unlinkSync(list);
  const r = await run(['send', '--draft', d.draft_id, '--confirm', d.confirm], s.env);
  await s.f.close();
  assert.equal(r.code, 1);
  assert.match(r.stderr, /blocklist could not load/);
  assert.equal(posts(s.f), 0);
  assert.equal(JSON.parse(readFileSync(s.draftFile(d.draft_id), 'utf8')).state, 'refused');
});

test('send: a chat that turned read-only after drafting is refused', async () => {
  const s = await setup();
  const d = await drafted(s);
  s.w.routes['GET chats/c1'] = () => ({ json: { id: 'c1', type: 0, read_only: 1, account_id: WA } });
  const r = await run(['send', '--draft', d.draft_id, '--confirm', d.confirm], s.env);
  await s.f.close();
  assert.equal(r.code, 1);
  assert.match(r.stderr, /read-only/);
  assert.equal(posts(s.f), 0);
});

// ---- verify ----

async function sendWith(opts, text) {
  const s = await setup(opts);
  const d = await drafted(s, text);
  const r = await run(['send', '--draft', d.draft_id, '--confirm', d.confirm], s.env);
  await s.f.close();
  const file = JSON.parse(readFileSync(s.draftFile(d.draft_id), 'utf8'));
  return { r, file, posts: posts(s.f), s };
}

test('verify: a read that 404s twice then appears is direct_after_retry', async () => {
  let n = 0;
  const { r, file } = await sendWith({ getMessage: (req, url, raw, hits) => (++n <= 2 ? { status: 404, json: {} } : { json: { id: 'sent1', is_sender: 1, text: 'Sure, here it is: https://example.com/x' } }) });
  assert.equal(r.code, 0, r.stderr);
  assert.equal(r.json.verified_via, 'direct_after_retry');
  assert.equal(file.verify_attempts, 3);
});

test('verify: a read that 404s forever but is in the chat list is chat_list', async () => {
  const { r } = await sendWith({ getMessage: () => ({ status: 404, json: {} }) });
  assert.equal(r.code, 0, r.stderr);
  assert.equal(r.json.verified_via, 'chat_list');
});

test('verify: failures that must never read as sent', async () => {
  const text = 'Sure, here it is: https://example.com/x';
  const cases = {
    'absent everywhere': { getMessage: () => ({ status: 404, json: {} }), postReply: { object: 'MessageSent', message_id: 'ghost' } },
    'not from this account': { getMessage: () => ({ json: { id: 'sent1', is_sender: 0, text } }) },
    'different text': { getMessage: () => ({ json: { id: 'sent1', is_sender: 1, text: text + '!' } }) },
    'no message id': { postReply: { object: 'MessageSent' } },
  };
  for (const [name, opts] of Object.entries(cases)) {
    const { r, file, posts: p } = await sendWith(opts, text);
    assert.equal(r.code, 1, name);
    assert.match(r.stderr, /VERIFY BEFORE RETRY/, name);
    assert.equal(file.state, 'unconfirmed', name);
    assert.equal(p, 1, name);
  }
});

test('verify: a send that returns no message id stops at once, with no read-back of a null id', async () => {
  const { r, s } = await sendWith({ postReply: { object: 'MessageSent' } });
  assert.match(r.stderr, /returned no message id/);
  assert.equal(s.f.hits.filter((h) => h.path.startsWith('messages/')).length, 0);
});

test('verify: an earlier identical message of yours never confirms a send by text', async () => {
  const text = 'ok';
  const s = await setup({ getMessage: () => ({ status: 404, json: {} }), postReply: { object: 'MessageSent', message_id: 'ghost' } });
  // You already said "ok" earlier in this chat, before the draft.
  s.w.state.msgs.push({ id: 'old-ok', timestamp: '2026-10-06T09:59:00Z', text, is_sender: 1 });
  s.w.state.msgs.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  // The POST "lands" but under an id the read-back cannot find.
  s.w.routes['POST chats/c1/messages'] = () => { s.w.state.posts++; return { json: { object: 'MessageSent', message_id: 'ghost' } }; };
  const d = await drafted(s, text);
  const r = await run(['send', '--draft', d.draft_id, '--confirm', d.confirm], s.env);
  await s.f.close();
  assert.equal(r.code, 1);
  assert.equal(JSON.parse(readFileSync(s.draftFile(d.draft_id), 'utf8')).state, 'unconfirmed');
  assert.equal(posts(s.f), 1);
});

test('send: only listed statuses are definite rejections; the rest are unconfirmed', async () => {
  for (const [status, state] of [[400, 'failed'], [422, 'failed'], [429, 'failed'], [408, 'unconfirmed'], [502, 'unconfirmed']]) {
    const { r, file, posts: p } = await sendWith({ postStatus: status });
    assert.equal(file.state, state, String(status));
    assert.match(r.stderr, state === 'failed' ? /rejected the send/ : /VERIFY BEFORE RETRY/, String(status));
    assert.equal(p, 1, String(status));
  }
});

test('send: a dropped connection or an unreadable reply is unconfirmed, never failed', async () => {
  const dropped = await sendWith({});
  // Rebuild with a POST that kills the socket, and one that answers 200 with non-JSON.
  for (const [name, handler] of [
    ['dropped', (req) => { req.socket.destroy(); return new Promise(() => {}); }],
    ['non-JSON 200', () => ({ status: 200, body: '<html>ok</html>', type: 'text/html' })],
  ]) {
    const s = await setup();
    s.w.routes['POST chats/c1/messages'] = handler;
    const d = await drafted(s);
    const r = await run(['send', '--draft', d.draft_id, '--confirm', d.confirm], s.env);
    await s.f.close();
    assert.equal(r.code, 1, name);
    assert.match(r.stderr, /VERIFY BEFORE RETRY/, name);
    assert.equal(JSON.parse(readFileSync(s.draftFile(d.draft_id), 'utf8')).state, 'unconfirmed', name);
  }
  assert.equal(dropped.r.code, 0, 'control: the same setup with a normal POST sends');
});

test('send: a multi-line reply is confirmed even though multipart sends CRLF', async () => {
  const text = 'line one\nline two\n\nline four';
  const { r, s } = await sendWith({}, text);
  assert.equal(r.code, 0, r.stderr);
  const posted = formText(s.f.hits.find((h) => h.method === 'POST').body);
  assert.equal(posted.replace(/\r\n/g, '\n'), text, 'the words sent are the words approved');
});

test('send: changing the recipient, group permission or snapshot in the draft file is refused', async () => {
  for (const patch of [{ chat_id: 'c2' }, { group_ok: true }, { snapshot_message_id: 'm-other' }]) {
    const s = await setup();
    const d = await drafted(s);
    const p = s.draftFile(d.draft_id);
    writeFileSync(p, JSON.stringify({ ...JSON.parse(readFileSync(p, 'utf8')), ...patch }));
    const r = await run(['send', '--draft', d.draft_id, '--confirm', d.confirm], s.env);
    await s.f.close();
    assert.equal(r.code, 1, JSON.stringify(patch));
    assert.match(r.stderr, /changed on disk/);
    assert.equal(posts(s.f), 0);
  }
});

test('draft: --after must be the newest message; a newer one means the thread was not read', async () => {
  const s = await setup();
  const missing = await run(['draft', '--chat', 'c1', '--text-file', join(tmpCache(), 'x.txt')], s.env);
  const stale = await s.draftText('ok', [], 'm-older');
  const fresh = await s.draftText('ok');
  await s.f.close();
  assert.equal(missing.code, 2);
  assert.match(missing.stderr, /needs --after/);
  assert.equal(stale.code, 1);
  assert.match(stale.stderr, /arrived after the thread was read/);
  assert.equal(fresh.code, 0, fresh.stderr);
});

test('draft ids cannot reach outside the drafts folder', async () => {
  const s = await setup();
  const r = await run(['send', '--draft', '../../etc/passwd', '--confirm', 'x'], s.env);
  const a = await run(['abandon', '--draft', '../x'], s.env);
  await s.f.close();
  assert.equal(r.code, 2);
  assert.equal(a.code, 2);
  assert.match(r.stderr, /not a draft id/);
});

// ---- abandon and atomic writes ----

test('abandon: keeps where it came from, sends nothing, and the draft can never be sent after', async () => {
  for (const from of ['drafted', 'sending', 'unconfirmed']) {
    const s = await setup();
    const d = await drafted(s);
    const p = s.draftFile(d.draft_id);
    writeFileSync(p, JSON.stringify({ ...JSON.parse(readFileSync(p, 'utf8')), state: from }));
    const a = await run(['abandon', '--draft', d.draft_id], s.env);
    const r = await run(['send', '--draft', d.draft_id, '--confirm', d.confirm], s.env);
    const list = await run(['drafts'], s.env);
    await s.f.close();
    assert.equal(a.code, 0, a.stderr);
    assert.deepEqual(a.json, { draft_id: d.draft_id, state: 'abandoned', abandoned_from: from, was_claimed: false });
    assert.equal(r.code, 1);
    assert.equal(posts(s.f), 0);
    assert.equal(list.json.find((x) => x.draft_id === d.draft_id).abandoned_from, from);
  }
});

test('abandon: a sent draft cannot be abandoned', async () => {
  const s = await setup();
  const d = await drafted(s);
  await run(['send', '--draft', d.draft_id, '--confirm', d.confirm], s.env);
  const a = await run(['abandon', '--draft', d.draft_id], s.env);
  await s.f.close();
  assert.equal(a.code, 1);
  assert.match(a.stderr, /is sent/);
});

test('writeJsonAtomic: a failure before the rename leaves the previous file whole and no temp file', () => {
  const dir = tmpCache();
  const p = join(dir, 'd.json');
  writeJsonAtomic(p, { state: 'drafted' });
  assert.throws(() => writeJsonAtomic(p, { state: 'sending' }, () => { throw new Error('disk full'); }), /disk full/);
  assert.deepEqual(JSON.parse(readFileSync(p, 'utf8')), { state: 'drafted' });
  assert.deepEqual(readdirSync(dir), ['d.json']);
  assert.equal(statSync(p).mode & 0o777, 0o600);
});
