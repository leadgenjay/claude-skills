-- reply-claw: Multi-tenant scoping migration
-- Adds tenant_slug column to agent_replies, agent_state, and sender_email_signatures.
-- Enables safe isolation of data across tenants (consulti, lgj, etc.).
--
-- Run via:
--   turso db shell <db-name> < migrations/002_tenant_scoping.sql

-- ─── Add tenant_slug to agent_replies ──────────────────────────────────

ALTER TABLE agent_replies ADD COLUMN tenant_slug TEXT NOT NULL DEFAULT 'lgj-default';

-- Drop old unique constraint (if it exists) and add tenant-scoped one
DROP INDEX IF EXISTS idx_agent_replies_unique_bison;
CREATE UNIQUE INDEX idx_agent_replies_unique_bison
  ON agent_replies(tenant_slug, bison_reply_id);

-- Update composite index for thread lookups
DROP INDEX IF EXISTS idx_agent_replies_thread;
CREATE INDEX idx_agent_replies_thread
  ON agent_replies(tenant_slug, thread_id);

-- Update existing indexes to include tenant_slug for filtering efficiency
DROP INDEX IF EXISTS idx_agent_replies_state;
CREATE INDEX idx_agent_replies_state
  ON agent_replies(tenant_slug, state, created_at);

DROP INDEX IF EXISTS idx_agent_replies_account_created;
CREATE INDEX idx_agent_replies_account_created
  ON agent_replies(tenant_slug, created_at);

-- ─── Add tenant_slug to agent_state ────────────────────────────────────

ALTER TABLE agent_state ADD COLUMN tenant_slug TEXT NOT NULL DEFAULT 'lgj-default';

-- Backfill default for existing rows
UPDATE agent_state SET tenant_slug = 'lgj-default'
  WHERE tenant_slug IS NULL;

-- Redefine PRIMARY KEY to be composite (tenant_slug, key)
-- SQLite doesn't support ALTER PRIMARY KEY, so we must recreate the table.
-- This is a breaking change; coordinate with any live readers.

CREATE TABLE agent_state_new (
  tenant_slug TEXT NOT NULL DEFAULT 'lgj-default',
  key         TEXT NOT NULL,
  value       TEXT NOT NULL,
  updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (tenant_slug, key)
);

INSERT INTO agent_state_new (tenant_slug, key, value, updated_at)
  SELECT tenant_slug, key, value, updated_at FROM agent_state;

DROP TABLE agent_state;
ALTER TABLE agent_state_new RENAME TO agent_state;

-- Re-insert default rows for all tenants (only if not already present)
INSERT OR IGNORE INTO agent_state(tenant_slug, key, value) VALUES
  ('lgj-default',  'global_paused',             '0'),
  ('lgj-default',  'auto_sends_today_consulti', '0'),
  ('lgj-default',  'auto_sends_today_lgj',      '0'),
  ('lgj-default',  'counter_reset_date',        date('now')),
  ('lgj-default',  'confidence_floor',          '0.85'),
  ('lgj-default',  'daily_auto_send_cap',       '15');

-- ─── Add tenant_slug to sender_email_signatures ────────────────────────

ALTER TABLE sender_email_signatures ADD COLUMN tenant_slug TEXT NOT NULL DEFAULT 'lgj-default';

-- Redefine PRIMARY KEY to be composite (tenant_slug, account_key, sender_email_id)
CREATE TABLE sender_email_signatures_new (
  tenant_slug      TEXT NOT NULL DEFAULT 'lgj-default',
  account_key      TEXT NOT NULL CHECK(account_key IN ('consulti','lgj')),
  sender_email_id  INTEGER NOT NULL,
  email            TEXT NOT NULL,
  persona_name     TEXT NOT NULL,
  persona_role     TEXT,
  signature_html   TEXT NOT NULL,
  refreshed_at     TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY(tenant_slug, account_key, sender_email_id)
);

INSERT INTO sender_email_signatures_new
  (tenant_slug, account_key, sender_email_id, email, persona_name, persona_role, signature_html, refreshed_at)
  SELECT tenant_slug, account_key, sender_email_id, email, persona_name, persona_role, signature_html, refreshed_at
  FROM sender_email_signatures;

DROP TABLE sender_email_signatures;
ALTER TABLE sender_email_signatures_new RENAME TO sender_email_signatures;
