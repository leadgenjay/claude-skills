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
  return { status: res.status, stdout: res.stdout, stderr: res.stderr, log };
}

export const reqs = (log, method, ...parts) => {
  const re = new RegExp(rx(...parts));
  return log.filter((e) => e.method === method && re.test(e.url));
};
export const bodyOf = (entry) => (entry?.body ? JSON.parse(entry.body) : undefined);

export const steps = (extra = []) => [
  { type: 'connect', note: '' },
  { type: 'message', message: '{{welcome_message}}' },
  ...extra,
];

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
