// Test harness for the closer. Nothing here touches the network.
//
// Unipile: the REAL lib/unipile.mjs runs over lib/http.mjs with LINKEDIN_LEADGEN_MOCK pointing at a
// per-scenario JSON file, and every request is recorded to LINKEDIN_LEADGEN_HTTP_LOG. Assertions
// about what was sent read that log.
//
// Supabase: an in-process FAKE of the tables and of the SQL functions in schema.sql
// (claim_message, finish_message, expire_stuck_sends, daily_count, unanswered_streak). Every call
// yields to the event loop first, so two passes run with Promise.all genuinely interleave. The
// real atomicity of those functions is proven by worker-1's SQL tests against Postgres; this fake
// copies their semantics so the closer's use of them can be tested.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const CLOSER = path.resolve(HERE, '../scripts/closer.mjs');
export const LIB = path.resolve(HERE, '../../linkedin-prospector/scripts/lib');

export const U = 'https://unipile\\.test/api/v1/';
export const ACCOUNT = 'acc-test';
export const ME = 'me-provider';

export function tempHome() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'li-closer-'));
  fs.writeFileSync(path.join(dir, '.env'),
    'UNIPILE_DSN=unipile.test\nUNIPILE_API_KEY=test-key\nSUPABASE_URL=https://supa.test\nSUPABASE_SERVICE_KEY=test-service\n');
  return dir;
}

let n = 0;
/** Points http.mjs at a fresh mock file and a fresh request log. Returns { log, mockFile }. */
export function useMocks(home, entries) {
  n++;
  const mockFile = path.join(home, `mock-${n}.json`);
  const logFile = path.join(home, `http-${n}.log`);
  // Every chat is one-to-one unless a test lists its own attendees mock earlier.
  // and our own profile is ME, unless a test lists its own mocks for those earlier.
  fs.writeFileSync(mockFile, JSON.stringify([...entries, attendeesMock('[^/]+', ['someone']),
    { method: 'GET', urlPattern: `${U}users/me\\?account_id=`, status: 200, body: { provider_id: ME, id: ME, public_identifier: 'me-public' } }]));
  process.env.LINKEDIN_LEADGEN_MOCK = mockFile;
  process.env.LINKEDIN_LEADGEN_HTTP_LOG = logFile;
  return {
    mockFile,
    logFile,
    requests: () => (fs.existsSync(logFile)
      ? fs.readFileSync(logFile, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l))
      : []),
  };
}

export const posts = (reqs) => reqs.filter((r) => r.method === 'POST' && /unipile\.test/.test(r.url));
export const unipileCalls = (reqs) => reqs.filter((r) => /unipile\.test/.test(r.url));

// ---------------------------------------------------------------- Unipile mock entries

export function accountMock(status = 'OK') {
  return { method: 'GET', urlPattern: `${U}accounts$`, status: 200,
    body: { items: [{ id: ACCOUNT, type: 'LINKEDIN', name: 'Test Account', sources: [{ id: 's1', status }] }] } };
}

export function chatsMock(chats) {
  return { method: 'GET', urlPattern: `${U}chats\\?account_id=`, status: 200, body: { items: chats, cursor: null } };
}

export function messagesMock(chatId, msgs) {
  return { method: 'GET', urlPattern: `${U}chats/${chatId}/messages\\?`, status: 200, body: { items: msgs } };
}

/** The chat object send re-reads to learn who the chat belongs to. */
export function chatMock(chatId, providerId, extra = {}) {
  return { method: 'GET', urlPattern: `${U}chats/${chatId}$`, status: 200,
    body: { id: chatId, attendee_provider_id: providerId, read_only: 0, disabledFeatures: [], ...extra } };
}

/** The account itself plus the given other attendees. */
export function attendeesMock(chatId, others) {
  return { method: 'GET', urlPattern: `${U}chats/${chatId}/attendees$`, status: 200,
    body: { items: [{ provider_id: ME, is_self: 1 }, ...others.map((id) => ({ provider_id: id, is_self: 0 }))] } };
}

/** chatMock plus messagesMock for one chat. */
export function threadMocks(chatId, providerId, msgs) {
  return [chatMock(chatId, providerId), messagesMock(chatId, msgs)];
}

export function sendMock(status = 201, body = { message_id: 'sent-1' }) {
  return { method: 'POST', urlPattern: `${U}chats/[^/]+/messages$`, status, body };
}

export function profileMock(providerId, publicId) {
  return { method: 'GET', urlPattern: `${U}users/${providerId}\\?account_id=`, status: 200,
    body: { provider_id: providerId, public_identifier: publicId, network_distance: 'FIRST_DEGREE' } };
}

export function ownPostsMocks(postList, commentsByUrn, commentPost = { status: 201, body: { comment_id: 'new-c' } }) {
  const entries = [
    { method: 'GET', urlPattern: `${U}users/me\\?account_id=`, status: 200, body: { provider_id: ME, id: ME } },
    { method: 'GET', urlPattern: `${U}users/${ME}/posts\\?`, status: 200, body: { items: postList } },
  ];
  for (const [urn, comments] of Object.entries(commentsByUrn)) {
    entries.push({ method: 'GET', urlPattern: `${U}posts/${encodeURIComponent(urn)}/comments\\?`, status: 200, body: { items: comments } });
  }
  entries.push({ method: 'POST', urlPattern: `${U}posts/[^/]+/comments$`, ...commentPost });
  return entries;
}

/** A message as Unipile returns it. mine = sent by the account. */
export function msg(id, text, minutesAgo, mine = false, sender = 'them-provider') {
  return { id, text, is_sender: mine ? 1 : 0, sender_id: mine ? ME : sender,
    timestamp: new Date(Date.now() - minutesAgo * 60000).toISOString() };
}

// ---------------------------------------------------------------- fake Supabase

const tick = () => new Promise((r) => setImmediate(r));

function parseQuery(q) {
  const filters = [];
  let order = null;
  let limit = null;
  for (const part of String(q ?? '').split('&').filter(Boolean)) {
    const eq = part.indexOf('=');
    const key = decodeURIComponent(part.slice(0, eq));
    const val = decodeURIComponent(part.slice(eq + 1));
    if (key === 'select' || key === 'offset' || key === 'on_conflict') continue;
    if (key === 'order') { order = val; continue; }
    if (key === 'limit') { limit = Number(val); continue; }
    const dot = val.indexOf('.');
    const op = val.slice(0, dot);
    const arg = val.slice(dot + 1);
    if (op === 'eq') filters.push((r) => String(r[key]) === arg);
    else if (op === 'neq') filters.push((r) => String(r[key]) !== arg);
    else if (op === 'is' && arg === 'null') filters.push((r) => r[key] === null || r[key] === undefined);
    else if (op === 'in') {
      const vals = [...arg.replace(/^\(|\)$/g, '').matchAll(/"((?:[^"\\]|\\.)*)"|([^,]+)/g)]
        .map((x) => (x[1] !== undefined ? x[1].replace(/\\(.)/g, '$1') : x[2]));
      filters.push((r) => vals.includes(String(r[key])));
    } else throw new Error(`fake db: unsupported filter ${part}`);
  }
  return { filters, order, limit };
}

export function fakeDb(toQuery, inList) {
  const tables = { li_prospects: [], li_messages: [], li_alerts: [] };
  const seq = { li_prospects: 0, li_messages: 0, li_alerts: 0 };
  const calls = [];
  const rows = (t) => (tables[t] ??= []);
  const match = (t, q) => {
    const { filters, order, limit } = parseQuery(toQuery(q));
    let out = rows(t).filter((r) => filters.every((f) => f(r)));
    if (order) {
      const [col, dir] = order.split('.');
      out = [...out].sort((a, b) => (a[col] > b[col] ? 1 : a[col] < b[col] ? -1 : 0) * (dir === 'desc' ? -1 : 1));
    }
    return limit ? out.slice(0, limit) : out;
  };
  const now = () => new Date().toISOString();

  const db = {
    tables,
    calls,
    inList,
    seed(table, row) {
      seq[table] = (seq[table] ?? 0) + 1;
      const base = table === 'li_messages'
        ? { status: 'draft', attempts: 0, sent_via: null, sent_at: null, claimed_at: null, created_at: now(), prospect_id: null }
        : table === 'li_prospects' ? { status: 'welcome_sent', last_inbound_at: null, unipile_provider_id: null } : {};
      const r = { id: seq[table], ...base, ...row };
      rows(table).push(r);
      return r;
    },
    async select(table, q) {
      await tick();
      calls.push(['select', table, toQuery(q)]);
      return match(table, q).map((r) => ({ ...r }));
    },
    async insert(table, input, { onConflict, ignoreDuplicates = false } = {}) {
      await tick();
      calls.push(['insert', table]);
      const list = Array.isArray(input) ? input : [input];
      const out = [];
      for (const row of list) {
        if (table === 'li_prospects') {
          const existing = rows(table).find((r) => r.public_id === row.public_id);
          if (existing && onConflict === 'public_id' && ignoreDuplicates) continue;
          if (existing && onConflict === 'public_id') { Object.assign(existing, row); out.push({ ...existing }); continue; }
          if (existing) {
            const e = new Error('duplicate key value violates unique constraint "li_prospects_public_id_key"');
            e.name = 'DbError';
            e.status = 409;
            throw e;
          }
        }
        if (table === 'li_messages' && rows(table).some((r) => r.kind === row.kind && r.external_id === row.external_id)) {
          const e = new Error('duplicate key value violates unique constraint "li_messages_kind_external_id_key"');
          e.name = 'DbError';
          e.status = 409;
          throw e;
        }
        out.push({ ...db.seed(table, row) });
      }
      return out;
    },
    async update(table, m, patch) {
      await tick();
      calls.push(['update', table, toQuery(m), patch]);
      const hit = match(table, m);
      for (const r of hit) Object.assign(r, patch);
      return hit.map((r) => ({ ...r }));
    },
    async rpc(fn, a) {
      await tick();
      calls.push(['rpc', fn, a]);
      const msgs = rows('li_messages');
      const byId = (id) => msgs.find((r) => r.id === id);
      switch (fn) {
        case 'claim_send': {
          const m = byId(a.p_id);
          if (!m) return 'busy';
          const p = rows('li_prospects').find((x) => x.id === m.prospect_id);
          if (m.status === 'draft' && p?.status === 'do_not_contact') { m.status = 'dropped'; return 'dropped'; }
          if (a.p_daily_cap != null) {
            const since = Date.now() - 86400000;
            const used = msgs.filter((r) => r.kind === m.kind && ['sent', 'sending'].includes(r.status)
              && Date.parse(r.sent_at ?? r.claimed_at) > since).length;
            if (used >= a.p_daily_cap) return 'cap';
          }
          if (m.status !== 'draft') return 'busy';
          m.status = 'sending'; m.claimed_at = now(); m.attempts += 1;
          return 'claimed';
        }
        case 'finish_message': {
          const m = byId(a.p_id);
          if (a.p_outcome === 'sent') {
            if (!m || !(m.status === 'sending' || (m.status === 'failed' && m.claimed_at))) return null;
            m.status = 'sent'; m.sent_at = now();
            return 'sent';
          }
          if (!m || m.status !== 'sending') return null;
          m.status = m.attempts >= 3 ? 'failed' : 'draft';
          return m.status;
        }
        case 'expire_stuck_sends': {
          const cutoff = Date.now() - (a.p_minutes ?? 15) * 60000;
          const hit = msgs.filter((r) => r.status === 'sending' && Date.parse(r.claimed_at) < cutoff);
          for (const r of hit) r.status = 'failed';
          return hit.map((r) => r.id);
        }
        case 'daily_count': {
          const since = Date.now() - 86400000;
          return msgs.filter((r) => r.kind === a.p_kind && ['sent', 'sending'].includes(r.status)
            && Date.parse(r.sent_at ?? r.claimed_at) > since).length;
        }
        case 'unanswered_streak': {
          const p = rows('li_prospects').find((x) => x.id === a.p_prospect);
          const since = p?.last_inbound_at ? Date.parse(p.last_inbound_at) : -Infinity;
          return msgs.filter((r) => r.prospect_id === a.p_prospect && r.kind === 'reply'
            && ['sent', 'sending'].includes(r.status) && Date.parse(r.sent_at ?? r.claimed_at) > since).length;
        }
        default:
          throw new Error(`fake db: unknown rpc ${fn}`);
      }
    },
  };
  return db;
}

export function fakeAlerts(db) {
  return {
    async alert(kind, body, prospectId = null) {
      db.seed('li_alerts', { kind, body, prospect_id: prospectId });
      return { saved: true };
    },
    async printOpenAlerts() { return 0; },
    async openAlerts() { return db.tables.li_alerts.filter((a) => !a.resolved_at).map((a) => ({ ...a })); },
    async resolveAlert(id) {
      const row = db.tables.li_alerts.find((a) => a.id === id && !a.resolved_at);
      if (row) row.resolved_at = new Date().toISOString();
      return row ? { ...row } : null;
    },
  };
}

export function fakeDnc(db) {
  return {
    marked: [],
    async markDoNotContact(prospectId, reason) {
      this.marked.push({ prospectId, reason });
      await db.update('li_prospects', { id: prospectId }, { status: 'do_not_contact', dnc_reason: reason });
      await db.update('li_messages', { prospect_id: prospectId, status: 'draft' }, { status: 'dropped' });
    },
  };
}

/** What inbox-export would have remembered: { chat_id: { external_id, prospect_id, answered_text } }. */
export function inboxState(home, chats) {
  fs.writeFileSync(path.join(home, 'closer-inbox-export.json'), JSON.stringify({ generated_at: new Date().toISOString(), chats }));
}

/** What comments-export would have remembered: { comment_id: { post_id, prospect_id } }. */
export function commentsState(home, comments) {
  fs.writeFileSync(path.join(home, 'closer-comments-export.json'), JSON.stringify({ generated_at: new Date().toISOString(), comments }));
}

export const baseCfg = {
  closer_mode: 'send',
  reply_scope: 'campaign_only',
  closer_replies_per_day: 50,
  comment_replies_per_day: 25,
  unipile_account_id: ACCOUNT,
  offer: 'We set up outbound that books sales calls for agencies.',
  offer_url: 'https://example.com/pricing',
  booking_link: 'https://example.com/book',
  aimfox_campaign_id: 'camp-1',
};

/**
 * Builds deps for main(): fake db, alerts and dnc, the real unipile and lock modules.
 * Returns { deps, db, dnc, outputs } where outputs collects what each command printed.
 */
export async function makeDeps(cfgOverrides = {}) {
  const dbMod = await import(pathToFileURL(path.join(LIB, 'db.mjs')).href);
  const db = fakeDb(dbMod.toQuery, dbMod.inList);
  const dnc = fakeDnc(db);
  const outputs = [];
  const errors = [];
  const writes = [];
  const deps = {
    db,
    alerts: fakeAlerts(db),
    dnc,
    cfg: { ...baseCfg, ...cfgOverrides },
    out: (o) => outputs.push(o),
    err: (s) => errors.push(s),
    write: (s) => writes.push(s),
  };
  return { deps, db, dnc, outputs, errors, writes };
}
