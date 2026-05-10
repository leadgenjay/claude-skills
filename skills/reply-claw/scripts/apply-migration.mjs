#!/usr/bin/env node
// Apply Turso migrations. Usage: node apply-migration.mjs --slug=<slug>

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { readdirSync } from 'node:fs';

const SCRIPT_DIR = dirname(decodeURIComponent(import.meta.url.replace('file://', '')));

const args = process.argv.slice(2);
let slug = null;

for (const arg of args) {
  if (arg.startsWith('--slug=')) slug = arg.split('=')[1];
}

if (!slug) {
  console.error('Error: --slug required');
  process.exit(1);
}

const configFile = resolve(SCRIPT_DIR, '..', 'tenants', slug, 'config.json');
let config;
try {
  config = JSON.parse(readFileSync(configFile, 'utf8'));
} catch (e) {
  console.error(`Error: Cannot read config: ${configFile}`);
  process.exit(1);
}

const envFile = resolve(SCRIPT_DIR, '..', 'tenants', slug, 'tenant.env');
const env = {};
try {
  readFileSync(envFile, 'utf8')
    .split('\n')
    .forEach(line => {
      const [k, v] = line.split('=');
      if (k && v) env[k.trim()] = v.trim();
    });
} catch (e) {
  // env file might not exist yet
}

const dbUrl = process.env.TURSO_DB_URL || env.TURSO_DB_URL;
const dbToken = process.env.TURSO_DB_TOKEN || env.TURSO_DB_TOKEN;

if (!dbUrl || !dbToken) {
  console.error('Error: TURSO_DB_URL or TURSO_DB_TOKEN not configured');
  process.exit(1);
}

let pipelineUrl = dbUrl.replace(/^libsql:/, 'https:').replace(/\/+$/, '');
if (!pipelineUrl.endsWith('/v2/pipeline')) pipelineUrl = `${pipelineUrl}/v2/pipeline`;

async function runSql(sql) {
  const r = await fetch(pipelineUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${dbToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      requests: [
        { type: 'execute', stmt: { sql } },
        { type: 'close' },
      ],
    }),
  });

  if (!r.ok) {
    const text = await r.text();
    throw new Error(`HTTP ${r.status}: ${text.slice(0, 200)}`);
  }

  const j = await r.json();
  const result = j.results?.[0];
  if (result?.error) throw new Error(`SQL: ${result.error.message}`);
  return result?.response;
}

async function applyMigrations() {
  const migrationsDir = resolve(SCRIPT_DIR, '..', 'runtime', 'migrations');
  const files = readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  // Create migrations tracking table if not exists
  await runSql(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id INTEGER PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      applied_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `).catch(() => null); // ignore if it already exists

  const applied = [];
  const skipped = [];

  for (const file of files) {
    // Check if already applied
    let alreadyApplied = false;
    try {
      const check = await runSql(`SELECT 1 FROM _migrations WHERE name='${file}'`);
      alreadyApplied = check?.result?.rows?.length > 0;
    } catch (e) {
      // table might not exist yet
    }

    if (alreadyApplied) {
      skipped.push(file);
      continue;
    }

    const filePath = resolve(migrationsDir, file);
    const sql = readFileSync(filePath, 'utf8');

    // Split on semicolons, execute each statement
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    for (const stmt of statements) {
      await runSql(stmt);
    }

    // Record migration
    await runSql(`INSERT INTO _migrations (name) VALUES ('${file.replace(/'/g, "''")}')`);
    applied.push(file);
  }

  return { applied, skipped };
}

try {
  const { applied, skipped } = await applyMigrations();
  console.log(JSON.stringify({
    ok: true,
    applied,
    skipped,
  }));
} catch (e) {
  console.error(`Error: ${e.message}`);
  process.exit(1);
}
