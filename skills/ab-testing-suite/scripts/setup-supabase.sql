-- ============================================================
-- A/B Testing Suite — Supabase Database Setup
-- ============================================================
-- Run this against your Supabase project to set up the
-- A/B testing infrastructure. Safe to run multiple times
-- (fully idempotent).
--
-- Usage:
--   1. Open Supabase Dashboard → SQL Editor
--   2. Paste this entire script
--   3. Click "Run"
-- ============================================================

-- --------------------------------------------------------
-- 1. Event Type Enum
-- --------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE ab_event_type AS ENUM ('view', 'conversion');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- --------------------------------------------------------
-- 2. Test Registry Table
-- --------------------------------------------------------
-- Stores all A/B test configurations. The edge middleware
-- reads this table to determine variant assignments.
CREATE TABLE IF NOT EXISTS ab_test_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  path_pattern TEXT NOT NULL,
  variants JSONB NOT NULL DEFAULT '[]',
  status TEXT DEFAULT 'draft'
    CHECK (status IN ('draft', 'active', 'paused', 'completed')),
  is_active BOOLEAN DEFAULT false,
  winner_variant_id TEXT,
  confidence_threshold INTEGER DEFAULT 95,
  auto_select_winner BOOLEAN DEFAULT false,
  webhook_url TEXT,
  conversion_selector TEXT,
  started_at TIMESTAMPTZ,
  concluded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_ab_test_registry_test_id ON ab_test_registry(test_id);
CREATE INDEX IF NOT EXISTS idx_ab_test_registry_status ON ab_test_registry(status);
CREATE INDEX IF NOT EXISTS idx_ab_test_registry_active ON ab_test_registry(is_active);

-- Table documentation
COMMENT ON TABLE ab_test_registry IS 'A/B test registry — stores test configuration, variants, and status';
COMMENT ON COLUMN ab_test_registry.test_id IS 'Unique identifier (e.g., "pricing-headline-v1")';
COMMENT ON COLUMN ab_test_registry.path_pattern IS 'URL path to match (e.g., "/pricing")';
COMMENT ON COLUMN ab_test_registry.variants IS 'JSON array: [{"id":"control","name":"Control","weight":50,"enabled":true}]';
COMMENT ON COLUMN ab_test_registry.status IS 'Test lifecycle: draft → active → paused → completed';
COMMENT ON COLUMN ab_test_registry.confidence_threshold IS 'Statistical confidence threshold (90 or 95) for auto-winner';
COMMENT ON COLUMN ab_test_registry.conversion_selector IS 'CSS selector for conversion tracking (e.g., "a[href*=checkout]")';

-- --------------------------------------------------------
-- 3. Test Events Table
-- --------------------------------------------------------
-- Stores view and conversion events per variant.
-- The ConversionTracker component writes to this table.
CREATE TABLE IF NOT EXISTS ab_test_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id TEXT,
  variant_id TEXT NOT NULL,
  event_type ab_event_type NOT NULL,
  visitor_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for efficient stat queries
CREATE INDEX IF NOT EXISTS idx_ab_test_events_test_id ON ab_test_events(test_id);
CREATE INDEX IF NOT EXISTS idx_ab_test_events_variant ON ab_test_events(test_id, variant_id);
CREATE INDEX IF NOT EXISTS idx_ab_test_events_visitor ON ab_test_events(test_id, visitor_id);
CREATE INDEX IF NOT EXISTS idx_ab_test_events_type ON ab_test_events(test_id, event_type);

COMMENT ON TABLE ab_test_events IS 'A/B test event tracking — views and conversions per variant';

-- --------------------------------------------------------
-- 4. Row Level Security
-- --------------------------------------------------------

-- Registry: public read (edge middleware needs this), authenticated write
ALTER TABLE ab_test_registry ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "ab_registry_public_read"
    ON ab_test_registry FOR SELECT TO public USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "ab_registry_authenticated_write"
    ON ab_test_registry FOR ALL TO authenticated
    USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "ab_registry_service_role"
    ON ab_test_registry FOR ALL TO service_role
    USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Events: public insert (tracking), authenticated read
ALTER TABLE ab_test_events ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "ab_events_public_insert"
    ON ab_test_events FOR INSERT TO public WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "ab_events_authenticated_read"
    ON ab_test_events FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "ab_events_public_read"
    ON ab_test_events FOR SELECT TO public USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "ab_events_service_role"
    ON ab_test_events FOR ALL TO service_role
    USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- --------------------------------------------------------
-- 5. Triggers
-- --------------------------------------------------------

-- Auto-update updated_at on registry changes
CREATE OR REPLACE FUNCTION update_ab_test_registry_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop and recreate trigger (idempotent)
DROP TRIGGER IF EXISTS ab_test_registry_updated_at ON ab_test_registry;
CREATE TRIGGER ab_test_registry_updated_at
  BEFORE UPDATE ON ab_test_registry
  FOR EACH ROW
  EXECUTE FUNCTION update_ab_test_registry_updated_at();

-- --------------------------------------------------------
-- 6. Global Settings (Optional)
-- --------------------------------------------------------
-- Store global A/B test settings in an app_settings table.
-- Skip if you already have a settings system.

CREATE TABLE IF NOT EXISTS app_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Seed default AB test settings (skip if exists)
INSERT INTO app_settings (key, value)
VALUES (
  'ab_test_settings',
  '{"confidenceThreshold": 95, "autoSelectWinner": false, "webhookUrl": null}'::jsonb
)
ON CONFLICT (key) DO NOTHING;

-- RLS for app_settings
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "app_settings_authenticated_access"
    ON app_settings FOR ALL TO authenticated
    USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "app_settings_service_role"
    ON app_settings FOR ALL TO service_role
    USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- --------------------------------------------------------
-- Done! Verify by running:
--   SELECT * FROM ab_test_registry LIMIT 1;
--   SELECT * FROM ab_test_events LIMIT 1;
--   SELECT * FROM app_settings WHERE key = 'ab_test_settings';
-- --------------------------------------------------------
