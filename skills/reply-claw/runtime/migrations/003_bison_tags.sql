-- 003_bison_tags: Bison custom funnel-tag layer.
-- Adds applied_bison_tag (which tag we attached to the lead) and bison_lead_id
-- (so slash-command path can swap to Lead Magnet post-send).
-- Idempotent via apply-migration.mjs (column-existence guard).

ALTER TABLE agent_replies ADD COLUMN applied_bison_tag TEXT;
ALTER TABLE agent_replies ADD COLUMN bison_lead_id INTEGER;
