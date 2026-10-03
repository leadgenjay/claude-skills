// The real CLI in a child process, with the real shared library end to end: Supabase and Unipile
// are both served from a static LINKEDIN_LEADGEN_MOCK file, and the request log is the evidence.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

import { CLOSER, U, ACCOUNT, tempHome, baseCfg } from './harness.mjs';

const S = 'https://supa\\.test/rest/v1/';
let home;

beforeEach(() => {
  home = tempHome();
  fs.writeFileSync(path.join(home, 'config.json'), JSON.stringify(baseCfg));
});

function run(args, entries, { cfg, cwdScript = CLOSER } = {}) {
  if (cfg) fs.writeFileSync(path.join(home, 'config.json'), JSON.stringify({ ...baseCfg, ...cfg }));
  const mock = path.join(home, 'mock.json');
  const log = path.join(home, 'http.log');
  fs.writeFileSync(mock, JSON.stringify(entries));
  fs.rmSync(log, { force: true });
  const env = { ...process.env, LINKEDIN_LEADGEN_HOME: home, LINKEDIN_LEADGEN_MOCK: mock, LINKEDIN_LEADGEN_HTTP_LOG: log };
  for (const k of ['UNIPILE_DSN', 'UNIPILE_API_KEY', 'SUPABASE_URL', 'SUPABASE_SERVICE_KEY']) delete env[k];
  const r = spawnSync(process.execPath, [cwdScript, ...args], { env, encoding: 'utf8' });
  const requests = fs.existsSync(log) ? fs.readFileSync(log, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l)) : [];
  return { code: r.status, stdout: r.stdout, stderr: r.stderr, requests };
}

const openAlerts = { method: 'GET', urlPattern: `${S}li_alerts\\?`, status: 200, body: [] };
const alertInsert = { method: 'POST', urlPattern: `${S}li_alerts$`, status: 201, body: [{ id: 1 }] };
const draftRow = { id: 7, prospect_id: 3, kind: 'reply', external_id: 'm-1', target_id: 'c-1', body: 'What does your outbound look like?', status: 'draft', attempts: 0 };

test('auth failure (Unipile 401): exit 2, alert in li_alerts and needs-you.md, no send', () => {
  const r = run(['send'], [
    openAlerts,
    { method: 'POST', urlPattern: `${S}rpc/expire_stuck_sends$`, status: 200, body: [] },
    { method: 'GET', urlPattern: `${S}li_messages\\?`, status: 200, body: [draftRow] },
    { method: 'GET', urlPattern: `${U}accounts$`, status: 401, body: { status: 401, type: 'errors/unauthorized' } },
    alertInsert,
  ]);
  assert.equal(r.code, 2, r.stderr);
  assert.match(r.stderr, /Stopped/);
  assert.ok(!r.requests.some((q) => q.method === 'POST' && /unipile\.test/.test(q.url)), 'no Unipile POST');
  const alertPost = r.requests.find((q) => q.method === 'POST' && /li_alerts$/.test(q.url));
  assert.ok(alertPost, 'alert inserted');
  assert.equal(JSON.parse(alertPost.body).kind, 'auth_failed');
  assert.match(fs.readFileSync(path.join(home, 'needs-you.md'), 'utf8'), /auth_failed/);
});

test('auth failure (Supabase 401) also exits 2', () => {
  const r = run(['inbox-export'], [
    { method: 'GET', urlPattern: `${S}li_alerts\\?`, status: 401, body: { message: 'Invalid API key' } },
    { method: 'GET', urlPattern: `${U}accounts$`, status: 200, body: { items: [{ id: ACCOUNT, sources: [{ status: 'OK' }] }] } },
    { method: 'GET', urlPattern: `${U}chats\\?`, status: 200, body: { items: [{ id: 'c-1', attendee_provider_id: 'p1', timestamp: new Date().toISOString() }] } },
    { method: 'GET', urlPattern: `${U}users/me\\?account_id=`, status: 200, body: { provider_id: 'me', id: 'me' } },
    { method: 'GET', urlPattern: `${U}chats/c-1/attendees$`, status: 200, body: { items: [{ provider_id: 'me', is_self: 1 }, { provider_id: 'p1', is_self: 0 }] } },
    { method: 'GET', urlPattern: `${U}chats/c-1/messages\\?`, status: 200, body: { items: [{ id: 'm1', is_sender: 0, text: 'hi?', timestamp: new Date().toISOString() }] } },
    { method: 'GET', urlPattern: `${S}li_messages\\?`, status: 401, body: { message: 'Invalid API key' } },
    { method: 'POST', urlPattern: `${S}li_alerts$`, status: 401, body: { message: 'Invalid API key' } },
  ]);
  assert.equal(r.code, 2, r.stderr);
  assert.match(r.stderr, /Supabase GET li_messages returned 401/);
  assert.match(fs.readFileSync(path.join(home, 'needs-you.md'), 'utf8'), /auth_failed/);
});

test('draft_only through the real stack: send and comments-post make zero Unipile requests', () => {
  for (const cmd of ['send', 'comments-post']) {
    const r = run([cmd], [openAlerts,
      { method: 'GET', urlPattern: `${S}li_messages\\?`, status: 200, body: [draftRow] },
      { urlPattern: `${U}`, status: 201, body: { message_id: 'x' } }], { cfg: { closer_mode: 'draft_only' } });
    assert.equal(r.code, 0, r.stderr);
    assert.equal(r.requests.filter((q) => /unipile\.test/.test(q.url)).length, 0, cmd);
    assert.equal(r.requests.filter((q) => q.method === 'POST').length, 0, cmd);
    assert.equal(JSON.parse(r.stdout).closer_mode, 'draft_only');
  }
});

test('run-begin prints the ordered stages and refuses a second run; run-end releases', () => {
  const first = run(['run-begin'], [openAlerts]);
  assert.equal(first.code, 0, first.stderr);
  const lines = first.stdout.split('\n');
  const stages = lines.filter((l) => /^\d+\. /.test(l));
  assert.deepEqual(stages.map((l) => l.replace(/^\d+\. ([^:]+):.*$/, '$1')),
    ['prospector sync', 'prospector qualify', 'prospector write', 'prospector push', 'closer inbox', 'closer comments']);
  assert.match(stages[4], /inbox-export ; then .*draft-import <file> ; then .*closer\.mjs" send$/);
  assert.match(stages[5], /comments-export ; then .*comments-import <file> ; then .*comments-post$/);
  assert.ok(!/find-creators|scrape-commenters|booked/.test(first.stdout), 'money-spending and booked steps are never in the loop');
  assert.match(first.stdout, /run-end/);
  assert.ok(fs.existsSync(path.join(home, 'run.lock')));
  const second = run(['run-begin'], [openAlerts]);
  assert.equal(second.code, 1);
  assert.match(second.stderr, /already active/);
  const end = run(['run-end'], [openAlerts]);
  assert.equal(end.code, 0);
  assert.ok(!fs.existsSync(path.join(home, 'run.lock')));
  assert.equal(run(['run-begin'], [openAlerts]).code, 0);
});

test('booked marks the prospect meeting_booked', () => {
  const r = run(['booked', 'https://www.linkedin.com/in/Ana-K/'], [openAlerts,
    { method: 'GET', urlPattern: `${S}li_prospects\\?public_id=eq\\.ana-k`, status: 200, body: [{ id: 3, public_id: 'ana-k', status: 'replied' }] },
    { method: 'PATCH', urlPattern: `${S}li_prospects\\?id=eq\\.3`, status: 200, body: [{ id: 3 }] }]);
  assert.equal(r.code, 0, r.stderr);
  const patch = r.requests.find((q) => q.method === 'PATCH');
  assert.deepEqual(JSON.parse(patch.body), { status: 'meeting_booked' });
});

test('every entry point prints open alerts first', () => {
  const r = run(['alerts'], [{ method: 'GET', urlPattern: `${S}li_alerts\\?`, status: 200,
    body: [{ id: 4, kind: 'escalation', prospect_id: 9, body: 'Tom asked if this is a bot' }] }]);
  assert.equal(r.code, 0);
  assert.match(r.stderr, /1 open alert/);
  assert.match(r.stderr, /#4 escalation \(prospect 9\)/);
  assert.ok(!/Tom asked/.test(r.stderr), 'alert bodies stay out of the output Claude reads');
});

test('setup-check passes with the prospector beside it and working keys', () => {
  const r = run(['setup-check'], [openAlerts,
    { method: 'GET', urlPattern: `${U}accounts$`, status: 200, body: { items: [{ id: ACCOUNT, name: 'Test Account', sources: [{ status: 'OK' }] }] } },
    { method: 'GET', urlPattern: `${S}li_messages\\?`, status: 200, body: [] },
    { method: 'POST', urlPattern: `${S}rpc/daily_count$`, status: 200, body: 0 }]);
  assert.equal(r.code, 0, r.stderr);
  const out = JSON.parse(r.stdout);
  assert.equal(out.ok, true);
  assert.equal(out.unipile_account, 'Test Account');
});

test('setup check refuses with a plain message when linkedin-prospector is not installed beside it', () => {
  const lonely = fs.mkdtempSync(path.join(os.tmpdir(), 'li-lonely-'));
  const script = path.join(lonely, 'skills', 'linkedin-closer', 'scripts', 'closer.mjs');
  fs.mkdirSync(path.dirname(script), { recursive: true });
  fs.copyFileSync(CLOSER, script);
  for (const cmd of ['setup-check', 'send']) {
    const r = run([cmd], [], { cwdScript: script });
    assert.equal(r.code, 1);
    assert.match(r.stderr, /needs the linkedin-prospector skill installed in the same skills folder/);
    assert.equal(r.requests.length, 0);
  }
});
