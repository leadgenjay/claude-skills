// Starting or pausing the Aimfox campaign stays a manual step. PATCH /api/v2/campaigns/:id (which
// takes state ACTIVE|PAUSED) must never be issued by any code path. Two layers:
//   - every CLI run in every test is checked by helpers.run (assertNoCampaignStateChange);
//   - the source is scanned so a PATCH cannot hide in a path no test happens to exercise.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { assertNoCampaignStateChange } from './helpers.mjs';

const SCRIPTS = path.resolve(import.meta.dirname, '../../scripts');
const CLIENT = path.join(SCRIPTS, 'lib', 'aimfox.mjs');

function sourceFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const p = path.join(dir, d.name);
    return d.isDirectory() ? sourceFiles(p) : (p.endsWith('.mjs') ? [p] : []);
  });
}

// The method argument of every call(...) to the v2 helper, as written in the source.
function v2CallMethods(src) {
  return [...src.matchAll(/(?<![\w.])call\(\s*([^,)]+)/g)]
    .filter((m) => !/async function call\($/.test(src.slice(Math.max(0, m.index - 15), m.index + 5)))
    .map((m) => m[1].trim());
}

test('the harness check rejects a PATCH to a v2 campaign and allows the private v1 flow route', () => {
  const v2 = (url) => [{ method: 'PATCH', url }];
  assert.throws(() => assertNoCampaignStateChange(v2('https://api.aimfox.com/api/v2/campaigns/c1')), /forbidden/);
  assert.throws(() => assertNoCampaignStateChange(v2('https://api.aimfox.com/api/v2/campaigns/c1?x=1')), /forbidden/);
  assert.doesNotThrow(() => assertNoCampaignStateChange(v2('https://api.aimfox.com/api/v1/workspaces/ws1/campaigns/c1/flows/11')));
  assert.doesNotThrow(() => assertNoCampaignStateChange([{ method: 'GET', url: 'https://api.aimfox.com/api/v2/campaigns/c1' }]));
});

test('the scanner sees through a PATCH written into the v2 client', () => {
  const planted = "async function call(method, path, body) {}\nawait call('PATCH', `/campaigns/${id}`, { state: 'ACTIVE' });";
  assert.ok(v2CallMethods(planted).some((m) => /PATCH/.test(m)));
  assert.deepEqual(v2CallMethods("privateCall(step.method, p); await call('GET', '/x');"), ["'GET'"]);
});

test('every v2 call in the Aimfox client uses a literal GET, POST or DELETE', () => {
  const methods = v2CallMethods(fs.readFileSync(CLIENT, 'utf8'));
  assert.ok(methods.length >= 10, `found ${methods.length} calls; the scan is not seeing the client`);
  const bad = methods.filter((m) => !["'GET'", "'POST'", "'DELETE'"].includes(m));
  assert.deepEqual(bad, [], 'a PATCH (or a computed method, which could become one) on the v2 API');
});

test('only the Aimfox client talks to the v2 API, and its raw requests go through call() or to v1', () => {
  for (const file of sourceFiles(SCRIPTS)) {
    if (file === CLIENT) continue;
    const src = fs.readFileSync(file, 'utf8');
    assert.ok(!/api\.aimfox\.com\/api\/v2|AIMFOX_BASE/.test(src), `${path.relative(SCRIPTS, file)} reaches the v2 API directly`);
  }
  const client = fs.readFileSync(CLIENT, 'utf8');
  const raw = [...client.matchAll(/\brequest\(\s*([^,]+),\s*([^,]+),/g)].map((m) => m[2].trim());
  assert.ok(raw.length >= 1);
  for (const url of raw) {
    assert.ok(url === '`${AIMFOX_BASE}${path}`' || url.startsWith('`https://api.aimfox.com/api/v1'), `unexpected raw request to ${url}`);
  }
});
