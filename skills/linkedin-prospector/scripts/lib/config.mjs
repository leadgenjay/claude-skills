// Config and secrets for both skills.
// Home: $LINKEDIN_LEADGEN_HOME, default ~/.linkedin-lead-system/, holding config.json, .env,
// needs-you.md and run.lock.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export const DEFAULTS = Object.freeze({
  per_run_cap_usd: 10,
  total_cap_usd: 25,
  creators_top_n: 10,
  posts_per_creator: 10,
  top_posts: 30,
  comments_per_post: 60,
  qualify_threshold: 60,
  offer_url: '',
  closer_mode: 'send',
  reply_scope: 'campaign_only',
  closer_replies_per_day: 50,
  comment_replies_per_day: 25,
});

export const SECRET_KEYS = Object.freeze([
  'APIFY_TOKEN',
  'SUPABASE_URL',
  'SUPABASE_SERVICE_KEY',
  'AIMFOX_API_KEY',
  'UNIPILE_DSN',
  'UNIPILE_API_KEY',
]);

const ENUMS = {
  closer_mode: ['send', 'draft_only'],
  reply_scope: ['campaign_only', 'all'],
};
const POSITIVE_NUMBERS = ['per_run_cap_usd', 'total_cap_usd'];
const POSITIVE_INTEGERS = ['creators_top_n', 'posts_per_creator', 'top_posts', 'comments_per_post',
  'closer_replies_per_day', 'comment_replies_per_day'];
const STRINGS = ['offer', 'offer_url', 'icp_description', 'booking_link', 'self_profile_url',
  'aimfox_campaign_id', 'unipile_account_id'];
const STRING_LISTS = ['niche_keywords', 'disqualifiers', 'tone_samples', 'creator_urls'];

export class ConfigError extends Error {
  constructor(problems) {
    super(`config problem: ${problems.join('; ')}`);
    this.name = 'ConfigError';
    this.problems = problems;
  }
}

export function homeDir() {
  return process.env.LINKEDIN_LEADGEN_HOME || path.join(os.homedir(), '.linkedin-lead-system');
}

// Creates the home folder readable by this user only, and tightens it if it already exists.
export function ensureHome() {
  const dir = homeDir();
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  fs.chmodSync(dir, 0o700);
  return dir;
}

export function configPath() {
  return path.join(homeDir(), 'config.json');
}

export function loadConfig() {
  const file = configPath();
  let raw;
  try {
    raw = fs.readFileSync(file, 'utf8');
  } catch (err) {
    if (err.code === 'ENOENT') throw new ConfigError([`no config at ${file}; run setup first`]);
    throw err;
  }
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new ConfigError([`${file} is not valid JSON (${err.message})`]);
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new ConfigError([`${file} must hold a JSON object`]);
  }
  // keys starting with "_" are notes in the file (_comment, _help) and are dropped
  const settings = Object.fromEntries(Object.entries(parsed).filter(([k]) => !k.startsWith('_')));
  return validateConfig({ ...DEFAULTS, ...settings });
}

export function validateConfig(cfg) {
  const problems = [];
  for (const [key, allowed] of Object.entries(ENUMS)) {
    if (!allowed.includes(cfg[key])) problems.push(`${key} must be one of ${allowed.join(', ')}`);
  }
  for (const key of POSITIVE_NUMBERS) {
    if (typeof cfg[key] !== 'number' || !(cfg[key] > 0)) problems.push(`${key} must be a number above 0`);
  }
  for (const key of POSITIVE_INTEGERS) {
    if (!Number.isInteger(cfg[key]) || cfg[key] < 1) problems.push(`${key} must be a whole number of at least 1`);
  }
  if (!Number.isInteger(cfg.qualify_threshold) || cfg.qualify_threshold < 0 || cfg.qualify_threshold > 100) {
    problems.push('qualify_threshold must be a whole number from 0 to 100');
  }
  if (problems.length === 0 && cfg.per_run_cap_usd > cfg.total_cap_usd) {
    problems.push('per_run_cap_usd cannot be larger than total_cap_usd');
  }
  for (const key of STRINGS) {
    if (cfg[key] !== undefined && cfg[key] !== null && typeof cfg[key] !== 'string') {
      problems.push(`${key} must be text`);
    }
  }
  for (const key of STRING_LISTS) {
    if (cfg[key] !== undefined && cfg[key] !== null
        && !(Array.isArray(cfg[key]) && cfg[key].every((v) => typeof v === 'string'))) {
      problems.push(`${key} must be a list of text`);
    }
  }
  if (problems.length) throw new ConfigError(problems);
  return Object.freeze(cfg);
}

// Reads <home>/.env into process.env without overwriting variables already set, and returns
// the secret keys that are present. Values are never printed.
export function loadEnv() {
  const file = path.join(homeDir(), '.env');
  let text = '';
  try {
    text = fs.readFileSync(file, 'utf8');
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
  }
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!m) continue;
    let value = m[2];
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (process.env[m[1]] === undefined) process.env[m[1]] = value;
  }
  const env = {};
  for (const key of SECRET_KEYS) {
    if (process.env[key]) env[key] = process.env[key];
  }
  return env;
}

// Throws a plain message naming any missing secret, never the values of present ones.
export function requireEnv(...keys) {
  const env = loadEnv();
  const missing = keys.filter((k) => !env[k] && !process.env[k]);
  if (missing.length) {
    throw new ConfigError([`missing ${missing.join(', ')} in ${path.join(homeDir(), '.env')}`]);
  }
  return Object.fromEntries(keys.map((k) => [k, process.env[k]]));
}
