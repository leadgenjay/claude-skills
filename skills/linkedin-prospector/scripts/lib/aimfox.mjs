// Aimfox v2 client. One function per endpoint the prospector uses.
// Read shapes (accounts, campaign, audience, lead) were observed 2026-10-03 against a live workspace
// and are recorded in docs/aimfox-api.md: every body is {status: "ok", <name>: ...}. Write calls
// (audience add and remove, custom variables read-back, blacklist) follow the official docs
// (docs.aimfox.com, 2026-10-03) and have not yet been exercised live; each says so where it is used.
// Campaign authoring edits inactive flow steps only; the user presses Start in Aimfox by hand.

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
export const ADD_REFUSAL_CODES = ['blocked', 'locked', 'miningFailed', 'noPFP', 'alreadyConnected', 'notLead', 'closed'];

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
// One profile is sent per call, so a lone entry in the answer is that profile even when its public
// identifier differs from the URL sent (a changed vanity URL).
export async function addToAudience(campaignId, { profileUrl, customVariables }) {
  const path = `/campaigns/${encodeURIComponent(campaignId)}/audience/multiple`;
  let res;
  try {
    res = await call('POST', path, { type: 'profile_url', profiles: [{ profile_url: profileUrl, custom_variables: customVariables ?? {} }] });
  } catch (e) {
    // The single-add route answers a refusal as HTTP 400 {error: {data: <code>}}; read it the same way,
    // but only for the documented codes. Any other HTTP error is not a per-profile refusal.
    const code = e instanceof AimfoxError && !e.auth ? e.body?.error?.data : null;
    if (ADD_REFUSAL_CODES.includes(code)) throw new AimfoxAddRefused(code, profileUrl, e.body, e.status);
    throw e;
  }
  const publicId = publicIdFromProfileUrl(profileUrl);
  const reasons = res?.failedReason && typeof res.failedReason === 'object' ? res.failedReason : {};
  const reasonKeys = Object.keys(reasons);
  const reasonKey = reasonKeys.find((k) => publicIdFromProfileUrl(k) === publicId) ?? (reasonKeys.length === 1 ? reasonKeys[0] : undefined);
  const failed = (Array.isArray(res?.failed) ? res.failed : []).some((f) => publicIdFromProfileUrl(f?.profile_url) === publicId);
  if (reasonKey !== undefined || failed) {
    throw new AimfoxAddRefused(reasonKey !== undefined ? String(reasons[reasonKey]) : 'unknown', profileUrl, res);
  }
  const profiles = (Array.isArray(res?.profiles) ? res.profiles : []).map(audienceEntry);
  const added = profiles.find((e) => e.publicId === publicId) ?? (profiles.length === 1 ? profiles[0] : undefined);
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

// ---- campaign authoring -------------------------------------------------------------------------

export class AimfoxRefusal extends AimfoxError {
  constructor(message) { super(message, 0, null); this.name = 'AimfoxRefusal'; }
}

export function stableId(value, label = 'ID') {
  if (!['string', 'number'].includes(typeof value) || !/^[A-Za-z0-9_-]+$/.test(String(value))) {
    throw new AimfoxRefusal(`${label} must be a stable ID (letters, digits, _ or -)`);
  }
  return String(value);
}

function checkedEnvelope(body, key, array = false) {
  if (body?.status !== 'ok') throw new AimfoxError('Aimfox returned an unsuccessful or missing status envelope', 0, null);
  if (body.next || body.next_page || body.has_more === true || body.pagination?.has_more === true) {
    throw new AimfoxRefusal('Aimfox returned a partial list; complete pagination is not established');
  }
  return requireShape(body, key, key, array);
}

export async function authoringAccounts() {
  const rows = checkedEnvelope(await call('GET', '/accounts'), 'accounts', true);
  const ids = new Set();
  for (const row of rows) {
    const id = stableId(row?.id, 'account ID');
    stableId(row?.workspace_id, 'account workspace ID');
    if (ids.has(id)) throw new AimfoxRefusal('Aimfox returned duplicate account IDs');
    ids.add(id);
  }
  return rows;
}

export async function listCampaigns() {
  const rows = checkedEnvelope(await call('GET', '/campaigns'), 'campaigns', true);
  const ids = new Set();
  for (const row of rows) {
    const id = stableId(row?.id, 'campaign ID');
    if (ids.has(id)) throw new AimfoxRefusal('Aimfox returned duplicate campaign IDs');
    ids.add(id);
  }
  return rows;
}

export async function readAuthoringCampaign(id) {
  stableId(id, 'campaign ID');
  const c = checkedEnvelope(await call('GET', `/campaigns/${id}`), 'campaign');
  if (String(c.id) !== String(id)) throw new AimfoxRefusal('Aimfox returned a different campaign ID');
  return c;
}

function accountScope(accounts, requestedAccount, campaign) {
  let selected;
  if (campaign?.owners !== undefined) {
    if (!Array.isArray(campaign.owners) || campaign.owners.length === 0) throw new AimfoxRefusal('Campaign owner IDs are missing');
    const ownerIds = campaign.owners.map((o) => stableId(typeof o === 'object' ? o?.id : o, 'owner account ID'));
    selected = ownerIds.map((id) => accounts.find((a) => String(a.id) === id));
    if (selected.some((a) => !a)) throw new AimfoxRefusal('Campaign owner is inaccessible with this API key');
    if (new Set(ownerIds).size !== ownerIds.length) throw new AimfoxRefusal('Campaign owners are ambiguous');
    if (requestedAccount && (selected.length !== 1 || String(selected[0].id) !== requestedAccount)) {
      throw new AimfoxRefusal('Campaign does not belong exclusively to the requested account');
    }
  } else {
    selected = requestedAccount ? accounts.filter((a) => String(a.id) === requestedAccount) : accounts;
    // A missing owners field cannot prove ownership for a chosen account among several.
    if (selected.length !== 1 || (campaign && accounts.length !== 1)) {
      throw new AimfoxRefusal('Select an exact --account ID for creation; repair requires proven campaign ownership');
    }
  }
  const workspaces = new Set(selected.map((a) => String(a.workspace_id)));
  if (workspaces.size !== 1) throw new AimfoxRefusal('Campaign accounts span multiple workspaces');
  const workspaceId = [...workspaces][0];
  if (campaign?.workspace_id !== undefined && String(campaign.workspace_id) !== workspaceId) {
    throw new AimfoxRefusal('Campaign workspace does not match the account workspace');
  }
  return { workspaceId, accountIds: selected.map((a) => String(a.id)) };
}

function safeCampaign(c, accounts, account) {
  if (!['INIT', 'CREATED', 'PAUSED'].includes(c.state)) {
    throw new AimfoxRefusal('Campaign must be INIT, CREATED or PAUSED; active, running and unknown states are refused');
  }
  if (c.type !== 'list' || c.outreach_type !== 'connect') throw new AimfoxRefusal('Campaign must be a list/connect campaign');
  if (c.inmail_optimization !== false || c.uses_connection_note !== false) {
    throw new AimfoxRefusal('Turn InMail optimization and uses_connection_note off in Aimfox first; changing campaign settings is outside this command');
  }
  const scope = accountScope(accounts, account, c);
  if (!Array.isArray(c.flows)) throw new AimfoxRefusal('Campaign flows are missing');
  const primary = c.flows.filter((f) => f?.type === 'PRIMARY_CONNECT');
  if (primary.length !== 1) throw new AimfoxRefusal('Campaign must expose exactly one PRIMARY_CONNECT flow');
  const flow = primary[0];
  stableId(flow.id, 'flow ID');
  if (!Object.hasOwn(flow, 'template') || !Array.isArray(flow.flow_message_templates)) {
    throw new AimfoxRefusal('PRIMARY_CONNECT note or message list is missing');
  }
  if (flow.flow_message_templates.length > 100) throw new AimfoxRefusal('More than 100 message steps is outside the bounded repair scope');
  const optimization = c.flows.filter((f) => f?.type === 'CONNECT_OPTIMIZATION');
  if (optimization.length !== 1 || optimization[0].template !== null
      || !Array.isArray(optimization[0].flow_message_templates) || optimization[0].flow_message_templates.length !== 0) {
    throw new AimfoxRefusal('Connect optimization must be explicitly blank before authoring');
  }
  return { ...scope, flow };
}

// The body the Aimfox web app sends for a new message step. Live 2026-10-03 the endpoint answered
// 422 for a missing `edited`, then for a non-string `original_id`: a step is always added from a
// saved template, whose id goes in original_id. Delay is in hours (the app's default is 24).
const WELCOME_TEMPLATE_NAME = 'LinkedIn Prospector welcome';
const TEMPLATE_PLACEHOLDER = '<welcome template id>';
const welcomeStepBody = (templateId) => ({
  type: 'MESSAGE_TEMPLATE', message: WELCOME_TOKEN, delay: 1,
  edited: false, original_id: templateId, ai_descriptors: {}, attachments: [],
});

// Documented public endpoints (GET/POST /v2/templates). Reuses a saved message template whose text
// is exactly the welcome token, else creates one. Returns { id, created }.
async function welcomeTemplate() {
  const list = await call('GET', '/templates');
  if (!list || !Array.isArray(list.templates)) throw new AimfoxError('Aimfox returned templates in an unexpected shape', 0, null);
  const found = list.templates.find((t) => t?.type === 'MESSAGE_TEMPLATE' && t?.message === WELCOME_TOKEN
    && (!Array.isArray(t.attachments) || !t.attachments.length));
  if (found) return { id: stableId(found.id, 'template ID'), created: false };
  const made = checkedEnvelope(await call('POST', '/templates',
    { name: WELCOME_TEMPLATE_NAME, type: 'MESSAGE_TEMPLATE', message: WELCOME_TOKEN, ai: false }), 'template');
  if (made.type !== 'MESSAGE_TEMPLATE' || made.message !== WELCOME_TOKEN) {
    throw new AimfoxError(`Template ${made.id} came back with different text; inspect it in Aimfox`, 0, null);
  }
  return { id: stableId(made.id, 'created template ID'), created: true };
}

function repairSteps(c, workspaceId, flow, templateId = TEMPLATE_PLACEHOLDER) {
  const base = `/workspaces/${workspaceId}/campaigns/${c.id}/flows/${flow.id}`;
  const steps = [];
  if (flow.template !== null) steps.push({ method: 'PATCH', path: base, body: { template: null } });
  for (let n = flow.flow_message_templates.length; n > 1; n--) {
    steps.push({ method: 'DELETE', path: `${base}/messages` });
  }
  const desired = welcomeStepBody(templateId);
  const first = flow.flow_message_templates[0];
  if (!first) steps.push({ method: 'POST', path: `${base}/messages`, body: desired });
  else if (first.type !== desired.type || first.message !== desired.message || first.delay !== desired.delay
      || (first.attachments !== undefined && (!Array.isArray(first.attachments) || first.attachments.length))) {
    steps.push({ method: 'DELETE', path: `${base}/messages` });
    steps.push({ method: 'POST', path: `${base}/messages`, body: desired });
  }
  return steps;
}

// Undocumented private endpoint (web app), observed 2026-10-03.
// The token never leaves this stack frame/its caller and is never written to disk or error bodies.
async function privateCall(method, path, body, token, route) {
  let res;
  try {
    res = await request(method, `https://api.aimfox.com/api/v1${path}`, {
      headers: { Authorization: `Bearer ${token}` }, body, timeoutMs: AIMFOX_TIMEOUT_MS,
    });
  } catch {
    throw new AimfoxError(`UNPROVEN private ${method} ${path} (${route}): no response; stop and inspect this campaign before retrying`, 0, null);
  }
  if (res.status < 200 || res.status >= 300 || res.body?.status !== 'ok') {
    throw new AimfoxError(`UNPROVEN private ${method} ${path} (${route}): HTTP ${res.status}; stop and inspect this campaign before retrying`, res.status, null);
  }
}

async function sessionToken() {
  let failure;
  try {
    // Documented login token route. Empty body deliberately excludes account_id (re-login).
    const body = await call('POST', '/token', {});
    // Observed live 2026-10-03: this route answers status "OK" in capitals, unlike the rest of v2.
    if (!body || (body.status !== undefined && String(body.status).toLowerCase() !== 'ok') || body.error || typeof body.token !== 'string' || !body.token.trim()) {
      throw new AimfoxError('login token response missing status/token', 0, null);
    }
    return { token: body.token, route: 'A' };
  } catch (e) {
    failure = e instanceof AimfoxError && e.status ? `HTTP ${e.status}` : 'no valid login-token response';
  }
  if (process.env.AIMFOX_SESSION?.trim()) return { token: process.env.AIMFOX_SESSION, route: 'B', routeAFailure: failure };
  throw new AimfoxRefusal(`Login-token route A failed (${failure}). Copy localStorage "auth" from your existing app.aimfox.com session into AIMFOX_SESSION, then rerun. No flow writes were attempted.`);
}

// Compare documented protocol fields, ignoring server IDs/metadata and normalizing absent attachments.
// Sorted by flow id: Aimfox returns the flows in a different order on each read (observed live).
function flowSnapshot(c) {
  const flows = [...c.flows].sort((a, b) => String(a.id).localeCompare(String(b.id)));
  return JSON.stringify(flows.map((f) => [String(f.id), f.type, f.template,
    Array.isArray(f.flow_message_templates) ? f.flow_message_templates.map((m) =>
      [m.type, m.message, m.delay, m.attachments ?? []]) : null]));
}

// Undocumented private endpoint (web app), observed 2026-10-03. Read-only authorization probe.
async function probeSession(auth, path) {
  let res;
  try {
    res = await request('GET', `https://api.aimfox.com/api/v1${path}`, {
      headers: { Authorization: `Bearer ${auth.token}` }, timeoutMs: AIMFOX_TIMEOUT_MS,
    });
  } catch { throw new AimfoxRefusal('Private session authorization probe did not answer; no flow writes attempted'); }
  if ((res.status === 401 || res.status === 403) && auth.route === 'A' && process.env.AIMFOX_SESSION?.trim()) {
    const fallback = { token: process.env.AIMFOX_SESSION, route: 'B', routeAFailure: `private GET HTTP ${res.status}` };
    return probeSession(fallback, path);
  }
  if (res.status < 200 || res.status >= 300) {
    throw new AimfoxRefusal(`Private session authorization probe (${auth.route}) returned HTTP ${res.status}. Set AIMFOX_SESSION from localStorage "auth" in your existing Aimfox session; no flow writes attempted.`);
  }
  if (!res.body || typeof res.body !== 'object' || Array.isArray(res.body) || res.body.status === 'fail' || res.body.error) {
    throw new AimfoxRefusal('Private session authorization probe returned an unexpected body; no flow writes attempted');
  }
  return auth;
}

function exactResult(c, safety) {
  const facts = campaignFacts(c);
  const flow = safety.flow;
  const messages = flow.flow_message_templates;
  if (flow.template !== null || messages.length !== 1 || messages[0]?.type !== 'MESSAGE_TEMPLATE'
      || messages[0]?.message !== WELCOME_TOKEN || messages[0]?.delay !== 1
      || (messages[0]?.attachments !== undefined && (!Array.isArray(messages[0].attachments) || messages[0].attachments.length))
      || facts.state !== 'PAUSED' || !facts.connectNoteBlank || !facts.welcomeTokenOk
      || !facts.connectOptimizationBlank || facts.inmailOptimization !== false) {
    throw new AimfoxError(`UNPROVEN campaign ${c.id}: final readback does not match the exact blank note, one welcome token and delay 1`, 0, null);
  }
  return facts;
}

export function authoringOptions({ name = 'LinkedIn Prospector', campaign, account } = {}) {
  if (typeof name !== 'string' || !name.trim() || name.length > 200 || /[\x00-\x1f]/.test(name)
      || /\{\{|<[^>]+>/.test(name)) throw new AimfoxRefusal('Campaign name must be a nonempty literal of at most 200 characters');
  if (campaign !== undefined) stableId(campaign, 'campaign ID');
  if (account !== undefined) stableId(account, 'account ID');
  return { name, campaign, account };
}

// Authoring only: no campaign-state PATCH, audience endpoint, schedule or start call exists here.
export async function createWelcomeCampaign(options = {}, { apply = false } = {}) {
  const { name, campaign: id, account } = authoringOptions(options);
  let campaignId = id;
  let route = null;
  let writesAttempted = 0;
  try {
    let accounts = await authoringAccounts();
    let c = id ? await readAuthoringCampaign(id) : null;
    let safety = c ? safeCampaign(c, accounts, account) : accountScope(accounts, account);
    const shell = { name, type: 'list', outreach_type: 'connect', account_ids: safety.accountIds,
      audience_size: 1000, uses_connection_note: false, inmail_optimization: false,
      exclude_active_targets: true, exclude_previous_targets: true };
    if (!apply) return {
      status: 'preview', campaign_id: id ?? null, workspace_id: safety.workspaceId, account_ids: safety.accountIds,
      steps: c ? repairSteps(c, safety.workspaceId, safety.flow) : [{ method: 'POST', path: '/campaigns', body: shell },
        { method: 'POST', path: `/workspaces/${safety.workspaceId}/campaigns/<created-id>/flows/<readback-flow>/messages`,
          body: welcomeStepBody(TEMPLATE_PLACEHOLDER) }],
      effects: 'Author inactive campaign configuration only; audience remains unchanged; Start is manual.',
      cost: 'Provider authoring cost is unmeasured; no audience or sends are requested.',
    };
    // Resolve private write auth before creating a shell, avoiding an orphan when no session exists.
    let auth = await sessionToken();
    route = auth.route;
    const selectedScope = JSON.stringify([safety.workspaceId, safety.accountIds]);
    accounts = await authoringAccounts();
    if (!c) {
      const freshScope = accountScope(accounts, account);
      if (JSON.stringify(freshScope) !== JSON.stringify(safety)) throw new AimfoxRefusal('Account scope changed before shell creation');
      writesAttempted++;
      const created = checkedEnvelope(await call('POST', '/campaigns', shell), 'campaign');
      campaignId = stableId(created.id, 'created campaign ID');
      if (created.state !== 'INIT') throw new AimfoxRefusal(`New campaign ${campaignId} is not INIT; stop and inspect it`);
    }
    c = await readAuthoringCampaign(campaignId);
    safety = safeCampaign(c, accounts, account);
    if (JSON.stringify([safety.workspaceId, safety.accountIds]) !== selectedScope) throw new AimfoxRefusal('Campaign account/workspace changed before authoring');
    const originalScope = JSON.stringify([safety.workspaceId, safety.accountIds, String(safety.flow.id)]);
    let steps = repairSteps(c, safety.workspaceId, safety.flow);
    if (steps.length) {
      auth = await probeSession(auth, `/workspaces/${safety.workspaceId}/campaigns/${campaignId}/flows/${safety.flow.id}`);
      route = auth.route;
    }
    // A saved template is a standalone, reusable object, not a campaign change, so creating one
    // does not count as a campaign write; the result reports it.
    let template = null;
    if (steps.some((s) => s.method === 'POST')) {
      template = await welcomeTemplate();
      steps = repairSteps(c, safety.workspaceId, safety.flow, template.id);
    }
    let expectedFlows = flowSnapshot(c);
    for (const step of steps) {
      // Recheck the exact resource and inactive state immediately before EVERY private effect.
      c = await readAuthoringCampaign(campaignId);
      safety = safeCampaign(c, accounts, account);
      if (JSON.stringify([safety.workspaceId, safety.accountIds, String(safety.flow.id)]) !== originalScope
          || flowSnapshot(c) !== expectedFlows) throw new AimfoxRefusal('Campaign scope or flow changed before write; stop and inspect it');
      writesAttempted++;
      await privateCall(step.method, step.path, step.body, auth.token, route);
      // Update the expected shape; the next preflight/final GET proves the previous effect.
      if (step.method === 'DELETE') safety.flow.flow_message_templates.pop();
      else if (step.path.endsWith('/messages')) safety.flow.flow_message_templates.push({ ...step.body });
      else safety.flow.template = null;
      // Server may attach an empty attachments property. Compare canonical protocol fields below.
      expectedFlows = flowSnapshot(c);
    }
    c = await readAuthoringCampaign(campaignId);
    safety = safeCampaign(c, accounts, account);
    if (JSON.stringify([safety.workspaceId, safety.accountIds, String(safety.flow.id)]) !== originalScope) {
      throw new AimfoxRefusal('Campaign scope changed during final readback');
    }
    return { status: 'verified', campaign_id: campaignId, workspace_id: safety.workspaceId,
      account_ids: safety.accountIds, auth_route: route, ...(auth.routeAFailure ? { route_a_failure: auth.routeAFailure } : {}),
      writes_attempted: writesAttempted, facts: exactResult(c, safety),
      ...(template ? { welcome_template: { id: template.id, created: template.created } } : {}),
      config: { aimfox_campaign_id: campaignId }, instruction: 'Put campaign_id in config.json as aimfox_campaign_id. Start remains manual in Aimfox.' };
  } catch (e) {
    // Never serialize a provider body or a credential. Partial effects must remain distinguishable.
    if (writesAttempted) throw new AimfoxError(`UNPROVEN campaign ${campaignId ?? '(shell ID unknown)'}; ${writesAttempted} write(s) attempted; auth route ${route ?? 'none'}; ${e instanceof AimfoxError ? e.message : 'request failed without a proven result'}`, e.status ?? 0, null);
    throw e;
  }
}
