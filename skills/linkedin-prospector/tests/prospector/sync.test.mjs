import test from 'node:test';
import assert from 'node:assert/strict';
import { makeHome, run, rx, reqs, bodyOf, AIMFOX, CAMPAIGN, audienceRow, audienceBody } from './helpers.mjs';

const C = `${AIMFOX}/campaigns/${CAMPAIGN}`;

const pushedRow = (id, over = {}) => ({
  id, public_id: `p${id}`, status: 'pushed', aimfox_lead_urn: `u${id}`, last_inbound_at: null, ...over,
});
const leadGet = (leadId, labels = []) => ({
  method: 'GET', urlPattern: `${rx(`${AIMFOX}/leads/${leadId}`)}$`,
  body: { status: 'ok', lead: { id: leadId, urn: `lead-${leadId}`, full_name: 'X', labels } },
});

function syncMocks({ prospects, audience, leads = [] }) {
  return [
    { method: 'GET', urlPattern: rx('/rest/v1/li_campaign_state?'), body: [] },
    {
      method: 'GET',
      urlPattern: rx('/rest/v1/li_prospects?', 'status=in.(pushed,connect_sent,accepted,welcome_sent,replied)'),
      body: prospects,
    },
    { method: 'GET', urlPattern: `${rx(`${C}/audience`)}$`, body: audienceBody(audience) },
    ...leads,
    // any lead not listed above has no labels
    { method: 'GET', urlPattern: rx(`${AIMFOX}/leads/`), body: { status: 'ok', lead: { labels: [] } } },
    { method: 'PATCH', urlPattern: rx('/rest/v1/li_messages?'), body: [{ id: 101 }] },
    { method: 'PATCH', urlPattern: rx('/rest/v1/li_prospects?'), body: [{ id: 0 }] },
    { method: 'DELETE', urlPattern: rx(`${C}/audience/`), body: null },
    { method: 'POST', urlPattern: rx(`${AIMFOX}/blacklist`), body: {} },
  ];
}

test('sync maps audience state: message -> accepted, done -> welcome_sent; other states change nothing', () => {
  const home = makeHome();
  const res = run(home, ['sync'], syncMocks({
    prospects: [pushedRow(1), pushedRow(2), pushedRow(3), pushedRow(4, { status: 'welcome_sent' }), pushedRow(5)],
    audience: [
      audienceRow(1, { state: 'message' }),
      audienceRow(2, { state: 'DONE' }),
      audienceRow(3, { state: 'endorse' }),
      audienceRow(4, { state: 'message' }), // never moves backward
      audienceRow(5, { state: 'withdraw' }),
    ],
  }));
  assert.equal(res.status, 0, res.stderr);
  assert.deepEqual(reqs(res.log, 'PATCH', '/rest/v1/li_prospects?', 'id=eq.1', 'status=eq.pushed').map(bodyOf), [{ status: 'accepted' }]);
  assert.deepEqual(reqs(res.log, 'PATCH', '/rest/v1/li_prospects?', 'id=eq.2', 'status=eq.pushed').map(bodyOf), [{ status: 'welcome_sent' }]);
  for (const id of [3, 4, 5]) assert.equal(reqs(res.log, 'PATCH', '/rest/v1/li_prospects?', `id=eq.${id}`).length, 0, `prospect ${id}`);

  const welcome = reqs(res.log, 'PATCH', '/rest/v1/li_messages?');
  assert.equal(welcome.length, 1, 'only the done lead has its welcome marked sent');
  assert.match(welcome[0].url, /prospect_id=eq\.2&kind=eq\.welcome&status=eq\.draft/);
  const b = bodyOf(welcome[0]);
  assert.equal(b.status, 'sent');
  assert.equal(b.sent_via, 'aimfox');
  assert.ok(!Number.isNaN(Date.parse(b.sent_at)), 'sent_at is a timestamp');
  assert.equal(reqs(res.log, 'DELETE', `${C}/audience/`).length, 0);
  assert.match(res.stdout, /Sync: 2 status change\(s\), 1 welcome\(s\) marked sent, 0 replied lead\(s\) removed/);
});

test('sync reads the audience once, with no paging parameters, and asks for prospects with last_inbound_at', () => {
  const home = makeHome();
  const res = run(home, ['sync'], syncMocks({ prospects: [pushedRow(1)], audience: [audienceRow(1)] }));
  assert.equal(res.status, 0, res.stderr);
  assert.deepEqual(reqs(res.log, 'GET', `${C}/audience`).map((e) => e.url), [`${C}/audience`]);
  assert.match(reqs(res.log, 'GET', '/rest/v1/li_prospects?')[0].url, /select=id,public_id,status,aimfox_lead_urn,last_inbound_at/);
});

test('a prospect with last_inbound_at moves to replied and, with steps left, is removed from the campaign', () => {
  const home = makeHome();
  const res = run(home, ['sync'], syncMocks({
    prospects: [
      pushedRow(1, { status: 'accepted', last_inbound_at: '2026-10-03T08:00:00Z' }),
      pushedRow(2, { status: 'welcome_sent', last_inbound_at: '2026-10-02T08:00:00Z' }),
      pushedRow(3, { status: 'welcome_sent', last_inbound_at: '2026-10-02T08:00:00Z' }),
    ],
    audience: [audienceRow(1, { state: 'message' }), audienceRow(2, { state: 'done' }), audienceRow(3, { state: 'cancelled' })],
  }));
  assert.equal(res.status, 0, res.stderr);
  for (const id of [1, 2, 3]) {
    assert.deepEqual(reqs(res.log, 'PATCH', '/rest/v1/li_prospects?', `id=eq.${id}`, 'status=eq.').map(bodyOf), [{ status: 'replied' }], `prospect ${id}`);
  }
  assert.deepEqual(reqs(res.log, 'DELETE', `${C}/audience/`).map((e) => e.url), [`${C}/audience/u1`],
    'a done or cancelled sequence has nothing left to fire');
  assert.match(res.stdout, /1 replied lead\(s\) removed from the campaign/);
});

test('a replied prospect with no urn anywhere is removed by its public id', () => {
  const home = makeHome();
  const res = run(home, ['sync'], syncMocks({
    prospects: [pushedRow(1, { status: 'accepted', aimfox_lead_urn: null, last_inbound_at: '2026-10-03T08:00:00Z' })],
    audience: [audienceRow(1, { urn: null, state: 'message' })],
  }));
  assert.equal(res.status, 0, res.stderr);
  assert.deepEqual(reqs(res.log, 'DELETE', `${C}/audience/`).map((e) => e.url), [`${C}/audience/p1`]);
});

test('a replied prospect absent from the audience moves to replied with no removal call', () => {
  const home = makeHome();
  const res = run(home, ['sync'], syncMocks({
    prospects: [pushedRow(1, { status: 'welcome_sent', last_inbound_at: '2026-10-03T08:00:00Z' })],
    audience: [],
  }));
  assert.equal(res.status, 0, res.stderr);
  assert.deepEqual(reqs(res.log, 'PATCH', '/rest/v1/li_prospects?', 'id=eq.1').map(bodyOf), [{ status: 'replied' }]);
  assert.equal(reqs(res.log, 'DELETE', `${C}/audience/`).length, 0);
});

test('a failed remove after a reply alerts once, and the next sync tries the remove again', () => {
  const home = makeHome();
  const replied = (status) => syncMocks({
    prospects: [pushedRow(1, { status, last_inbound_at: '2026-10-03T08:00:00Z' })],
    audience: [audienceRow(1, { state: 'message' })],
  });
  const first = run(home, ['sync'], [
    { method: 'DELETE', urlPattern: rx(`${C}/audience/u1`), status: 500, body: { error: 'nope' } },
    ...replied('accepted'),
  ]);
  assert.equal(first.status, 0, first.stderr);
  assert.deepEqual(reqs(first.log, 'PATCH', '/rest/v1/li_prospects?', 'id=eq.1').map(bodyOf), [{ status: 'replied' }]);
  assert.deepEqual(reqs(first.log, 'POST', '/rest/v1/li_alerts').map(bodyOf).map((a) => [a.kind, a.prospect_id]), [['sync_remove_failed', 1]]);

  // Next run: the row is already replied, so its status does not move, but the remove is retried.
  const second = run(home, ['sync'], replied('replied'));
  assert.equal(second.status, 0, second.stderr);
  assert.equal(reqs(second.log, 'PATCH', '/rest/v1/li_prospects?').length, 0);
  assert.deepEqual(reqs(second.log, 'DELETE', `${C}/audience/`).map((e) => e.url), [`${C}/audience/u1`]);
  assert.match(second.stdout, /1 replied lead\(s\) removed from the campaign/);
});

test('one failed label read does not stop the others; one alert sums them up', () => {
  const home = makeHome();
  const res = run(home, ['sync'], [
    { method: 'GET', urlPattern: rx('/rest/v1/li_prospects?', 'id=eq.3'), body: [{ status: 'pushed' }] },
    { method: 'PATCH', urlPattern: rx('/rest/v1/li_prospects?', 'id=eq.3'), body: [{ id: 3, public_id: 'p3', status: 'do_not_contact', aimfox_lead_urn: 'u3' }] },
    { method: 'GET', urlPattern: `${rx(`${AIMFOX}/leads/5001`)}$`, status: 500, body: { error: 'boom' } },
    { method: 'GET', urlPattern: `${rx(`${AIMFOX}/leads/5002`)}$`, body: { status: 'ok', profile: {} } },
    ...syncMocks({
      prospects: [pushedRow(1), pushedRow(2), pushedRow(3)],
      audience: [audienceRow(1), audienceRow(2), audienceRow(3)],
      leads: [leadGet(5003, [{ name: 'not interested' }])],
    }),
  ]);
  assert.equal(res.status, 0, res.stderr);
  assert.equal(reqs(res.log, 'GET', `${AIMFOX}/leads/`).length, 3, 'every lead was read');
  assert.deepEqual(reqs(res.log, 'PATCH', '/rest/v1/li_prospects?', 'id=eq.3').map(bodyOf),
    [{ status: 'do_not_contact', dnc_reason: 'Aimfox label: not interested' }], 'the third still counts');
  const alerts = reqs(res.log, 'POST', '/rest/v1/li_alerts').map(bodyOf);
  assert.deepEqual(alerts.map((a) => a.kind), ['sync_label_check_failed']);
  assert.match(alerts[0].body, /^2 "not interested" label check\(s\) failed/);
  assert.match(res.stdout, /1 lead\(s\) checked for labels, 2 label check\(s\) failed, 1 marked do-not-contact/);
});

test('a label do-not-contact matched by public id stores the audience urn first, so it can be removed', () => {
  const home = makeHome();
  const res = run(home, ['sync'], [
    { method: 'PATCH', urlPattern: `${rx('/rest/v1/li_prospects?id=eq.3')}$`, body: [{ id: 3, public_id: 'p3', status: 'do_not_contact', aimfox_lead_urn: 'u3' }] },
    { method: 'GET', urlPattern: rx('/rest/v1/li_prospects?', 'id=eq.3'), body: [{ status: 'pushed' }] },
    ...syncMocks({
      prospects: [pushedRow(3, { aimfox_lead_urn: null })],
      audience: [audienceRow(3)],
      leads: [leadGet(5003, ['Not interested'])],
    }),
  ]);
  assert.equal(res.status, 0, res.stderr);
  assert.deepEqual(reqs(res.log, 'PATCH', '/rest/v1/li_prospects?', 'id=eq.3').map(bodyOf), [
    { aimfox_lead_urn: 'u3' },
    { status: 'do_not_contact', dnc_reason: 'Aimfox label: not interested' },
  ]);
  assert.equal(reqs(res.log, 'DELETE', `${C}/audience/u3`).length, 1);
  assert.deepEqual(reqs(res.log, 'POST', `${AIMFOX}/blacklist`).map((e) => [e.url, e.body]), [[`${AIMFOX}/blacklist/u3`, undefined]]);
});

test('an audience body without `audience` stops sync and changes nothing', () => {
  const home = makeHome();
  const res = run(home, ['sync'], [
    { method: 'GET', urlPattern: `${rx(`${C}/audience`)}$`, body: { status: 'ok' } },
    ...syncMocks({ prospects: [pushedRow(1, { last_inbound_at: '2026-10-03T08:00:00Z' })], audience: [] }),
  ]);
  assert.notEqual(res.status, 0);
  assert.match(res.stderr, /Aimfox returned an audience in an unexpected shape/);
  assert.equal(reqs(res.log, 'PATCH', '/rest/v1/').length, 0);
  assert.equal(reqs(res.log, 'DELETE', `${C}/audience/`).length, 0);
});

test('sync turns an Aimfox "not interested" label into do-not-contact, one lead read per pushed prospect', () => {
  const home = makeHome();
  const res = run(home, ['sync'], [
    // markDoNotContact reads and writes prospect 3
    { method: 'GET', urlPattern: rx('/rest/v1/li_prospects?', 'id=eq.3'), body: [{ status: 'pushed' }] },
    { method: 'PATCH', urlPattern: rx('/rest/v1/li_prospects?', 'id=eq.3'), body: [{ id: 3, public_id: 'p3', status: 'do_not_contact', aimfox_lead_urn: 'u3' }] },
    ...syncMocks({
      prospects: [pushedRow(1), pushedRow(3), pushedRow(4)],
      audience: [audienceRow(1), audienceRow(3), audienceRow(9, { urn: 'u9', public_identifier: 'p9' })],
      leads: [leadGet(5003, [{ name: 'Not Interested' }]), leadGet(5001, ['Hot'])],
    }),
  ]);
  assert.equal(res.status, 0, res.stderr);
  assert.deepEqual(reqs(res.log, 'GET', `${AIMFOX}/leads/`).map((e) => e.url), [`${AIMFOX}/leads/5001`, `${AIMFOX}/leads/5003`],
    'one read per pushed prospect found in the audience; p4 is absent and p9 is not ours');
  assert.deepEqual(reqs(res.log, 'PATCH', '/rest/v1/li_prospects?', 'id=eq.3').map(bodyOf),
    [{ status: 'do_not_contact', dnc_reason: 'Aimfox label: not interested' }]);
  assert.equal(reqs(res.log, 'DELETE', `${C}/audience/u3`).length, 1);
  assert.deepEqual(reqs(res.log, 'POST', `${AIMFOX}/blacklist`).map((e) => [e.url, e.body]), [[`${AIMFOX}/blacklist/u3`, undefined]]);
  assert.match(res.stdout, /2 lead\(s\) checked for labels, 0 label check\(s\) failed, 1 marked do-not-contact, 1 pushed prospect\(s\) not in the Aimfox audience/);
});

test('a prospect absent from the audience is left alone', () => {
  const home = makeHome();
  const res = run(home, ['sync'], syncMocks({ prospects: [pushedRow(1, { status: 'accepted' })], audience: [] }));
  assert.equal(res.status, 0, res.stderr);
  assert.equal(reqs(res.log, 'PATCH', '/rest/v1/').length, 0);
  assert.equal(reqs(res.log, 'GET', `${AIMFOX}/leads/`).length, 0);
  assert.equal(reqs(res.log, 'DELETE', `${C}/audience/`).length, 0);
});

test('a prospect found by public id when it has no stored urn', () => {
  const home = makeHome();
  const res = run(home, ['sync'], syncMocks({
    prospects: [pushedRow(1, { aimfox_lead_urn: null })],
    audience: [audienceRow(1, { urn: 'other-urn', state: 'message' })],
  }));
  assert.equal(res.status, 0, res.stderr);
  assert.deepEqual(reqs(res.log, 'PATCH', '/rest/v1/li_prospects?', 'id=eq.1').map(bodyOf), [{ status: 'accepted' }]);
});

test('sync reads every pushed prospect past the 1000-row PostgREST page', () => {
  const home = makeHome();
  const page = (from, n) => Array.from({ length: n }, (_, i) => pushedRow(from + i));
  const res = run(home, ['sync'], [
    { method: 'GET', urlPattern: rx('/rest/v1/li_campaign_state?'), body: [] },
    { method: 'GET', urlPattern: rx('/rest/v1/li_prospects?', 'offset=0'), body: page(1, 1000) },
    { method: 'GET', urlPattern: rx('/rest/v1/li_prospects?', 'offset=1000'), body: page(1001, 5) },
    { method: 'GET', urlPattern: `${rx(`${C}/audience`)}$`, body: audienceBody([{ urn: 'u1004', public_identifier: 'p1004', state: 'message' }]) },
    { method: 'PATCH', urlPattern: rx('/rest/v1/li_prospects?'), body: [{ id: 1004 }] },
  ]);
  assert.equal(res.status, 0, res.stderr);
  const pages = reqs(res.log, 'GET', '/rest/v1/li_prospects?');
  assert.equal(pages.length, 2);
  assert.ok(pages.every((p) => /order=id/.test(p.url)), 'paged in a stable order');
  assert.deepEqual(reqs(res.log, 'PATCH', '/rest/v1/li_prospects?', 'id=eq.1004').map(bodyOf), [{ status: 'accepted' }]);
  assert.equal(reqs(res.log, 'GET', `${AIMFOX}/leads/`).length, 0, 'an entry without a lead id gets no label read');
});

test('an audience read that times out stops sync with a clear message and changes nothing', () => {
  const home = makeHome();
  const res = run(home, ['sync'], [
    { method: 'GET', urlPattern: `${rx(`${C}/audience`)}$`, timeout: true },
    ...syncMocks({ prospects: [pushedRow(1, { last_inbound_at: '2026-10-03T08:00:00Z' })], audience: [] }),
  ]);
  assert.notEqual(res.status, 0);
  assert.match(res.stderr, /Aimfox did not answer within 90s; try again later/);
  assert.equal(reqs(res.log, 'PATCH', '/rest/v1/').length, 0);
  assert.equal(reqs(res.log, 'DELETE', `${C}/audience/`).length, 0);
});
