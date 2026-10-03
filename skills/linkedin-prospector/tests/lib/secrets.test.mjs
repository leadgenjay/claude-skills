import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { assertNoSecrets, findSecrets, SecretLeakError } from '../../scripts/lib/secrets.mjs';
import { setupEnv } from './_env.mjs';

let env;
afterEach(() => {
  delete process.env.UNIPILE_API_KEY;
  env?.cleanup();
});

test('clean text passes through unchanged', () => {
  env = setupEnv();
  const text = 'Loved your take on reply rates. What are you testing next quarter?';
  assert.equal(assertNoSecrets(text), text);
  assert.deepEqual(findSecrets(text), []);
});

test('any .env value of 8+ characters is refused, and the error never repeats it', () => {
  env = setupEnv();
  fs.writeFileSync(path.join(env.home, '.env'), 'UNIPILE_API_KEY=unipile-live-key-123\n');
  assert.throws(() => assertNoSecrets('here you go: unipile-live-key-123', 'reply to chat 9'), (err) => {
    assert.ok(err instanceof SecretLeakError);
    assert.match(err.message, /^refused: reply to chat 9 contains the value of UNIPILE_API_KEY$/);
    assert.ok(!err.message.includes('unipile-live-key-123'));
    return true;
  });
  // the service key set by the harness is caught the same way
  assert.deepEqual(findSecrets('x service-key-for-tests x'), ['the value of SUPABASE_SERVICE_KEY']);
});

test('a key disguised with spaces, hyphens or a line break is still refused', () => {
  env = setupEnv();
  process.env.UNIPILE_API_KEY = 'Xk9PqLm2Vt7Rz4Wb';
  const disguises = {
    spaced: 'my key is X k 9 P q L m 2 V t 7 R z 4 W b ok',
    hyphens: 'try xk9p-qlm2-vt7r-z4wb please',
    'line break': 'first half Xk9PqLm2\nVt7Rz4Wb second half',
    'mixed punctuation': 'X.k.9_P q-L/m 2:V t*7 R z 4 W b',
  };
  for (const [how, text] of Object.entries(disguises)) {
    assert.deepEqual(findSecrets(text), ['the value of UNIPILE_API_KEY'], how);
    assert.throws(() => assertNoSecrets(text, how), SecretLeakError, how);
  }
});

test('ordinary prose passes the normalized check', () => {
  env = setupEnv();
  process.env.UNIPILE_API_KEY = 'Xk9PqLm2Vt7Rz4Wb';
  const prose = [
    'Loved your post on cold outreach. Are you hiring SDRs this quarter, or keeping it lean?',
    "Thanks for the comment! What's working best for you: LinkedIn, email or both?",
    'We booked 14 calls in 30 days, mostly from replies like yours. Worth a quick chat?',
  ];
  for (const text of prose) assert.deepEqual(findSecrets(text), [], text);
});

test('values under 12 characters once normalized are only matched exactly', () => {
  env = setupEnv();
  process.env.UNIPILE_API_KEY = 'ab-cd-ef-12';
  assert.deepEqual(findSecrets('see a b c d e f 1 2'), []);
  assert.deepEqual(findSecrets('raw ab-cd-ef-12 here'), ['the value of UNIPILE_API_KEY']);
});

test('values shorter than 8 characters are not treated as secrets', () => {
  env = setupEnv();
  process.env.UNIPILE_API_KEY = 'short';
  assert.doesNotThrow(() => assertNoSecrets('this is short and fine'));
});

test('token shapes are refused even when they are not in .env', () => {
  env = setupEnv();
  const cases = {
    'apify_api_AbCdEf123': 'an Apify token',
    'sb_secret_xyz': 'a Supabase secret key',
    'sk-abcdefghijklmnop1234': 'an API key (sk-...)',
    'eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoic2VydmljZSJ9.sig': 'a JWT',
  };
  for (const [token, name] of Object.entries(cases)) {
    assert.deepEqual(findSecrets(`look: ${token}`), [name], token);
    assert.throws(() => assertNoSecrets(`look: ${token}`), SecretLeakError);
  }
  assert.doesNotThrow(() => assertNoSecrets('a task-list or sk-short is fine'));
});

test('non-string input is checked as JSON', () => {
  env = setupEnv();
  assert.throws(() => assertNoSecrets({ welcome: 'key sb_secret_abc' }), SecretLeakError);
});
