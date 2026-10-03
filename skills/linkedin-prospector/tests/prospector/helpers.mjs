// Test harness: every CLI run is a child process with its own temp home, its own static mock file
// (LINKEDIN_LEADGEN_MOCK) and its own HTTP log. Nothing touches the network: an unmatched request
// throws inside http.mjs.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const CLI = path.resolve(HERE, '../../scripts/prospector.mjs');

export const DB = 'https://db.test';
export const AIMFOX = 'https://api.aimfox.com/api/v2';
export const APIFY = 'https://api.apify.com/v2';
export const CAMPAIGN = 'c1';

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// Literal pieces joined by ".*": rx('/rest/v1/li_prospects?', 'status=eq.approved').
export const rx = (...parts) => parts.map(esc).join('.*');

export const BASE_CONFIG = {
  offer: 'We build outbound systems.',
  icp_description: 'B2B founders',
  niche_keywords: ['cold email'],
  self_profile_url: 'https://www.linkedin.com/in/me-myself/',
  aimfox_campaign_id: CAMPAIGN,
  per_run_cap_usd: 10,
  total_cap_usd: 25,
  creators_top_n: 2,
};

const homes = [];
process.on('exit', () => {
  for (const h of homes) fs.rmSync(h, { recursive: true, force: true });
});

export function makeHome(configOverrides = {}) {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'li-prospector-test-'));
  homes.push(home);
  fs.writeFileSync(path.join(home, 'config.json'), JSON.stringify({ ...BASE_CONFIG, ...configOverrides }));
  fs.writeFileSync(path.join(home, '.env'), [
    `SUPABASE_URL=${DB}`,
    'SUPABASE_SERVICE_KEY=test-service-key',
    'APIFY_TOKEN=test-apify-token',
    'AIMFOX_API_KEY=test-aimfox-key',
  ].join('\n'));
  return home;
}

// Mocks every run needs: open alerts read and alert writes.
export const ALERT_MOCKS = [
  { method: 'GET', urlPattern: rx('/rest/v1/li_alerts?'), status: 200, body: [] },
  { method: 'POST', urlPattern: rx('/rest/v1/li_alerts'), status: 201, body: [{ id: 900 }] },
];

let runCounter = 0;

export function run(home, args, mocks, { input, env = {} } = {}) {
  runCounter++;
  const mockFile = path.join(home, `mock-${runCounter}.json`);
  const logFile = path.join(home, `http-${runCounter}.log`);
  // The test's own entries come first, so a test can override the alert defaults.
  fs.writeFileSync(mockFile, JSON.stringify([...mocks, ...ALERT_MOCKS]));
  const res = spawnSync(process.execPath, [CLI, ...args], {
    encoding: 'utf8',
    input: input ?? '',
    env: {
      PATH: process.env.PATH,
      HOME: home,
      LINKEDIN_LEADGEN_HOME: home,
      LINKEDIN_LEADGEN_MOCK: mockFile,
      LINKEDIN_LEADGEN_HTTP_LOG: logFile,
      ...env,
    },
  });
  const log = fs.existsSync(logFile)
    ? fs.readFileSync(logFile, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l))
    : [];
  assertNoCampaignStateChange(log);
  return { status: res.status, stdout: res.stdout, stderr: res.stderr, log };
}

// Campaign state (Start, Pause) is changed by the user in Aimfox, never by this skill. Every CLI run in
// every test goes through this check: any PATCH to /api/v2/campaigns/:id fails the test that caused
// it. (The private v1 flow PATCH in create-campaign is a different route and is allowed.)
export function assertNoCampaignStateChange(log) {
  const bad = log.filter((e) => e.method === 'PATCH' && /api\.aimfox\.com\/api\/v2\/campaigns(\/|$|\?)/.test(e.url));
  if (bad.length) throw new Error(`PATCH to an Aimfox v2 campaign is forbidden: ${bad.map((e) => e.url).join(', ')}`);
}

export const reqs = (log, method, ...parts) => {
  const re = new RegExp(rx(...parts));
  return log.filter((e) => e.method === method && re.test(e.url));
};
export const bodyOf = (entry) => (entry?.body ? JSON.parse(entry.body) : undefined);

export const WELCOME_TOKEN = '{{CUSTOM.welcome_message}}';

// campaign.flows as GET /campaigns/:id returns them (docs/aimfox-api.md): the PRIMARY_CONNECT flow
// carries the invite note (template null = blank) and the messages after acceptance; the two
// optimization flows are always present.
export const flows = ({ note = null, messages = [WELCOME_TOKEN] } = {}) => [
  {
    id: 11, type: 'PRIMARY_CONNECT', name: 'Connect',
    template: note === null ? null : { type: 'NOTE_TEMPLATE', message: note },
    flow_message_templates: messages.map((message, i) => ({ type: 'MESSAGE_TEMPLATE', message, delay: i ? 86400 : 3600, attachments: [] })),
    withdraw_delay: 21, endorse_enabled: false, like_enabled: false,
  },
  { id: 12, type: 'INMAIL_OPTIMIZATION', name: 'InMail', template: null, flow_message_templates: [] },
  { id: 13, type: 'CONNECT_OPTIMIZATION', name: 'Connect optimization', template: null, flow_message_templates: [] },
];

// One campaign object (the `campaign` of {status, campaign}). state is the raw Aimfox state.
export const campaign = (state, over = {}) => ({
  id: CAMPAIGN, name: 'LinkedIn prospector', state, type: 'list', outreach_type: 'connect',
  target_count: 0, audience_size: 0, completion: 0, uses_connection_note: false,
  custom_variable_keys: [{ name: 'welcome_message', value: WELCOME_TOKEN }],
  inmail_optimization: false, flows: flows(), ...over,
});

// One audience entry as GET /campaigns/:id/audience returns it.
export const audienceRow = (id, over = {}) => ({
  id: 5000 + id, urn: `u${id}`, public_identifier: `p${id}`, full_name: `P ${id}`, state: 'init', ...over,
});
export const audienceBody = (rows) => ({ status: 'ok', audience: rows });

export function prospect(id, over = {}) {
  return {
    id,
    public_id: `p${id}`,
    profile_url: `https://www.linkedin.com/in/p${id}`,
    status: 'approved',
    push_attempts: 0,
    aimfox_lead_urn: null,
    ...over,
  };
}

export const welcomeBody = (id) => `Liked your point on reply rates, P${id}. What is working best for you right now?`;

export function welcomeRow(id, over = {}) {
  return { id: 100 + id, prospect_id: id, body: welcomeBody(id), status: 'draft', attempts: 0, ...over };
}

// One Apify run, as runActor sees it: started on /runs, finished on the first poll, items read
// from that run's dataset. actor is the URL form, e.g. 'harvestapi~linkedin-post-search'.
export function apifyRunMocks(actor, items, { runId = `run-${actor}`, cost = 0.01, status = 'SUCCEEDED' } = {}) {
  const ds = `ds-${runId}`;
  return [
    { method: 'POST', urlPattern: rx(`${APIFY}/acts/${actor}/runs?`), status: 201, body: { data: { id: runId, status: 'READY', defaultDatasetId: ds } } },
    { method: 'GET', urlPattern: rx(`${APIFY}/actor-runs/${runId}?`), body: { data: { id: runId, status, usageTotalUsd: cost, defaultDatasetId: ds } } },
    { method: 'GET', urlPattern: rx(`${APIFY}/datasets/${ds}/items`), body: items },
  ];
}
