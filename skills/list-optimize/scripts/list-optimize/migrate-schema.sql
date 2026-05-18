-- list-optimize migration: add qualification + normalization + personalization columns to `leads`.
-- This file is the reference SQL. The idempotent runner is `migrate-schema.sh`, which guards each
-- ALTER with a column-existence check via PRAGMA table_info(leads) since SQLite has no
-- ALTER TABLE ... ADD COLUMN IF NOT EXISTS.
--
-- Re-run safe: re-applying these statements after the first run will fail with "duplicate column".
-- Use migrate-schema.sh instead of running this file directly.

-- ─── Phase 1: Lead qualification ────────────────────────────────────
ALTER TABLE leads ADD COLUMN qualification_status TEXT;        -- pending | qualified | disqualified
ALTER TABLE leads ADD COLUMN qualification_reason TEXT;        -- LLM rationale
ALTER TABLE leads ADD COLUMN qualification_score INTEGER;      -- 0-100 fit score (nullable)

-- ─── Phase 2: Company name normalization ────────────────────────────
ALTER TABLE leads ADD COLUMN company_name_original TEXT;       -- Preserve raw scraped value
ALTER TABLE leads ADD COLUMN company_name_normalized TEXT;     -- Canonical form

-- ─── Phase 3-4: Personalization ─────────────────────────────────────
ALTER TABLE leads ADD COLUMN personalization_research TEXT;    -- Raw Perplexity response (JSON)
ALTER TABLE leads ADD COLUMN personalization_line TEXT;        -- Final 1-sentence E1 opener
ALTER TABLE leads ADD COLUMN personalization_status TEXT;      -- pending | researched | written | failed | skipped
ALTER TABLE leads ADD COLUMN personalization_cost_cents INTEGER DEFAULT 0;

-- ─── Indexes for filter queries used by each phase ──────────────────
CREATE INDEX IF NOT EXISTS idx_leads_qualification ON leads(qualification_status);
CREATE INDEX IF NOT EXISTS idx_leads_personalization ON leads(personalization_status);
CREATE INDEX IF NOT EXISTS idx_leads_company_normalized ON leads(company_name_normalized);
