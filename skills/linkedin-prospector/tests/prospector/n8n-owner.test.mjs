// pipeline_owner "n8n": qualify-export, write-export and push hand off to the n8n workflows.
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeHome, run, reqs } from './helpers.mjs';

for (const cmd of ['qualify-export', 'write-export']) {
  test(`${cmd} exports nobody when n8n owns the pipeline`, () => {
    const home = makeHome({ pipeline_owner: 'n8n' });
    const res = run(home, [cmd], []);
    assert.equal(res.status, 0, res.stderr);
    assert.deepEqual(JSON.parse(res.stdout).prospects, []);
    assert.equal(reqs(res.log, 'GET', 'li_prospects?').length, 0);
  });
}

test('push adds nobody and never reads Aimfox when n8n owns the pipeline', () => {
  const home = makeHome({ pipeline_owner: 'n8n' });
  const res = run(home, ['push'], []);
  assert.equal(res.status, 0, res.stderr);
  assert.match(res.stdout, /n8n owns the Aimfox push/);
  assert.equal(reqs(res.log, 'GET', 'aimfox').length + reqs(res.log, 'POST', 'aimfox').length, 0);
  assert.equal(reqs(res.log, 'PATCH', 'li_prospects?').length, 0);
});
