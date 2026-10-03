import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { loadConfig, loadEnv, requireEnv, homeDir, DEFAULTS, ConfigError } from '../../scripts/lib/config.mjs';
import { setupEnv } from './_env.mjs';

let env;
afterEach(() => env?.cleanup());

test('homeDir follows LINKEDIN_LEADGEN_HOME', () => {
  env = setupEnv();
  assert.equal(homeDir(), env.home);
});

test('loadConfig fills the plan defaults', () => {
  env = setupEnv([], { config: { offer: 'Audit', niche_keywords: ['cold email'] } });
  const cfg = loadConfig();
  assert.equal(cfg.per_run_cap_usd, 10);
  assert.equal(cfg.total_cap_usd, 25);
  assert.equal(cfg.creators_top_n, 10);
  assert.equal(cfg.closer_mode, 'send');
  assert.equal(cfg.reply_scope, 'campaign_only');
  assert.equal(cfg.closer_replies_per_day, 50);
  assert.equal(cfg.comment_replies_per_day, 25);
  assert.equal(cfg.offer, 'Audit');
  assert.equal(cfg.posts_per_creator, 10);
  assert.equal(cfg.top_posts, 30);
  assert.equal(cfg.comments_per_post, 60);
  assert.equal(cfg.qualify_threshold, 60);
  assert.equal(cfg.offer_url, '');
  assert.deepEqual(Object.keys(DEFAULTS).sort(), [
    'closer_mode', 'closer_replies_per_day', 'comment_replies_per_day', 'comments_per_post',
    'creators_top_n', 'offer_url', 'per_run_cap_usd', 'posts_per_creator', 'qualify_threshold',
    'reply_scope', 'top_posts', 'total_cap_usd']);
});

test('keys starting with "_" are notes: dropped, never rejected', () => {
  env = setupEnv([], { config: { _comment: 'hi', _help: { offer: 'x' }, offer: 'Audit' } });
  const cfg = loadConfig();
  assert.equal(cfg._comment, undefined);
  assert.equal(cfg._help, undefined);
  assert.equal(cfg.offer, 'Audit');
});

test('the shipped config.example.json loads as-is', () => {
  env = setupEnv();
  const example = new URL('../../config.example.json', import.meta.url);
  if (!fs.existsSync(example)) return;
  fs.copyFileSync(example, path.join(env.home, 'config.json'));
  const cfg = loadConfig();
  assert.equal(cfg.per_run_cap_usd, 10);
  assert.equal(cfg._help, undefined);
});

test('qualify_threshold must be 0 to 100', () => {
  env = setupEnv([], { config: { qualify_threshold: 101 } });
  assert.throws(() => loadConfig(), /qualify_threshold/);
});

test('loadConfig refuses bad values with every problem listed', () => {
  env = setupEnv([], { config: { closer_mode: 'yolo', reply_scope: 'everyone', per_run_cap_usd: -1, creators_top_n: 2.5, niche_keywords: 'x' } });
  assert.throws(() => loadConfig(), (err) => {
    assert.ok(err instanceof ConfigError);
    assert.equal(err.problems.length, 5);
    return true;
  });
});

test('loadConfig refuses a per-run cap above the total cap', () => {
  env = setupEnv([], { config: { per_run_cap_usd: 30, total_cap_usd: 25 } });
  assert.throws(() => loadConfig(), /per_run_cap_usd cannot be larger/);
});

test('loadConfig with no file tells the user to run setup', () => {
  env = setupEnv();
  assert.throws(() => loadConfig(), /run setup first/);
});

test('loadEnv reads .env without overwriting set variables and returns only secret keys', () => {
  env = setupEnv();
  delete process.env.APIFY_TOKEN;
  delete process.env.UNIPILE_DSN;
  fs.writeFileSync(path.join(env.home, '.env'),
    '# comment\nAPIFY_TOKEN="apify-abc"\nexport UNIPILE_DSN=api1.unipile.com:13111\nSUPABASE_URL=https://other.supabase.co\nOTHER=1\n');
  const got = loadEnv();
  assert.equal(got.APIFY_TOKEN, 'apify-abc');
  assert.equal(got.UNIPILE_DSN, 'api1.unipile.com:13111');
  assert.equal(got.SUPABASE_URL, 'https://test-project.supabase.co', 'an already-set variable was overwritten');
  assert.equal(got.OTHER, undefined);
  delete process.env.APIFY_TOKEN;
  delete process.env.UNIPILE_DSN;
});

test('requireEnv names what is missing and never prints a value', () => {
  env = setupEnv();
  delete process.env.AIMFOX_API_KEY;
  assert.throws(() => requireEnv('SUPABASE_SERVICE_KEY', 'AIMFOX_API_KEY'), (err) => {
    assert.match(err.message, /missing AIMFOX_API_KEY/);
    assert.ok(!err.message.includes('service-key-for-tests'));
    return true;
  });
});
