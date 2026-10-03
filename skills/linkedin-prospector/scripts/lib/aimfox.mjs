// Aimfox v2 client. One function per endpoint the prospector uses.
// Paths come from the Aimfox docs bundle (2026-10-03). Request and response BODIES are not verified:
// every function marks its assumption in one place, and build step 5 (live probe on a paused test
// campaign) replaces them with the recorded shapes in docs/aimfox-api.md.

import { request } from './http.mjs';

export const AIMFOX_BASE = 'https://api.aimfox.com/api/v2';

// UNVERIFIED body shape — build step 5 confirms. Whether POST /campaigns/:id/audience accepts the
// custom variables in the same request. push reads them back either way, so a wrong guess here can
// only produce a read-back mismatch (lead removed, push_failed), never a lead with an empty message.
export const AUDIENCE_ADD_TAKES_VARIABLES = true;

// The custom variable the campaign's message step renders: its text is exactly {{welcome_message}}.
export const WELCOME_VARIABLE = 'welcome_message';

export class AimfoxError extends Error {
  constructor(message, status, body) {
    super(message);
    this.name = 'AimfoxError';
    this.status = status;
    this.body = body;
    this.auth = status === 401 || status === 403;
  }
}

function apiKey() {
  const key = process.env.AIMFOX_API_KEY;
  if (!key) throw new AimfoxError('AIMFOX_API_KEY is not set in .env', 0, null);
  return key;
}

async function call(method, path, body) {
  const res = await request(method, `${AIMFOX_BASE}${path}`, {
    headers: { Authorization: `Bearer ${apiKey()}`, 'Content-Type': 'application/json' },
    body,
  });
  if (res.status < 200 || res.status >= 300) {
    const what = res.status === 401 || res.status === 403 ? 'Aimfox refused the API key' : 'Aimfox request failed';
    throw new AimfoxError(`${what}: ${method} ${path} -> HTTP ${res.status}`, res.status, res.body);
  }
  return res.body;
}

// Unwraps the common envelope shapes ({data: ...}, {campaign: ...}) without guessing deeper.
function unwrap(body, key) {
  if (body && typeof body === 'object') {
    if (key && body[key] !== undefined) return body[key];
    if (body.data !== undefined) return body.data;
  }
  return body;
}

function asList(body, key) {
  const v = unwrap(body, key);
  if (Array.isArray(v)) return v;
  if (v && Array.isArray(v.items)) return v.items;
  if (v && Array.isArray(v.results)) return v.results;
  return [];
}

export function publicIdFromProfileUrl(url) {
  if (!url) return null;
  const m = String(url).match(/linkedin\.com\/in\/([^/?#]+)/i);
  const slug = m ? m[1] : String(url);
  try {
    return decodeURIComponent(slug).trim().replace(/\/+$/, '').toLowerCase() || null;
  } catch {
    return slug.trim().replace(/\/+$/, '').toLowerCase() || null;
  }
}

// ---- accounts (setup-check) -------------------------------------------------------------------

export async function listAccounts() {
  // UNVERIFIED body shape — build step 5 confirms. Assumed: list or {data: [...]}.
  return asList(await call('GET', '/accounts'), 'accounts');
}

// ---- campaigns ----------------------------------------------------------------------------------

export async function getCampaign(campaignId) {
  // UNVERIFIED body shape — build step 5 confirms. Assumed: {campaign: {...}} or {data: {...}} or bare.
  return unwrap(await call('GET', `/campaigns/${encodeURIComponent(campaignId)}`), 'campaign');
}

// Reads the facts push needs out of a campaign object. Every field Aimfox may not expose comes back
// null, meaning "the API cannot answer", which push turns into the one typed confirmation.
// UNVERIFIED body shape — build step 5 confirms. Assumed fields, in order of preference:
//   state:       campaign.state | campaign.status  (PAUSED / RUNNING / ACTIVE ...)
//   steps:       campaign.steps | campaign.sequence | campaign.flow.steps, each {type, message|text|note|template}
//   stop on reply: campaign.stop_on_reply | campaign.settings.stop_on_reply | campaign.stopOnReply
//   updated-at:  campaign.updated_at | campaign.updatedAt
export function campaignFacts(campaign) {
  const c = campaign || {};
  const rawState = String(c.state ?? c.status ?? '').toUpperCase();
  const state = rawState === 'ACTIVE' || rawState === 'STARTED' ? 'RUNNING' : rawState || null;

  const steps = Array.isArray(c.steps) ? c.steps
    : Array.isArray(c.sequence) ? c.sequence
      : Array.isArray(c.flow?.steps) ? c.flow.steps : null;

  const stepText = (s) => s?.message ?? s?.text ?? s?.template ?? s?.body ?? null;
  const isConnect = (s) => /connect|invit/i.test(String(s?.type ?? s?.action ?? ''));
  const isMessage = (s) => /message/i.test(String(s?.type ?? s?.action ?? '')) && !isConnect(s);

  let welcomeTokenOk = null;
  let connectNoteBlank = null;
  if (steps) {
    const msgs = steps.filter(isMessage).map(stepText).filter((t) => t !== null && t !== undefined);
    if (msgs.length) welcomeTokenOk = String(msgs[0]).trim() === `{{${WELCOME_VARIABLE}}}`;
    const connects = steps.filter(isConnect);
    if (connects.length) {
      connectNoteBlank = connects.every((s) => {
        const note = s?.note ?? s?.message ?? s?.text ?? '';
        return String(note ?? '').trim() === '';
      });
    }
  }

  const sor = c.stop_on_reply ?? c.settings?.stop_on_reply ?? c.stopOnReply ?? c.settings?.stopOnReply;
  const stopOnReply = typeof sor === 'boolean' ? sor : null;

  // Fingerprint: a hash of the step text when readable (it does not move when leads are added),
  // else the campaign's updated-at, else null (no automatic later batches).
  let fingerprint = null;
  if (steps) fingerprint = `steps:${fnv1a(JSON.stringify(steps.map((s) => [s?.type ?? s?.action ?? '', stepText(s) ?? '', s?.note ?? ''])))}`;
  else if (c.updated_at ?? c.updatedAt) fingerprint = `updated:${c.updated_at ?? c.updatedAt}`;

  return { state, welcomeTokenOk, connectNoteBlank, stopOnReply, fingerprint };
}

function fnv1a(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

// ---- audience -----------------------------------------------------------------------------------

// Shape of one audience entry, read in one place.
// UNVERIFIED body shape — build step 5 confirms. Assumed: {urn | lead_urn | id, public_identifier | public_id, profile_url}.
export function audienceEntry(raw) {
  const urn = raw?.urn ?? raw?.lead_urn ?? raw?.target_urn ?? raw?.id ?? null;
  const publicId = (raw?.public_identifier ?? raw?.public_id ?? publicIdFromProfileUrl(raw?.profile_url ?? raw?.linkedin_url))
    ?.toString().toLowerCase() ?? null;
  return { urn: urn === null ? null : String(urn), publicId };
}

export const PAGE_SIZE = 100;
const MAX_PAGES = 500;

// UNVERIFIED paging — build step 5 confirms. Assumed for every list endpoint: offset/limit; each page
// a list or {data: [...]}, optionally with has_more / next. Paging stops on a short or empty page, an
// explicit has_more:false, or a page that adds nothing new (an API that ignores offset).
// fetchPage(offset, limit) returns the raw body; key(raw) dedupes across pages.
async function pageAll(fetchPage, listKey, key) {
  const seen = new Map();
  for (let page = 0, offset = 0; page < MAX_PAGES; page++, offset += PAGE_SIZE) {
    const body = await fetchPage(offset, PAGE_SIZE);
    const items = asList(body, listKey);
    const before = seen.size;
    for (const raw of items) seen.set(key(raw), raw);
    const hasMore = body?.has_more ?? body?.hasMore ?? (body?.next !== undefined ? Boolean(body.next) : undefined);
    if (hasMore === false || items.length < PAGE_SIZE || seen.size === before) break;
  }
  return [...seen.values()];
}

export async function listAudience(campaignId) {
  // UNVERIFIED body shape — build step 5 confirms. Paged as pageAll assumes.
  const raws = await pageAll(
    (offset, limit) => call('GET', `/campaigns/${encodeURIComponent(campaignId)}/audience?offset=${offset}&limit=${limit}`),
    'audience',
    (raw) => { const e = audienceEntry(raw); return e.urn ?? `public:${e.publicId}`; },
  );
  return raws.map(audienceEntry);
}

export async function addToAudience(campaignId, { profileUrl, customVariables }) {
  // UNVERIFIED body shape — build step 5 confirms. Assumed request: {profile_url, custom_variables?};
  // assumed response: the created audience entry, or {data: entry}. urn may be absent, in which case
  // push looks the lead up in listAudience by public id.
  const body = { profile_url: profileUrl };
  if (AUDIENCE_ADD_TAKES_VARIABLES && customVariables) body.custom_variables = customVariables;
  const res = await call('POST', `/campaigns/${encodeURIComponent(campaignId)}/audience`, body);
  return audienceEntry(unwrap(res, 'lead') ?? {});
}

export async function removeFromAudience(campaignId, urn) {
  // UNVERIFIED body shape — build step 5 confirms. Assumed: no body, any 2xx is success.
  return call('DELETE', `/campaigns/${encodeURIComponent(campaignId)}/audience/${encodeURIComponent(urn)}`);
}

// ---- custom variables ---------------------------------------------------------------------------

export async function setCustomVariables(campaignId, urn, variables) {
  // UNVERIFIED body shape — build step 5 confirms. Assumed: PUT {custom_variables: {name: value}}.
  return call('PUT', `/campaigns/${encodeURIComponent(campaignId)}/custom-variables/${encodeURIComponent(urn)}`,
    { custom_variables: variables });
}

export async function getCustomVariables(campaignId, urn) {
  // UNVERIFIED body shape — build step 5 confirms. Assumed: {custom_variables: {name: value}} or
  // {data: {...}} or a list of {name, value}. Normalised to a plain {name: value} object.
  const body = await call('GET', `/campaigns/${encodeURIComponent(campaignId)}/custom-variables/${encodeURIComponent(urn)}`);
  const v = unwrap(body, 'custom_variables');
  if (Array.isArray(v)) return Object.fromEntries(v.map((x) => [x?.name ?? x?.key, x?.value]));
  if (v && typeof v === 'object' && v.custom_variables && typeof v.custom_variables === 'object') return v.custom_variables;
  return v && typeof v === 'object' ? v : {};
}

// ---- blacklist ----------------------------------------------------------------------------------

// Takes a lead urn (string, as dnc.mjs passes it) or {urn} / {profileUrl}.
export async function addToBlacklist(target) {
  // UNVERIFIED body shape — build step 5 confirms. Assumed: POST {urn} or {profile_url}.
  const { urn, profileUrl } = typeof target === 'string' ? { urn: target } : (target ?? {});
  const body = urn ? { urn } : { profile_url: profileUrl };
  return call('POST', '/blacklist', body);
}

// ---- interactions and leads (sync) --------------------------------------------------------------

// One interaction, read in one place.
// UNVERIFIED body shape — build step 5 confirms. Assumed: {type | event, lead_urn | target_urn | urn,
// public_identifier | profile_url, campaign_id, created_at | timestamp}. Types are matched loosely:
// connect sent / connect accepted / message sent / reply.
export function interactionEntry(raw) {
  const type = String(raw?.type ?? raw?.event ?? raw?.interaction ?? '').toLowerCase();
  let kind = null;
  if (/accept/.test(type)) kind = 'accepted';
  else if (/connect|invit/.test(type) && /sent|send/.test(type)) kind = 'connect_sent';
  else if (/repl/.test(type)) kind = 'replied';
  else if (/message/.test(type) && /sent|send/.test(type)) kind = 'welcome_sent';
  const lead = raw?.lead ?? raw?.target ?? {};
  const urn = raw?.lead_urn ?? raw?.target_urn ?? raw?.urn ?? lead?.urn ?? null;
  const publicId = (raw?.public_identifier ?? lead?.public_identifier ?? publicIdFromProfileUrl(raw?.profile_url ?? lead?.profile_url))
    ?.toString().toLowerCase() ?? null;
  return {
    kind,
    urn: urn === null ? null : String(urn),
    publicId,
    campaignId: raw?.campaign_id ?? raw?.campaign?.id ?? null,
    at: raw?.created_at ?? raw?.timestamp ?? raw?.date ?? null,
  };
}

export async function listInteractions({ campaignId } = {}) {
  // UNVERIFIED body shape — build step 5 confirms. Assumed query: ?campaign_id=&offset=&limit=, paged
  // as pageAll assumes; response: list or {data: [...]}. A missed page would leave a replied lead in
  // the campaign, so every page is read.
  const q = campaignId ? `campaign_id=${encodeURIComponent(campaignId)}&` : '';
  const raws = await pageAll(
    (offset, limit) => call('GET', `/analytics/interactions?${q}offset=${offset}&limit=${limit}`),
    'interactions',
    (raw) => String(raw?.id ?? JSON.stringify(raw)),
  );
  return raws.map(interactionEntry);
}

export async function searchLeads(query = {}) {
  // UNVERIFIED body shape — build step 5 confirms. Assumed: POST body is the filter object plus
  // offset/limit, paged as pageAll assumes; response list or {data: [...]} of leads with
  // {urn, public_identifier, labels: [{name}] | [string]}.
  const list = await pageAll(
    (offset, limit) => call('POST', '/leads:search', { ...query, offset, limit }),
    'leads',
    (raw) => { const e = audienceEntry(raw); return e.urn ?? `public:${e.publicId}`; },
  );
  return list.map((raw) => ({
    ...audienceEntry(raw),
    labels: (Array.isArray(raw?.labels) ? raw.labels : []).map((l) => String(l?.name ?? l).toLowerCase()),
  }));
}
