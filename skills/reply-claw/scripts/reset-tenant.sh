#!/bin/bash
# Reset (wipe) a tenant configuration and optionally drop Turso rows.
# Usage: bash reset-tenant.sh <slug> [--drop-turso-rows]
# Requires confirmation via read -p (skipped if non-interactive stdin).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_DIR="$(dirname "$SCRIPT_DIR")"
SLUG="${1:-}"
DROP_TURSO_ROWS=0

if [[ -z "$SLUG" ]]; then
  echo "Error: slug required. Usage: bash reset-tenant.sh <slug> [--drop-turso-rows]" >&2
  exit 1
fi

# Parse optional flags
for arg in "${@:2}"; do
  if [[ "$arg" == "--drop-turso-rows" ]]; then
    DROP_TURSO_ROWS=1
  fi
done

TENANT_DIR="$SKILL_DIR/tenants/$SLUG"

# Confirmation gate (skip if stdin is not a TTY, e.g., piped input)
if [[ -t 0 ]]; then
  echo "WARNING: This will permanently delete the tenant configuration and state for: $SLUG"
  if [[ $DROP_TURSO_ROWS -eq 1 ]]; then
    echo "         AND drop all agent_replies, agent_state, and sender_email_signatures rows in Turso."
  fi
  read -p "Continue? (yes/no) " -r confirm
  if [[ ! "$confirm" =~ ^[Yy][Ee][Ss]$ ]]; then
    echo "Cancelled."
    exit 0
  fi
else
  # Non-interactive mode: warn but proceed (useful for CI/automation)
  echo "Non-interactive mode: proceeding without confirmation gate."
fi

# Drop Turso rows if requested
if [[ $DROP_TURSO_ROWS -eq 1 ]]; then
  CONFIG_FILE="$TENANT_DIR/config.json"
  ENV_FILE="$TENANT_DIR/tenant.env"

  if [[ ! -f "$CONFIG_FILE" ]]; then
    echo "Error: config.json not found at $CONFIG_FILE" >&2
    exit 1
  fi

  if [[ ! -f "$ENV_FILE" ]]; then
    echo "Error: tenant.env not found at $ENV_FILE" >&2
    exit 1
  fi

  # Parse config.json for Turso DB URL
  DB_URL=$(python3 -c "import json; cfg=json.load(open('$CONFIG_FILE')); print(cfg.get('turso', {}).get('db_url', 'MISSING'))" 2>/dev/null || echo "MISSING")

  if [[ "$DB_URL" == "MISSING" ]]; then
    echo "Error: turso.db_url not found in config.json" >&2
    exit 1
  fi

  # Source tenant env for Turso token
  # shellcheck disable=SC1090
  source "$ENV_FILE"

  # Normalize DB URL
  DB_URL_NORMALIZED=$(echo "$DB_URL" | sed 's/^libsql:/https:/' | sed 's/\/$//')

  echo "Dropping Turso rows for tenant_slug='$SLUG'..."
  python3 - <<'PYTHON' "$DB_URL_NORMALIZED" "$TURSO_DB_TOKEN" "$SLUG"
import sys, json, urllib.request, urllib.error

db_url = sys.argv[1]
token = sys.argv[2]
slug = sys.argv[3]

if not db_url.endswith('/v2/pipeline'):
    db_url += '/v2/pipeline'

tables = ['agent_replies', 'agent_state', 'sender_email_signatures']

try:
    for table in tables:
        req = urllib.request.Request(
            db_url,
            data=json.dumps({
                'requests': [
                    {'type': 'execute', 'stmt': {'sql': f"DELETE FROM {table} WHERE tenant_slug='{slug}'"}},
                    {'type': 'close'}
                ]
            }).encode(),
            headers={'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'},
            method='POST'
        )
        with urllib.request.urlopen(req, timeout=10) as r:
            resp = json.load(r)
            result = resp.get('results', [{}])[0]
            # Check for SQL errors
            if result.get('error'):
                print(f"  {table}: Error — {result['error']['message']}")
            else:
                print(f"  {table}: OK")
except Exception as e:
    print(f"Error: {e}")
    sys.exit(1)
PYTHON

  echo "Turso rows dropped successfully."
fi

# Remove tenant directory
if [[ -d "$TENANT_DIR" ]]; then
  echo "Removing $TENANT_DIR..."
  rm -rf "$TENANT_DIR"
  echo "Tenant directory removed."
else
  echo "Tenant directory not found: $TENANT_DIR (already removed or never created)."
fi

echo ""
echo "=== Reset Complete ==="
echo ""
echo "REMINDER: If you have a running cron job on the remote nanoclaw host, remove it manually:"
echo "  ssh <alias> crontab -e"
echo "  # Remove any lines containing: reply-claw-$SLUG"
echo ""
