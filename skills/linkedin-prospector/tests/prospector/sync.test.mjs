import test from 'node:test';
import assert from 'node:assert/strict';
import { makeHome, run, rx, reqs, bodyOf, AIMFOX, CAMPAIGN } from './helpers.mjs';

const C = `${AIMFOX}/campaigns/${CAMPAIGN}`;

function syncMocks({ leads = [] } = {}) {
  return [
    { method: 'GET', urlPattern: rx('/rest/v1/li_campaign_state?'), body: [] },
    {
      method: 'GET',
      urlPattern: rx('/rest/v1/li_prospects?', 'status=in.(pushed,connect_sent,accepted,welcome_sent,replied)'),
      body: [
        { id: 1, public_id: 'p1', status: 'pushed', aimfox_lead_urn: 'u1' },
        { id: 2, public_id: 'p2', status: 'welcome_sent', aimfox_lead_urn: 'u2' },
        { id: 3, public_id: 'p3', status: 'pushed', aimfox_lead_urn: 'u3' },
      ],
    },
    {
      method: 'GET',
      urlPattern: rx(`${AIMFOX}/analytics/interactions`),
      body: {
        data: [
          { type: 'connect_sent', lead_urn: 'u1', created_at: '2026-10-02T09:00:00Z' },
          { type: 'connect_accepted', lead_urn: 'u1', created_at: '2026-10-02T12:00:00Z' },
          { type: 'message_sent', lead_urn: 'u1', created_at: '2026-10-02T12:05:00Z' },
          { type: 'message_reply', public_identifier: 'p2', created_at: '2026-10-03T08:00:00Z' },
          { type: 'connect_sent', lead_urn: 'someone-else' },
        ],
      },
    },
    { method: 'PATCH', urlPattern: rx('/rest/v1/li_messages?'), body: [{ id: 101 }] },
    // markDoNotContact (label path)
    { method: 'GET', urlPattern: rx('/rest/v1/li_prospects?', 'id=eq.3'), body: [{ status: 'pushed' }] },
    { method: 'PATCH', urlPattern: rx('/rest/v1/li_prospects?', 'id=eq.3'), body: [{ id: 3, public_id: 'p3', status: 'do_not_contact', aimfox_lead_urn: 'u3' }] },
    { method: 'PATCH', urlPattern: rx('/rest/v1/li_prospects?'), body: [{ id: 0 }] },
    { method: 'DELETE', urlPattern: rx(`${C}/audience/`), body: null },
    { method: 'POST', urlPattern: rx(`${AIMFOX}/blacklist`), body: {} },
    { method: 'POST', urlPattern: rx(`${AIMFOX}/leads:search`), body: { data: leads } },
  ];
}

test('sync moves statuses forward, marks the welcome row sent, and removes replied leads', () => {
  const home = makeHome();
  const res = run(home, ['sync'], syncMocks());
  assert.equal(res.status, 0, res.stderr);

  const welcome = reqs(res.log, 'PATCH', '/rest/v1/li_messages?', 'prospect_id=eq.1', 'kind=eq.welcome', 'status=eq.draft');
  assert.equal(welcome.length, 1);
  assert.deepEqual(bodyOf(welcome[0]), { status: 'sent', sent_at: '2026-10-02T12:05:00Z', sent_via: 'aimfox' });

  assert.deepEqual(reqs(res.log, 'PATCH', '/rest/v1/li_prospects?', 'id=eq.1', 'status=eq.pushed').map(bodyOf), [{ status: 'welcome_sent' }]);
  assert.deepEqual(reqs(res.log, 'PATCH', '/rest/v1/li_prospects?', 'id=eq.2', 'status=eq.welcome_sent').map(bodyOf), [{ status: 'replied' }]);
  assert.equal(reqs(res.log, 'PATCH', '/rest/v1/li_prospects?', 'id=eq.3').length, 0, 'no interaction, no change');

  const deletes = reqs(res.log, 'DELETE', `${C}/audience/`).map((e) => e.url);
  assert.deepEqual(deletes, [`${C}/audience/u2`], 'only the replied lead leaves the audience');
});

test('sync turns an Aimfox "not interested" label into do-not-contact', () => {
  const home = makeHome();
  const res = run(home, ['sync'], syncMocks({ leads: [{ urn: 'u3', public_identifier: 'p3', labels: [{ name: 'Not Interested' }] }] }));
  assert.equal(res.status, 0, res.stderr);
  const dnc = reqs(res.log, 'PATCH', '/rest/v1/li_prospects?', 'id=eq.3').map(bodyOf);
  assert.deepEqual(dnc, [{ status: 'do_not_contact', dnc_reason: 'Aimfox label: not interested' }]);
  assert.ok(reqs(res.log, 'DELETE', `${C}/audience/u3`).length === 1);
  assert.deepEqual(reqs(res.log, 'POST', `${AIMFOX}/blacklist`).map(bodyOf), [{ urn: 'u3' }]);
});

test('sync reads every pushed prospect past the 1000-row PostgREST page', () => {
  const home = makeHome();
  const page = (from, n) => Array.from({ length: n }, (_, i) => ({ id: from + i, public_id: `p${from + i}`, status: 'pushed', aimfox_lead_urn: `u${from + i}` }));
  const res = run(home, ['sync'], [
    { method: 'GET', urlPattern: rx('/rest/v1/li_campaign_state?'), body: [] },
    { method: 'GET', urlPattern: rx('/rest/v1/li_prospects?', 'offset=0'), body: page(1, 1000) },
    { method: 'GET', urlPattern: rx('/rest/v1/li_prospects?', 'offset=1000'), body: page(1001, 5) },
    { method: 'GET', urlPattern: rx(`${AIMFOX}/analytics/interactions`), body: [{ type: 'connect_sent', lead_urn: 'u1004' }] },
    { method: 'PATCH', urlPattern: rx('/rest/v1/li_prospects?'), body: [{ id: 1004 }] },
    { method: 'POST', urlPattern: rx(`${AIMFOX}/leads:search`), body: [] },
  ]);
  assert.equal(res.status, 0, res.stderr);
  const pages = reqs(res.log, 'GET', '/rest/v1/li_prospects?');
  assert.equal(pages.length, 2);
  assert.ok(pages.every((p) => /order=id/.test(p.url)), 'paged in a stable order');
  assert.deepEqual(reqs(res.log, 'PATCH', '/rest/v1/li_prospects?', 'id=eq.1004').map(bodyOf), [{ status: 'connect_sent' }]);
});

test('a reply on page 2 of the interactions still gets the lead removed from the campaign', () => {
  const home = makeHome();
  const filler = Array.from({ length: 100 }, (_, i) => ({ id: `i${i}`, type: 'connect_sent', lead_urn: `other${i}` }));
  const res = run(home, ['sync'], [
    { method: 'GET', urlPattern: rx('/rest/v1/li_campaign_state?'), body: [] },
    { method: 'GET', urlPattern: rx('/rest/v1/li_prospects?', 'offset=0'), body: [{ id: 2, public_id: 'p2', status: 'welcome_sent', aimfox_lead_urn: 'u2' }] },
    { method: 'GET', urlPattern: rx(`${AIMFOX}/analytics/interactions?`, 'offset=0&'), body: { data: filler, has_more: true } },
    { method: 'GET', urlPattern: rx(`${AIMFOX}/analytics/interactions?`, 'offset=100&'), body: { data: [{ id: 'r1', type: 'message_reply', lead_urn: 'u2' }], has_more: false } },
    { method: 'PATCH', urlPattern: rx('/rest/v1/li_prospects?'), body: [{ id: 2 }] },
    { method: 'DELETE', urlPattern: rx(`${C}/audience/`), body: null },
    { method: 'POST', urlPattern: rx(`${AIMFOX}/leads:search`), body: [] },
  ]);
  assert.equal(res.status, 0, res.stderr);
  assert.equal(reqs(res.log, 'GET', '/analytics/interactions?').length, 2, 'read both pages');
  assert.deepEqual(reqs(res.log, 'PATCH', '/rest/v1/li_prospects?', 'id=eq.2').map(bodyOf), [{ status: 'replied' }]);
  assert.deepEqual(reqs(res.log, 'DELETE', `${C}/audience/`).map((e) => e.url), [`${C}/audience/u2`]);
  assert.deepEqual(bodyOf(reqs(res.log, 'POST', 'leads:search')[0]), { campaign_id: CAMPAIGN, offset: 0, limit: 100 }, 'lead search is paged too');
});
