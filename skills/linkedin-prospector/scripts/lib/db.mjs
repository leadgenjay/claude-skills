// Thin Supabase REST (PostgREST) client using the service key from <home>/.env.
//
// Filters: pass a PostgREST query string ("status=eq.new&select=id,public_id&order=id"), or an
// object. In an object, `select`, `order`, `limit` and `offset` are passed through and every
// other key is an equality filter on that column; a list value becomes an in.() filter.
// For a string query, build the in.() part with inList().

import { requireEnv } from './config.mjs';
import { request } from './http.mjs';

export class DbError extends Error {
  constructor(message, { status, body } = {}) {
    super(message);
    this.name = 'DbError';
    this.status = status;
    this.body = body;
  }
}

const PASS_THROUGH = new Set(['select', 'order', 'limit', 'offset', 'on_conflict']);

// The parenthesised PostgREST list before URL encoding: every value double-quoted, with " and \
// escaped, so commas, parentheses, dots and quotes inside a value cannot split or end the list.
function quotedList(values) {
  if (!Array.isArray(values)) throw new TypeError('inList needs an array of values');
  return `(${values.map((v) => `"${String(v).replace(/[\\"]/g, '\\$&')}"`).join(',')})`;
}

// A ready-to-use in.() filter value for a string query, URL-encoded so &, # and spaces in a value
// cannot break the query string: `public_id=${inList(ids)}&select=id`.
export function inList(values) {
  return `in.${encodeURIComponent(quotedList(values))}`;
}

export function toQuery(filter) {
  if (filter === undefined || filter === null) return '';
  if (typeof filter === 'string') return filter.replace(/^\?/, '');
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filter)) {
    if (value === undefined) continue;
    if (PASS_THROUGH.has(key)) params.append(key, String(value));
    else if (value === null) params.append(key, 'is.null');
    else if (Array.isArray(value)) params.append(key, `in.${quotedList(value)}`);
    else params.append(key, `eq.${value}`);
  }
  return params.toString();
}

function hasFilter(query) {
  return query.split('&').some((part) => part && !PASS_THROUGH.has(part.split('=')[0]));
}

async function call(method, pathAndQuery, { body, prefer } = {}) {
  const { SUPABASE_URL, SUPABASE_SERVICE_KEY } = requireEnv('SUPABASE_URL', 'SUPABASE_SERVICE_KEY');
  const headers = {
    apikey: SUPABASE_SERVICE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
    'Content-Type': 'application/json',
  };
  if (prefer) headers.Prefer = prefer;
  const url = `${SUPABASE_URL.replace(/\/+$/, '')}/rest/v1/${pathAndQuery}`;
  const res = await request(method, url, { headers, body });
  if (res.status < 200 || res.status >= 300) {
    const detail = res.body && typeof res.body === 'object'
      ? res.body.message || res.body.hint || JSON.stringify(res.body)
      : String(res.body ?? '');
    throw new DbError(`Supabase ${method} ${pathAndQuery.split('?')[0]} returned ${res.status}: ${detail}`,
      { status: res.status, body: res.body });
  }
  return res.body;
}

export async function select(table, query) {
  const q = toQuery(query);
  return (await call('GET', q ? `${table}?${q}` : table)) ?? [];
}

// rows: one object or a list. opts.onConflict names the unique column(s) for an upsert;
// opts.ignoreDuplicates keeps the existing row instead of merging. Returns the stored rows.
export async function insert(table, rows, { onConflict, ignoreDuplicates = false } = {}) {
  const prefer = ['return=representation'];
  let path = table;
  if (onConflict) {
    prefer.push(ignoreDuplicates ? 'resolution=ignore-duplicates' : 'resolution=merge-duplicates');
    path += `?on_conflict=${encodeURIComponent(onConflict)}`;
  }
  return (await call('POST', path, { body: rows, prefer: prefer.join(',') })) ?? [];
}

// Refuses an empty match so a bad call can never rewrite the whole table. Returns updated rows.
export async function update(table, match, patch) {
  const q = toQuery(match);
  if (!hasFilter(q)) throw new DbError(`update on ${table} refused: no filter given`);
  return (await call('PATCH', `${table}?${q}`, { body: patch, prefer: 'return=representation' })) ?? [];
}

export async function rpc(fn, args = {}) {
  return call('POST', `rpc/${fn}`, { body: args });
}
