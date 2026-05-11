#!/usr/bin/env node
// FORKED FROM: bison-replies/scripts/check-replies.mjs @ commit ba00377
// reply-claw: Multi-tenant reply polling, classification, and drafting worker.
// Runs every N minutes (typically */8) via host crontab inside nanoclaw HOST container.
//
// Loads multi-tenant config from RC_TENANT_CONFIG JSON file.
// Polls Bison API for new replies, classifies with Haiku, drafts with Sonnet.
// Increments reply_count counter, updates agent_replies state.
// Posts 📬 updates to tenant's Telegram chat.
//
// Env required:
//   RC_TENANT_CONFIG — path to tenant config JSON
//   ANTHROPIC_API_KEY — used by classify + draft subprocesses
//
// Tenant config schema (JSON):
//   {
//     "tenant_slug": "lgj",
//     "bison": { "base_url": "https://send.leadgenjay.com/api", "workspaces": [...] },
//     "personas": { "jay": { "auto_send_eligible": true }, "bob": { "auto_send_eligible": false } },
//     "telegram": { "bot_token": "...", "chat_id": "123" },
//     "turso": { "db_url": "libsql://...", "token": "..." },
//     "preferences": {
//       "daily_auto_send_cap": 15,
//       "confidence_floor": 0.85,
//       "dry_run": false,
//       "classify_model": "claude-haiku-4-5-20251001",
//       "draft_model": "claude-sonnet-4-6"
//     }
//   }

import { execSync, spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));

function logErr(msg) {
  process.stderr.write(`[check-replies] ${msg}\n`);
}

// Load tenant config from RC_TENANT_CONFIG
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

const BISON_BASE = cfg.bison.base_url || 'https://send.leadgenjay.com/api';
const TENANT_SLUG = cfg.tenant_slug;
const CLASSIFY_MODEL = cfg.preferences?.classify_model || 'claude-haiku-4-5-20251001';
const DRAFT_MODEL = cfg.preferences?.draft_model || 'claude-sonnet-4-6';
const CONFIDENCE_FLOOR = cfg.preferences?.confidence_floor ?? 0.85;
const DRY_RUN = cfg.preferences?.dry_run ? '1' : '0';
const MAX_PER_CYCLE = parseInt(process.env.MAX_PER_CYCLE || '20', 10);
const TELEGRAM_CHAT_ID = cfg.telegram?.chat_id;

// ─── Bison custom-tag layer ────────────────────────────────────────────
// Mirror of bison-replies/scripts/check-replies.mjs tag constants — kept
// verbatim to preserve fork parity. Bootstrap via sync-bison-tags.mjs.
const FUNNEL_TAGS = [
  'Interested', 'Hard No', 'Soft No', 'Auto Reply',
  'Follow up 7d', 'Follow up 30d', 'Booked', 'Lead Magnet',
];
const CATEGORY_TO_TAG = {
  interested: 'Interested',
  booked: 'Booked',
  question: 'Interested',
  follow_up_7d: 'Follow up 7d',
  follow_up_30d: 'Follow up 30d',
  not_interested: 'Soft No',
  unsubscribe: 'Hard No',
  do_not_contact: 'Hard No',
  wrong_person: 'Hard No',
  ooo: 'Auto Reply',
  referral: null,
};

function bisonKeyFor(account_key) {
  const ws = (cfg.bison?.workspaces || []).find((w) => w.account_key === account_key);
  return ws?.api_key || null;
}

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
    `SELECT value FROM agent_state WHERE key='${sqlEsc(key)}' AND tenant_slug='${sqlEsc(TENANT_SLUG)}' LIMIT 1`
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

async function collectNewReplies() {
  const sinceId = (await getState('reply_last_id')) || '0';
  const sinceIdInt = parseInt(sinceId, 10) || 0;
  const sql =
    `SELECT bison_reply_id, reply_thread_id, email_from, email_subject, reply_body, ` +
    `account_key, bison_lead_id FROM agent_replies ` +
    `WHERE tenant_slug='${sqlEsc(TENANT_SLUG)}' AND state='new' AND CAST(bison_reply_id AS INTEGER) > ${sinceIdInt} ` +
    `ORDER BY CAST(bison_reply_id AS INTEGER) ASC LIMIT ${MAX_PER_CYCLE}`;
  const { rows } = await turso(sql);
  return rows.map((r) => ({
    bison_reply_id: r[0],
    reply_thread_id: r[1],
    email_from: r[2],
    email_subject: r[3],
    reply_body: r[4],
    account_key: r[5],
    bison_lead_id: r[6] != null ? Number(r[6]) : null,
  }));
}

// ─── Bison API helpers ─────────────────────────────────────────────────
async function bisonRequest(method, path, key, body) {
  const r = await fetch(`${BISON_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!r.ok) {
    const txt = (await r.text()).slice(0, 200);
    throw new Error(`bison ${method} ${path} HTTP ${r.status}: ${txt}`);
  }
  return r.json();
}

async function getBisonTagIds(account_key) {
  const raw = await getState(`bison_tag_ids:${TENANT_SLUG}:${account_key}`);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

// Attach tagName to the lead, detaching the other 7 funnel tags first
// (exclusivity invariant). Never throws — failures are logged.
async function applyBisonTag(account_key, lead_id, tagName) {
  if (!lead_id || !tagName) return false;
  const key = bisonKeyFor(account_key);
  if (!key) return false;
  const tagMap = await getBisonTagIds(account_key);
  if (!tagMap) {
    logErr(`applyBisonTag: no tag map for ${TENANT_SLUG}/${account_key} — run sync-bison-tags.mjs`);
    return false;
  }
  const newTagId = tagMap[tagName];
  if (!newTagId) {
    logErr(`applyBisonTag: tag "${tagName}" missing from map for ${account_key}`);
    return false;
  }
  const otherIds = FUNNEL_TAGS
    .filter((n) => n !== tagName)
    .map((n) => tagMap[n])
    .filter((id) => typeof id === 'number');
  try {
    if (otherIds.length > 0) {
      await bisonRequest('POST', '/tags/remove-from-leads', key, {
        tag_ids: otherIds, lead_ids: [lead_id], skip_webhooks: true,
      });
    }
    await bisonRequest('POST', '/tags/attach-to-leads', key, {
      tag_ids: [newTagId], lead_ids: [lead_id], skip_webhooks: true,
    });
    return true;
  } catch (e) {
    logErr(`applyBisonTag(${account_key}, lead=${lead_id}, tag=${tagName}) failed: ${e.message}`);
    return false;
  }
}

function classifyReply(body, subject) {
  const script = path.join(SCRIPT_DIR, 'classify-haiku.sh');
  const result = spawnSync(script, [subject, body], {
    stdio: ['ignore', 'pipe', 'pipe'],
    env: {
      ...process.env,
      CLASSIFY_MODEL,
    },
  });
  if (result.status !== 0) {
    logErr(`classify failed for subject="${subject.slice(0, 60)}": ${result.stderr?.toString() || 'unknown error'}`);
    return null;
  }
  try {
    const out = result.stdout.toString().trim();
    return JSON.parse(out);
  } catch (e) {
    logErr(`classify JSON parse failed: ${e.message}`);
    return null;
  }
}

function draftReply(classification, sender, subject, body, accountKey) {
  const script = path.join(SCRIPT_DIR, 'draft-sonnet.sh');
  const result = spawnSync(script, [classification, sender, subject, body, accountKey], {
    stdio: ['ignore', 'pipe', 'pipe'],
    env: {
      ...process.env,
      DRAFT_MODEL,
      RC_TENANT_CONFIG: process.env.RC_TENANT_CONFIG,
    },
  });
  if (result.status !== 0) {
    logErr(`draft failed: ${result.stderr?.toString() || 'unknown error'}`);
    return null;
  }
  return result.stdout.toString().trim();
}

async function updateReplyState(bisonReplyId, newState, classification = null, draftBody = null, appliedTag = null) {
  let sql = `UPDATE agent_replies SET state='${sqlEsc(newState)}'`;
  if (classification) sql += `, classification='${sqlEsc(classification)}'`;
  if (draftBody) sql += `, draft_body='${sqlEsc(draftBody)}'`;
  if (appliedTag) sql += `, applied_bison_tag='${sqlEsc(appliedTag)}'`;
  sql += `, updated_at=datetime('now') WHERE tenant_slug='${sqlEsc(TENANT_SLUG)}' AND bison_reply_id='${sqlEsc(bisonReplyId)}'`;
  await turso(sql);
}

async function postTelegram(text) {
  if (!cfg.telegram?.bot_token || !TELEGRAM_CHAT_ID) return;
  try {
    const r = await fetch(`https://api.telegram.org/bot${cfg.telegram.bot_token}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text,
        disable_web_page_preview: true,
      }),
    });
    if (!r.ok) logErr(`telegram ${r.status}`);
  } catch (e) {
    logErr(`telegram post failed: ${e.message}`);
  }
}

async function fullCycleOne(reply) {
  const { bison_reply_id, email_from, email_subject, reply_body, account_key, bison_lead_id } = reply;

  // Classify
  const clf = classifyReply(reply_body, email_subject);
  if (!clf) {
    await updateReplyState(bison_reply_id, 'classify_error');
    return;
  }

  logErr(`[${bison_reply_id}] classified: ${clf.category} (conf=${clf.confidence?.toFixed(2) || 'N/A'})`);

  // Apply mapped Bison funnel tag (exclusive). Logged-and-continue on failure.
  const tagToApply = CATEGORY_TO_TAG[clf.category] || null;
  let appliedTag = null;
  if (tagToApply && bison_lead_id) {
    const ok = await applyBisonTag(account_key, bison_lead_id, tagToApply);
    if (ok) {
      appliedTag = tagToApply;
      logErr(`[${bison_reply_id}] tagged lead ${bison_lead_id} → "${tagToApply}"`);
    }
  } else if (tagToApply && !bison_lead_id) {
    logErr(`[${bison_reply_id}] tag "${tagToApply}" skipped: bison_lead_id missing`);
  }

  // Check confidence floor
  if ((clf.confidence ?? 0) < CONFIDENCE_FLOOR) {
    logErr(`  -> confidence ${clf.confidence?.toFixed(2)} below floor ${CONFIDENCE_FLOOR}; marking pending_review`);
    await updateReplyState(bison_reply_id, 'pending_review', clf.category, null, appliedTag);
    return;
  }

  // Route by category — new classes (booked, follow_up_7d, follow_up_30d)
  // are auto-handled like the other terminal classifications (no draft).
  if (clf.category === 'interested') {
    logErr(`  -> INTERESTED; drafting booking handoff`);
    const draft = draftReply(clf.category, email_from, email_subject, reply_body, account_key);
    if (!draft) {
      await updateReplyState(bison_reply_id, 'draft_error', clf.category, null, appliedTag);
      return;
    }
    await updateReplyState(bison_reply_id, 'interested_drafted', clf.category, draft, appliedTag);
    await postTelegram(`📬 INTERESTED drafted: ${bison_reply_id} from ${email_from}`);
  } else if (['question', 'referral'].includes(clf.category)) {
    logErr(`  -> ${clf.category.toUpperCase()}; drafting contextual response`);
    const draft = draftReply(clf.category, email_from, email_subject, reply_body, account_key);
    if (!draft) {
      await updateReplyState(bison_reply_id, 'draft_error', clf.category, null, appliedTag);
      return;
    }
    await updateReplyState(bison_reply_id, 'pending_review', clf.category, draft, appliedTag);
    await postTelegram(`📬 ${clf.category.toUpperCase()}: ${bison_reply_id} pending your review`);
  } else {
    // booked, not_interested, follow_up_7d, follow_up_30d, ooo,
    // unsubscribe, do_not_contact, wrong_person → no draft, tag-only path
    logErr(`  -> auto-handled (${clf.category})`);
    await updateReplyState(bison_reply_id, clf.category, clf.category, null, appliedTag);
  }
}

async function fullCycle() {
  try {
    const replies = await collectNewReplies();
    if (replies.length === 0) return;

    logErr(`cycle: ${replies.length}/${MAX_PER_CYCLE} new replies`);
    for (const reply of replies) {
      try {
        await fullCycleOne(reply);
      } catch (e) {
        logErr(`cycle error on ${reply.bison_reply_id}: ${e.message}`);
      }
    }

    // Increment reply_count (for monitoring)
    const oldCount = parseInt((await getState('reply_count')) || '0', 10);
    await setState('reply_count', String(oldCount + replies.length));
  } catch (e) {
    logErr(`fatal: ${e.message}`);
  }
}

fullCycle();
