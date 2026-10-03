import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { campaignFacts } from '../../scripts/lib/aimfox.mjs';
import {
  makeHome, run, rx, reqs, bodyOf, AIMFOX, CAMPAIGN, flows, campaign, audienceRow, audienceBody, WELCOME_TOKEN,
  prospect, welcomeRow, welcomeBody,
} from './helpers.mjs';

const C = `${AIMFOX}/campaigns/${CAMPAIGN}`;
const PAUSED = campaign('PAUSED');
const RUNNING = campaign('ACTIVE');
// The same campaign with its message delay changed: still set up right, but a different definition.
const editedFlows = (c) => c.flows.map((f) => (f.type === 'PRIMARY_CONNECT'
  ? { ...f, flow_message_templates: f.flow_message_templates.map((m) => ({ ...m, delay: m.delay + 7200 })) } : f));

const campaignGet = (c, extra = {}) => ({ method: 'GET', urlPattern: `${rx(C)}$`, body: { status: 'ok', campaign: c }, ...extra });
const stateRow = (rows) => ({ method: 'GET', urlPattern: rx('/rest/v1/li_campaign_state?'), body: rows });
const pushingRows = (rows) => ({ method: 'GET', urlPattern: rx('/rest/v1/li_prospects?', 'status=eq.pushing'), body: rows });
const approvedRows = (rows, extra = {}) => ({ method: 'GET', urlPattern: rx('/rest/v1/li_prospects?', 'status=eq.approved'), body: rows, ...extra });
const welcomes = (rows) => ({ method: 'GET', urlPattern: rx('/rest/v1/li_messages?', 'kind=eq.welcome'), body: rows });
const claimOk = { method: 'PATCH', urlPattern: rx('/rest/v1/li_prospects?', 'status=eq.approved'), body: [{ status: 'pushing' }] };
const finishOk = { method: 'PATCH', urlPattern: rx('/rest/v1/li_prospects?', 'status=eq.pushing'), body: [{ status: 'pushed' }] };
// GET /campaigns/:id/custom-variables/:urn, as documented on docs.aimfox.com.
const varsBody = (urn, variables) => ({ status: 'ok', custom_variable_keys: Object.keys(variables), custom_variables: { target_urn: urn, variables } });
const customVars = (urn, value) => ({
  method: 'GET', urlPattern: `${rx(`${C}/custom-variables/${urn}`)}$`, body: varsBody(urn, { welcome_message: value }),
});
// POST /campaigns/:id/audience/multiple, as documented: added profiles, failed ones, and why.
const addResult = ({ profiles = [], failed = [], failedReason = {} } = {}) => ({
  method: 'POST', urlPattern: `${rx(`${C}/audience/multiple`)}$`, body: { status: 'ok', profiles, failed, failedReason },
});
const addOk = (id) => addResult({ profiles: [audienceRow(id)] });
const addFailed = (id, reason) => addResult({
  failed: [{ profile_url: `https://www.linkedin.com/in/p${id}`, custom_variables: { welcome_message: welcomeBody(id) } }],
  failedReason: { [`p${id}`]: reason },
});

// Every PAUSED push ends by recording awaiting_start and printing one pushed lead's welcome.
const PAUSED_TAIL = [
  { method: 'POST', urlPattern: rx('/rest/v1/li_campaign_state'), body: [{ campaign_id: CAMPAIGN }] },
  { method: 'GET', urlPattern: rx('/rest/v1/li_prospects?', 'status=eq.pushed'), body: [] },
];
const runPush = (home, args, mocks, opts) => run(home, args, [...mocks, ...PAUSED_TAIL], opts);

const audienceAdds = (log) => reqs(log, 'POST', `${C}/audience`);
const patchesTo = (log, ...parts) => reqs(log, 'PATCH', '/rest/v1/li_prospects?', ...parts).map(bodyOf);

test('batch push of 3 approved + 1 do_not_contact adds exactly the 3', () => {
  const home = makeHome();
  const rows = [prospect(1), prospect(2), prospect(3), prospect(4, { status: 'do_not_contact' })];
  const res = runPush(home, ['push'], [
    stateRow([]),
    campaignGet(PAUSED),
    pushingRows([]),
    approvedRows(rows),
    welcomes([1, 2, 3, 4].map((id) => welcomeRow(id))),
    claimOk,
    // add returns no urn, so push finds each lead in the audience by public id
    addResult(),
    { method: 'GET', urlPattern: `${rx(`${C}/audience`)}(\\?.*)?$`, body: audienceBody([1, 2, 3].map((id) => audienceRow(id))) },
    ...[1, 2, 3].map((id) => customVars(`u${id}`, welcomeBody(id))),
    finishOk,
  ]);
  assert.equal(res.status, 0, res.stderr);
  const adds = audienceAdds(res.log).map(bodyOf);
  assert.equal(adds.length, 3);
  assert.deepEqual(adds, [1, 2, 3].map((id) => ({
    type: 'profile_url',
    profiles: [{ profile_url: `https://www.linkedin.com/in/p${id}`, custom_variables: { welcome_message: welcomeBody(id) } }],
  })), 'the documented /audience/multiple body, the welcome riding along as a custom variable');
  assert.ok(audienceAdds(res.log).every((e) => e.url === `${C}/audience/multiple`));
  assert.equal(reqs(res.log, 'POST', `${C}/custom-variables`).length, 0, 'no separate variables write');
  assert.ok(!JSON.stringify(res.log).includes('/in/p4'), 'the do_not_contact row never reaches Aimfox');
  assert.equal(patchesTo(res.log, 'id=eq.4').length, 0);
  // the batch query itself restricts to approved
  assert.equal(reqs(res.log, 'GET', '/rest/v1/li_prospects?', 'status=eq.approved').length, 1);
  assert.deepEqual(patchesTo(res.log, 'status=eq.pushing').map((b) => b.status), ['pushed', 'pushed', 'pushed']);
});

test('read-back mismatch: removed, push_failed, alerted, and not re-added on the next push', () => {
  const home = makeHome();
  const first = runPush(home, ['push'], [
    stateRow([]),
    campaignGet(PAUSED),
    pushingRows([]),
    approvedRows([prospect(1)]),
    welcomes([welcomeRow(1)]),
    claimOk,
    addOk(1),
    customVars('u1', 'Something else entirely'),
    { method: 'DELETE', urlPattern: `${rx(`${C}/audience/u1`)}$`, body: null },
    finishOk,
  ]);
  assert.equal(first.status, 0, first.stderr);
  assert.equal(reqs(first.log, 'DELETE', `${C}/audience/u1`).length, 1, 'removed from the audience');
  const failed = patchesTo(first.log, 'id=eq.1', 'status=eq.pushing');
  assert.equal(failed.length, 1);
  assert.equal(failed[0].status, 'push_failed');
  assert.equal(failed[0].push_attempts, 1);
  const alerts = reqs(first.log, 'POST', '/rest/v1/li_alerts').map(bodyOf);
  assert.deepEqual(alerts.map((a) => [a.kind, a.prospect_id]), [['push_failed', 1], ['awaiting_start', null]]);
  assert.match(fs.readFileSync(path.join(home, 'needs-you.md'), 'utf8'), /push_failed \(prospect 1\)/);

  // Next push: the database now holds the row as push_failed. Any query that is not limited to
  // approved/pushing would get it from the catch-all entry and try to add it.
  const second = runPush(home, ['push'], [
    stateRow([]),
    campaignGet(PAUSED),
    pushingRows([]),
    approvedRows([]),
    { method: 'GET', urlPattern: rx('/rest/v1/li_prospects?'), body: [prospect(1, { status: 'push_failed', push_attempts: 2 })] },
    welcomes([welcomeRow(1)]),
    addOk(1),
  ]);
  assert.equal(second.status, 0, second.stderr);
  assert.equal(audienceAdds(second.log).length, 0, 'push_failed is terminal');
});

test('crash between the audience add and the status write: reconcile leaves exactly one add', () => {
  const home = makeHome();
  const first = runPush(home, ['push'], [
    stateRow([]),
    campaignGet(PAUSED),
    pushingRows([]),
    approvedRows([prospect(1)]),
    welcomes([welcomeRow(1)]),
    claimOk,
    addOk(1),
    customVars('u1', welcomeBody(1)),
    { method: 'PATCH', urlPattern: rx('/rest/v1/li_prospects?', 'status=eq.pushing'), status: 503, body: { message: 'down' } },
  ]);
  assert.notEqual(first.status, 0, 'the status write failed, so the run dies');
  assert.equal(audienceAdds(first.log).length, 1);

  const second = runPush(home, ['push'], [
    stateRow([]),
    campaignGet(PAUSED),
    pushingRows([prospect(1, { status: 'pushing', push_attempts: 1 })]),
    { method: 'GET', urlPattern: `${rx(`${C}/audience`)}(\\?.*)?$`, body: audienceBody([audienceRow(1)]) },
    welcomes([welcomeRow(1)]),
    customVars('u1', welcomeBody(1)),
    finishOk,
    approvedRows([]),
    addOk(1),
  ]);
  assert.equal(second.status, 0, second.stderr);
  assert.equal(audienceAdds(second.log).length, 0, 'reconcile does not add again');
  assert.equal(audienceAdds(first.log).length + audienceAdds(second.log).length, 1, 'exactly one add overall');
  assert.deepEqual(patchesTo(second.log, 'id=eq.1', 'status=eq.pushing'), [{ status: 'pushed', aimfox_lead_urn: 'u1' }]);
});

test('crash after pushing, before the add: back to approved; a second time: push_failed', () => {
  const home = makeHome();
  // Run 1: the audience add gets no answer at all (no mock entry), which kills the run.
  const first = runPush(home, ['push'], [
    stateRow([]), campaignGet(PAUSED), pushingRows([]),
    approvedRows([prospect(1)]), welcomes([welcomeRow(1)]), claimOk,
  ]);
  assert.notEqual(first.status, 0);
  assert.deepEqual(patchesTo(first.log, 'id=eq.1', 'status=eq.approved'), [{ status: 'pushing', push_attempts: 1 }]);

  // Run 2: reconcile finds it absent from the audience with 1 attempt → approved; it is retried and dies again.
  const second = runPush(home, ['push'], [
    stateRow([]), campaignGet(PAUSED),
    pushingRows([prospect(1, { status: 'pushing', push_attempts: 1 })]),
    { method: 'GET', urlPattern: `${rx(`${C}/audience`)}(\\?.*)?$`, body: audienceBody([]) },
    welcomes([welcomeRow(1)]),
    { method: 'PATCH', urlPattern: rx('/rest/v1/li_prospects?', 'status=eq.pushing'), body: [{ status: 'approved' }] },
    approvedRows([prospect(1, { push_attempts: 1 })]),
    claimOk,
  ]);
  assert.notEqual(second.status, 0);
  assert.deepEqual(patchesTo(second.log, 'id=eq.1', 'status=eq.pushing'), [{ status: 'approved' }]);
  assert.deepEqual(patchesTo(second.log, 'id=eq.1', 'status=eq.approved'), [{ status: 'pushing', push_attempts: 2 }]);

  // Run 3: absent again with 2 attempts → push_failed with an alert, never re-added.
  const third = runPush(home, ['push'], [
    stateRow([]), campaignGet(PAUSED),
    pushingRows([prospect(1, { status: 'pushing', push_attempts: 2 })]),
    { method: 'GET', urlPattern: `${rx(`${C}/audience`)}(\\?.*)?$`, body: audienceBody([]) },
    welcomes([welcomeRow(1)]),
    { method: 'PATCH', urlPattern: rx('/rest/v1/li_prospects?', 'status=eq.pushing'), body: [{ status: 'push_failed' }] },
    approvedRows([]),
  ]);
  assert.equal(third.status, 0, third.stderr);
  assert.deepEqual(patchesTo(third.log, 'id=eq.1', 'status=eq.pushing'), [{ status: 'push_failed' }]);
  assert.deepEqual(reqs(third.log, 'POST', '/rest/v1/li_alerts').map(bodyOf).map((a) => a.kind), ['push_failed', 'awaiting_start']);
  // Runs 1 and 2 each tried one add that never got an answer (the simulated crash); run 3 tries none.
  assert.deepEqual([first, second, third].map((r) => audienceAdds(r.log).map((e) => e.status)), [[null], [null], []]);
});

test('running campaign: a later batch is added while the fingerprint is unchanged', () => {
  const home = makeHome();
  const fp = campaignFacts(RUNNING).fingerprint;
  assert.ok(fp, 'step text gives a fingerprint');
  const res = runPush(home, ['push'], [
    stateRow([{ campaign_id: CAMPAIGN, fingerprint: fp, confirmed_at: '2026-10-01T00:00:00Z', loop_installed_at: '2026-10-01T00:00:00Z' }]),
    campaignGet(RUNNING),
    pushingRows([]),
    approvedRows([prospect(5)]),
    welcomes([welcomeRow(5)]),
    claimOk,
    addOk(5),
    customVars('u5', welcomeBody(5)),
    finishOk,
  ]);
  assert.equal(res.status, 0, res.stderr);
  assert.equal(audienceAdds(res.log).length, 1);
});

test('running campaign: a batch is refused after the campaign definition changes', () => {
  const home = makeHome();
  const fp = campaignFacts(RUNNING).fingerprint;
  const edited = { ...RUNNING, flows: editedFlows(RUNNING) };
  assert.notEqual(campaignFacts(edited).fingerprint, fp);
  const res = runPush(home, ['push'], [
    stateRow([{ campaign_id: CAMPAIGN, fingerprint: fp, confirmed_at: '2026-10-01T00:00:00Z' }]),
    campaignGet(edited),
    pushingRows([]),
    approvedRows([prospect(6)]),
    welcomes([welcomeRow(6)]),
    claimOk,
    addOk(6),
  ]);
  assert.notEqual(res.status, 0);
  assert.equal(audienceAdds(res.log).length, 0);
  assert.equal(reqs(res.log, 'PATCH', '/rest/v1/li_prospects').length, 0);
  assert.deepEqual(reqs(res.log, 'POST', '/rest/v1/li_alerts').map(bodyOf).map((a) => a.kind), ['campaign_changed']);
});

test('running campaign with no fingerprint available: every later batch waits with an alert', () => {
  const home = makeHome();
  const opaque = { id: CAMPAIGN, state: 'ACTIVE', inmail_optimization: false }; // no flows
  assert.equal(campaignFacts(opaque).fingerprint, null);
  const mocks = [
    stateRow([{ campaign_id: CAMPAIGN, fingerprint: null, confirmed_at: '2026-10-01T00:00:00Z' }]),
    campaignGet(opaque),
    pushingRows([]),
    approvedRows([prospect(7)]),
    welcomes([welcomeRow(7)]),
    claimOk,
    addOk(7),
  ];
  for (let pass = 0; pass < 2; pass++) {
    const res = runPush(home, ['push'], mocks);
    assert.equal(res.status, 0, res.stderr);
    assert.equal(audienceAdds(res.log).length, 0, `pass ${pass}: nothing added`);
    assert.deepEqual(reqs(res.log, 'POST', '/rest/v1/li_alerts').map(bodyOf).map((a) => a.kind), ['batch_waiting']);
  }
});

// ---- the start flow: the user presses Start in Aimfox; the script never starts anything ----------

const fpOf = (c) => campaignFacts(c).fingerprint;
const awaiting = (campaign, over = {}) => ({
  campaign_id: CAMPAIGN, fingerprint: fpOf(campaign), awaiting_start: '2026-10-03T09:00:00Z', confirmed_at: null, ...over,
});
const stateWrites = (log) => reqs(log, 'POST', 'li_campaign_state').map(bodyOf);
const stateUpdates = (log) => reqs(log, 'PATCH', 'li_campaign_state').map(bodyOf);
const campaignWrites = (log) => log.filter((e) => e.url.startsWith(C) && !['GET'].includes(e.method) && !e.url.includes('/audience') && !e.url.includes('/custom-variables'));

test('first batch into a PAUSED campaign: enrolled, awaiting_start recorded, checklist printed, never started', () => {
  const home = makeHome();
  const res = runPush(home, ['push'], [
    stateRow([]),
    campaignGet(PAUSED),
    pushingRows([]),
    approvedRows([prospect(1)]),
    welcomes([welcomeRow(1)]),
    claimOk,
    addOk(1),
    customVars('u1', welcomeBody(1)),
    finishOk,
    { method: 'GET', urlPattern: rx('/rest/v1/li_prospects?', 'status=eq.pushed'), body: [{ id: 1, public_id: 'p1', name: 'P One' }] },
  ]);
  assert.equal(res.status, 0, res.stderr);
  assert.equal(audienceAdds(res.log).length, 1);
  const [state] = stateWrites(res.log);
  assert.equal(state.fingerprint, fpOf(PAUSED));
  assert.ok(state.awaiting_start);
  assert.equal(state.confirmed_at, null);
  assert.match(res.stdout, /Connect step has no note/);
  assert.match(res.stdout, /exactly one message after acceptance, and its whole text is \{\{CUSTOM\.welcome_message\}\}: looks right/);
  assert.match(res.stdout, /InMail optimization is OFF: looks right/);
  assert.match(res.stdout, /connect optimization step has no note and no messages: looks right/);
  assert.match(res.stdout, /Stop on reply: Aimfox does not report this\. If your campaign has the setting, turn it on\. \(Observed: leads who replied ended their sequence\.\)/);
  assert.doesNotMatch(res.stdout, /Stop sequence on reply" is ON/);
  assert.match(res.stdout, /press Start yourself/);
  assert.ok(res.stdout.includes(welcomeBody(1)), 'shows one real welcome for the preview check');
  assert.equal(campaignWrites(res.log).length, 0, 'the script never starts the campaign');
  assert.deepEqual(reqs(res.log, 'POST', '/rest/v1/li_alerts').map(bodyOf).map((a) => a.kind), ['awaiting_start']);
});

test('push --start is only an alias of push: it never starts the campaign and reads no stdin', () => {
  const home = makeHome();
  const res = runPush(home, ['push', '--start'], [stateRow([]), campaignGet(PAUSED), pushingRows([]), approvedRows([])],
    { input: 'START CAMPAIGN\n' });
  assert.equal(res.status, 0, res.stderr);
  assert.match(res.stdout, /same as push/);
  assert.equal(campaignWrites(res.log).length, 0);
});

test('RUNNING after awaiting_start with an unchanged fingerprint: push records the Start and adds the batch', () => {
  const home = makeHome();
  const res = runPush(home, ['push'], [
    stateRow([awaiting(RUNNING)]),
    campaignGet(RUNNING),
    { method: 'PATCH', urlPattern: rx('/rest/v1/li_campaign_state?'), body: [{ campaign_id: CAMPAIGN }] },
    pushingRows([]),
    approvedRows([prospect(2)]),
    welcomes([welcomeRow(2)]),
    claimOk,
    addOk(2),
    customVars('u2', welcomeBody(2)),
    finishOk,
  ]);
  assert.equal(res.status, 0, res.stderr);
  const [upd] = stateUpdates(res.log);
  assert.ok(upd.confirmed_at);
  assert.equal(upd.awaiting_start, null);
  assert.match(res.stdout, /INSTALL_LOOP/);
  assert.equal(audienceAdds(res.log).length, 1);
});

test('RUNNING after awaiting_start: sync records the Start too', () => {
  const home = makeHome();
  const res = run(home, ['sync'], [
    stateRow([awaiting(RUNNING, { loop_installed_at: '2026-10-03T10:00:00Z' })]),
    campaignGet(RUNNING),
    { method: 'PATCH', urlPattern: rx('/rest/v1/li_campaign_state?'), body: [{ campaign_id: CAMPAIGN }] },
    { method: 'GET', urlPattern: rx('/rest/v1/li_prospects?'), body: [] },
  ]);
  assert.equal(res.status, 0, res.stderr);
  assert.ok(stateUpdates(res.log)[0].confirmed_at);
  assert.match(res.stdout, /already installed/);
});

test('campaign edited between the batch and Start: the Start is not taken, nothing is added', () => {
  const home = makeHome();
  const edited = { ...RUNNING, flows: editedFlows(RUNNING) };
  const res = runPush(home, ['push'], [
    stateRow([awaiting(PAUSED)]),
    campaignGet(edited),
    pushingRows([prospect(1, { status: 'pushing' })]),
    approvedRows([prospect(2)]),
    welcomes([welcomeRow(2)]),
    claimOk,
    { method: 'GET', urlPattern: `${rx(`${C}/audience`)}(\\?.*)?$`, body: audienceBody([]) },
    addOk(2),
  ]);
  assert.notEqual(res.status, 0);
  assert.equal(stateUpdates(res.log).length, 0, 'not confirmed');
  assert.equal(reqs(res.log, 'GET', `${C}/audience`).length + audienceAdds(res.log).length, 0);
  assert.deepEqual(reqs(res.log, 'POST', '/rest/v1/li_alerts').map(bodyOf).map((a) => a.kind), ['campaign_changed']);
});

// A RUNNING campaign this skill never recorded. Every enrolment mock is present, so a regression
// that reconciles or enrolls before refusing shows up in the HTTP log.
function neverRecordedRunningMocks(stateRows) {
  return [
    stateRow(stateRows),
    campaignGet(RUNNING),
    pushingRows([prospect(1, { status: 'pushing', push_attempts: 1 })]),
    { method: 'GET', urlPattern: `${rx(`${C}/audience`)}(\\?.*)?$`, body: audienceBody([]) },
    { method: 'PATCH', urlPattern: rx('/rest/v1/li_prospects?'), body: [{ status: 'approved' }] },
    approvedRows([prospect(2)]),
    welcomes([welcomeRow(1), welcomeRow(2)]),
    addOk(2),
    customVars('u2', welcomeBody(2)),
    { method: 'PATCH', urlPattern: rx('/rest/v1/li_campaign_state?'), body: [{}] },
  ];
}

test('never-recorded RUNNING campaign: push and push --start refuse before any reconcile or audience call', () => {
  const home = makeHome();
  for (const [args, rows] of [
    [['push'], []],
    [['push', '--start'], []],
    [['push'], [{ campaign_id: CAMPAIGN, fingerprint: fpOf(RUNNING), awaiting_start: null, confirmed_at: null }]],
  ]) {
    const res = runPush(home, args, neverRecordedRunningMocks(rows), { input: 'START CAMPAIGN\n' });
    assert.notEqual(res.status, 0, args.join(' '));
    assert.equal(audienceAdds(res.log).length, 0, 'zero audience POSTs');
    assert.equal(reqs(res.log, 'GET', `${C}/audience`).length, 0, 'no reconcile');
    assert.equal(reqs(res.log, 'PATCH', '/rest/v1/li_prospects').length, 0);
    assert.equal(reqs(res.log, 'GET', '/rest/v1/li_prospects').length, 0);
    assert.equal(stateWrites(res.log).length + stateUpdates(res.log).length, 0);
    assert.equal(campaignWrites(res.log).length, 0);
    assert.match(res.stderr, /Pause it in Aimfox, then run push again/);
    assert.deepEqual(reqs(res.log, 'POST', '/rest/v1/li_alerts').map(bodyOf).map((a) => a.kind), ['campaign_not_confirmed']);
  }
});

test('no fingerprint: a later batch goes into the re-paused campaign and asks for Start again', () => {
  const home = makeHome();
  const opaquePaused = { id: CAMPAIGN, state: 'PAUSED', inmail_optimization: false };
  const res = runPush(home, ['push'], [
    stateRow([{ campaign_id: CAMPAIGN, fingerprint: null, confirmed_at: '2026-10-01T00:00:00Z', awaiting_start: null }]),
    campaignGet(opaquePaused),
    pushingRows([]),
    approvedRows([prospect(8)]),
    welcomes([welcomeRow(8)]),
    claimOk,
    addOk(8),
    customVars('u8', welcomeBody(8)),
    finishOk,
  ]);
  assert.equal(res.status, 0, res.stderr);
  assert.equal(audienceAdds(res.log).length, 1);
  const [state] = stateWrites(res.log);
  assert.equal(state.confirmed_at, null, 'needs a fresh Start');
  assert.ok(state.awaiting_start);
  assert.match(res.stdout, /Aimfox does not say, check it/);
  assert.match(res.stdout, /press Start yourself/);
});

test('a stored welcome carrying a secret is refused right before enrolling', () => {
  const home = makeHome();
  const leaky = 'Loved your comment. My key is sb_secret_abc123, does that help?';
  const res = runPush(home, ['push'], [
    stateRow([]),
    campaignGet(PAUSED),
    pushingRows([]),
    approvedRows([prospect(1)]),
    welcomes([welcomeRow(1, { body: leaky })]),
    claimOk,
    addOk(1),
  ]);
  assert.equal(res.status, 0, res.stderr);
  assert.equal(audienceAdds(res.log).length, 0);
  assert.equal(reqs(res.log, 'PATCH', '/rest/v1/li_prospects').length, 0);
  const blocked = reqs(res.log, 'POST', '/rest/v1/li_alerts').map(bodyOf).find((a) => a.kind === 'welcome_blocked');
  assert.ok(blocked, 'alerted');
  assert.match(blocked.body, /Supabase secret key/);
});

test('push refuses a campaign whose Connect step carries a note', () => {
  const home = makeHome();
  const withNote = campaign('PAUSED', { flows: flows({ note: 'Hi {{FIRST_NAME}}' }) });
  const res = runPush(home, ['push'], [stateRow([]), campaignGet(withNote), approvedRows([prospect(1)])]);
  assert.notEqual(res.status, 0);
  assert.equal(audienceAdds(res.log).length, 0);
  assert.match(res.stderr, /Connect step has a note/);
});

test('push refuses a campaign with InMail optimization on', () => {
  const home = makeHome();
  const res = runPush(home, ['push'], [
    stateRow([]), campaignGet(campaign('CREATED', { inmail_optimization: true })), approvedRows([prospect(1)]),
  ]);
  assert.notEqual(res.status, 0);
  assert.equal(audienceAdds(res.log).length, 0);
  assert.match(res.stderr, /InMail optimization is on; it would message people who never accepted\. Turn it off\./);
  assert.deepEqual(reqs(res.log, 'POST', '/rest/v1/li_alerts').map(bodyOf).map((a) => a.kind), ['push_refused']);
});

test('push refuses a campaign with a follow-up message after the welcome', () => {
  const home = makeHome();
  const res = runPush(home, ['push'], [
    stateRow([]), campaignGet(campaign('CREATED', { flows: flows({ messages: [WELCOME_TOKEN, 'Just following up!'] }) })),
    approvedRows([prospect(1)]),
  ]);
  assert.notEqual(res.status, 0);
  assert.equal(audienceAdds(res.log).length, 0);
  assert.match(res.stderr, /exactly one message whose whole text is \{\{CUSTOM\.welcome_message\}\}/);
});

test('a CREATED (never started) campaign is treated as paused: batch enrolled, Start asked for', () => {
  const home = makeHome();
  const created = campaign('CREATED');
  const res = runPush(home, ['push'], [
    stateRow([]), campaignGet(created), pushingRows([]),
    approvedRows([prospect(1)]), welcomes([welcomeRow(1)]), claimOk,
    addOk(1),
    customVars('u1', welcomeBody(1)),
    finishOk,
  ]);
  assert.equal(res.status, 0, res.stderr);
  assert.equal(audienceAdds(res.log).length, 1);
  assert.equal(stateWrites(res.log)[0].fingerprint, fpOf(created));
  assert.match(res.stdout, /is paused\. Before it sends anything/);
  assert.equal(campaignWrites(res.log).length, 0);
});

test('read-back finds the welcome under an uppercased variable name', () => {
  const home = makeHome();
  const res = runPush(home, ['push'], [
    stateRow([]), campaignGet(PAUSED), pushingRows([]),
    approvedRows([prospect(1)]), welcomes([welcomeRow(1)]), claimOk,
    addOk(1),
    { method: 'GET', urlPattern: `${rx(`${C}/custom-variables/u1`)}$`, body: varsBody('u1', { FIRST_NAME: 'P', WELCOME_MESSAGE: welcomeBody(1) }) },
    finishOk,
  ]);
  assert.equal(res.status, 0, res.stderr);
  assert.deepEqual(patchesTo(res.log, 'id=eq.1', 'status=eq.pushing'), [{ status: 'pushed', aimfox_lead_urn: 'u1' }]);
  assert.equal(reqs(res.log, 'DELETE', `${C}/audience/`).length, 0);
});

test('push refuses a campaign that reports uses_connection_note true, even with an empty template', () => {
  const home = makeHome();
  const res = runPush(home, ['push'], [
    stateRow([]), campaignGet(campaign('CREATED', { uses_connection_note: true })), approvedRows([prospect(1)]),
  ]);
  assert.notEqual(res.status, 0);
  assert.equal(audienceAdds(res.log).length, 0);
  assert.match(res.stderr, /Connect step has a note/);
});

test('push refuses a campaign whose connect optimization step carries a note or a message', () => {
  const withConnectOpt = (over) => campaign('CREATED', {
    flows: flows().map((f) => (f.type === 'CONNECT_OPTIMIZATION' ? { ...f, ...over } : f)),
  });
  for (const over of [
    { template: { type: 'NOTE_TEMPLATE', message: 'Hi {{FIRST_NAME}}' } },
    { flow_message_templates: [{ type: 'MESSAGE_TEMPLATE', message: 'Thanks for connecting', delay: 0 }] },
  ]) {
    const res = runPush(makeHome(), ['push'], [stateRow([]), campaignGet(withConnectOpt(over)), approvedRows([prospect(1)])]);
    assert.notEqual(res.status, 0, JSON.stringify(over));
    assert.equal(audienceAdds(res.log).length, 0);
    assert.match(res.stderr, /connect optimization step has a note or messages; it must be empty/);
  }
});

test('inert InMail text is not refused while InMail optimization is off', () => {
  const home = makeHome();
  const inert = campaign('CREATED', {
    flows: flows().map((f) => (f.type === 'INMAIL_OPTIMIZATION' ? { ...f, template: { type: 'NOTE_TEMPLATE', message: 'Old InMail text' } } : f)),
  });
  const res = runPush(home, ['push'], [stateRow([]), campaignGet(inert), pushingRows([]), approvedRows([])]);
  assert.equal(res.status, 0, res.stderr);
});

test('push refuses when Aimfox does not report InMail optimization', () => {
  const home = makeHome();
  const missing = campaign('CREATED');
  delete missing.inmail_optimization;
  const res = runPush(home, ['push'], [stateRow([]), campaignGet(missing), approvedRows([prospect(1)])]);
  assert.notEqual(res.status, 0);
  assert.equal(audienceAdds(res.log).length, 0);
  assert.match(res.stderr, /Aimfox did not report InMail optimization; check it is off/);
});

test('an audience body without `audience` stops push; it is never read as empty', () => {
  const home = makeHome();
  const res = runPush(home, ['push'], [
    stateRow([]), campaignGet(PAUSED),
    pushingRows([prospect(1, { status: 'pushing', push_attempts: 1 })]),
    { method: 'GET', urlPattern: `${rx(`${C}/audience`)}$`, body: { status: 'ok', leads: [] } },
    welcomes([welcomeRow(1)]),
    { method: 'PATCH', urlPattern: rx('/rest/v1/li_prospects?'), body: [{}] },
    approvedRows([]),
  ]);
  assert.notEqual(res.status, 0);
  assert.match(res.stderr, /Aimfox returned an audience in an unexpected shape/);
  assert.equal(reqs(res.log, 'PATCH', '/rest/v1/li_prospects').length, 0, 'the pushing row is not sent back to approved');
});

test('a read-back connection reset: the lead is removed, the row settled push_failed, then the run stops', () => {
  const home = makeHome();
  // No mock for the custom-variables read: http.mjs throws an HttpError, as a reset connection does.
  const res = runPush(home, ['push'], [
    stateRow([]), campaignGet(PAUSED), pushingRows([]),
    approvedRows([prospect(1), prospect(2)]), welcomes([welcomeRow(1), welcomeRow(2)]), claimOk,
    addOk(1),
    { method: 'DELETE', urlPattern: rx(`${C}/audience/u1`), body: null },
    { method: 'POST', urlPattern: rx(`${AIMFOX}/blacklist`), body: {} },
    finishOk,
  ]);
  assert.notEqual(res.status, 0, 'no answer at all: the run stops after settling this row');
  assert.match(res.stderr, /no mock matched GET .*custom-variables\/u1/);
  assert.equal(reqs(res.log, 'DELETE', `${C}/audience/u1`).length, 1, 'the lead comes out');
  assert.deepEqual(patchesTo(res.log, 'id=eq.1', 'status=eq.pushing').map((b) => b.status), ['push_failed'], 'never left at pushing');
  const a = reqs(res.log, 'POST', '/rest/v1/li_alerts').map(bodyOf).find((x) => x.kind === 'push_failed');
  assert.match(a.body, /could not be read back from Aimfox/);
  assert.equal(audienceAdds(res.log).length, 1, 'the second prospect is not tried in this run');
});

test('a read-back with an unexpected shape during reconcile settles the row instead of wedging every run', () => {
  const home = makeHome();
  const badShape = { method: 'GET', urlPattern: `${rx(`${C}/custom-variables/u1`)}$`, body: { status: 'ok', custom_variables: null } };
  const res = runPush(home, ['push'], [
    stateRow([]), campaignGet(PAUSED),
    pushingRows([prospect(1, { status: 'pushing', push_attempts: 1 })]),
    { method: 'GET', urlPattern: `${rx(`${C}/audience`)}$`, body: audienceBody([audienceRow(1)]) },
    welcomes([welcomeRow(1)]),
    badShape,
    { method: 'DELETE', urlPattern: rx(`${C}/audience/u1`), body: null },
    finishOk,
    approvedRows([]),
  ]);
  assert.equal(res.status, 0, res.stderr);
  assert.equal(reqs(res.log, 'DELETE', `${C}/audience/u1`).length, 1);
  assert.deepEqual(patchesTo(res.log, 'id=eq.1', 'status=eq.pushing').map((b) => b.status), ['push_failed']);
  assert.match(res.stdout, /Reconciled 1 interrupted push\(es\): 0 pushed, 0 back to approved, 1 failed/);
});

test('a failed read-back whose remove also fails blacklists the lead and alerts', () => {
  const home = makeHome();
  const res = runPush(home, ['push'], [
    stateRow([]), campaignGet(PAUSED), pushingRows([]),
    approvedRows([prospect(1)]), welcomes([welcomeRow(1)]), claimOk, addOk(1),
    { method: 'GET', urlPattern: `${rx(`${C}/custom-variables/u1`)}$`, body: { status: 'ok' } },
    { method: 'DELETE', urlPattern: rx(`${C}/audience/u1`), status: 500, body: { status: 'fail' } },
    { method: 'POST', urlPattern: rx(`${AIMFOX}/blacklist`), body: { status: 'ok' } },
    finishOk,
  ]);
  assert.equal(res.status, 0, res.stderr);
  assert.deepEqual(reqs(res.log, 'POST', `${AIMFOX}/blacklist`).map((e) => e.url), [`${AIMFOX}/blacklist/u1`]);
  const a = reqs(res.log, 'POST', '/rest/v1/li_alerts').map(bodyOf).find((x) => x.kind === 'push_failed');
  assert.match(a.body, /could not be read back .*blacklisted in Aimfox instead/);
});

test('a read-back answered with an HTTP error still counts as a mismatch', () => {
  const home = makeHome();
  const res = runPush(home, ['push'], [
    stateRow([]), campaignGet(PAUSED), pushingRows([]),
    approvedRows([prospect(1)]), welcomes([welcomeRow(1)]), claimOk,
    addOk(1),
    { method: 'GET', urlPattern: `${rx(`${C}/custom-variables/u1`)}$`, status: 404, body: { status: 'error' } },
    { method: 'DELETE', urlPattern: rx(`${C}/audience/u1`), body: null },
    finishOk,
  ]);
  assert.equal(res.status, 0, res.stderr);
  assert.equal(reqs(res.log, 'DELETE', `${C}/audience/u1`).length, 1);
  assert.equal(patchesTo(res.log, 'id=eq.1', 'status=eq.pushing')[0].status, 'push_failed');
});

// ---- Aimfox refusing the add (failedReason), one outcome per documented code ----------------------

const refusedPush = (addMock, attempts = 0) => runPush(makeHome(), ['push'], [
  stateRow([]), campaignGet(PAUSED), pushingRows([]),
  approvedRows([prospect(1, { push_attempts: attempts })]), welcomes([welcomeRow(1)]),
  { ...claimOk, body: [{ status: 'pushing', push_attempts: attempts + 1 }] },
  addMock,
  { method: 'DELETE', urlPattern: rx(`${C}/audience/`), body: { status: 'ok' } },
  { method: 'PATCH', urlPattern: rx('/rest/v1/li_messages?'), body: [{ id: 101 }] },
  { method: 'PATCH', urlPattern: rx('/rest/v1/li_prospects?', 'status=eq.pushing'), body: [{ id: 1 }] },
]);
const afterRefusal = (res) => ({
  row: patchesTo(res.log, 'id=eq.1', 'status=eq.pushing'),
  removals: reqs(res.log, 'DELETE', `${C}/audience/`).map((e) => e.url),
  readBacks: reqs(res.log, 'GET', `${C}/custom-variables/`).length,
  alerts: reqs(res.log, 'POST', '/rest/v1/li_alerts').map(bodyOf).map((a) => a.kind),
  drafts: reqs(res.log, 'PATCH', '/rest/v1/li_messages?').map(bodyOf),
});

test('add refused as alreadyConnected: the prospect is rejected as already a connection', () => {
  const res = refusedPush(addFailed(1, 'alreadyConnected'));
  assert.equal(res.status, 0, res.stderr);
  const r = afterRefusal(res);
  assert.deepEqual(r.row, [{ status: 'rejected', icp_reason: 'already a connection (Aimfox: alreadyConnected)' }]);
  assert.equal(r.readBacks, 0);
  assert.match(res.stdout, /Aimfox would not add 1 already connected \(rejected\), 0 in another campaign/);
});

test('add refused as locked: left approved with the attempt counted, reported as in another campaign', () => {
  const res = refusedPush(addFailed(1, 'locked'));
  assert.equal(res.status, 0, res.stderr);
  const r = afterRefusal(res);
  assert.deepEqual(r.row, [{ status: 'approved' }], 'push_attempts keeps the claimed count');
  assert.match(res.stdout, /p1: in another Aimfox campaign; left approved to retry later/);
  assert.match(res.stdout, /1 in another campaign \(left approved\)/);
  assert.ok(!r.alerts.includes('push_failed'));
});

test('locked on the third push: rejected as in another Aimfox campaign', () => {
  const second = refusedPush(addFailed(1, 'locked'), 1);
  assert.deepEqual(afterRefusal(second).row, [{ status: 'approved' }], 'second push still retries');
  const third = refusedPush(addFailed(1, 'locked'), 2);
  assert.equal(third.status, 0, third.stderr);
  assert.deepEqual(afterRefusal(third).row, [{ status: 'rejected', icp_reason: 'in another Aimfox campaign' }]);
  assert.match(third.stdout, /1 still in another campaign after 3 pushes \(rejected\)/);
});

test('every refusal first takes the lead out of this campaign by urn, else public id', () => {
  for (const reason of ['alreadyConnected', 'locked', 'blocked', 'miningFailed']) {
    assert.deepEqual(afterRefusal(refusedPush(addFailed(1, reason))).removals, [`${C}/audience/p1`], reason);
  }
});

test('a changed vanity URL: the lone added profile is taken even though its public id differs', () => {
  const res = runPush(makeHome(), ['push'], [
    stateRow([]), campaignGet(PAUSED), pushingRows([]),
    approvedRows([prospect(1)]), welcomes([welcomeRow(1)]), claimOk,
    addResult({ profiles: [audienceRow(1, { public_identifier: 'p1-renamed' })] }),
    customVars('u1', welcomeBody(1)),
    finishOk,
  ]);
  assert.equal(res.status, 0, res.stderr);
  assert.equal(reqs(res.log, 'GET', `${C}/audience`).length, 0, 'no audience lookup needed');
  assert.deepEqual(patchesTo(res.log, 'id=eq.1', 'status=eq.pushing'), [{ status: 'pushed', aimfox_lead_urn: 'u1' }]);
});

test('add refused as blocked: do-not-contact, unsent welcome dropped', () => {
  const res = refusedPush(addFailed(1, 'blocked'));
  assert.equal(res.status, 0, res.stderr);
  const r = afterRefusal(res);
  assert.deepEqual(r.row, [{ status: 'do_not_contact', dnc_reason: 'blocked in Aimfox (blacklist)' }]);
  assert.deepEqual(r.drafts, [{ status: 'dropped' }]);
  assert.match(res.stdout, /1 blocked \(do-not-contact\)/);
});

test('add refused for any other reason: push_failed with the reason in the alert', () => {
  for (const reason of ['miningFailed', 'noPFP', 'notLead', 'closed']) {
    const res = refusedPush(addFailed(1, reason));
    assert.equal(res.status, 0, res.stderr);
    const r = afterRefusal(res);
    assert.deepEqual(r.row, [{ status: 'push_failed' }], reason);
    const a = reqs(res.log, 'POST', '/rest/v1/li_alerts').map(bodyOf).find((x) => x.kind === 'push_failed');
    assert.match(a.body, new RegExp(`would not add this profile \\(${reason}\\)`));
    assert.match(res.stdout, /1 other \(push_failed\)/);
  }
});

test('a profile listed in failed with no failedReason is push_failed as unknown', () => {
  const res = refusedPush(addResult({ failed: [{ profile_url: 'https://www.linkedin.com/in/p1/', custom_variables: {} }] }));
  assert.equal(res.status, 0, res.stderr);
  assert.deepEqual(afterRefusal(res).row, [{ status: 'push_failed' }]);
  assert.match(reqs(res.log, 'POST', '/rest/v1/li_alerts').map(bodyOf).find((x) => x.kind === 'push_failed').body, /\(unknown\)/);
});

test('an HTTP 400 refusal with an error code is handled like a failedReason', () => {
  const res = refusedPush({
    method: 'POST', urlPattern: `${rx(`${C}/audience/multiple`)}$`, status: 400,
    body: { status: 'fail', error: { code: 400, message: 'The Target is Locked', type: 'Bad Request', data: 'locked' } },
  });
  assert.equal(res.status, 0, res.stderr);
  assert.deepEqual(afterRefusal(res).row, [{ status: 'approved' }]);
});

test('an HTTP 400 with an undocumented code is not a per-profile refusal', () => {
  const res = refusedPush({
    method: 'POST', urlPattern: `${rx(`${C}/audience/multiple`)}$`, status: 400,
    body: { status: 'fail', error: { code: 400, message: 'Campaign is archived', type: 'Bad Request', data: 'campaignArchived' } },
  });
  const r = afterRefusal(res);
  assert.equal(r.row.length, 0, 'not rejected, approved, do-not-contact or push_failed as a refusal');
  assert.equal(r.removals.length, 0);
  assert.ok(r.alerts.includes('push_error'));
  assert.match(res.stdout, /0 other \(push_failed\)/);
});

test('a failedReason keyed by a profile URL form still matches this profile', () => {
  const res = refusedPush(addResult({
    failed: [],
    failedReason: { 'someone-else': 'locked', 'https://www.linkedin.com/in/P1/': 'blocked' },
  }));
  assert.equal(res.status, 0, res.stderr);
  assert.deepEqual(afterRefusal(res).row, [{ status: 'do_not_contact', dnc_reason: 'blocked in Aimfox (blacklist)' }]);
});

test('read-back reads custom_variables.variables; a body without it counts as a failed read-back', () => {
  const ok = runPush(makeHome(), ['push'], [
    stateRow([]), campaignGet(PAUSED), pushingRows([]),
    approvedRows([prospect(1)]), welcomes([welcomeRow(1)]), claimOk, addOk(1),
    { method: 'GET', urlPattern: `${rx(`${C}/custom-variables/u1`)}$`, body: varsBody('u1', { welcome_message: welcomeBody(1) }) },
    finishOk,
  ]);
  assert.equal(ok.status, 0, ok.stderr);
  assert.deepEqual(patchesTo(ok.log, 'id=eq.1', 'status=eq.pushing'), [{ status: 'pushed', aimfox_lead_urn: 'u1' }]);

  // The variables flat under custom_variables (the old guess) is not the documented shape.
  const bad = runPush(makeHome(), ['push'], [
    stateRow([]), campaignGet(PAUSED), pushingRows([]),
    approvedRows([prospect(1)]), welcomes([welcomeRow(1)]), claimOk, addOk(1),
    { method: 'GET', urlPattern: `${rx(`${C}/custom-variables/u1`)}$`, body: { custom_variables: { welcome_message: welcomeBody(1) } } },
    { method: 'DELETE', urlPattern: rx(`${C}/audience/u1`), body: null },
    finishOk,
  ]);
  assert.equal(bad.status, 0, bad.stderr);
  assert.equal(reqs(bad.log, 'DELETE', `${C}/audience/u1`).length, 1, 'the lead comes out');
  assert.deepEqual(patchesTo(bad.log, 'id=eq.1', 'status=eq.pushing').map((b) => b.status), ['push_failed']);
  const a = reqs(bad.log, 'POST', '/rest/v1/li_alerts').map(bodyOf).find((x) => x.kind === 'push_failed');
  assert.match(a.body, /Aimfox returned custom variables in an unexpected shape/);
});

test('a read-back that times out: the lead is removed and the row settled, then the run stops', () => {
  const home = makeHome();
  const res = runPush(home, ['push'], [
    stateRow([]), campaignGet(PAUSED), pushingRows([]),
    approvedRows([prospect(1)]), welcomes([welcomeRow(1)]), claimOk,
    addOk(1),
    { method: 'GET', urlPattern: `${rx(`${C}/custom-variables/u1`)}$`, timeout: true },
    { method: 'DELETE', urlPattern: rx(`${C}/audience/u1`), body: null },
    finishOk,
  ]);
  assert.notEqual(res.status, 0);
  assert.match(res.stderr, /Aimfox did not answer within 90s; try again later/);
  assert.equal(reqs(res.log, 'DELETE', `${C}/audience/u1`).length, 1);
  assert.deepEqual(patchesTo(res.log, 'id=eq.1', 'status=eq.pushing').map((b) => b.status), ['push_failed']);
});

test('read-back mismatch where the remove fails: the lead is blacklisted instead, and alerted', () => {
  const home = makeHome();
  const res = runPush(home, ['push'], [
    stateRow([]), campaignGet(PAUSED), pushingRows([]),
    approvedRows([prospect(1)]), welcomes([welcomeRow(1)]), claimOk,
    addOk(1),
    customVars('u1', ''),
    { method: 'DELETE', urlPattern: rx(`${C}/audience/u1`), status: 500, body: { error: 'nope' } },
    { method: 'POST', urlPattern: rx(`${AIMFOX}/blacklist`), body: {} },
    finishOk,
  ]);
  assert.equal(res.status, 0, res.stderr);
  const bl = reqs(res.log, 'POST', `${AIMFOX}/blacklist`);
  assert.deepEqual(bl.map((e) => [e.url, e.body]), [[`${AIMFOX}/blacklist/u1`, undefined]], 'POST /blacklist/:urn, no body');
  assert.equal(patchesTo(res.log, 'id=eq.1', 'status=eq.pushing')[0].status, 'push_failed');
  const a = reqs(res.log, 'POST', '/rest/v1/li_alerts').map(bodyOf).find((x) => x.kind === 'push_failed');
  assert.match(a.body, /blacklisted in Aimfox instead/);
});

test('reconcile reads the whole Aimfox audience in one call', () => {
  const home = makeHome();
  const others = Array.from({ length: 250 }, (_, i) => audienceRow(100 + i, { urn: `x${i}`, public_identifier: `x${i}` }));
  const res = runPush(home, ['push'], [
    stateRow([]), campaignGet(PAUSED),
    pushingRows([prospect(1, { status: 'pushing', push_attempts: 1 })]),
    { method: 'GET', urlPattern: `${rx(`${C}/audience`)}$`, body: audienceBody([...others, audienceRow(1)]) },
    welcomes([welcomeRow(1)]),
    customVars('u1', welcomeBody(1)),
    finishOk,
    approvedRows([]),
  ]);
  assert.equal(res.status, 0, res.stderr);
  assert.deepEqual(reqs(res.log, 'GET', `${C}/audience`).map((e) => e.url), [`${C}/audience`], 'one GET, no paging parameters');
  assert.deepEqual(patchesTo(res.log, 'id=eq.1', 'status=eq.pushing'), [{ status: 'pushed', aimfox_lead_urn: 'u1' }]);
});

test('batch_waiting is alerted once, not every hour', () => {
  const home = makeHome();
  const opaque = { id: CAMPAIGN, state: 'ACTIVE', inmail_optimization: false };
  const res = runPush(home, ['push'], [
    { method: 'GET', urlPattern: rx('/rest/v1/li_alerts?', 'kind=eq.batch_waiting'), body: [{ id: 5 }] },
    stateRow([{ campaign_id: CAMPAIGN, fingerprint: null, confirmed_at: '2026-10-01T00:00:00Z' }]),
    campaignGet(opaque), pushingRows([]), approvedRows([prospect(7)]),
  ]);
  assert.equal(res.status, 0, res.stderr);
  assert.equal(reqs(res.log, 'POST', '/rest/v1/li_alerts').length, 0, 'an open batch_waiting alert already exists');
  assert.equal(audienceAdds(res.log).length, 0);
});
