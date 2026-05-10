#!/usr/bin/env node
// FORKED FROM: bison-replies/scripts/slash-command-handler.mjs @ commit ba00377
// reply-claw: Multi-tenant slash-command handler. Runs every minute via host crontab.
//
// Polls nanoclaw's messages.db for new chat messages matching /approve, /skip, /edit,
// /mute, /agent commands. Executes the action and posts confirmation to Telegram.
//
// Loads multi-tenant config from RC_TENANT_CONFIG JSON file.
// Tenant slug is used for scoping agent_replies and agent_state queries.
//
// Env required:
//   RC_TENANT_CONFIG — path to tenant config JSON
//
// Tenant config schema (JSON):
//   {
//     "tenant_slug": "lgj",
//     "telegram": { "bot_token": "...", "chat_id": "123" },
//     "turso": { "db_url": "libsql://...", "token": "..." },
//     "nanoclaw": { "messages_db": "/app/store/messages.db", "chat_jid": "tg:123" }
//   }

import { spawnSync, execFileSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));

function logErr(msg) {
  process.stderr.write(`[slash-cmd] ${msg}\n`);
}

// Load tenant config
let cfg = null;
try {
  const cfgPath = process.env.RC_TENANT_CONFIG;
  if (!cfgPath) throw new Error('RC_TENANT_CONFIG env var not set');
  const raw = fs.readFileSync(cfgPath, 'utf8');
  cfg = JSON.parse(raw);
  if (!cfg.tenant_slug) throw new Error('tenant_slug missing from config');
} catch (e) {
  logErr(`config load failed: ${e.message}`);
  process.exit(1);
}

const TENANT_SLUG = cfg.tenant_slug;
const MESSAGES_DB = cfg.nanoclaw?.messages_db || '/app/store/messages.db';
const CHAT_JID = cfg.nanoclaw?.chat_jid || `tg:${cfg.telegram?.chat_id || '0'}`;

const tursoPipeline = (() => {
  let u = cfg.turso?.db_url || '';
  if (!u) return null;
  u = u.replace(/^libsql:/, 'https:').replace(/\/+$/, '');
  return u.endsWith('/v2/pipeline') ? u : `${u}/v2/pipeline`;
})();

const TURSO_TOKEN = cfg.turso?.token;

async function turso(sql) {
  if (!tursoPipeline || !TURSO_TOKEN) {
    throw new Error('TURSO_DB_URL / TURSO_DB_TOKEN missing in config');
  }
  const r = await fetch(tursoPipeline, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${TURSO_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      requests: [{ type: 'execute', stmt: { sql } }, { type: 'close' }],
    }),
  });
  if (!r.ok) throw new Error(`turso HTTP ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const j = await r.json();
  const result = j.results?.[0];
  if (result?.error) throw new Error(`turso: ${result.error.message}`);
  const res = result?.response?.result;
  if (!res) return { cols: [], rows: [] };
  return {
    cols: (res.cols || []).map((c) => c.name),
    rows: (res.rows || []).map((row) => row.map((c) => (c.type === 'null' ? null : c.value))),
  };
}

const sqlEsc = (s) => String(s).replace(/'/g, "''");

async function getState(key) {
  const { rows } = await turso(
    `SELECT value FROM agent_state WHERE tenant_slug='${sqlEsc(TENANT_SLUG)}' AND key='${sqlEsc(key)}' LIMIT 1`
  );
  return rows[0]?.[0] ?? null;
}

async function setState(key, value) {
  const k = sqlEsc(key), v = sqlEsc(value);
  await turso(
    `INSERT INTO agent_state(tenant_slug, key, value) VALUES('${sqlEsc(TENANT_SLUG)}','${k}','${v}') ` +
    `ON CONFLICT(tenant_slug, key) DO UPDATE SET value='${v}', updated_at=datetime('now')`
  );
}

function readNewMessages(sinceId) {
  // sqlite3 CLI; nanoclaw `id` is text — compare lexicographically AND cast to int.
  const sinceInt = parseInt(sinceId || '0', 10) || 0;
  const sql = `SELECT id, content, timestamp FROM messages
    WHERE chat_jid='${sqlEsc(CHAT_JID)}'
      AND is_from_me=0 AND is_bot_message=0
      AND CAST(id AS INTEGER) > ${sinceInt}
      AND (content LIKE '/approve%' OR content LIKE '/skip%' OR content LIKE '/edit%' OR content LIKE '/mute%' OR content LIKE '/agent%')
    ORDER BY CAST(id AS INTEGER) ASC`;
  const out = execFileSync('sqlite3', ['-separator', '\t', MESSAGES_DB, sql], { encoding: 'utf8' });
  if (!out.trim()) return [];
  return out.trim().split('\n').map((line) => {
    const [id, ...rest] = line.split('\t');
    const ts = rest.pop();
    const content = rest.join('\t');
    return { id, content, timestamp: ts };
  });
}

async function postTelegram(text) {
  if (!cfg.telegram?.bot_token || !cfg.telegram?.chat_id) {
    logErr('TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID missing — skipping post');
    return;
  }
  const r = await fetch(`https://api.telegram.org/bot${cfg.telegram.bot_token}/sendMessage`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      chat_id: cfg.telegram.chat_id,
      text,
      disable_web_page_preview: true,
    }),
  });
  if (!r.ok) logErr(`telegram ${r.status}: ${(await r.text()).slice(0, 200)}`);
}

async function lookupReply(bisonReplyId) {
  const sql =
    `SELECT account_key, bison_reply_id, draft_body, state FROM agent_replies ` +
    `WHERE tenant_slug='${sqlEsc(TENANT_SLUG)}' AND bison_reply_id='${sqlEsc(bisonReplyId)}' LIMIT 1`;
  const { rows } = await turso(sql);
  if (rows.length === 0) return null;
  return { account_key: rows[0][0], bison_reply_id: rows[0][1], draft_body: rows[0][2], state: rows[0][3] };
}

function runSendScript(account_key, bison_reply_id, body) {
  const script = path.join(SCRIPT_DIR, 'send-bison-reply.sh');
  const result = spawnSync(script, [
    '--account', account_key,
    '--reply-id', String(bison_reply_id),
    '--body', body,
    '--content-type', 'html',
  ], { stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, RC_TENANT_CONFIG: process.env.RC_TENANT_CONFIG } });
  return {
    ok: result.status === 0,
    stdout: result.stdout?.toString() || '',
    stderr: result.stderr?.toString() || '',
  };
}

async function markSent(bison_reply_id, body) {
  await turso(
    `UPDATE agent_replies SET state='sent', sent_at=datetime('now'), ` +
    `decided_at=datetime('now'), decided_by='human:jay', draft_body='${sqlEsc(body)}' ` +
    `WHERE tenant_slug='${sqlEsc(TENANT_SLUG)}' AND bison_reply_id='${sqlEsc(bison_reply_id)}'`
  );
}

async function handleApprove(bisonReplyId) {
  const row = await lookupReply(bisonReplyId);
  if (!row) return `❓ No agent_replies row for ${bisonReplyId}`;
  if (row.state !== 'pending_review') return `⚠️ ${bisonReplyId} state=${row.state}, not pending_review`;
  if (!row.draft_body || row.draft_body.length < 5) return `⚠️ ${bisonReplyId} has no draft body to send`;

  const send = runSendScript(row.account_key, row.bison_reply_id, row.draft_body);
  if (!send.ok) {
    logErr(`approve ${bisonReplyId} send failed: ${send.stderr.slice(0, 300)}`);
    return `❌ Send failed for ${bisonReplyId} on ${row.account_key}: ${send.stderr.slice(0, 200)}`;
  }
  await markSent(bisonReplyId, row.draft_body);
  return `✅ Sent reply ${bisonReplyId} on ${row.account_key}`;
}

async function handleSkip(bisonReplyId) {
  const row = await lookupReply(bisonReplyId);
  if (!row) return `❓ No agent_replies row for ${bisonReplyId}`;
  await turso(
    `UPDATE agent_replies SET state='skipped', decided_at=datetime('now'), decided_by='human:jay' ` +
    `WHERE tenant_slug='${sqlEsc(TENANT_SLUG)}' AND bison_reply_id='${sqlEsc(bisonReplyId)}'`
  );
  return `⏭ Skipped ${bisonReplyId}`;
}

async function handleEdit(bisonReplyId, newBody) {
  const row = await lookupReply(bisonReplyId);
  if (!row) return `❓ No agent_replies row for ${bisonReplyId}`;
  if (row.state !== 'pending_review') return `⚠️ ${bisonReplyId} state=${row.state}, not pending_review`;
  const send = runSendScript(row.account_key, row.bison_reply_id, newBody);
  if (!send.ok) {
    return `❌ Edit-send failed for ${bisonReplyId}: ${send.stderr.slice(0, 200)}`;
  }
  await markSent(bisonReplyId, newBody);
  return `✅ Sent edited reply ${bisonReplyId} on ${row.account_key}`;
}

async function handleMute(threadId) {
  await turso(
    `UPDATE agent_replies SET state='muted_thread', decided_at=datetime('now'), decided_by='human:jay' ` +
    `WHERE tenant_slug='${sqlEsc(TENANT_SLUG)}' AND thread_id='${sqlEsc(threadId)}' AND state='pending_review'`
  );
  return `🔇 Muted thread ${threadId}`;
}

async function handleAgentOff() {
  await setState('global_paused', '1');
  return `🛑 Agent paused. Next cron tick short-circuits — no API calls until /agent on.`;
}
async function handleAgentOn() {
  await setState('global_paused', '0');
  return `▶️ Agent resumed.`;
}
async function handleAgentStatus() {
  const { rows } = await turso(
    `SELECT key, value FROM agent_state WHERE tenant_slug='${sqlEsc(TENANT_SLUG)}' ORDER BY key`
  );
  const stateLines = rows.map((r) => `  ${r[0]}: ${r[1]}`).join('\n');
  const counts = await turso(
    `SELECT state, count(*) FROM agent_replies WHERE tenant_slug='${sqlEsc(TENANT_SLUG)}' AND date(created_at) = date('now') GROUP BY state`
  );
  const countLines = counts.rows.length
    ? counts.rows.map((r) => `  ${r[0]}: ${r[1]}`).join('\n')
    : '  (none today)';
  return `📊 Agent status\n\nagent_state:\n${stateLines}\n\nToday's agent_replies:\n${countLines}`;
}

async function dispatch(content) {
  const trimmed = content.trim();
  let m;

  if ((m = trimmed.match(/^\/approve\s+(\S+)\s*$/i))) return handleApprove(m[1]);
  if ((m = trimmed.match(/^\/skip\s+(\S+)\s*$/i))) return handleSkip(m[1]);
  if ((m = trimmed.match(/^\/edit\s+(\S+)\s+([\s\S]+)$/i))) return handleEdit(m[1], m[2]);
  if ((m = trimmed.match(/^\/mute\s+(\S+)\s*$/i))) return handleMute(m[1]);
  if (/^\/agent\s+off\b/i.test(trimmed)) return handleAgentOff();
  if (/^\/agent\s+on\b/i.test(trimmed)) return handleAgentOn();
  if (/^\/agent\s+status\b/i.test(trimmed)) return handleAgentStatus();

  return null; // not one of ours; ignore
}

async function main() {
  try {
    const since = (await getState('last_slashcmd_message_id')) || '0';
    const messages = readNewMessages(since);
    if (messages.length === 0) return;

    logErr(`processing ${messages.length} new slash command(s) since msg ${since}`);

    let maxId = since;
    for (const msg of messages) {
      logErr(`[msg ${msg.id}] ${msg.content.slice(0, 80)}`);
      try {
        const reply = await dispatch(msg.content);
        if (reply) {
          await postTelegram(reply);
          logErr(`[msg ${msg.id}] -> ${reply.split('\n')[0].slice(0, 100)}`);
        }
      } catch (e) {
        logErr(`[msg ${msg.id}] dispatch failed: ${e.message}`);
        await postTelegram(`❌ Error processing "${msg.content.slice(0, 60)}": ${e.message}`);
      }
      if (parseInt(msg.id, 10) > parseInt(maxId, 10)) maxId = msg.id;
    }
    await setState('last_slashcmd_message_id', maxId);
    logErr(`watermark advanced to ${maxId}`);
  } catch (e) {
    logErr(`fatal: ${e.message}`);
  }
}

main();
