// Unipile client for the closer: LinkedIn chats, messages, profiles, own posts and comments.
//
// Env: UNIPILE_DSN (host:port, e.g. api8.unipile.com:13851) and UNIPILE_API_KEY, read from the
// skill's .env through loadEnv(). Every call goes through http.mjs, so tests drive it with
// LINKEDIN_LEADGEN_MOCK and nothing here touches the network on its own.
//
// Auth: a 401 from Unipile, or the account's source status CREDENTIALS (LinkedIn session expired
// or revoked), throws AuthError. Callers stop the whole pass on it.

import { request } from './http.mjs';
import { requireEnv } from './config.mjs';

export class AuthError extends Error {
  constructor(message) {
    super(message);
    this.name = 'AuthError';
  }
}

export class UnipileError extends Error {
  constructor(message, status, body) {
    super(message);
    this.name = 'UnipileError';
    this.status = status;
    this.body = body;
  }
}

function credentials() {
  const { UNIPILE_DSN: dsn, UNIPILE_API_KEY: key } = requireEnv('UNIPILE_DSN', 'UNIPILE_API_KEY');
  return { base: `https://${dsn.replace(/^https?:\/\//, '').replace(/\/+$/, '')}/api/v1/`, key };
}

async function api(path, { method = 'GET', json, form } = {}) {
  const { base, key } = credentials();
  const headers = { 'X-API-KEY': key, accept: 'application/json' };
  let body;
  if (json) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(json);
  }
  if (form) {
    // Unipile's send-message endpoint takes multipart form fields, as in the reference CLI.
    // http.mjs hands FormData to fetch untouched, which sets the boundary.
    body = new FormData();
    for (const [k, v] of Object.entries(form)) if (v != null) body.append(k, v);
  }
  const res = await request(method, base + path, { headers, body });
  const data = res.body;
  if (res.status === 401) {
    throw new AuthError(`Unipile refused the API key or the LinkedIn session (401 on ${method} ${path.split('?')[0]})`);
  }
  if (res.status < 200 || res.status >= 300) {
    const text = typeof data === 'string' ? data : JSON.stringify(data ?? '');
    if (/disconnected_account|credentials/i.test(text)) {
      throw new AuthError(`Unipile says the LinkedIn account needs reconnecting (${res.status} on ${method} ${path.split('?')[0]})`);
    }
    throw new UnipileError(`unipile ${method} ${path.split('?')[0]}: ${res.status} ${text.slice(0, 300)}`, res.status, data);
  }
  return data;
}

const items = (r) => (Array.isArray(r) ? r : (r?.items ?? []));

// ---- accounts

export async function accounts() {
  return items(await api('accounts')).map((a) => ({
    id: a.id,
    type: a.type,
    name: a.name,
    sources: (a.sources ?? []).map((s) => ({ id: s.id, status: s.status })),
  }));
}

/** Throws AuthError unless the account exists and none of its sources reports CREDENTIALS. */
export async function assertAccountHealthy(accountId) {
  const acct = (await accounts()).find((a) => a.id === accountId);
  if (!acct) throw new AuthError(`Unipile has no account with id ${accountId}; check unipile_account_id in config.json`);
  const bad = acct.sources.find((s) => s.status === 'CREDENTIALS');
  if (bad) throw new AuthError(`Unipile account ${accountId} needs reconnecting (status CREDENTIALS)`);
  return acct;
}

// ---- chats and messages

/** One page of chats, newest first as Unipile returns them. */
export async function chats(accountId, { limit = 50, cursor } = {}) {
  const c = cursor ? `&cursor=${encodeURIComponent(cursor)}` : '';
  const r = await api(`chats?account_id=${encodeURIComponent(accountId)}&limit=${limit}${c}`);
  return { items: items(r), cursor: r?.cursor ?? null };
}

/**
 * Chats active since sinceIso (all chats when omitted), following the cursor up to maxPages.
 * Paging stops once a page reaches back past sinceIso.
 */
export async function allChats(accountId, { sinceIso, pageSize = 50, maxPages = 10 } = {}) {
  const sinceMs = sinceIso ? Date.parse(sinceIso) : -Infinity;
  const out = [];
  let cursor;
  for (let page = 0; page < maxPages; page++) {
    const r = await chats(accountId, { limit: pageSize, cursor });
    out.push(...r.items);
    const times = r.items.map((c) => Date.parse(c.timestamp)).filter(Number.isFinite);
    if (!r.cursor || (times.length && Math.min(...times) < sinceMs)) break;
    cursor = r.cursor;
  }
  return out.filter((c) => !Number.isFinite(sinceMs) || !(Date.parse(c.timestamp) < sinceMs));
}

export async function chat(chatId) {
  return await api(`chats/${encodeURIComponent(chatId)}`);
}

/**
 * True when LinkedIn will refuse a reply in this chat: read_only, reply disabled, or a sponsored
 * (InMail ad) chat. Unipile answers 422 on those, so they are skipped, never drafted.
 */
export function chatReplyDisabled(c) {
  const disabled = new Set(c?.disabledFeatures ?? []);
  return c?.read_only === 1 || c?.read_only === true || disabled.has('reply')
    || String(c?.content_type ?? '').toLowerCase() === 'sponsored';
}

export function chatReplyDisabledReason(c) {
  if (!chatReplyDisabled(c)) return null;
  const bits = [];
  if (c?.content_type) bits.push(String(c.content_type));
  if (c?.read_only === 1 || c?.read_only === true) bits.push('read-only');
  if ((c?.disabledFeatures ?? []).includes('reply')) bits.push('reply disabled');
  return `chat is not replyable (${bits.join(', ')})`;
}

/** Messages in a chat, oldest first, each with from: 'us' | 'them'. */
export async function messages(chatId, { limit = 30 } = {}) {
  const r = await api(`chats/${encodeURIComponent(chatId)}/messages?limit=${limit}`);
  return items(r)
    .map((m) => ({
      id: m.id,
      from: m.is_sender === 1 || m.is_sender === true ? 'us' : 'them',
      text: m.text ?? '',
      at: m.timestamp ?? null,
      sender_id: m.sender_id ?? null,
    }))
    .sort((a, b) => (Date.parse(a.at) || 0) - (Date.parse(b.at) || 0));
}

/**
 * Every id the account is known by (provider id, member id, Unipile id, public identifier and the
 * /in/ slug of its profile URL), lowercased. Compared against attendees and comment authors, so
 * a different id space cannot make our own account look like someone else.
 */
export function selfIds(me) {
  const slug = String(me?.profile_url ?? me?.public_profile_url ?? '').match(/linkedin\.com\/in\/([^/?#]+)/i)?.[1];
  return new Set([me?.provider_id, me?.member_id, me?.id, me?.public_identifier, slug]
    .filter(Boolean).map((v) => decodeURIComponent(String(v)).toLowerCase()));
}

/** True when any of a person's ids is one of ours. */
export function isSelf(person, self) {
  const slug = String(person?.profile_url ?? '').match(/linkedin\.com\/in\/([^/?#]+)/i)?.[1];
  return [person?.provider_id, person?.member_id, person?.id, person?.public_identifier, slug]
    .some((v) => v && self.has(decodeURIComponent(String(v)).toLowerCase()));
}

/**
 * The chat's attendees other than the account itself. More than one means a group chat.
 * UNVERIFIED: is_self is read as Unipile documents it; any attendee carrying one of our own ids
 * (self, from selfIds) is dropped too, in case is_self is absent.
 */
export async function otherAttendees(chatId, self = new Set()) {
  const r = await api(`chats/${encodeURIComponent(chatId)}/attendees`);
  return items(r).filter((a) => !(a.is_self === 1 || a.is_self === true) && !isSelf(a, self));
}

/** Reply inside an existing chat. Returns { message_id }. */
export async function sendMessage(chatId, text) {
  const r = await api(`chats/${encodeURIComponent(chatId)}/messages`, { method: 'POST', form: { text } });
  const messageId = r?.message_id ?? r?.id ?? null;
  return { message_id: messageId };
}

// ---- profiles

/** A LinkedIn profile by public id or provider id; includes network_distance. */
export async function profile(identifier, accountId) {
  return await api(`users/${encodeURIComponent(identifier)}?account_id=${encodeURIComponent(accountId)}`);
}

export async function ownProfile(accountId) {
  return await api(`users/me?account_id=${encodeURIComponent(accountId)}`);
}

// ---- own posts and comments

/** The account owner's recent posts. Each post's social_id is the urn:li:... used for comments. */
export async function listOwnPosts(accountId, { limit = 10 } = {}) {
  const me = await ownProfile(accountId);
  const ident = me?.provider_id ?? me?.id;
  if (!ident) return { me, posts: [] }; // no own id: the caller refuses to read comments
  const r = await api(`users/${encodeURIComponent(ident)}/posts?account_id=${encodeURIComponent(accountId)}&limit=${limit}`);
  return { me, posts: items(r) };
}

/** Comments on a post. postId is the post's social_id URN. */
export async function postComments(postId, accountId, { limit = 100 } = {}) {
  const r = await api(`posts/${encodeURIComponent(postId)}/comments?account_id=${encodeURIComponent(accountId)}&limit=${limit}`);
  return items(r);
}

/**
 * Comment on a post, or reply to one comment when commentId is given.
 * UNVERIFIED: the comment_id field for threading a reply under a comment is taken from Unipile's
 * docs, not from a live call; build step 10 confirms it on the test account.
 */
export async function postComment(postUrn, text, accountId, { commentId } = {}) {
  if (!/^urn:/.test(String(postUrn))) {
    throw new Error(`comment target must be a social_id URN (urn:li:...), got "${postUrn}"`);
  }
  const json = { account_id: accountId, text };
  if (commentId) json.comment_id = commentId;
  const r = await api(`posts/${encodeURIComponent(postUrn)}/comments`, { method: 'POST', json });
  return { comment_id: r?.comment_id ?? r?.id ?? null };
}
