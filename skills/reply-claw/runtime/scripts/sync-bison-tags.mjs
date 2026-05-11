#!/usr/bin/env node
// FORKED FROM: bison-replies/scripts/sync-bison-tags.mjs
// reply-claw: bootstrap the 8 custom funnel tags per Bison workspace per tenant.
// Idempotent — safe to re-run. Iterates all cfg.bison.workspaces[].
//
// Usage:
//   RC_TENANT_CONFIG=/path/to/config.json node sync-bison-tags.mjs
//   RC_TENANT_CONFIG=... node sync-bison-tags.mjs --account lgj
//
// Caches tag_name → tag_id map to Turso agent_state under key
// `bison_tag_ids:{tenant_slug}:{account_key}` per workspace.

import fs from 'fs';

const env = process.env;

// The 8 funnel tags. Exclusivity: only one of these attaches to a lead at a time.
export const FUNNEL_TAGS = [
  'Interested',
  'Hard No',
  'Soft No',
  'Auto Reply',
  'Follow up 7d',
  'Follow up 30d',
  'Booked',
  'Lead Magnet',
];

function logErr(msg) {
  process.stderr.write(`[sync-tags] ${msg}\n`);
}

// Load tenant config
let cfg = null;
try {
  const cfgPath = env.RC_TENANT_CONFIG;
  if (!cfgPath) throw new Error('RC_TENANT_CONFIG env var not set');
  cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
  if (!cfg.tenant_slug) throw new Error('tenant_slug missing from config');
} catch (e) {
  logErr(`config load failed: ${e.message}`);
  process.exit(1);
}

const TENANT_SLUG = cfg.tenant_slug;
const BISON_BASE = cfg.bison?.base_url || 'https://send.leadgenjay.com/api';
const TURSO_DB_URL = cfg.turso?.db_url;
const TURSO_TOKEN = cfg.turso?.token || env.TURSO_DB_TOKEN;

const tursoPipeline = (() => {
  let u = TURSO_DB_URL || '';
  if (!u) return null;
  u = u.replace(/^libsql:/, 'https:').replace(/\/+$/, '');
  return u.endsWith('/v2/pipeline') ? u : `${u}/v2/pipeline`;
})();

const sqlEsc = (s) => String(s).replace(/'/g, "''");

async function turso(sql) {
  if (!tursoPipeline || !TURSO_TOKEN) throw new Error('turso db url/token missing');
  const r = await fetch(tursoPipeline, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TURSO_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ requests: [{ type: 'execute', stmt: { sql } }, { type: 'close' }] }),
  });
  if (!r.ok) throw new Error(`turso HTTP ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const j = await r.json();
  const result = j.results?.[0];
  if (result?.error) throw new Error(`turso: ${result.error.message}`);
}

async function bison(method, path, key, body) {
  const r = await fetch(`${BISON_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const txt = await r.text();
  let j;
  try { j = txt ? JSON.parse(txt) : {}; } catch { j = { _raw: txt.slice(0, 200) }; }
  if (!r.ok) throw new Error(`bison ${method} ${path} HTTP ${r.status}: ${JSON.stringify(j).slice(0, 200)}`);
  return j;
}

async function listTags(key) {
  const byLower = new Map();
  const j = await bison('GET', `/tags?page=1&per_page=200`, key);
  for (const t of (j.data || [])) byLower.set(String(t.name).toLowerCase(), { id: t.id, name: t.name });
  return byLower;
}

async function ensureTagsForWorkspace(account_key, key) {
  logErr(`${TENANT_SLUG}/${account_key}: listing existing tags…`);
  const existing = await listTags(key);
  logErr(`${TENANT_SLUG}/${account_key}: ${existing.size} tags already exist`);

  const finalMap = {};
  for (const name of FUNNEL_TAGS) {
    const lower = name.toLowerCase();
    const hit = existing.get(lower);
    if (hit) {
      finalMap[name] = hit.id;
      if (hit.name !== name) {
        logErr(`${TENANT_SLUG}/${account_key}: reusing existing "${hit.name}" (id=${hit.id}) for canonical "${name}"`);
      }
      continue;
    }
    logErr(`${TENANT_SLUG}/${account_key}: creating tag "${name}"…`);
    const j = await bison('POST', '/tags', key, { name });
    const id = j.data?.id || j.id;
    if (!id) throw new Error(`tag creation returned no id for "${name}": ${JSON.stringify(j).slice(0, 200)}`);
    finalMap[name] = id;
    existing.set(lower, { id, name });
  }

  const cacheKey = `bison_tag_ids:${TENANT_SLUG}:${account_key}`;
  const value = JSON.stringify(finalMap);
  await turso(
    `INSERT INTO agent_state(tenant_slug, key, value) VALUES('${sqlEsc(TENANT_SLUG)}','${sqlEsc(cacheKey)}','${sqlEsc(value)}') ` +
      `ON CONFLICT(tenant_slug, key) DO UPDATE SET value='${sqlEsc(value)}', updated_at=datetime('now')`
  );
  logErr(`${TENANT_SLUG}/${account_key}: cached tag map → ${JSON.stringify(finalMap)}`);
  return finalMap;
}

async function main() {
  const argAccount = (() => {
    const i = process.argv.indexOf('--account');
    return i >= 0 ? process.argv[i + 1] : null;
  })();

  const workspaces = (cfg.bison?.workspaces || [])
    .filter((w) => w.api_key && (!argAccount || w.account_key === argAccount));
  if (workspaces.length === 0) {
    logErr('no workspaces to sync (check --account flag and config.bison.workspaces[].api_key)');
    process.exit(1);
  }

  const summary = {};
  for (const w of workspaces) {
    try {
      summary[w.account_key] = await ensureTagsForWorkspace(w.account_key, w.api_key);
    } catch (e) {
      logErr(`${w.account_key}: FAILED — ${e.message}`);
      summary[w.account_key] = { error: e.message };
    }
  }
  process.stdout.write(JSON.stringify({ ok: true, tenant_slug: TENANT_SLUG, summary }, null, 2) + '\n');
}

import { fileURLToPath } from 'url';
import { realpathSync } from 'fs';
const isMain = (() => {
  try {
    return realpathSync(fileURLToPath(import.meta.url)) === realpathSync(process.argv[1]);
  } catch {
    return true;
  }
})();
if (isMain) {
  main().catch((e) => { logErr(`fatal: ${e.message}`); process.exit(1); });
}
