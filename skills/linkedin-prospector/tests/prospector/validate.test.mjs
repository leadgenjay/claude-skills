import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// The secret check reads <home>/.env; point it at an empty temp home, never the real one.
const HOME = fs.mkdtempSync(path.join(os.tmpdir(), 'li-validate-test-'));
process.env.LINKEDIN_LEADGEN_HOME = HOME;
process.on('exit', () => fs.rmSync(HOME, { recursive: true, force: true }));
import { validateWelcome, validateWriteRow, containsUrl, WELCOME_MAX_CHARS } from '../../scripts/validate.mjs';

test('a 400-character welcome passes and 401 is rejected', () => {
  assert.equal(WELCOME_MAX_CHARS, 400);
  assert.equal(validateWelcome('a'.repeat(400)).ok, true);
  const r = validateWelcome('a'.repeat(401));
  assert.equal(r.ok, false);
  assert.match(r.errors.join(), /401 characters/);
});

test('a URL is rejected', () => {
  for (const t of ['See https://example.com/x for more', 'go to http://foo.bar', 'check www.mysite.org today']) {
    assert.equal(validateWelcome(t).ok, false, t);
  }
});

test('a bare domain is rejected', () => {
  for (const t of ['grab it at foo.com, then tell me', 'it lives on mytool.io', 'see acme.co/pricing']) {
    assert.equal(validateWelcome(t).ok, false, t);
  }
});

test('ordinary text with dots and slashes is not mistaken for a link', () => {
  for (const t of ['Loved your Node.js take. Rated it 7.5/10, e.g. the part on hooks. Fair?', 'and/or works too. Thoughts?']) {
    assert.equal(containsUrl(t), false, t);
  }
});

test('empty and template-brace messages are rejected', () => {
  assert.equal(validateWelcome('').ok, false);
  assert.equal(validateWelcome('   ').ok, false);
  assert.equal(validateWelcome(undefined).ok, false);
  assert.equal(validateWelcome('Hi {{first_name}}, how is it going?').ok, false);
});

test('a write row never carries a connect_note, even an empty one', () => {
  assert.equal(validateWriteRow({ id: 1, welcome_message: 'Hi, how are things?' }).ok, true);
  const r = validateWriteRow({ id: 1, welcome_message: 'Hi, how are things?', connect_note: '' });
  assert.equal(r.ok, false);
  assert.match(r.errors.join(), /connect_note/);
  assert.equal(validateWriteRow({ id: 'x', welcome_message: 'Hi?' }).ok, false);
});

test('a welcome carrying a secret is rejected, without echoing it', () => {
  process.env.APIFY_TOKEN = 'apify-live-token-0123456789';
  try {
    const leak = validateWelcome('Quick one: does apify-live-token-0123456789 ring a bell?');
    assert.equal(leak.ok, false);
    assert.match(leak.errors.join(), /the value of APIFY_TOKEN/);
    assert.ok(!leak.errors.join().includes('0123456789'), 'the error never repeats the secret');
    const shaped = validateWelcome('Is sb_secret_x the key you meant?');
    assert.equal(shaped.ok, false);
    assert.match(shaped.errors.join(), /Supabase secret key/);
  } finally {
    delete process.env.APIFY_TOKEN;
  }
});
