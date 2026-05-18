#!/usr/bin/env bash
# Setup Turso database for cold email lead tracking
# Installs Turso CLI (if needed), creates DB, applies schema, saves creds to .env
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
SCHEMA_FILE="$SCRIPT_DIR/schema.sql"
ENV_FILE="$PROJECT_DIR/.env"
DB_NAME="cold-email-leads"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log() { echo -e "${CYAN}[db-setup]${NC} $*"; }
ok()  { echo -e "${GREEN}[✓]${NC} $*"; }
warn(){ echo -e "${YELLOW}[!]${NC} $*"; }
err() { echo -e "${RED}[✗]${NC} $*"; }

# Portable in-place sed (macOS BSD vs Linux GNU)
_sed_inplace() {
  if [[ "$(uname)" == "Darwin" ]]; then
    sed -i '' "$@"
  else
    sed -i "$@"
  fi
}

# Step 1: Install Turso CLI
install_turso() {
  if command -v turso &>/dev/null; then
    ok "Turso CLI already installed: $(turso --version 2>/dev/null || echo 'unknown')"
    return 0
  fi

  log "Installing Turso CLI..."
  curl -sSfL https://get.tur.so/install.sh | bash

  # Add to PATH for this session
  export PATH="$HOME/.turso:$PATH"

  if command -v turso &>/dev/null; then
    ok "Turso CLI installed"
  else
    err "Turso CLI installation failed"
    exit 1
  fi
}

# Step 2: Auth check
check_auth() {
  log "Checking Turso auth..."
  if turso auth status &>/dev/null 2>&1; then
    ok "Turso authenticated"
  else
    log "Opening browser for Turso login..."
    turso auth login
    ok "Turso authenticated"
  fi
}

# Step 3: Create database
create_db() {
  log "Checking if database '$DB_NAME' exists..."

  if turso db show "$DB_NAME" &>/dev/null 2>&1; then
    ok "Database '$DB_NAME' already exists"
  else
    log "Creating database '$DB_NAME'..."
    turso db create "$DB_NAME"
    ok "Database '$DB_NAME' created"
  fi
}

# Step 4: Apply schema
apply_schema() {
  if [[ ! -f "$SCHEMA_FILE" ]]; then
    err "Schema file not found: $SCHEMA_FILE"
    exit 1
  fi

  log "Applying schema to '$DB_NAME'..."
  turso db shell "$DB_NAME" < "$SCHEMA_FILE"
  ok "Schema applied"

  # Verify tables
  local tables
  tables=$(turso db shell "$DB_NAME" ".tables" 2>/dev/null)
  log "Tables created:"
  echo "$tables" | while read -r t; do
    echo "  - $t"
  done
}

# Step 5: Save credentials to .env
save_credentials() {
  log "Generating auth token..."
  local db_url
  db_url=$(turso db show "$DB_NAME" --url 2>/dev/null)

  local db_token
  db_token=$(turso db tokens create "$DB_NAME" 2>/dev/null)

  if [[ -z "$db_url" || -z "$db_token" ]]; then
    err "Failed to get database credentials"
    exit 1
  fi

  # Append or update .env
  local needs_header=true
  if [[ -f "$ENV_FILE" ]]; then
    if grep -q "TURSO_DB" "$ENV_FILE"; then
      needs_header=false
      # Update existing values
      _sed_inplace "s|^TURSO_DB_URL=.*|TURSO_DB_URL=${db_url}|" "$ENV_FILE"
      _sed_inplace "s|^TURSO_DB_TOKEN=.*|TURSO_DB_TOKEN=${db_token}|" "$ENV_FILE"
      _sed_inplace "s|^TURSO_DB_NAME=.*|TURSO_DB_NAME=${DB_NAME}|" "$ENV_FILE"
      ok "Updated Turso credentials in .env"
      return
    fi
  fi

  # Append new section
  cat >> "$ENV_FILE" <<EOF

# Turso Database (Lead Tracking)
TURSO_DB_NAME=${DB_NAME}
TURSO_DB_URL=${db_url}
TURSO_DB_TOKEN=${db_token}
EOF
  ok "Saved Turso credentials to .env"
}

# Main
main() {
  echo ""
  log "Cold Email Lead Tracking — Database Setup"
  log "=========================================="
  echo ""

  install_turso
  check_auth
  create_db
  apply_schema
  save_credentials

  echo ""
  log "=========================================="
  ok "Setup complete!"
  echo ""
  log "Test with:"
  echo "  turso db shell $DB_NAME \".tables\""
  echo "  turso db shell $DB_NAME \"SELECT name FROM sqlite_master WHERE type='table'\""
  echo ""
  log "Import leads:"
  echo "  ./scripts/import-leads.sh <apify-output.json> [actor-name]"
  echo ""
}

main
