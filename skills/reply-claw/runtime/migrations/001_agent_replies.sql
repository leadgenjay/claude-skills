-- bison-replies: agent state, KB bundle transport, killswitch + counters,
-- signature cache. Idempotent (CREATE TABLE IF NOT EXISTS). Run via:
--   turso db shell <db-name> < migrations/001_agent_replies.sql

-- ─── Agent Replies (one row per Bison reply seen by the agent) ──────

CREATE TABLE IF NOT EXISTS agent_replies (
  id                        INTEGER PRIMARY KEY AUTOINCREMENT,
  account_key               TEXT NOT NULL CHECK(account_key IN ('consulti','lgj')),
  bison_reply_id            TEXT NOT NULL,
  reply_id                  INTEGER REFERENCES replies(id),
  thread_id                 TEXT NOT NULL,
  sender_email_id           INTEGER NOT NULL,
  state                     TEXT NOT NULL CHECK(state IN (
                              'pending_review','sent','sent_auto','skipped',
                              'muted_thread','dry_run','error'
                            )),
  classification            TEXT NOT NULL CHECK(classification IN (
                              'interested','not_interested','ooo','wrong_person',
                              'do_not_contact','question','referral','unsubscribe'
                            )),
  classification_confidence REAL NOT NULL,
  draft_body                TEXT,
  drafted_at                TEXT,
  decided_at                TEXT,
  decided_by                TEXT,
  sent_at                   TEXT,
  kb_refs                   TEXT,
  error_msg                 TEXT,
  created_at                TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(account_key, bison_reply_id)
);

CREATE INDEX IF NOT EXISTS idx_agent_replies_thread
  ON agent_replies(thread_id, account_key);
CREATE INDEX IF NOT EXISTS idx_agent_replies_state
  ON agent_replies(state, created_at);
CREATE INDEX IF NOT EXISTS idx_agent_replies_account_created
  ON agent_replies(account_key, created_at);

-- ─── KB Bundle transport (Mac Nextcloud → Turso → Zeus container) ───

CREATE TABLE IF NOT EXISTS kb_bundles (
  name        TEXT PRIMARY KEY,
  content     TEXT NOT NULL,
  built_at    TEXT NOT NULL DEFAULT (datetime('now')),
  source_hash TEXT NOT NULL
);

-- ─── Agent control plane (killswitch + per-account daily counters) ──

CREATE TABLE IF NOT EXISTS agent_state (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO agent_state(key, value) VALUES
  ('global_paused',             '0'),
  ('auto_sends_today_consulti', '0'),
  ('auto_sends_today_lgj',      '0'),
  ('counter_reset_date',        date('now')),
  ('confidence_floor',          '0.85'),
  ('daily_auto_send_cap',       '15');

-- ─── Persona signature cache ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS sender_email_signatures (
  account_key      TEXT NOT NULL CHECK(account_key IN ('consulti','lgj')),
  sender_email_id  INTEGER NOT NULL,
  email            TEXT NOT NULL,
  persona_name     TEXT NOT NULL,
  persona_role     TEXT,
  signature_html   TEXT NOT NULL,
  refreshed_at     TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY(account_key, sender_email_id)
);
