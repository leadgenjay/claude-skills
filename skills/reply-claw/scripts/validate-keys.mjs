#!/usr/bin/env node
// Validate API keys live. Usage: node validate-keys.mjs --slug=<slug> [--service=anthropic|bison|turso|telegram|all]

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

const SCRIPT_DIR = dirname(decodeURIComponent(import.meta.url.replace('file://', '')));

const args = process.argv.slice(2);
let slug = null;
let service = 'all';

for (const arg of args) {
  if (arg.startsWith('--slug=')) slug = arg.split('=')[1];
  if (arg.startsWith('--service=')) service = arg.split('=')[1];
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

const result = {
  anthropic: null,
  bison: { workspaces: [] },
  turso: null,
  telegram: null,
  all_ok: true,
};

// Validate Anthropic
if (service === 'all' || service === 'anthropic') {
  const key = process.env.ANTHROPIC_API_KEY || env.ANTHROPIC_API_KEY;
  if (!key) {
    result.anthropic = { ok: false, reason: 'ANTHROPIC_API_KEY not found' };
    result.all_ok = false;
  } else {
    try {
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': key,
          'content-type': 'application/json',
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 1,
          messages: [{ role: 'user', content: '.' }],
        }),
      });
      if (r.status === 200) {
        result.anthropic = { ok: true };
      } else {
        result.anthropic = { ok: false, reason: `HTTP ${r.status}` };
        result.all_ok = false;
      }
    } catch (e) {
      result.anthropic = { ok: false, reason: e.message };
      result.all_ok = false;
    }
  }
}

// Validate Bison workspaces
if (service === 'all' || service === 'bison') {
  const workspaces = config.bison?.workspaces || [];
  for (const ws of workspaces) {
    const apiKeyVar = `EMAIL_BISON_${(ws.account_key || '').toUpperCase().replace(/-/g, '_')}_API_KEY`;
    const apiKey = process.env[apiKeyVar] || env[apiKeyVar];
    const baseUrl = ws.base_url || 'https://send.leadgenjay.com/api';

    if (!apiKey) {
      result.bison.workspaces.push({
        account_key: ws.account_key,
        ok: false,
        reason: `${apiKeyVar} not found`,
      });
      result.all_ok = false;
    } else {
      try {
        const r = await fetch(`${baseUrl}/me`, {
          method: 'GET',
          headers: { Authorization: `Bearer ${apiKey}` },
        });
        if (r.status === 200) {
          result.bison.workspaces.push({
            account_key: ws.account_key,
            ok: true,
          });
        } else {
          result.bison.workspaces.push({
            account_key: ws.account_key,
            ok: false,
            reason: `HTTP ${r.status}`,
          });
          result.all_ok = false;
        }
      } catch (e) {
        result.bison.workspaces.push({
          account_key: ws.account_key,
          ok: false,
          reason: e.message,
        });
        result.all_ok = false;
      }
    }
  }
}

// Validate Turso
if (service === 'all' || service === 'turso') {
  const dbUrl = process.env.TURSO_DB_URL || env.TURSO_DB_URL;
  const dbToken = process.env.TURSO_DB_TOKEN || env.TURSO_DB_TOKEN;

  if (!dbUrl || !dbToken) {
    result.turso = { ok: false, reason: 'TURSO_DB_URL or TURSO_DB_TOKEN not found' };
    result.all_ok = false;
  } else {
    try {
      let url = dbUrl.replace(/^libsql:/, 'https:').replace(/\/+$/, '');
      if (!url.endsWith('/v2/pipeline')) url = `${url}/v2/pipeline`;

      const r = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${dbToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: [
            { type: 'execute', stmt: { sql: 'SELECT 1' } },
            { type: 'close' },
          ],
        }),
      });

      if (r.status === 200) {
        result.turso = { ok: true };
      } else {
        result.turso = { ok: false, reason: `HTTP ${r.status}` };
        result.all_ok = false;
      }
    } catch (e) {
      result.turso = { ok: false, reason: e.message };
      result.all_ok = false;
    }
  }
}

// Validate Telegram
if (service === 'all' || service === 'telegram') {
  const botToken = process.env.TELEGRAM_BOT_TOKEN || env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID || env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    result.telegram = { ok: false, reason: 'TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not found' };
    result.all_ok = false;
  } else {
    try {
      // Test getMe
      let r = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
      if (r.status !== 200) {
        result.telegram = { ok: false, reason: 'getMe failed' };
        result.all_ok = false;
      } else {
        // Test sendMessage
        r = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: '✅ reply-claw — validation test (you can ignore this)',
          }),
        });
        if (r.status === 200) {
          result.telegram = { ok: true };
        } else if (r.status === 403) {
          result.telegram = {
            ok: false,
            reason: 'Chat access denied. Open the chat, type /start to your bot, then re-run validation.',
          };
          result.all_ok = false;
        } else {
          result.telegram = { ok: false, reason: `HTTP ${r.status}` };
          result.all_ok = false;
        }
      }
    } catch (e) {
      result.telegram = { ok: false, reason: e.message };
      result.all_ok = false;
    }
  }
}

console.log(JSON.stringify(result, null, 2));
process.exit(result.all_ok ? 0 : 1);
