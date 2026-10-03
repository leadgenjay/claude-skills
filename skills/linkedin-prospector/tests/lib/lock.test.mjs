import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { acquire, release, holder, lockPath } from '../../scripts/lib/lock.mjs';
import { setupEnv } from './_env.mjs';

let env;
afterEach(() => {
  delete process.env.LINKEDIN_LEADGEN_LOCK_TTL_MINUTES;
  env?.cleanup();
});
const alertMock = { method: 'POST', urlPattern: '/rest/v1/li_alerts$', status: 201, body: [{ id: 1 }] };
const MIN = 60 * 1000;

function writeLock(pid, ageMs) {
  fs.writeFileSync(lockPath('run'), JSON.stringify({ pid, startedAt: new Date(Date.now() - ageMs).toISOString() }));
}
const alertKinds = () => env.log().filter((e) => e.url.endsWith('/rest/v1/li_alerts')).map((e) => JSON.parse(e.body).kind);

test('second acquire fails while the lock is held, and succeeds after release', async () => {
  env = setupEnv([alertMock]);
  assert.equal(await acquire('run'), true);
  assert.equal(lockPath('run'), `${env.home}/run.lock`);
  assert.equal(holder('run').pid, process.pid);
  assert.equal(await acquire('run'), false);
  assert.equal(release('run'), true);
  assert.equal(release('run'), false);
  assert.equal(await acquire('run'), true);
  assert.deepEqual(alertKinds(), [], 'no alert for a normal acquire');
});

test('a lock past the 90-minute TTL is replaced and alerts, even if its pid is alive (pids get reused)', async () => {
  env = setupEnv([alertMock]);
  writeLock(process.pid, 91 * MIN);
  assert.equal(await acquire('run'), true);
  assert.equal(holder('run').pid, process.pid);
  assert.ok(Date.now() - Date.parse(holder('run').startedAt) < MIN, 'lock was not rewritten');
  assert.deepEqual(alertKinds(), ['stale_lock']);
  assert.match(env.needsYou(), /stale_lock: Replaced a run lock from .* \(91 minutes old, past the 90-minute limit\)/);
  assert.deepEqual(fs.readdirSync(env.home).filter((f) => f.includes('.stale-')), [], 'stale copy left behind');
});

test('a young lock holds quietly, whatever its pid', async () => {
  env = setupEnv([alertMock]);
  writeLock(999999, 10 * MIN);
  assert.equal(await acquire('run'), false);
  assert.deepEqual(alertKinds(), []);
});

test('refusing because of a lock older than 30 minutes alerts that the loop is stuck', async () => {
  env = setupEnv([alertMock]);
  writeLock(999999, 45 * MIN);
  assert.equal(await acquire('run'), false);
  assert.deepEqual(alertKinds(), ['lock_stuck']);
  assert.match(env.needsYou(), /lock_stuck: A run pass has held its lock for 45 minutes/);
});

test('the TTL is configurable per call and by LINKEDIN_LEADGEN_LOCK_TTL_MINUTES', async () => {
  env = setupEnv([alertMock]);
  writeLock(999999, 20 * MIN);
  assert.equal(await acquire('run'), false);
  assert.equal(await acquire('run', { ttlMinutes: 15 }), true);
  writeLock(999999, 20 * MIN);
  process.env.LINKEDIN_LEADGEN_LOCK_TTL_MINUTES = '15';
  assert.equal(await acquire('run'), true);
  await assert.rejects(acquire('run', { ttlMinutes: 0 }), /TTL/);
});

test('lock names cannot escape the home folder', () => {
  env = setupEnv([]);
  assert.throws(() => lockPath('../x'), /lock name/);
});

test('the home folder is 0700 and the lock, needs-you.md and HTTP log are 0600', async () => {
  env = setupEnv([alertMock]);
  fs.rmSync(env.home, { recursive: true, force: true });
  assert.equal(await acquire('run'), true);
  const mode = (p) => (fs.statSync(p).mode & 0o777).toString(8);
  assert.equal(mode(env.home), '700');
  assert.equal(mode(lockPath('run')), '600');
  env.setMocks([alertMock]); // the mock file went with the deleted folder
  release('run');
  writeLock(999999, 3 * 60 * MIN);
  fs.chmodSync(env.home, 0o755);
  assert.equal(await acquire('run'), true, 'stale lock replaced, which writes an alert');
  assert.equal(mode(env.home), '700', 'an existing loose home folder is tightened');
  assert.equal(mode(`${env.home}/needs-you.md`), '600');
  assert.equal(mode(`${env.home}/http.log`), '600');
  assert.equal(mode(lockPath('run')), '600');
});
