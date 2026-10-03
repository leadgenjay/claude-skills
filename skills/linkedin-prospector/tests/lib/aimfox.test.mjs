import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  campaignFacts, audienceEntry, listAudience, getLead, getCampaign, welcomeFrom, WELCOME_TOKEN, AimfoxError,
  addToAudience, AimfoxAddRefused, removeFromAudience, addToBlacklist, getCustomVariables,
} from '../../scripts/lib/aimfox.mjs';
import { HttpError } from '../../scripts/lib/http.mjs';
import { setupEnv } from './_env.mjs';

let env;
afterEach(() => env?.cleanup());

const BASE = 'https://api.aimfox.com/api/v2';

// A campaign as GET /campaigns/:id returns it (docs/aimfox-api.md).
function campaign({ state = 'CREATED', note = null, messages = [WELCOME_TOKEN], inmail = false, ...over } = {}) {
  return {
    id: '9f2c', name: 'Test', state, audience_size: 0, completion: 0, target_count: 0,
    inmail_optimization: inmail, uses_connection_note: false,
    flows: [
      {
        id: 1, type: 'PRIMARY_CONNECT', template: note === null ? null : { type: 'NOTE_TEMPLATE', message: note },
        flow_message_templates: messages.map((message) => ({ type: 'MESSAGE_TEMPLATE', message, delay: 3600, attachments: [] })),
      },
      { id: 2, type: 'INMAIL_OPTIMIZATION', template: null, flow_message_templates: [] },
      { id: 3, type: 'CONNECT_OPTIMIZATION', template: null, flow_message_templates: [] },
    ],
    ...over,
  };
}

test('state: CREATED and PAUSED read as PAUSED, ACTIVE and STARTED as RUNNING, others as-is, empty as null', () => {
  assert.equal(campaignFacts(campaign({ state: 'CREATED' })).state, 'PAUSED');
  assert.equal(campaignFacts(campaign({ state: 'INIT' })).state, 'PAUSED', 'what the docs show for a new campaign');
  assert.equal(campaignFacts(campaign({ state: 'paused' })).state, 'PAUSED');
  assert.equal(campaignFacts(campaign({ state: 'ACTIVE' })).state, 'RUNNING');
  assert.equal(campaignFacts(campaign({ state: 'STARTED' })).state, 'RUNNING');
  assert.equal(campaignFacts(campaign({ state: 'done' })).state, 'DONE');
  assert.equal(campaignFacts(campaign({ state: '' })).state, null);
  assert.equal(campaignFacts({}).state, null);
});

test('connect note: null template or a blank note is a blank invite; a note is not', () => {
  assert.equal(campaignFacts(campaign()).connectNoteBlank, true);
  assert.equal(campaignFacts(campaign({ note: '  \n ' })).connectNoteBlank, true);
  assert.equal(campaignFacts(campaign({ note: 'Hi {{FIRST_NAME}}' })).connectNoteBlank, false);
});

test('connect note: uses_connection_note must be false as well', () => {
  assert.equal(campaignFacts(campaign({ uses_connection_note: true })).connectNoteBlank, false);
  const unreported = campaign();
  delete unreported.uses_connection_note;
  assert.equal(campaignFacts(unreported).connectNoteBlank, false);
});

test('connect optimization must be empty; InMail flow text is not judged', () => {
  const withFlow = (type, over) => {
    const c = campaign();
    c.flows = c.flows.map((f) => (f.type === type ? { ...f, ...over } : f));
    return campaignFacts(c);
  };
  assert.equal(campaignFacts(campaign()).connectOptimizationBlank, true);
  assert.equal(withFlow('CONNECT_OPTIMIZATION', { template: { message: 'Hi' } }).connectOptimizationBlank, false);
  assert.equal(withFlow('CONNECT_OPTIMIZATION', { flow_message_templates: [{ message: 'x' }] }).connectOptimizationBlank, false);
  assert.equal(withFlow('CONNECT_OPTIMIZATION', { template: { message: '  ' } }).connectOptimizationBlank, true);
  const inert = withFlow('INMAIL_OPTIMIZATION', { template: { message: 'Old InMail' } });
  assert.equal(inert.connectOptimizationBlank, true);
  assert.equal(inert.connectNoteBlank, true);
  assert.equal(inert.welcomeTokenOk, true);
});

test('welcome token: exactly one message whose whole text is the token', () => {
  assert.equal(campaignFacts(campaign()).welcomeTokenOk, true);
  assert.equal(campaignFacts(campaign({ messages: [WELCOME_TOKEN, 'Just checking in'] })).welcomeTokenOk, false, 'a follow-up');
  assert.equal(campaignFacts(campaign({ messages: [] })).welcomeTokenOk, false, 'no message');
  assert.equal(campaignFacts(campaign({ messages: [`Hi! ${WELCOME_TOKEN}`] })).welcomeTokenOk, false, 'extra text');
  assert.equal(campaignFacts(campaign({ messages: ['{{ welcome_message }}'] })).welcomeTokenOk, false, 'no CUSTOM. prefix');
});

test('welcome token: the variable name matches case-insensitively, with inner whitespace and outer padding', () => {
  for (const t of ['{{CUSTOM.WELCOME_MESSAGE}}', '{{custom.welcome_message}}', '{{ CUSTOM.welcome_message }}', `  ${WELCOME_TOKEN}\n`]) {
    assert.equal(campaignFacts(campaign({ messages: [t] })).welcomeTokenOk, true, t);
  }
});

test('InMail optimization is reported as a boolean, null when absent', () => {
  assert.equal(campaignFacts(campaign({ inmail: true })).inmailOptimization, true);
  assert.equal(campaignFacts(campaign({ inmail: false })).inmailOptimization, false);
  assert.equal(campaignFacts({ state: 'ACTIVE', flows: [] }).inmailOptimization, null);
});

test('no flows: every step fact is null and there is no fingerprint; stop on reply is always null', () => {
  const f = campaignFacts({ state: 'ACTIVE', inmail_optimization: false });
  assert.deepEqual(f, {
    state: 'RUNNING', welcomeTokenOk: null, connectNoteBlank: null, connectOptimizationBlank: null,
    inmailOptimization: false, stopOnReply: null, fingerprint: null,
  });
  assert.equal(campaignFacts(campaign()).stopOnReply, null);
});

test('fingerprint moves with message text, delay, note and InMail; not with state or audience', () => {
  const fp = campaignFacts(campaign()).fingerprint;
  assert.match(fp, /^flows:[0-9a-f]{8}$/);
  assert.notEqual(campaignFacts(campaign({ messages: ['{{ CUSTOM.welcome_message }}'] })).fingerprint, fp, 'message text');
  assert.notEqual(campaignFacts(campaign({ note: 'Hi' })).fingerprint, fp, 'invite note');
  assert.notEqual(campaignFacts(campaign({ inmail: true })).fingerprint, fp, 'InMail switch');
  const delayed = campaign();
  delayed.flows[0].flow_message_templates[0].delay = 7200;
  assert.notEqual(campaignFacts(delayed).fingerprint, fp, 'delay');
  assert.equal(campaignFacts(campaign({ state: 'ACTIVE', audience_size: 4346, completion: 37, target_count: 4346 })).fingerprint, fp);
});

test('audienceEntry: urn from urn only, id is the lead id, state lowercased', () => {
  assert.deepEqual(audienceEntry({ id: 123, urn: 'ACoAAx', public_identifier: 'Jane-Doe', state: 'MESSAGE' }),
    { urn: 'ACoAAx', publicId: 'jane-doe', leadId: '123', state: 'message' });
  assert.deepEqual(audienceEntry({ id: 7, public_identifier: 'x' }), { urn: null, publicId: 'x', leadId: '7', state: null });
  assert.deepEqual(audienceEntry({}), { urn: null, publicId: null, leadId: null, state: null });
});

test('welcomeFrom finds the variable whatever its case', () => {
  assert.equal(welcomeFrom({ welcome_message: 'a' }), 'a');
  assert.equal(welcomeFrom({ AUTHOR: 'x', WELCOME_MESSAGE: 'b' }), 'b');
  assert.equal(welcomeFrom({ AUTHOR: 'x' }), undefined);
  assert.equal(welcomeFrom(null), undefined);
});

test('listAudience is one GET with no paging parameters', async () => {
  env = setupEnv([{ method: 'GET', urlPattern: '/campaigns/c1/audience$', body: {
    status: 'ok',
    audience: [{ id: 1, urn: 'u1', public_identifier: 'p1', state: 'init' }, { id: 2, urn: 'u2', public_identifier: 'p2', state: 'done' }],
  } }]);
  process.env.AIMFOX_API_KEY = 'k';
  const list = await listAudience('c1');
  assert.deepEqual(list.map((e) => [e.urn, e.leadId, e.state]), [['u1', '1', 'init'], ['u2', '2', 'done']]);
  assert.deepEqual(env.log().map((e) => [e.method, e.url]), [['GET', `${BASE}/campaigns/c1/audience`]]);
});

test('getCampaign unwraps {status, campaign}; getLead reads labels as objects or strings', async () => {
  env = setupEnv([
    { method: 'GET', urlPattern: '/campaigns/c1$', body: { status: 'ok', campaign: { id: 'c1', state: 'ACTIVE' } } },
    { method: 'GET', urlPattern: '/leads/42$', body: { status: 'ok', lead: { id: 42, urn: 'u42', labels: [{ name: 'Not Interested' }, 'Hot'] } } },
  ]);
  process.env.AIMFOX_API_KEY = 'k';
  assert.deepEqual(await getCampaign('c1'), { id: 'c1', state: 'ACTIVE' });
  const lead = await getLead('42');
  assert.deepEqual(lead.labels, ['not interested', 'hot']);
  assert.equal(lead.urn, 'u42');
});

test('an unexpected body shape throws; it is never read as empty', async () => {
  env = setupEnv([
    { method: 'GET', urlPattern: '/campaigns/c1/audience$', body: { status: 'ok', data: [] } },
    { method: 'GET', urlPattern: '/campaigns/c1$', body: { status: 'ok', campaign: [] } },
    { method: 'GET', urlPattern: '/leads/42$', body: { status: 'ok' } },
  ]);
  process.env.AIMFOX_API_KEY = 'k';
  await assert.rejects(listAudience('c1'), (err) => err instanceof AimfoxError && /^Aimfox returned an audience in an unexpected shape$/.test(err.message));
  await assert.rejects(getCampaign('c1'), /Aimfox returned a campaign in an unexpected shape/);
  await assert.rejects(getLead('42'), /Aimfox returned a lead in an unexpected shape/);
});

// ---- write calls, shapes from docs.aimfox.com ----------------------------------------------------

const logged = (e) => [e.method, e.url, e.body === undefined ? undefined : JSON.parse(e.body)];

test('addToAudience posts the documented /audience/multiple body and returns the added entry', async () => {
  env = setupEnv([{ method: 'POST', urlPattern: '/campaigns/c1/audience/multiple$', body: {
    status: 'ok',
    profiles: [
      { id: '1', urn: 'uX', public_identifier: 'someone-else', state: 'init' },
      { id: '583654275', urn: 'ACoAAC', public_identifier: 'john-doe', state: 'init' },
    ],
    failed: [],
    failedReason: {},
  } }]);
  process.env.AIMFOX_API_KEY = 'k';
  const entry = await addToAudience('c1', { profileUrl: 'https://www.linkedin.com/in/john-doe/', customVariables: { welcome_message: 'Hi' } });
  assert.deepEqual(entry, { urn: 'ACoAAC', publicId: 'john-doe', leadId: '583654275', state: 'init' }, 'matched by public id');
  assert.deepEqual(env.log().map(logged), [['POST', `${BASE}/campaigns/c1/audience/multiple`, {
    type: 'profile_url', profiles: [{ profile_url: 'https://www.linkedin.com/in/john-doe/', custom_variables: { welcome_message: 'Hi' } }],
  }]]);
});

test('addToAudience throws AimfoxAddRefused with the failedReason code', async () => {
  for (const code of ['blocked', 'locked', 'miningFailed', 'noPFP', 'alreadyConnected', 'notLead', 'closed']) {
    env = setupEnv([{ method: 'POST', urlPattern: '/audience/multiple$', body: {
      status: 'ok', profiles: [], failed: [{ profile_url: 'https://www.linkedin.com/in/jane-doe', custom_variables: {} }],
      failedReason: { 'jane-doe': code },
    } }]);
    process.env.AIMFOX_API_KEY = 'k';
    await assert.rejects(addToAudience('c1', { profileUrl: 'https://www.linkedin.com/in/Jane-Doe/', customVariables: {} }), (err) => {
      assert.ok(err instanceof AimfoxAddRefused && err instanceof AimfoxError);
      assert.equal(err.reason, code);
      return true;
    });
    env.cleanup();
  }
  env = null;
});

test('addToAudience with the profile in neither list returns an empty entry (push then looks it up)', async () => {
  env = setupEnv([{ method: 'POST', urlPattern: '/audience/multiple$', body: { status: 'ok', profiles: [], failed: [], failedReason: {} } }]);
  process.env.AIMFOX_API_KEY = 'k';
  assert.deepEqual(await addToAudience('c1', { profileUrl: 'https://www.linkedin.com/in/x', customVariables: {} }),
    { urn: null, publicId: null, leadId: null, state: null });
});

test('removeFromAudience takes a urn or a public id; addToBlacklist posts /blacklist/:urn or {urls}', async () => {
  env = setupEnv([
    { method: 'DELETE', urlPattern: '/campaigns/c1/audience/', body: { status: 'ok' } },
    { method: 'POST', urlPattern: '/blacklist', body: { status: 'ok' } },
  ]);
  process.env.AIMFOX_API_KEY = 'k';
  await removeFromAudience('c1', 'ACoAAC');
  await removeFromAudience('c1', 'jane-doe');
  await addToBlacklist('ACoAAC');
  await addToBlacklist({ profileUrl: 'https://www.linkedin.com/in/jane-doe' });
  await assert.rejects(addToBlacklist({}), /needs a urn or a profile URL/);
  assert.deepEqual(env.log().map(logged), [
    ['DELETE', `${BASE}/campaigns/c1/audience/ACoAAC`, undefined],
    ['DELETE', `${BASE}/campaigns/c1/audience/jane-doe`, undefined],
    ['POST', `${BASE}/blacklist/ACoAAC`, undefined],
    ['POST', `${BASE}/blacklist`, { urls: ['https://www.linkedin.com/in/jane-doe'] }],
  ]);
});

test('getCustomVariables returns custom_variables.variables; welcomeFrom then finds the welcome', async () => {
  env = setupEnv([{ method: 'GET', urlPattern: '/campaigns/c1/custom-variables/ACoAAC$', body: {
    status: 'ok',
    custom_variable_keys: ['FIRST_NAME', 'CUSTOM_MESSAGE', 'WELCOME_MESSAGE'],
    custom_variables: { target_urn: 'ACoAAC', variables: { CUSTOM_MESSAGE: 'Hello there', 'first name': 'Jo', WELCOME_MESSAGE: 'Hi Jo' } },
  } }]);
  process.env.AIMFOX_API_KEY = 'k';
  const vars = await getCustomVariables('c1', 'ACoAAC');
  assert.deepEqual(vars, { CUSTOM_MESSAGE: 'Hello there', 'first name': 'Jo', WELCOME_MESSAGE: 'Hi Jo' });
  assert.equal(welcomeFrom(vars), 'Hi Jo');
});

test('a call that gets no answer throws a clear timeout error, never data', async () => {
  env = setupEnv([{ method: 'GET', urlPattern: '/campaigns/c1/audience$', timeout: true }]);
  process.env.AIMFOX_API_KEY = 'k';
  await assert.rejects(listAudience('c1'), (err) => {
    assert.ok(err instanceof HttpError, 'an HttpError (no answer), so callers stop');
    assert.ok(!(err instanceof AimfoxError), 'not a refusal');
    assert.equal(err.timeout, true);
    assert.match(err.message, /^Aimfox did not answer within 90s; try again later/);
    return true;
  });
});
