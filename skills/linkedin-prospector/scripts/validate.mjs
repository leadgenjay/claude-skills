// Welcome-message rules enforced in code. Claude writes the message; this decides whether it ships.
// Rules (plan, Skill 1 step 5): at most 400 characters, no link of any kind (a bare domain counts),
// and there is never a connection note: invites go out blank. A message carrying a secret (a value
// from .env or a token-shaped string) is refused too.

import { assertNoSecrets } from './lib/secrets.mjs';

export const WELCOME_MAX_CHARS = 400;

// Common TLDs a viewer is likely to type as a bare domain. A dotted word ending in one of these is a
// link to LinkedIn's renderer even without "http". Kept as a list so "Node.js" or "e.g." do not trip it.
const BARE_TLDS = [
  'com', 'net', 'org', 'io', 'co', 'ai', 'app', 'dev', 'me', 'us', 'uk', 'ca', 'de', 'fr', 'nl',
  'au', 'in', 'info', 'biz', 'xyz', 'ly', 'gg', 'tv', 'so', 'to', 'link', 'site', 'online', 'store',
  'shop', 'tech', 'page', 'agency', 'club', 'pro', 'live', 'world', 'cc', 'vc', 'fm', 'sh', 'is',
];

const URL_PATTERNS = [
  /\b[a-z][a-z0-9+.-]*:\/\/\S+/i,                                   // scheme://anything
  /\bwww\.\S+/i,                                                    // www.anything
  new RegExp(`\\b[a-z0-9-]+(?:\\.[a-z0-9-]+)*\\.(?:${BARE_TLDS.join('|')})\\b`, 'i'), // foo.com, a.b.io
  /\b[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z][a-z0-9-]+\/\S*/i,           // any.dotted/path (not 7.5/10)
];

export function charCount(text) {
  return Array.from(String(text ?? '')).length;
}

export function containsUrl(text) {
  const s = String(text ?? '');
  return URL_PATTERNS.some((re) => re.test(s));
}

// Returns { ok, errors[] }. Never throws on bad input; the caller reports errors per row.
export function validateWelcome(text) {
  const errors = [];
  if (typeof text !== 'string' || text.trim() === '') {
    return { ok: false, errors: ['welcome message is empty'] };
  }
  const n = charCount(text);
  if (n > WELCOME_MAX_CHARS) errors.push(`welcome message is ${n} characters (limit ${WELCOME_MAX_CHARS})`);
  if (containsUrl(text)) errors.push('welcome message contains a link or domain');
  if (/\{\{|\}\}/.test(text)) errors.push('welcome message contains template braces {{ }}');
  try {
    assertNoSecrets(text, 'welcome message');
  } catch (e) {
    errors.push(e.message);
  }
  return { ok: errors.length === 0, errors };
}

// One row of a write-import file: { id, welcome_message }. A connect_note is refused outright,
// even an empty one, so nothing downstream can ever start sending notes.
export function validateWriteRow(row) {
  const errors = [];
  if (!row || typeof row !== 'object') return { ok: false, errors: ['row is not an object'] };
  if (!Number.isInteger(row.id)) errors.push('id must be an integer prospect id');
  if (Object.prototype.hasOwnProperty.call(row, 'connect_note')) {
    errors.push('connect_note is not allowed: connection requests are always sent blank');
  }
  const w = validateWelcome(row.welcome_message);
  errors.push(...w.errors);
  return { ok: errors.length === 0, errors };
}
