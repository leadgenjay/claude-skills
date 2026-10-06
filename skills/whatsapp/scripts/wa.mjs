#!/usr/bin/env node
/**
 * wa.mjs — your WhatsApp over Unipile: read chats, read a thread, download images,
 * and send a reply you approved.
 *
 * Exactly one code path writes to WhatsApp: `send`, which only sends a stored draft
 * whose approval hash matches `--confirm` (text, recipient and snapshot unchanged since
 * you approved it), once in that draft's life. Nothing here marks read, reacts, or
 * starts a new chat.
 *
 * Config: ~/.config/whatsapp-skill/.env (mode 600), or the file WA_CONFIG names.
 *   UNIPILE_API_KEY  from the Unipile dashboard (sent as the X-API-KEY header)
 *   UNIPILE_DSN      your API host, e.g. api1.unipile.com:13111
 *   WA_ACCOUNT_ID    the WhatsApp account to use; `health` lists yours if it is missing
 *   WA_BLOCKLIST     optional: a .txt word list (or a .mjs exporting vendorHit) that
 *                    no reply may contain
 * The process environment wins over the file, key by key.
 *
 * Usage:
 *   node wa.mjs health
 *   node wa.mjs inbox  [--limit 20] [--unread] [--dms] [--since <ISO>]
 *   node wa.mjs find   --name "<text>" [--pages 5]
 *   node wa.mjs thread --chat <chat_id> [--limit 30]
 *   node wa.mjs media  --chat <chat_id> [--message <id>] [--limit 30] [--types img] [--max-mb 10]
 *   node wa.mjs draft  --chat <chat_id> --text-file <path> --after <message_id|none> [--group]
 *   node wa.mjs send   --draft <draft_id> --confirm <code>
 *   node wa.mjs drafts
 *   node wa.mjs abandon --draft <draft_id>
 *
 * Output: JSON on stdout. Failure: one plain line on stderr, exit 1. Bad usage: exit 2.
 */

import { existsSync, readFileSync, mkdirSync, renameSync, unlinkSync, statSync, lstatSync,
  readdirSync, rmSync, chmodSync, realpathSync, openSync, writeSync, closeSync, fsyncSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, isAbsolute } from 'node:path';
import { createHash, randomBytes } from 'node:crypto';
import { parseArgs } from 'node:util';
import { fileURLToPath, pathToFileURL } from 'node:url';

const MEDIA_TTL_MS = 7 * 24 * 3600 * 1000;
const LOOPBACK = new Set(['127.0.0.1', 'localhost']);

class UsageError extends Error {}

/** A leading ~/ means the home folder. Nothing else is expanded ($HOME stays literal). */
export function expandHome(p) {
  const s = String(p).trim();
  if (s === '~') return homedir();
  return s.startsWith('~/') ? join(homedir(), s.slice(2)) : s;
}

/** The config file: WA_CONFIG from the process environment, else the default. */
export function configFile() {
  const named = process.env.WA_CONFIG;
  if (named === undefined || !named.trim()) return join(homedir(), '.config', 'whatsapp-skill', '.env');
  const p = expandHome(named);
  if (!isAbsolute(p)) throw new Error(`WA_CONFIG must be an absolute path or start with ~/ (got ${named})`);
  return p;
}

/**
 * The environment plus the config file, the environment winning per key. A config file
 * other users can read holds the API key in the open, so it is refused, not warned about.
 */
function loadEnv() {
  const env = { ...process.env };
  const file = configFile();
  if (!existsSync(file)) {
    if (process.env.WA_CONFIG?.trim()) throw new Error(`WA_CONFIG points at ${file}, which does not exist`);
    return env;
  }
  if (process.platform !== 'win32' && (statSync(file).mode & 0o077)) {
    throw new Error(`${file} can be read by other users on this machine and holds your Unipile API key. Run: chmod 600 "${file}"`);
  }
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)=["']?(.*?)["']?\s*$/);
    if (m && !(m[1] in process.env)) env[m[1]] = m[2];
  }
  return env;
}

let _env;
function env() { return (_env ??= loadEnv()); }

/**
 * Test hooks (WA_API_BASE, WA_CACHE_DIR) are honored only with WA_TEST=1, and
 * the API base only on a loopback host, so a stray export can never send the
 * API key to another host. WA_API_BASE without WA_TEST=1 is an error, not a
 * silent fallback, so the mistake is seen.
 */
export function apiBase(e = env()) {
  if (e.WA_API_BASE) {
    if (e.WA_TEST !== '1') throw new Error('WA_API_BASE is set but WA_TEST is not 1. Refusing: unset WA_API_BASE.');
    let host;
    try { host = new URL(e.WA_API_BASE).hostname; } catch { throw new Error(`WA_API_BASE is not a URL: ${e.WA_API_BASE}`); }
    if (!LOOPBACK.has(host)) throw new Error(`WA_API_BASE host ${host} is not loopback. Refusing.`);
    return e.WA_API_BASE.replace(/\/+$/, '') + '/';
  }
  for (const k of ['UNIPILE_API_KEY', 'UNIPILE_DSN']) {
    if (!e[k]) throw new Error(`Missing ${k}: set it in ${configFile()} or the environment`);
  }
  return `https://${e.UNIPILE_DSN}/api/v1/`;
}

function cacheDir(e = env()) {
  if (e.WA_TEST === '1' && e.WA_CACHE_DIR) return e.WA_CACHE_DIR;
  return join(homedir(), '.cache', 'whatsapp-skill');
}

async function request(path, { method = 'GET', form } = {}) {
  const e = env();
  const base = apiBase(e);
  if (!e.UNIPILE_API_KEY) throw new Error(`Missing UNIPILE_API_KEY: set it in ${configFile()} or the environment`);
  let body;
  if (form) { body = new FormData(); for (const [k, v] of Object.entries(form)) body.append(k, v); }
  // No redirects (the API key must not follow one to another host) and a hard timeout.
  const res = await fetch(base + path, { method, headers: { 'X-API-KEY': e.UNIPILE_API_KEY }, body,
    redirect: 'error', signal: AbortSignal.timeout(60_000) });
  if (!res.ok) {
    const text = (await res.text()).slice(0, 300);
    const err = new Error(`unipile ${method} ${path.split('?')[0]}: ${res.status} ${text}`);
    err.status = res.status;
    throw err;
  }
  return res;
}

async function api(path) { return await (await request(path)).json(); }

// ---- the account ----

const whatsappAccounts = (r) => (r.items ?? r ?? []).filter((a) => a.type === 'WHATSAPP');
const accountLines = (list) => list.map((a) => `  WA_ACCOUNT_ID=${a.id}    (${a.name ?? 'no name'})`).join('\n');

/**
 * WA_ACCOUNT_ID, required and never guessed. When it is missing, the error lists the
 * WhatsApp accounts this API key can see, as lines ready to paste into the config file.
 * Offline commands (drafts, abandon) never call this.
 */
async function requireAccount() {
  const id = String(env().WA_ACCOUNT_ID ?? '').trim();
  if (id) return id;
  let detail;
  try {
    const list = whatsappAccounts(await api('accounts'));
    detail = list.length
      ? `Add one of these lines to ${configFile()}:\n${accountLines(list)}`
      : 'No WhatsApp account is connected in Unipile yet: connect one by QR code in the Unipile dashboard.';
  } catch (err) {
    detail = `The account list could not be read either: ${err.message}`;
  }
  throw new Error(`WA_ACCOUNT_ID is not set. ${detail}`);
}

// ---- helpers ----

const isGroup = (chat) => chat.type === 1 || String(chat.provider_id ?? '').endsWith('@g.us');

async function attendees(chatId) {
  const r = await api(`chats/${encodeURIComponent(chatId)}/attendees`);
  return r.items ?? [];
}

/** A failed attendee lookup costs that one chat its name, never the whole command. */
async function chatName(chat) {
  if (isGroup(chat)) return { name: chat.name ?? '(unnamed group)' };
  if (chat.name) return { name: chat.name };
  const fallback = chat.attendee_provider_id ?? chat.provider_id ?? '(unknown)';
  try {
    const other = (await attendees(chat.id)).find((a) => !a.is_self);
    return { name: other?.name ?? fallback };
  } catch (err) {
    return { name: fallback, name_error: err.message };
  }
}

/** Run fn over items with at most n in flight, preserving order. */
async function pool(items, n, fn) {
  const out = new Array(items.length);
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => {
    while (i < items.length) { const k = i++; out[k] = await fn(items[k]); }
  }));
  return out;
}

/**
 * Walk chats newest first, following the cursor, until `want` pass `keep` or pages run out.
 * Returns how many were scanned and whether more pages exist, so a capped walk is never
 * mistaken for "nothing there".
 */
async function walkChats({ want, keep = () => true, maxPages = 10, pageSize = 50 }) {
  const account = await requireAccount();
  const kept = [];
  let cursor, scanned = 0;
  for (let page = 0; page < maxPages && kept.length < want; page++) {
    const q = `chats?account_id=${encodeURIComponent(account)}&limit=${pageSize}` + (cursor ? `&cursor=${encodeURIComponent(cursor)}` : '');
    const r = await api(q);
    const items = r.items ?? [];
    for (const c of items) {
      scanned++;
      if (keep(c)) kept.push(c);
      if (kept.length >= want) break;
    }
    cursor = items.length ? r.cursor : null;
    if (!cursor) break;
  }
  return { chats: kept, scanned, more: Boolean(cursor) };
}

// ---- commands ----

const CONFIG_KEYS = ['UNIPILE_API_KEY', 'UNIPILE_DSN', 'WA_ACCOUNT_ID', 'WA_BLOCKLIST'];

/**
 * The setup check: which config was read and which keys are set (never their values),
 * the blocklist loads if one is named, and the account exists, is WhatsApp, and is OK.
 */
export async function health() {
  const e = env();
  const file = configFile();
  const keysPresent = Object.fromEntries(CONFIG_KEYS.map((k) => [k, String(e[k] ?? '').trim() !== '']));
  const list = await loadBlocklist(e);
  const id = await requireAccount();
  const all = await api('accounts');
  const acct = (all.items ?? all).find((a) => a.id === id);
  const others = whatsappAccounts(all);
  const listing = others.length ? ` WhatsApp accounts there now:\n${accountLines(others)}` : ' No WhatsApp account is connected there now.';
  if (!acct) throw new Error(`WA_ACCOUNT_ID ${id} is not in Unipile. It was probably re-linked with a new id.${listing}`);
  if (acct.type !== 'WHATSAPP') throw new Error(`WA_ACCOUNT_ID ${id} is a ${acct.type} account, not WhatsApp.${listing}`);
  const src = (acct.sources ?? []).find((s) => String(s.id).endsWith('_MESSAGING')) ?? (acct.sources ?? [])[0];
  if (!src || src.status !== 'OK') {
    throw new Error(`WhatsApp account ${id} status is ${src?.status ?? 'unknown'}, not OK. Reconnect WhatsApp in the Unipile dashboard (scan the QR code again).`);
  }
  return { ok: true, config_file: file, config_file_found: existsSync(file), keys_present: keysPresent,
    account_id: acct.id, type: acct.type, name: acct.name, status: src.status, blocklist: list ? list.path : 'off' };
}

export async function inbox({ limit = 20, unread = false, dms = false, since } = {}) {
  const sinceMs = since ? Date.parse(since) : null;
  if (since && Number.isNaN(sinceMs)) throw new UsageError(`--since is not a date: ${since}`);
  const keep = (c) => (!unread || (c.unread_count ?? 0) > 0)
    && (!dms || !isGroup(c))
    && (sinceMs == null || Date.parse(c.timestamp) >= sinceMs);
  const { chats } = await walkChats({ want: limit, keep });
  return await pool(chats, 6, async (c) => ({
    chat_id: c.id,
    ...(await chatName(c)),
    is_group: isGroup(c),
    unread_count: c.unread_count ?? 0,
    last_at: c.timestamp,
    read_only: c.read_only ?? 0,
    muted: Boolean(c.muted_until) && Date.parse(c.muted_until) > Date.now(),
  }));
}

export async function find({ name, pages = 5 } = {}) {
  if (!name) throw new UsageError('find needs --name');
  const needle = name.toLowerCase();
  const { chats, scanned, more } = await walkChats({ want: Infinity, maxPages: pages });
  const named = await pool(chats, 6, async (c) => ({ c, ...(await chatName(c)) }));
  const matches = named
    .filter(({ name: n }) => String(n).toLowerCase().includes(needle))
    .map(({ c, name: n }) => ({ chat_id: c.id, name: n, is_group: isGroup(c), last_at: c.timestamp, read_only: c.read_only ?? 0 }));
  const unnamed = named.filter((x) => x.name_error).length;
  return { matches, scanned, more, unnamed_due_to_errors: unnamed };
}

async function messages(chatId, limit) {
  const r = await api(`chats/${encodeURIComponent(chatId)}/messages?limit=${limit}`);
  return [...(r.items ?? [])].sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));
}

export async function thread({ chat, limit = 30 } = {}) {
  if (!chat) throw new UsageError('thread needs --chat');
  await getChat(chat); // the chat must belong to WA_ACCOUNT_ID before anything in it is read
  const [msgs, people] = await Promise.all([messages(chat, limit), attendees(chat)]);
  const byId = new Map(people.map((a) => [a.id, a.name]));
  return msgs.map((m) => ({
    id: m.id,
    at: m.timestamp,
    from: m.is_sender ? 'me' : (byId.get(m.sender_attendee_id) ?? m.sender_id ?? '(unknown)'),
    text: m.text ?? '',
    attachments: (m.attachments ?? []).map((a) => ({
      id: a.id, type: a.type, mimetype: a.mimetype ?? null, file_size: a.file_size ?? null,
      unavailable: Boolean(a.unavailable), view_once: Boolean(m.is_view_once),
    })),
    deleted: Boolean(m.deleted),
    is_event: Boolean(m.is_event),
  }));
}

const EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif',
  'image/heic': 'heic', 'image/heif': 'heif', 'video/mp4': 'mp4', 'application/pdf': 'pdf' };

function wantType(a, types) {
  if (a.type === 'img') return types.has('img') && !a.sticker;
  return types.has(a.type);
}

/**
 * Delete cached media older than the TTL, and any .part left by an interrupted run.
 * lstat throughout: a symlink is never followed and never deleted through, and
 * only plain files are removed.
 */
function sweepCache(root) {
  if (!existsSync(root)) return;
  const now = Date.now();
  for (const chatDir of readdirSync(root)) {
    const d = join(root, chatDir);
    if (!lstatSync(d).isDirectory()) continue;
    for (const f of readdirSync(d)) {
      const p = join(d, f);
      const st = lstatSync(p);
      if (!st.isFile()) continue;
      if (f.endsWith('.part') || now - st.mtimeMs > MEDIA_TTL_MS) rmSync(p, { force: true });
    }
  }
}

/**
 * Stream a response body into `part`, counting bytes and aborting past maxBytes, so
 * an attachment of unknown size can never be pulled into memory or onto disk whole.
 */
async function streamToPart(res, part, maxBytes) {
  const declared = Number(res.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > maxBytes) throw new Error(`content-length ${declared} is over the cap`);
  const fd = openSync(part, 'w', 0o600);
  let total = 0;
  try {
    const reader = res.body.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.length;
      if (total > maxBytes) { await reader.cancel(); throw new Error(`download passed ${maxBytes} bytes, over the cap`); }
      writeSync(fd, value);
    }
  } finally { closeSync(fd); }
  return total;
}

export async function media({ chat, message, limit = 30, types = 'img', maxMb = 10 } = {}) {
  if (!chat) throw new UsageError('media needs --chat');
  const typeSet = new Set(String(types).split(',').map((s) => s.trim()).filter(Boolean));
  const maxBytes = maxMb * 1024 * 1024;
  const root = join(cacheDir(), 'media');
  mkdirSync(root, { recursive: true, mode: 0o700 });
  chmodSync(root, 0o700);
  sweepCache(root);
  const dir = join(root, chat.replace(/[^A-Za-z0-9_-]/g, '_'));
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  chmodSync(dir, 0o700);

  await getChat(chat); // the chat must belong to WA_ACCOUNT_ID before anything in it is downloaded
  const msgs = (await messages(chat, limit)).filter((m) => !message || m.id === message);
  if (message && !msgs.length) {
    throw new Error(`message ${message} is not in the last ${limit} messages of this chat; raise --limit`);
  }
  const saved = [], skipped = [], failed = [];
  for (const m of msgs) {
    for (const a of m.attachments ?? []) {
      const ref = { message_id: m.id, attachment_id: a.id, type: a.type, mimetype: a.mimetype ?? null };
      if (m.is_view_once) { skipped.push({ ...ref, reason: 'view_once' }); continue; }
      if (a.unavailable) { skipped.push({ ...ref, reason: 'unavailable' }); continue; }
      if (!wantType(a, typeSet)) { skipped.push({ ...ref, reason: a.sticker ? 'sticker' : `type ${a.type} not requested` }); continue; }
      if (a.file_size != null && a.file_size > maxBytes) { skipped.push({ ...ref, reason: `over ${maxMb} MB` }); continue; }

      const ext = EXT[a.mimetype] ?? 'bin';
      const final = join(dir, `${m.id}-${a.id}.${ext}`.replace(/[^A-Za-z0-9_.-]/g, '_'));
      if (existsSync(final) && a.file_size != null && statSync(final).size === a.file_size) {
        saved.push({ ...ref, path: final, bytes: a.file_size, from_cache: true });
        continue;
      }
      const part = `${final}.part`;
      try {
        const res = await request(`messages/${encodeURIComponent(m.id)}/attachments/${encodeURIComponent(a.id)}`);
        const bytes = await streamToPart(res, part, maxBytes);
        if (a.file_size != null && bytes !== a.file_size) throw new Error(`downloaded ${bytes} bytes, expected ${a.file_size}`);
        if (bytes === 0) throw new Error('downloaded 0 bytes');
        renameSync(part, final);
        chmodSync(final, 0o600);
        saved.push({ ...ref, path: final, bytes });
      } catch (err) {
        if (existsSync(part)) unlinkSync(part);
        failed.push({ ...ref, error: err.message });
      }
    }
  }
  return { dir, saved, skipped, failed };
}

// ---- drafts and sending ----
//
// A draft is a file holding the exact text, the chat it goes to, and an approval hash
// over both (plus the group permission and the stale-check snapshot). The user approves
// the text and recipient they are shown; `send` needs --confirm to match that hash, so nothing
// in the file can change after approval, and sends only once in the draft's life: an
// O_EXCL claim file is taken before any network call and never removed. Any refusal
// after the claim kills the draft; a new draft is the recovery. That is deliberate.

const MAX_TEXT = 4000;
const STATES_ABANDONABLE = new Set(['drafted', 'sending', 'unconfirmed']);
// Statuses that mean WhatsApp definitely did not take the message. Anything else,
// including a timeout or a dropped connection, may have gone out.
const DEFINITE_REJECTIONS = new Set([400, 401, 403, 404, 422, 429]);

const sha256 = (s) => createHash('sha256').update(s, 'utf8').digest('hex');
const normalizeText = (s) => String(s ?? '').replace(/\r\n?/g, '\n');

/** The hash the user's approval is bound to: text, recipient, group permission, snapshot. */
export const approvalHash = (d) =>
  sha256(JSON.stringify([d.chat_id, Boolean(d.group_ok), d.snapshot_message_id ?? null, d.text]));

/** group, dm, or other (status broadcasts, newsletters, anything unrecognised). */
function chatKind(chat) {
  const p = String(chat.provider_id ?? '');
  if (p.endsWith('@g.us')) return 'group';
  if (p.endsWith('@s.whatsapp.net') || p.endsWith('@lid')) return 'dm';
  return 'other';
}

function draftsDir() {
  const d = join(cacheDir(), 'drafts');
  mkdirSync(d, { recursive: true, mode: 0o700 });
  chmodSync(d, 0o700);
  return d;
}

const draftPath = (id) => join(draftsDir(), `${id}.json`);
const claimPath = (id) => join(draftsDir(), `${id}.claim`);

function checkDraftId(id) {
  if (!id || !/^[a-z0-9-]{8,64}$/.test(id)) throw new UsageError(`not a draft id: ${id}`);
  return id;
}

/**
 * Write JSON via a temp file and rename, so a crash or full disk mid-write leaves the
 * previous valid file in place. `_beforeRename` exists only for the fault-injection test.
 */
export function writeJsonAtomic(path, obj, _beforeRename) {
  const tmp = `${path}.${process.pid}.${randomBytes(4).toString('hex')}.tmp`;
  const fd = openSync(tmp, 'wx', 0o600);
  try { writeSync(fd, JSON.stringify(obj, null, 2)); fsyncSync(fd); } finally { closeSync(fd); }
  try {
    if (_beforeRename) _beforeRename();
    renameSync(tmp, path);
  } catch (err) { rmSync(tmp, { force: true }); throw err; }
}

export function readDraft(id) {
  const p = draftPath(checkDraftId(id));
  if (!existsSync(p)) throw new Error(`no draft ${id}`);
  try { return JSON.parse(readFileSync(p, 'utf8')); } catch (err) { throw new Error(`draft ${id} is unreadable: ${err.message}`); }
}

const updateDraft = (d, patch) => { const next = { ...d, ...patch, updated_at: new Date().toISOString() }; writeJsonAtomic(draftPath(d.draft_id), next); return next; };

/** Record a terminal state without letting a disk error swallow the message that matters. */
function recordState(d, patch) {
  try { updateDraft(d, patch); return ''; }
  catch (err) { return ` (and the draft file could not be updated: ${err.message})`; }
}

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * The optional word blocklist named by WA_BLOCKLIST: null when the key is absent, else
 * { path, hit(text) -> the matched word or null }. A .txt file is one word or phrase per
 * line (# comments allowed), matched whole-word and case-insensitive; a .mjs module must
 * export vendorHit(text). Every misconfiguration throws, and a throw refuses the draft:
 * a list someone set up and that silently stopped loading must never pass text unchecked.
 */
export async function loadBlocklist(e = env()) {
  if (!('WA_BLOCKLIST' in e)) return null;
  const raw = String(e.WA_BLOCKLIST).trim();
  if (!raw) throw new Error('WA_BLOCKLIST is set but empty; remove the line or point it at a file');
  const path = expandHome(raw);
  if (!isAbsolute(path)) throw new Error(`WA_BLOCKLIST must be an absolute path or start with ~/ (got ${raw})`);
  if (path.endsWith('.txt')) {
    let body;
    try { body = readFileSync(path, 'utf8'); } catch (err) { throw new Error(`WA_BLOCKLIST ${path} cannot be read (${err.code ?? err.message})`); }
    const terms = body.split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
    if (!terms.length) throw new Error(`WA_BLOCKLIST ${path} has no words in it`);
    const re = new RegExp(`\\b(${terms.map(escapeRe).join('|')})\\b`, 'i');
    return { path, hit: (t) => t.match(re)?.[1] ?? null };
  }
  if (path.endsWith('.mjs')) {
    let mod;
    try { mod = await import(pathToFileURL(path).href); } catch (err) { throw new Error(`WA_BLOCKLIST ${path} cannot be loaded (${err.code ?? err.message})`); }
    if (typeof mod.vendorHit !== 'function') throw new Error(`WA_BLOCKLIST ${path} has no vendorHit function`);
    return { path, hit: mod.vendorHit };
  }
  throw new Error(`WA_BLOCKLIST must be a .txt or .mjs file (got ${raw})`);
}

/**
 * Everything wrong with a reply's text, as a list of plain reasons; empty means it may
 * be sent. WhatsApp prints markdown literally, so the markup a model reaches for is
 * refused. If a blocklist is configured and cannot be loaded, the text is refused rather
 * than passed unchecked.
 */
export async function checkText(text, { loadList = () => loadBlocklist() } = {}) {
  const problems = [];
  const t = String(text ?? '');
  if (!t.trim()) problems.push('the text is empty');
  if (t.length > MAX_TEXT) problems.push(`the text is ${t.length} characters; the limit is ${MAX_TEXT}`);
  const markup = [
    [/\*\*/, '**bold** markdown (WhatsApp bold is *one* asterisk)'],
    [/__/, '__ markdown'],
    [/\[[^\]\n]*\]\([^)\n]*\)/, '[label](url) link (paste the bare URL)'],
    [/^\s{0,3}#{1,6}\s/m, 'a # heading'],
    [/`/, 'a backtick'],
    [/^\s*\|.*\|\s*$/m, 'a | table'],
  ];
  for (const [re, what] of markup) if (re.test(t)) problems.push(`it contains ${what}`);
  if (t.includes('\u2014')) problems.push('it contains an em dash');
  let list = null;
  try { list = await loadList(); }
  catch (err) { problems.push(`the word blocklist could not load (${err.message}), so nothing can be sent`); }
  const hit = list?.hit(t);
  if (hit) problems.push(`it contains "${hit}", which is on your WA_BLOCKLIST`);
  return problems;
}

async function getChat(chatId) {
  const account = await requireAccount();
  const c = await api(`chats/${encodeURIComponent(chatId)}`);
  if (c.account_id !== account) throw new Error(`chat ${chatId} belongs to account ${c.account_id ?? '(none given)'}, not the configured WhatsApp account`);
  return c;
}

/** Why this chat cannot take a reply now, or null. */
function chatRefusal(chat, groupOk) {
  if ((chat.read_only ?? 0) !== 0) return `the chat is read-only (read_only=${chat.read_only})`;
  const kind = chatKind(chat);
  if (kind === 'other') return `it is not a person or a group (provider id ${chat.provider_id ?? 'missing'}); broadcasts and channels are never sent to`;
  if (kind === 'group' && !groupOk) return 'it is a group chat; groups need --group, and only when the user named the group';
  return null;
}

async function newestMessageId(chatId) {
  const r = await api(`chats/${encodeURIComponent(chatId)}/messages?limit=1`);
  return (r.items ?? [])[0]?.id ?? null;
}

/**
 * `after` is the id of the newest message Claude read in `thread` before writing the
 * reply ("none" for an empty chat). If anything newer exists, the reply was written
 * without seeing it, so the draft is refused. That id is also the stale-check snapshot
 * `send` compares against.
 */
export async function draft({ chat, textFile, group = false, after } = {}) {
  if (!chat) throw new UsageError('draft needs --chat');
  if (!textFile) throw new UsageError('draft needs --text-file');
  if (!after) throw new UsageError('draft needs --after <id of the newest message you read in thread>, or --after none for an empty chat');
  const snapshot = after === 'none' ? null : after;
  const text = normalizeText(readFileSync(textFile, 'utf8')).replace(/\s+$/, '');
  const c = await getChat(chat);
  const problems = [chatRefusal(c, group), ...(await checkText(text))].filter(Boolean);
  if (problems.length) throw new Error(`draft refused: ${problems.join('; ')}`);
  const newest = await newestMessageId(chat);
  if (newest !== snapshot) {
    throw new Error(`draft refused: the newest message in the chat is ${newest ?? 'none'}, not ${after}. Something arrived after the thread was read; read it again first.`);
  }
  const id = `${new Date().toISOString().slice(0, 10)}-${randomBytes(4).toString('hex')}`;
  const { name } = await chatName(c);
  const d = {
    draft_id: id, chat_id: chat, to: name, is_group: chatKind(c) === 'group', group_ok: Boolean(group),
    text, snapshot_message_id: snapshot, state: 'drafted', created_at: new Date().toISOString(),
  };
  d.approval_sha256 = approvalHash(d);
  writeJsonAtomic(draftPath(id), d);
  return { draft_id: id, to: name, is_group: d.is_group, text, confirm: d.approval_sha256.slice(0, 10) };
}

const verifyDelayMs = () => (env().WA_TEST === '1' && env().WA_VERIFY_DELAY_MS ? Number(env().WA_VERIFY_DELAY_MS) : 2500);

/**
 * Confirm a send by the message id the POST returned, never by text alone: GET the
 * message (retrying while it 404s, since reads lag writes), then look for that same id
 * in the chat's last 20. Whatever finds it, it must be from this account and carry the
 * exact text. A match on text alone could confirm an earlier identical message.
 */
async function verifySent(chatId, messageId, text) {
  let m = null, attempts = 0, via = null, lastErr = null;
  for (; attempts < 5 && !m; attempts++) {
    try { m = await api(`messages/${encodeURIComponent(messageId)}`); via = attempts ? 'direct_after_retry' : 'direct'; }
    catch (err) {
      lastErr = err;
      if (err.status !== 404) break;
      await new Promise((r) => setTimeout(r, verifyDelayMs()));
    }
  }
  if (!m) {
    try {
      const r = await api(`chats/${encodeURIComponent(chatId)}/messages?limit=20`);
      m = (r.items ?? []).find((x) => x.id === messageId) ?? null;
      if (m) via = 'chat_list';
    } catch (err) { lastErr = err; }
  }
  if (!m) return { ok: false, reason: `message ${messageId} could not be read back (${lastErr?.message ?? 'not found'})`, attempts };
  if (!(m.is_sender === 1 || m.is_sender === true)) return { ok: false, reason: `message ${messageId} read back but is not from this account`, attempts };
  // Line endings only: multipart sends "\n" as "\r\n", and either may come back.
  if (normalizeText(m.text) !== normalizeText(text)) return { ok: false, reason: `message ${messageId} read back with different text`, attempts };
  return { ok: true, verified_via: via, attempts };
}

export async function send({ draft: id, confirm } = {}) {
  checkDraftId(id);
  if (!confirm) throw new UsageError('send needs --confirm <code>, the code `draft` printed');

  // 1. Local only, no claim, no network: text, recipient and snapshot must be what was approved.
  const checkApproval = (x) => {
    const actual = approvalHash(x);
    if (actual !== x.approval_sha256) throw new Error(`draft ${id} changed on disk since it was drafted (text, chat or snapshot); make a new draft`);
    return actual;
  };
  const actual = checkApproval(readDraft(id));
  if (confirm !== actual.slice(0, 10)) throw new Error(`--confirm ${confirm} does not match draft ${id}; nothing was sent and the draft is still usable`);

  // 2. Claim, atomically, once per draft, before any network call.
  try { closeSync(openSync(claimPath(id), 'wx', 0o600)); }
  catch (err) {
    if (err.code === 'EEXIST') throw new Error(`draft ${id} was already claimed by an earlier send; check the chat before doing anything else`);
    throw err;
  }

  // 3. Re-read under the claim, so an abandon or edit that landed in between is seen.
  let d = readDraft(id);
  checkApproval(d);
  if (d.state !== 'drafted') throw new Error(`draft ${id} is ${d.state}, not drafted; make a new draft`);

  // 4 and 5. Live re-checks; any failure kills the draft.
  const refuse = (reason) => { updateDraft(d, { state: 'refused', refused_reason: reason }); throw new Error(`send refused, draft ${id} is dead: ${reason}`); };
  let c;
  try { c = await getChat(d.chat_id); } catch (err) { refuse(`could not re-read the chat: ${err.message}`); }
  const problems = [chatRefusal(c, d.group_ok), ...(await checkText(d.text))].filter(Boolean);
  if (problems.length) refuse(problems.join('; '));
  let newest;
  try { newest = await newestMessageId(d.chat_id); } catch (err) { refuse(`could not re-read the chat: ${err.message}`); }
  if (newest !== d.snapshot_message_id) refuse('someone wrote in the chat after this draft was made; re-read the thread and draft again');

  // 6 to 8. Send once, then verify.
  d = updateDraft(d, { state: 'sending' });
  let r;
  try {
    r = await (await request(`chats/${encodeURIComponent(d.chat_id)}/messages`, { method: 'POST', form: { text: d.text } })).json();
  } catch (err) {
    // Only a listed status is a definite rejection; a timeout, dropped connection,
    // unreadable reply or any other status may have gone out.
    const definite = DEFINITE_REJECTIONS.has(err.status);
    const note = recordState(d, { state: definite ? 'failed' : 'unconfirmed', error: err.message });
    throw new Error(definite
      ? `WhatsApp rejected the send: ${err.message}${note}`
      : `send may or may not have gone out (${err.message}). VERIFY BEFORE RETRY: check the chat on the phone.${note}`);
  }
  const messageId = r?.message_id ?? r?.id ?? null;
  if (!messageId) {
    const note = recordState(d, { state: 'unconfirmed', error: 'the send returned no message id' });
    throw new Error(`the send returned no message id. VERIFY BEFORE RETRY: check the chat on the phone.${note}`);
  }
  const v = await verifySent(d.chat_id, messageId, d.text);
  if (!v.ok) {
    const note = recordState(d, { state: 'unconfirmed', message_id: messageId, error: v.reason, verify_attempts: v.attempts });
    throw new Error(`${v.reason}. VERIFY BEFORE RETRY: check the chat on the phone.${note}`);
  }
  d = updateDraft(d, { state: 'sent', message_id: messageId, verified_via: v.verified_via, verify_attempts: v.attempts, sent_at: new Date().toISOString() });
  return { sent: true, draft_id: id, to: d.to, message_id: messageId, verified_via: v.verified_via, verify_attempts: v.attempts };
}

export function drafts() {
  const dir = draftsDir();
  return readdirSync(dir).filter((f) => f.endsWith('.json')).sort().map((f) => {
    try {
      const d = JSON.parse(readFileSync(join(dir, f), 'utf8'));
      return { draft_id: d.draft_id, to: d.to, state: d.state, abandoned_from: d.abandoned_from, created_at: d.created_at,
        message_id: d.message_id, preview: String(d.text ?? '').slice(0, 60) };
    } catch { return { draft_id: f.replace(/\.json$/, ''), state: 'unreadable' }; }
  });
}

export function abandon({ draft: id } = {}) {
  const d = readDraft(checkDraftId(id));
  if (!STATES_ABANDONABLE.has(d.state)) throw new Error(`draft ${id} is ${d.state}; only drafted, sending or unconfirmed drafts can be abandoned`);
  const next = updateDraft(d, { state: 'abandoned', abandoned_from: d.state, was_claimed: existsSync(claimPath(id)) });
  return { draft_id: id, state: next.state, abandoned_from: next.abandoned_from, was_claimed: next.was_claimed };
}

// ---- CLI ----

export const USAGE = `wa.mjs — your WhatsApp over Unipile.
Config: ~/.config/whatsapp-skill/.env (mode 600) with UNIPILE_API_KEY, UNIPILE_DSN,
WA_ACCOUNT_ID and optionally WA_BLOCKLIST. Run health first; it says what is missing.
Output: JSON on stdout. Non-zero exit + one plain line on stderr on failure.

  health
  inbox   [--limit 20] [--unread] [--dms] [--since <ISO date>]
  find    --name "<text>" [--pages 5]
  thread  --chat <chat_id> [--limit 30]
  media   --chat <chat_id> [--message <message_id>] [--limit 30] [--types img] [--max-mb 10]

  draft   --chat <chat_id> --text-file <path> --after <message_id|none> [--group]
                                             stores a reply, sends nothing
  send    --draft <draft_id> --confirm <code>  sends a draft you approved, once
  drafts
  abandon --draft <draft_id>`;

// realpath on both sides, so a symlinked install still runs instead of silently doing nothing.
const isMain = (() => {
  try { return realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url)); } catch { return false; }
})();

if (isMain) {
  const argv = process.argv.slice(2);
  const [cmd] = argv;
  const usageExit = (problem) => { if (problem) console.error(`error: ${problem}\n`); console.error(USAGE); process.exit(2); };
  if (!cmd || ['help', '--help', '-h'].includes(cmd)) usageExit(null);

  let v;
  try {
    ({ values: v } = parseArgs({
      args: argv.slice(1),
      options: {
        limit: { type: 'string' }, unread: { type: 'boolean' }, dms: { type: 'boolean' },
        since: { type: 'string' }, name: { type: 'string' }, pages: { type: 'string' },
        chat: { type: 'string' }, message: { type: 'string' }, types: { type: 'string' },
        'max-mb': { type: 'string' }, 'text-file': { type: 'string' }, group: { type: 'boolean' },
        draft: { type: 'string' }, confirm: { type: 'string' }, after: { type: 'string' },
      },
    }));
  } catch (err) { usageExit(err.message); }

  const num = (s, d, flag) => {
    if (s == null) return d;
    const n = Number(s);
    if (!Number.isFinite(n) || n <= 0) usageExit(`${flag} must be a positive number`);
    return n;
  };

  const run = {
    health: () => health(),
    inbox: () => inbox({ limit: num(v.limit, 20, '--limit'), unread: v.unread, dms: v.dms, since: v.since }),
    find: () => find({ name: v.name, pages: num(v.pages, 5, '--pages') }),
    thread: () => thread({ chat: v.chat, limit: num(v.limit, 30, '--limit') }),
    media: () => media({ chat: v.chat, message: v.message, limit: num(v.limit, 30, '--limit'),
      types: v.types ?? 'img', maxMb: num(v['max-mb'], 10, '--max-mb') }),
    draft: () => draft({ chat: v.chat, textFile: v['text-file'], group: v.group, after: v.after }),
    send: () => send({ draft: v.draft, confirm: v.confirm }),
    drafts: async () => drafts(),
    abandon: async () => abandon({ draft: v.draft }),
  }[cmd];
  if (!run) usageExit(`unknown command "${cmd}"`);

  run().then((r) => {
    console.log(JSON.stringify(r, null, 2));
    // exitCode, not exit(): stdout to a pipe is async on macOS and exit() can cut it off.
    if (cmd === 'media' && r.failed.length) process.exitCode = 1;
  }).catch((err) => {
    if (err instanceof UsageError) usageExit(err.message);
    console.error(err.message);
    process.exitCode = 1;
  });
}
