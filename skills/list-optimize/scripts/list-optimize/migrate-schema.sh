#!/usr/bin/env bash
# Idempotent schema migration for the list-optimize skill.
# Adds qualification, normalization, and personalization columns to `leads` if missing.
#
# Usage: bash scripts/list-optimize/migrate-schema.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

# shellcheck disable=SC1091
source "$PROJECT_DIR/scripts/db-query.sh"

if ! db_enabled; then
  echo "ERROR: Turso DB not configured. Set TURSO_DB_URL + TURSO_DB_TOKEN in .env." >&2
  exit 1
fi

# Pull current column list once.
existing="$(db_query "PRAGMA table_info(leads)" | tail -n +2 | cut -f2)"

apply_if_missing() {
  local col="$1"
  local ddl="$2"
  if grep -qx "$col" <<<"$existing"; then
    echo "  ✓ $col already exists"
  else
    echo "  + adding $col"
    db_exec "$ddl"
  fi
}

echo "Migrating leads table for list-optimize skill..."
apply_if_missing qualification_status        "ALTER TABLE leads ADD COLUMN qualification_status TEXT"
apply_if_missing qualification_reason        "ALTER TABLE leads ADD COLUMN qualification_reason TEXT"
apply_if_missing qualification_score         "ALTER TABLE leads ADD COLUMN qualification_score INTEGER"
apply_if_missing company_name_original       "ALTER TABLE leads ADD COLUMN company_name_original TEXT"
apply_if_missing company_name_normalized     "ALTER TABLE leads ADD COLUMN company_name_normalized TEXT"
apply_if_missing personalization_research    "ALTER TABLE leads ADD COLUMN personalization_research TEXT"
apply_if_missing personalization_line        "ALTER TABLE leads ADD COLUMN personalization_line TEXT"
apply_if_missing personalization_status      "ALTER TABLE leads ADD COLUMN personalization_status TEXT"
apply_if_missing personalization_cost_cents  "ALTER TABLE leads ADD COLUMN personalization_cost_cents INTEGER DEFAULT 0"

echo "Creating indexes..."
db_exec "CREATE INDEX IF NOT EXISTS idx_leads_qualification ON leads(qualification_status)"
db_exec "CREATE INDEX IF NOT EXISTS idx_leads_personalization ON leads(personalization_status)"
db_exec "CREATE INDEX IF NOT EXISTS idx_leads_company_normalized ON leads(company_name_normalized)"

echo
echo "Migration complete. Verifying..."
echo
db_query "PRAGMA table_info(leads)" | grep -E "qualification|personalization|company_name_(original|normalized)" || echo "  (no matching columns found — something went wrong)"
