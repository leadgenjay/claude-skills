#!/bin/bash
# Operator status reporter. Queries Turso + SSH checks cron status.
# Usage: bash status.sh <slug>

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_DIR="$(dirname "$SCRIPT_DIR")"
SLUG="${1:-}"

if [[ -z "$SLUG" ]]; then
  echo "Error: slug required. Usage: bash status.sh <slug>" >&2
  exit 1
fi

CONFIG_FILE="$SKILL_DIR/tenants/$SLUG/config.json"
if [[ ! -f "$CONFIG_FILE" ]]; then
  echo "Error: config.json not found: $CONFIG_FILE" >&2
  exit 1
fi

# Parse config.json for credentials and settings
DB_URL=$(python3 -c "import json; cfg=json.load(open('$CONFIG_FILE')); print(cfg.get('turso', {}).get('db_url', 'MISSING'))" 2>/dev/null || echo "MISSING")
SSH_ALIAS=$(python3 -c "import json; cfg=json.load(open('$CONFIG_FILE')); print(cfg.get('nanoclaw', {}).get('ssh_alias', 'zeus'))" 2>/dev/null || echo "zeus")

if [[ "$DB_URL" == "MISSING" ]]; then
  echo "Error: turso.db_url not configured in config.json" >&2
  exit 1
fi

# Get env vars for Turso access
ENV_FILE="$SKILL_DIR/tenants/$SLUG/tenant.env"
if [[ ! -f "$ENV_FILE" ]]; then
  echo "Error: tenant.env not found: $ENV_FILE" >&2
  exit 1
fi

# shellcheck disable=SC1090
source "$ENV_FILE"

# Pull DB URL from config.json (tenant.env intentionally has no secrets)
if [[ -z "${DB_URL:-}" ]]; then
  DB_URL=$(python3 -c "import json; cfg=json.load(open('$CONFIG_FILE')); print(cfg.get('turso', {}).get('db_url', ''))" 2>/dev/null || echo "")
fi
if [[ -z "${TURSO_DB_TOKEN:-}" ]]; then
  echo "Error: TURSO_DB_TOKEN not set in environment." >&2
  echo "Hint: source your project .env first, e.g. \`set -a; source .env; set +a\`" >&2
  exit 1
fi

# Normalize DB URL
DB_URL_NORMALIZED=$(echo "$DB_URL" | sed 's/^libsql:/https:/' | sed 's/\/$//')

echo "=== Reply-Claw Status Report: $SLUG ==="
echo ""

# Query agent_state
echo "Agent State:"
python3 - <<'PYTHON' "$DB_URL_NORMALIZED" "$TURSO_DB_TOKEN" "$SLUG"
import sys, json, urllib.request, urllib.error

db_url = sys.argv[1]
token = sys.argv[2]
slug = sys.argv[3]

if not db_url.endswith('/v2/pipeline'):
    db_url += '/v2/pipeline'

try:
    req = urllib.request.Request(
        db_url,
        data=json.dumps({
            'requests': [
                {'type': 'execute', 'stmt': {'sql': f"SELECT key, value FROM agent_state WHERE tenant_slug='{slug}'"}},
                {'type': 'close'}
            ]
        }).encode(),
        headers={'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'},
        method='POST'
    )
    with urllib.request.urlopen(req, timeout=10) as r:
        resp = json.load(r)
        result = resp.get('results', [{}])[0]
        rows = result.get('response', {}).get('result', {}).get('rows', [])
        if rows:
            for row in rows:
                print(f"  {row[0]}: {row[1]}")
        else:
            print("  (no state)")
except Exception as e:
    print(f"  Error: {e}")
PYTHON

echo ""
echo "Today's Replies:"
python3 - <<'PYTHON' "$DB_URL_NORMALIZED" "$TURSO_DB_TOKEN" "$SLUG"
import sys, json, urllib.request, datetime

db_url = sys.argv[1]
token = sys.argv[2]
slug = sys.argv[3]

if not db_url.endswith('/v2/pipeline'):
    db_url += '/v2/pipeline'

try:
    req = urllib.request.Request(
        db_url,
        data=json.dumps({
            'requests': [
                {'type': 'execute', 'stmt': {'sql': f"SELECT COUNT(*) FROM agent_replies WHERE tenant_slug='{slug}' AND date(created_at)=date('now')"}},
                {'type': 'close'}
            ]
        }).encode(),
        headers={'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'},
        method='POST'
    )
    with urllib.request.urlopen(req, timeout=10) as r:
        resp = json.load(r)
        result = resp.get('results', [{}])[0]
        rows = result.get('response', {}).get('result', {}).get('rows', [])
        count = rows[0][0] if rows else 0
        print(f"  Total: {count}")
except Exception as e:
    print(f"  Error: {e}")
PYTHON

echo ""
echo "Reply States (all time):"
python3 - <<'PYTHON' "$DB_URL_NORMALIZED" "$TURSO_DB_TOKEN" "$SLUG"
import sys, json, urllib.request

db_url = sys.argv[1]
token = sys.argv[2]
slug = sys.argv[3]

if not db_url.endswith('/v2/pipeline'):
    db_url += '/v2/pipeline'

try:
    req = urllib.request.Request(
        db_url,
        data=json.dumps({
            'requests': [
                {'type': 'execute', 'stmt': {'sql': f"SELECT state, COUNT(*) FROM agent_replies WHERE tenant_slug='{slug}' GROUP BY state ORDER BY state"}},
                {'type': 'close'}
            ]
        }).encode(),
        headers={'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'},
        method='POST'
    )
    with urllib.request.urlopen(req, timeout=10) as r:
        resp = json.load(r)
        result = resp.get('results', [{}])[0]
        rows = result.get('response', {}).get('result', {}).get('rows', [])
        for row in rows:
            print(f"  {row[0]}: {row[1]}")
except Exception as e:
    print(f"  Error: {e}")
PYTHON

echo ""
echo "Last Cron Run:"
if ssh "$SSH_ALIAS" "test -f /var/log/reply-claw-${SLUG}.log" 2>/dev/null; then
  ssh "$SSH_ALIAS" "tail -1 /var/log/reply-claw-${SLUG}.log" 2>/dev/null || echo "  (unable to read log)"
else
  echo "  (log not found on host)"
fi

echo ""
echo "=== End of Report ==="
