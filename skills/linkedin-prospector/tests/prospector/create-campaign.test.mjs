import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { makeHome, run, campaign, WELCOME_TOKEN, bodyOf } from './helpers.mjs';

const AIMCLI = path.resolve(import.meta.dirname, '../../scripts/aimfox.mjs');
const account = { id: '101', workspace_id: 'ws1', full_name: 'Synthetic', state: 'LoggedIn' };
const target = (over = {}) => campaign('CREATED', { owners: ['101'], workspace_id: 'ws1', ...over });
const exact = () => target({ flows: target().flows.map((f) => f.type === 'PRIMARY_CONNECT'
  ? { ...f, flow_message_templates: [{ type: 'MESSAGE_TEMPLATE', message: WELCOME_TOKEN, delay: 1, attachments: [] }] } : f) });
const get = (c) => ({ method: 'GET', urlPattern: '/api/v2/campaigns/c1$', times: 1, body: { status: 'ok', campaign: c } });
const base = () => [
  { method: 'GET', urlPattern: '/api/v2/accounts$', body: { status: 'ok', accounts: [account] } },
  { method: 'POST', urlPattern: '/api/v2/token$', body: { status: 'ok', token: 'PRIVATE-MINTED-TOKEN' } },
  { method: 'GET', urlPattern: '/api/v1/workspaces/ws1/campaigns/c1/flows/11$', body: { status: 'ok', flow: {} } },
];
function repairMocks(c, final = exact()) {
  const states = [get(c), get(c)];
  const work = structuredClone(c);
  const f = work.flows[0];
  const addEffect = (method, path, mutate) => {
    states.push(get(structuredClone(work)));
    states.push({ method, urlPattern: path, body: { status: 'ok' } });
    mutate();
  };
  if (f.template !== null) addEffect('PATCH', '/flows/11$', () => { f.template = null; });
  while (f.flow_message_templates.length > 1) addEffect('DELETE', '/flows/11/messages$', () => { f.flow_message_templates.pop(); });
  if (f.flow_message_templates.length && (f.flow_message_templates[0].delay !== 1 || f.flow_message_templates[0].message !== WELCOME_TOKEN)) {
    addEffect('DELETE', '/flows/11/messages$', () => { f.flow_message_templates.pop(); });
  }
  if (!f.flow_message_templates.length) addEffect('POST', '/flows/11/messages$', () => {
    f.flow_message_templates.push({ type: 'MESSAGE_TEMPLATE', message: WELCOME_TOKEN, delay: 1, attachments: [] });
  });
  return [...states, get(final), ...base()];
}
function cli(args, mocks, extra = {}) {
  const home = makeHome();
  const mockFile = path.join(home, 'aimfox-mock.json');
  const logFile = path.join(home, 'aimfox-http.log');
  fs.writeFileSync(mockFile, JSON.stringify(mocks));
  const r = spawnSync(process.execPath, [AIMCLI, ...args], {
    cwd: home, encoding: 'utf8', env: { PATH: process.env.PATH, HOME: home, LINKEDIN_LEADGEN_HOME: home,
      LINKEDIN_LEADGEN_MOCK: mockFile, LINKEDIN_LEADGEN_HTTP_LOG: logFile, ...extra },
  });
  const log = fs.existsSync(logFile) ? fs.readFileSync(logFile, 'utf8').trim().split('\n').filter(Boolean).map(JSON.parse) : [];
  return { ...r, log };
}
const effects = (r) => r.log.filter((e) => e.method !== 'GET');
const privateEffects = (r) => effects(r).filter((e) => e.url.includes('/api/v1/'));

test('prospector repairs note, removes extra messages and stores exact token/delay without state/audience effects', () => {
  const c = target();
  c.flows[0].template = { type: 'NOTE_TEMPLATE', message: 'Old note' };
  c.flows[0].flow_message_templates.push({ type: 'MESSAGE_TEMPLATE', message: 'Extra', delay: 25, attachments: [] });
  const r = run(makeHome(), ['create-campaign', '--campaign', 'c1'], repairMocks(c));
  assert.equal(r.status, 0, r.stderr);
  const out = JSON.parse(r.stdout);
  assert.equal(out.status, 'verified');
  assert.equal(out.auth_route, 'A');
  assert.equal(out.config.aimfox_campaign_id, 'c1');
  assert.deepEqual(privateEffects(r).map((e) => e.method), ['PATCH', 'DELETE', 'DELETE', 'POST']);
  assert.deepEqual(bodyOf(privateEffects(r)[0]), { template: null });
  assert.deepEqual(bodyOf(privateEffects(r).at(-1)), { type: 'MESSAGE_TEMPLATE', message: WELCOME_TOKEN, delay: 1 });
  assert.deepEqual(bodyOf(effects(r)[0]), {});
  assert.ok(!JSON.stringify(r).includes('PRIVATE-MINTED-TOKEN'));
  assert.ok(!r.log.some((e) => /audience|start/.test(e.url) || (e.method === 'PATCH' && /\/api\/v2\/campaigns/.test(e.url))));
});

test('exact first message is kept while extra tail messages are deleted', () => {
  const c = exact();
  c.flows[0].flow_message_templates.push({ type: 'MESSAGE_TEMPLATE', message: 'extra', delay: 25 });
  const r = cli(['create-campaign', '--campaign', 'c1', '--apply'], repairMocks(c));
  assert.equal(r.status, 0, r.stderr);
  assert.deepEqual(privateEffects(r).map((e) => e.method), ['DELETE']);
});

test('shell required fields, blank note and absent welcome are authored and read back', () => {
  const c = target({ state: 'INIT' }); c.flows[0].flow_message_templates = [];
  const final = exact(); final.state = 'INIT';
  const r = cli(['create-campaign', '--name', 'Test Campaign', '--apply'], [
    { method: 'POST', urlPattern: '/api/v2/campaigns$', body: { status: 'ok', campaign: { id: 'c1', state: 'INIT' } } },
    get(c), get(c), get(final),
    { method: 'POST', urlPattern: '/flows/11/messages$', body: { status: 'ok' } }, ...base(),
  ]);
  assert.equal(r.status, 0, r.stderr);
  assert.deepEqual(bodyOf(effects(r).find((e) => e.url.endsWith('/api/v2/campaigns'))), {
    name: 'Test Campaign', type: 'list', outreach_type: 'connect', account_ids: ['101'], audience_size: 1000,
    uses_connection_note: false, inmail_optimization: false, exclude_active_targets: true, exclude_previous_targets: true,
  });
  assert.equal(JSON.parse(r.stdout).campaign_id, 'c1');
});

for (const over of [{ state: 'ACTIVE' }, { state: 'RUNNING' }, { state: 'DONE' }, { state: null },
  { uses_connection_note: true }, { inmail_optimization: true }, { uses_connection_note: undefined },
  { workspace_id: 'wrong' }, { owners: ['wrong'] }, { owners: [] }]) {
  test(`preflight refuses ${JSON.stringify(over)} before token or flow writes`, () => {
    const r = cli(['create-campaign', '--campaign', 'c1', '--apply'], [get(target(over)), ...base()]);
    assert.equal(r.status, 2, r.stderr); assert.equal(effects(r).length, 0);
  });
}

test('unknown/missing optimization shape and duplicate primary flow refuse without effects', () => {
  for (const change of [(c) => { c.flows[2].flow_message_templates = undefined; },
    (c) => { c.flows.push(structuredClone(c.flows[0])); }, (c) => { delete c.flows[0].template; }]) {
    const c = exact(); change(c);
    const r = cli(['create-campaign', '--campaign', 'c1', '--apply'], [get(c), ...base()]);
    assert.equal(r.status, 2); assert.equal(effects(r).length, 0);
  }
});

test('route A HTTP 401 falls back to session B; provider body/token never printed', () => {
  const c = target(); c.flows[0].flow_message_templates = [];
  const mocks = repairMocks(c);
  mocks.unshift({ method: 'POST', urlPattern: '/api/v2/token$', status: 401, body: { token: 'SECRET-BODY' } });
  const r = cli(['create-campaign', '--campaign', 'c1', '--apply'], mocks, { AIMFOX_SESSION: 'PRIVATE-FALLBACK-TOKEN' });
  assert.equal(r.status, 0, r.stderr);
  assert.equal(JSON.parse(r.stdout).auth_route, 'B');
  assert.equal(JSON.parse(r.stdout).route_a_failure, 'HTTP 401');
  assert.ok(!JSON.stringify(r).includes('PRIVATE-FALLBACK-TOKEN'));
  assert.ok(!JSON.stringify(r).includes('SECRET-BODY'));
});

test('read-only private A auth rejection falls back once before first flow effect', () => {
  const c = target(); c.flows[0].flow_message_templates = [];
  const mocks = repairMocks(c);
  mocks.unshift({ method: 'GET', urlPattern: '/api/v1/workspaces/ws1/campaigns/c1/flows/11$', status: 401, times: 1, body: { status: 'fail' } });
  const r = cli(['create-campaign', '--campaign', 'c1', '--apply'], mocks, { AIMFOX_SESSION: 'PRIVATE-FALLBACK-TOKEN' });
  assert.equal(r.status, 0, r.stderr); assert.equal(JSON.parse(r.stdout).auth_route, 'B');
  assert.equal(privateEffects(r).length, 1);
});

test('route A failure without fallback explains route B and leaves shell uncreated', () => {
  const mocks = base(); mocks[1] = { ...mocks[1], status: 401, body: { token: 'SECRET-BODY' } };
  const r = cli(['create-campaign', '--apply'], mocks);
  assert.equal(r.status, 2); assert.match(r.stderr, /HTTP 401.*AIMFOX_SESSION/);
  assert.equal(effects(r).length, 1); assert.ok(!r.stderr.includes('SECRET-BODY'));
});

test('private failed write stops immediately with exact campaign ID and no fallback retry', () => {
  const c = target(); c.flows[0].template = { message: 'note' };
  const mocks = repairMocks(c);
  mocks.unshift({ method: 'PATCH', urlPattern: '/flows/11$', status: 401, body: { error: { token: 'SECRET-BODY' } } });
  const r = cli(['create-campaign', '--campaign', 'c1', '--apply'], mocks, { AIMFOX_SESSION: 'PRIVATE-FALLBACK-TOKEN' });
  assert.equal(r.status, 1); assert.match(r.stderr, /UNPROVEN campaign c1.*HTTP 401/);
  assert.equal(privateEffects(r).length, 1); assert.ok(!r.stderr.includes('SECRET-BODY'));
});

test('uncertain shell create is never retried', () => {
  const r = cli(['create-campaign', '--apply'], [...base(), { method: 'POST', urlPattern: '/api/v2/campaigns$', timeout: true }]);
  assert.equal(r.status, 1); assert.match(r.stderr, /shell ID unknown/);
  assert.equal(effects(r).filter((e) => e.url.endsWith('/campaigns')).length, 1);
});

test('final mismatch is nonzero even after accepted write', () => {
  const c = target(); c.flows[0].flow_message_templates = [];
  const wrong = exact(); wrong.flows[0].flow_message_templates[0].message = ` ${WELCOME_TOKEN}`;
  const r = cli(['create-campaign', '--campaign', 'c1', '--apply'], repairMocks(c, wrong));
  assert.equal(r.status, 1); assert.match(r.stderr, /UNPROVEN.*final readback/);
});

test('account/workspace changes after auth refuse before private effects', () => {
  const c = target(); const moved = target({ workspace_id: 'ws2' });
  const r = cli(['create-campaign', '--campaign', 'c1', '--apply'], [get(c), get(moved), ...base()]);
  assert.equal(r.status, 2); assert.equal(privateEffects(r).length, 0);
});

test('campaign turning active immediately before a write refuses without private effects', () => {
  const c = target(); c.flows[0].flow_message_templates = [];
  const r = cli(['create-campaign', '--campaign', 'c1', '--apply'], [get(c), get(c), get(target({ state: 'ACTIVE' })), ...base()]);
  assert.equal(r.status, 2); assert.equal(privateEffects(r).length, 0);
});

test('no args/help and standalone previews are read-only JSON from unrelated cwd', () => {
  for (const args of [[], ['--help'], ['create-campaign'], ['create-campaign', '--campaign', 'c1']]) {
    const r = cli(args, [get(target()), ...base()]);
    assert.equal(r.status, 0, r.stderr);
    assert.ok(['help', 'preview'].includes(JSON.parse(r.stdout).status)); assert.equal(effects(r).length, 0);
  }
});

test('malformed flags, IDs, duplicate apply, placeholders and JSON conflict refuse before network', () => {
  for (const args of [['--campaign'], ['--campaign', '../escape'], ['--name', '{{NAME}}'], ['--name', ''],
    ['--apply', '--apply'], ['--campaign', 'c1', '--campaign', 'c2'], ['--json-file', '/missing/file'], ['--start']]) {
    const r = cli(['create-campaign', ...args], base()); assert.equal(r.status, 2); assert.equal(r.log.length, 0);
  }
  const home = makeHome(); const file = path.join(home, 'payload.json');
  fs.writeFileSync(file, JSON.stringify({ campaign: 'c1', name: 'Synthetic name' }));
  const r = cli(['create-campaign', '--json-file', file, '--campaign', 'c1'], base());
  assert.equal(r.status, 2); assert.equal(r.log.length, 0);
  const good = cli(['create-campaign', '--json-file', file], [get(exact()), ...base()]);
  assert.equal(good.status, 0, good.stderr); assert.equal(JSON.parse(good.stdout).status, 'preview');
});

test('list envelopes are strict and partial pagination is never reported as complete', () => {
  for (const body of [{ status: 'ok' }, { status: 'fail', accounts: [] }, { status: 'ok', accounts: [], has_more: true }]) {
    const r = cli(['accounts'], [{ method: 'GET', urlPattern: '/accounts$', body }]); assert.notEqual(r.status, 0);
  }
});

test('read commands positively project public fields and omit unknown/nested secrets', () => {
  const a = { ...account, token: 'SECRET-TOKEN', unknown: { secret: 'SECRET-NESTED' }, full_name: { token: 'SECRET-NESTED' } };
  const c = { ...exact(), unknown: { secret: 'SECRET-NESTED' } };
  for (const [args, mocks] of [
    [['accounts'], [{ method: 'GET', urlPattern: '/accounts$', body: { status: 'ok', accounts: [a] } }]],
    [['campaigns'], [{ method: 'GET', urlPattern: '/campaigns$', body: { status: 'ok', campaigns: [c] } }]],
    [['campaign', '--campaign', 'c1'], [get(c)]],
  ]) {
    const r = cli(args, mocks); assert.equal(r.status, 0, r.stderr); assert.ok(!r.stdout.includes('SECRET'));
  }
});

test('transport uses API key for v2 and minted/session bearer only for scoped private requests', async () => {
  const { createWelcomeCampaign } = await import('../../scripts/lib/aimfox.mjs');
  const savedFetch = globalThis.fetch;
  const keys = ['LINKEDIN_LEADGEN_MOCK', 'LINKEDIN_LEADGEN_OFFLINE', 'LINKEDIN_LEADGEN_HTTP_LOG', 'AIMFOX_API_KEY', 'AIMFOX_SESSION'];
  const saved = Object.fromEntries(keys.map((k) => [k, process.env[k]]));
  delete process.env.LINKEDIN_LEADGEN_MOCK; delete process.env.LINKEDIN_LEADGEN_OFFLINE; delete process.env.LINKEDIN_LEADGEN_HTTP_LOG;
  process.env.AIMFOX_API_KEY = 'test-api-key'; process.env.AIMFOX_SESSION = 'test-browser-session';
  try {
    for (const route of ['A', 'B']) {
      const calls = [];
      const c = target(); c.flows[0].flow_message_templates = [];
      globalThis.fetch = async (url, opts) => {
        calls.push({ url, opts });
        let body; let status = 200;
        if (url.endsWith('/api/v2/accounts')) body = { status: 'ok', accounts: [account] };
        else if (url.endsWith('/api/v2/token')) {
          assert.equal(opts.body, '{}'); assert.equal(opts.headers.Authorization, 'Bearer test-api-key');
          if (route === 'B') { status = 401; body = { status: 'fail' }; }
          else body = { status: 'ok', token: 'test-minted-session' };
        } else if (url.endsWith('/api/v2/campaigns/c1')) body = { status: 'ok', campaign: c };
        else if (opts.method === 'GET' && url.includes('/api/v1/')) body = { status: 'ok', flow: c.flows[0] };
        else if (opts.method === 'POST' && url.endsWith('/messages')) {
          c.flows[0].flow_message_templates = [{ type: 'MESSAGE_TEMPLATE', message: WELCOME_TOKEN, delay: 1, attachments: [] }];
          body = { status: 'ok' };
        } else assert.fail('Unexpected endpoint');
        return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
      };
      const result = await createWelcomeCampaign({ campaign: 'c1' }, { apply: true });
      assert.equal(result.auth_route, route);
      for (const call of calls) {
        assert.equal(call.opts.headers.Authorization, call.url.includes('/api/v1/')
          ? `Bearer ${route === 'A' ? 'test-minted-session' : 'test-browser-session'}` : 'Bearer test-api-key');
      }
      assert.ok(!JSON.stringify(result).includes('test-minted-session'));
      assert.ok(!JSON.stringify(result).includes('test-browser-session'));
    }
  } finally {
    globalThis.fetch = savedFetch;
    for (const k of keys) { if (saved[k] === undefined) delete process.env[k]; else process.env[k] = saved[k]; }
  }
});

test('token-only route A envelope from brief is accepted without exposing token', () => {
  const c = target(); c.flows[0].flow_message_templates = [];
  const mocks = repairMocks(c);
  mocks.unshift({ method: 'POST', urlPattern: '/api/v2/token$', body: { token: 'PRIVATE-TOKEN-ONLY' } });
  const r = cli(['create-campaign', '--campaign', 'c1', '--apply'], mocks);
  assert.equal(r.status, 0, r.stderr); assert.equal(JSON.parse(r.stdout).auth_route, 'A');
  assert.ok(!JSON.stringify(r).includes('PRIVATE-TOKEN-ONLY'));
});

test('multi-account creation needs explicit account and repair never guesses missing owners', () => {
  const accounts = { method: 'GET', urlPattern: '/accounts$', body: { status: 'ok', accounts: [account, { ...account, id: '102', workspace_id: 'ws2' }] } };
  const refused = cli(['create-campaign'], [accounts]); assert.equal(refused.status, 2); assert.equal(effects(refused).length, 0);
  const chosen = cli(['create-campaign', '--account', '102'], [accounts]); assert.equal(chosen.status, 0, chosen.stderr);
  assert.deepEqual(JSON.parse(chosen.stdout).account_ids, ['102']);
  const c = target(); delete c.owners;
  const repair = cli(['create-campaign', '--campaign', 'c1', '--account', '101'], [get(c), accounts]);
  assert.equal(repair.status, 2); assert.equal(effects(repair).length, 0);
});

test('new shell changing selected account/workspace refuses all private effects', () => {
  const moved = target({ state: 'INIT', owners: ['102'], workspace_id: 'ws2' });
  const r = cli(['create-campaign', '--account', '101', '--apply'], [
    { method: 'GET', urlPattern: '/accounts$', body: { status: 'ok', accounts: [account, { ...account, id: '102', workspace_id: 'ws2' }] } },
    { method: 'POST', urlPattern: '/api/v2/campaigns$', body: { status: 'ok', campaign: { id: 'c1', state: 'INIT' } } },
    get(moved), ...base(),
  ]);
  assert.equal(r.status, 1); assert.match(r.stderr, /UNPROVEN campaign c1/); assert.equal(privateEffects(r).length, 0);
});
