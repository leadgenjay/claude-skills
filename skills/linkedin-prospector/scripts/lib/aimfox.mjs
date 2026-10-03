// Aimfox v2 client. One function per endpoint the prospector uses.
// Read shapes (accounts, campaign, audience, lead) were observed 2026-10-03 against a live workspace
// and are recorded in docs/aimfox-api.md: every body is {status: "ok", <name>: ...}. Write calls
// (audience add and remove, custom variables read-back, blacklist) follow the official docs
// (docs.aimfox.com, 2026-10-03) and have not yet been exercised live; each says so where it is used.
// Nothing here starts, pauses or edits a campaign: the user presses Start in Aimfox by hand.

import { request, HttpError } from './http.mjs';

export const AIMFOX_BASE = 'https://api.aimfox.com/api/v2';

// Observed 2026-10-03 (docs/aimfox-api.md): calls that normally answer in under a second can stall
// for 30 to 120 seconds. A stall is "try again later", never an answer.
export const AIMFOX_TIMEOUT_MS = 90000;

// The custom variable the campaign's one message step renders. Aimfox writes custom variables as
// {{CUSTOM.NAME}} (docs/aimfox-api.md), so the message text is exactly WELCOME_TOKEN.
export const WELCOME_VARIABLE = 'welcome_message';
export const WELCOME_TOKEN = '{{CUSTOM.welcome_message}}';
const WELCOME_TOKEN_RE = /^\{\{\s*CUSTOM\.welcome_message\s*\}\}$/i;

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
  let res;
  try {
    res = await request(method, `${AIMFOX_BASE}${path}`, {
      headers: { Authorization: `Bearer ${apiKey()}`, 'Content-Type': 'application/json' },
      body,
      timeoutMs: AIMFOX_TIMEOUT_MS,
    });
  } catch (e) {
    // Still an HttpError (no answer), so callers stop rather than read it as a refusal or as data.
    if (e instanceof HttpError && e.timeout) {
      throw new HttpError(`Aimfox did not answer within ${AIMFOX_TIMEOUT_MS / 1000}s; try again later (${method} ${path})`,
        { method, url: e.url, cause: e, timeout: true });
    }
    throw e;
  }
  if (res.status < 200 || res.status >= 300) {
    const what = res.status === 401 || res.status === 403 ? 'Aimfox refused the API key' : 'Aimfox request failed';
    throw new AimfoxError(`${what}: ${method} ${path} -> HTTP ${res.status}`, res.status, res.body);
  }
  return res.body;
}

// Unwraps the {status, <key>: ...} envelope (and a {data: ...} one, for the unverified writes).
function unwrap(body, key) {
  if (body && typeof body === 'object') {
    if (key && body[key] !== undefined) return body[key];
    if (body.data !== undefined) return body.data;
  }
  return body;
}

function asList(body, key) {
  const v = unwrap(body, key);
  return Array.isArray(v) ? v : [];
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
  // Observed 2026-10-03 (docs/aimfox-api.md): {status, accounts: [...]}.
  return asList(await call('GET', '/accounts'), 'accounts');
}

// ---- campaigns ----------------------------------------------------------------------------------

// The observed read shapes, enforced: anything else is an error, never an empty answer.
function requireShape(body, key, what, isArray) {
  const v = body && typeof body === 'object' ? body[key] : undefined;
  const ok = isArray ? Array.isArray(v) : Boolean(v) && typeof v === 'object' && !Array.isArray(v);
  if (!ok) throw new AimfoxError(`Aimfox returned ${what} in an unexpected shape`, 0, body);
  return v;
}

export async function getCampaign(campaignId) {
  // Observed 2026-10-03 (docs/aimfox-api.md): {status, campaign: {...}}.
  return requireShape(await call('GET', `/campaigns/${encodeURIComponent(campaignId)}`), 'campaign', 'a campaign', false);
}

// Aimfox campaign state → the two states push works with. CREATED (observed) and INIT (what the
// docs' Create Campaign returns) are built and never started, so nothing sends: the same as paused.
// Anything else (DONE, ...) comes back as-is and push refuses it.
const STATE_MAP = { ACTIVE: 'RUNNING', STARTED: 'RUNNING', CREATED: 'PAUSED', INIT: 'PAUSED', PAUSED: 'PAUSED' };

// Reads the facts push needs out of a campaign object. A field Aimfox does not expose comes back
// null, meaning "the API cannot answer", which the checklist turns into "check it yourself".
// Observed 2026-10-03 (docs/aimfox-api.md): the steps live in campaign.flows. The flow with type
// PRIMARY_CONNECT is the connection request: template is null for a blank invite or
// {message: <note>}, and flow_message_templates are the messages sent after acceptance, in order.
// uses_connection_note is true on a live campaign that has a note, so a blank invite needs it false
// as well. The CONNECT_OPTIMIZATION flow sends its own invite and must stay empty. The
// INMAIL_OPTIMIZATION flow's text is inert while inmail_optimization is false (live campaigns keep
// text there), so only the switch is checked.
// There is no stop-on-reply field and no updated_at.
export function campaignFacts(campaign) {
  const c = campaign || {};
  const rawState = String(c.state ?? '').toUpperCase();
  const state = STATE_MAP[rawState] ?? (rawState || null);
  const inmailOptimization = typeof c.inmail_optimization === 'boolean' ? c.inmail_optimization : null;
  const stopOnReply = null;

  const flows = Array.isArray(c.flows) ? c.flows : null;
  if (!flows) {
    return {
      state, welcomeTokenOk: null, connectNoteBlank: null, connectOptimizationBlank: null, inmailOptimization, stopOnReply, fingerprint: null,
    };
  }

  const messagesOf = (f) => (Array.isArray(f?.flow_message_templates) ? f.flow_message_templates : []);
  const blankTemplate = (f) => String(f?.template?.message ?? '').trim() === '';
  const connect = flows.find((f) => f?.type === 'PRIMARY_CONNECT');
  const connectNoteBlank = Boolean(connect) && blankTemplate(connect) && c.uses_connection_note === false;
  const connectOpt = flows.find((f) => f?.type === 'CONNECT_OPTIMIZATION');
  const connectOptimizationBlank = !connectOpt || (blankTemplate(connectOpt) && messagesOf(connectOpt).length === 0);
  // Exactly one message: a second one would be a follow-up the skill never wrote.
  const messages = messagesOf(connect);
  const welcomeTokenOk = messages.length === 1 && WELCOME_TOKEN_RE.test(String(messages[0]?.message ?? '').trim());

  // A hash of every flow's text and delays plus the InMail switch. Adding leads does not move it.
  const fingerprint = `flows:${fnv1a(JSON.stringify([
    flows.map((f) => [f?.type ?? '', f?.template?.message ?? '', messagesOf(f).map((m) => [m?.message ?? '', m?.delay ?? null])]),
    c.inmail_optimization ?? null,
  ]))}`;

  return { state, welcomeTokenOk, connectNoteBlank, connectOptimizationBlank, inmailOptimization, stopOnReply, fingerprint };
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
// Observed 2026-10-03 (docs/aimfox-api.md): {id (numeric lead id), urn (ACoAA...), public_identifier,
// state, ...}. id is the lead id for GET /leads/:id, not the urn. state is the lead's current step:
// init, view, like, endorse, message (accepted, in the message sequence), inmail, withdraw,
// cancelled, done (sequence over, including every lead who replied).
// addToAudience's profiles[] entries have the same fields (documented, not yet exercised live).
export function audienceEntry(raw) {
  const urn = raw?.urn ?? raw?.lead_urn ?? raw?.target_urn ?? null;
  const publicId = (raw?.public_identifier ?? raw?.public_id ?? publicIdFromProfileUrl(raw?.profile_url ?? raw?.linkedin_url))
    ?.toString().toLowerCase() ?? null;
  return {
    urn: urn === null ? null : String(urn),
    publicId,
    leadId: raw?.id === undefined || raw?.id === null ? null : String(raw.id),
    state: typeof raw?.state === 'string' ? raw.state.toLowerCase() : null,
  };
}

export async function listAudience(campaignId) {
  // Observed 2026-10-03 (docs/aimfox-api.md): {status, audience: [...]}, the whole audience in one
  // response. offset, limit and page are ignored, so there is nothing to page.
  const body = await call('GET', `/campaigns/${encodeURIComponent(campaignId)}/audience`);
  return requireShape(body, 'audience', 'an audience', true).map(audienceEntry);
}

// Why Aimfox would not add a profile (documented codes): blocked, locked (in another campaign),
// miningFailed (not found), noPFP, alreadyConnected, notLead, closed. push decides what each means.
export class AimfoxAddRefused extends AimfoxError {
  constructor(reason, profileUrl, body, status = 200) {
    super(`Aimfox did not add ${profileUrl}: ${reason}`, status, body);
    this.name = 'AimfoxAddRefused';
    this.reason = reason;
  }
}

// Adds one profile with its custom variables and returns its audience entry.
// Documented (docs.aimfox.com, 2026-10-03), not yet exercised live: POST
// /campaigns/:id/audience/multiple {type: 'profile_url', profiles: [{profile_url, custom_variables}]}
// → {status, profiles: [entry], failed: [{profile_url, custom_variables}], failedReason: {<public id>: code}}.
// A profile in failed throws AimfoxAddRefused with that code. A profile in neither list comes back as
// an empty entry, and push then looks it up in listAudience by public id.
export async function addToAudience(campaignId, { profileUrl, customVariables }) {
  const path = `/campaigns/${encodeURIComponent(campaignId)}/audience/multiple`;
  let res;
  try {
    res = await call('POST', path, { type: 'profile_url', profiles: [{ profile_url: profileUrl, custom_variables: customVariables ?? {} }] });
  } catch (e) {
    // The single-add route answers a refusal as HTTP 400 {error: {data: <code>}}; read it the same way.
    const code = e instanceof AimfoxError && !e.auth && typeof e.body?.error?.data === 'string' ? e.body.error.data : null;
    if (code) throw new AimfoxAddRefused(code, profileUrl, e.body, e.status);
    throw e;
  }
  const publicId = publicIdFromProfileUrl(profileUrl);
  const reasons = res?.failedReason && typeof res.failedReason === 'object' ? res.failedReason : {};
  const reasonKey = Object.keys(reasons).find((k) => k.toLowerCase() === publicId);
  const failed = (Array.isArray(res?.failed) ? res.failed : []).some((f) => publicIdFromProfileUrl(f?.profile_url) === publicId);
  if (reasonKey !== undefined || failed) {
    throw new AimfoxAddRefused(reasonKey !== undefined ? String(reasons[reasonKey]) : 'unknown', profileUrl, res);
  }
  const added = (Array.isArray(res?.profiles) ? res.profiles : []).map(audienceEntry).find((e) => e.publicId === publicId);
  return added ?? audienceEntry({});
}

// Documented (docs.aimfox.com, 2026-10-03), not yet exercised live: DELETE
// /campaigns/:id/audience/:urn, where the last part is the lead's urn OR its public identifier.
export async function removeFromAudience(campaignId, urnOrPublicId) {
  return call('DELETE', `/campaigns/${encodeURIComponent(campaignId)}/audience/${encodeURIComponent(urnOrPublicId)}`);
}

// ---- custom variables ---------------------------------------------------------------------------

// Returns the target's variables as a plain {NAME: value} object.
// Documented (docs.aimfox.com, 2026-10-03), not yet exercised live: {status, custom_variable_keys,
// custom_variables: {target_urn, variables: {NAME: value}}}. Any other shape throws (it is never
// read as "no variables", which would remove a lead whose message is fine).
export async function getCustomVariables(campaignId, urn) {
  const body = await call('GET', `/campaigns/${encodeURIComponent(campaignId)}/custom-variables/${encodeURIComponent(urn)}`);
  const cv = requireShape(body, 'custom_variables', 'custom variables', false);
  return requireShape(cv, 'variables', 'custom variables', false);
}

// The welcome value out of getCustomVariables' result, matched on the name case-insensitively:
// the live workspace lists its custom variables uppercased (AUTHOR, POST_SUMMARY).
export function welcomeFrom(variables) {
  const key = Object.keys(variables ?? {}).find((k) => k.toLowerCase() === WELCOME_VARIABLE);
  return key === undefined ? undefined : variables[key];
}

// ---- blacklist ----------------------------------------------------------------------------------

// Takes a lead urn (string) or {urn} / {profileUrl}.
// Documented (docs.aimfox.com, 2026-10-03), not yet exercised live: POST /blacklist/:urn with no
// body, or POST /blacklist {urls: [profile url]}.
export async function addToBlacklist(target) {
  const { urn, profileUrl } = typeof target === 'string' ? { urn: target } : (target ?? {});
  if (urn) return call('POST', `/blacklist/${encodeURIComponent(urn)}`);
  if (!profileUrl) throw new AimfoxError('addToBlacklist needs a urn or a profile URL', 0, null);
  return call('POST', '/blacklist', { urls: [profileUrl] });
}

// ---- leads (sync) -------------------------------------------------------------------------------

// One lead by its numeric id (the audience entry's leadId), with its labels lowercased.
// Observed 2026-10-03 (docs/aimfox-api.md): {status, lead: {..., labels}}. Labels are read as
// [{name}] or plain strings.
export async function getLead(leadId) {
  const lead = requireShape(await call('GET', `/leads/${encodeURIComponent(leadId)}`), 'lead', 'a lead', false);
  return {
    ...audienceEntry(lead),
    labels: (Array.isArray(lead.labels) ? lead.labels : []).map((l) => String(l?.name ?? l).toLowerCase()),
  };
}
