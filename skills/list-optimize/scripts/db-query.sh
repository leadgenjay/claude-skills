#!/usr/bin/env bash
# Shared database helper — sourced by all scripts
# Usage: source scripts/db-query.sh
#
# Provides: db_query, db_exec, db_scalar, sql_escape
# Tries HTTP API first (most reliable), falls back to turso CLI

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Load .env if not already loaded (safe parser — handles pipes and special chars in values)
if [[ -z "${TURSO_DB_URL:-}" ]]; then
  if [[ -f "$PROJECT_DIR/.env" ]]; then
    while IFS= read -r line || [[ -n "$line" ]]; do
      # Skip comments and blank lines
      [[ -z "$line" || "$line" == \#* ]] && continue
      # Only process lines with = (KEY=VALUE)
      [[ "$line" == *=* ]] || continue
      key="${line%%=*}"
      val="${line#*=}"
      export "$key=$val"
    done < "$PROJECT_DIR/.env"
  fi
fi

DB_NAME="${TURSO_DB_NAME:-cold-email-leads}"
DB_URL="${TURSO_DB_URL:-}"
DB_TOKEN="${TURSO_DB_TOKEN:-}"

# Normalize URL: convert libsql:// to https:// and ensure /v2/pipeline path
if [[ -n "$DB_URL" ]]; then
  DB_URL="${DB_URL/#libsql:/https:}"
  DB_URL="${DB_URL%/}"
  [[ "$DB_URL" != */v2/pipeline ]] && DB_URL="${DB_URL}/v2/pipeline"
fi

# Check if DB is configured
db_enabled() {
  [[ -n "$DB_URL" && -n "$DB_TOKEN" ]]
}

# Set DB_ENABLED for easy conditional checks
if db_enabled; then
  DB_ENABLED="true"
else
  DB_ENABLED="false"
fi

# Escape single quotes for SQL strings
sql_escape() {
  local val="$1"
  echo "${val//\'/\'\'}"
}

# Detect turso CLI
_has_turso_cli() {
  command -v turso &>/dev/null
}

# Execute SQL via turso CLI (returns tab-separated output)
_turso_cli_query() {
  local sql="$1"
  turso db shell "$DB_NAME" "$sql" 2>/dev/null || return 1
}

# Execute SQL via Turso HTTP API
_turso_http_query() {
  local sql="$1"
  local response
  # Encode via env var so single quotes / triple quotes in SQL don't break the JSON build.
  local body
  body=$(_TURSO_SQL="$sql" python3 -c "import json, os; print(json.dumps({'requests':[{'type':'execute','stmt':{'sql':os.environ['_TURSO_SQL']}}]}))")
  response=$(curl -s -X POST "${DB_URL}" \
    -H "Authorization: Bearer ${DB_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "$body" \
    --max-time 30)

  # Parse response — extract rows
  echo "$response" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    results = d.get('results', [])
    if not results:
        sys.exit(0)
    result = results[0]
    if 'error' in result:
        print(f'ERROR: {result[\"error\"][\"message\"]}', file=sys.stderr)
        sys.exit(1)
    resp = result.get('response', {})
    if resp.get('type') == 'execute':
        res = resp.get('result', {})
        cols = [c['name'] for c in res.get('cols', [])]
        rows = res.get('rows', [])
        if cols:
            print('\t'.join(cols))
        for row in rows:
            vals = []
            for cell in row:
                if cell.get('type') == 'null':
                    vals.append('')
                else:
                    vals.append(str(cell.get('value', '')))
            print('\t'.join(vals))
except Exception as e:
    print(f'ERROR: {e}', file=sys.stderr)
    sys.exit(1)
" 2>&1
}

# Execute SQL via Turso HTTP API (batch mode for multi-statement)
_turso_http_batch() {
  local sql="$1"
  local body
  # Encode via env var so embedded quotes don't break Python parsing.
  body=$(_TURSO_SQL="$sql" python3 -c "
import json, os
sql = os.environ['_TURSO_SQL']
stmts = [s.strip() for s in sql.split(';') if s.strip()]
reqs = [{'type': 'execute', 'stmt': {'sql': s}} for s in stmts]
reqs.append({'type': 'close'})
print(json.dumps({'requests': reqs}))
")
  curl -s -X POST "${DB_URL}" \
    -H "Authorization: Bearer ${DB_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "$body" \
    --max-time 60
}

# Run a query and return results (tab-separated, first row is headers)
db_query() {
  local sql="$1"
  if ! db_enabled; then
    echo "ERROR: Database not configured. Run scripts/db-setup.sh first." >&2
    return 1
  fi

  # Try HTTP API first (most reliable, no auth needed)
  local result
  result=$(_turso_http_query "$sql" 2>&1)
  local http_exit=$?
  if [[ $http_exit -eq 0 && -n "$result" ]]; then
    echo "$result"
    return 0
  fi

  # Fall back to CLI if HTTP failed and CLI is available
  if _has_turso_cli; then
    _turso_cli_query "$sql"
    return $?
  fi

  # Both failed
  if [[ -n "$result" ]]; then
    echo "$result" >&2  # Print error output
  fi
  return 1
}

# Execute SQL (INSERT/UPDATE/DELETE) — no output expected
db_exec() {
  local sql="$1"
  if ! db_enabled; then
    echo "ERROR: Database not configured. Run scripts/db-setup.sh first." >&2
    return 1
  fi

  # Try HTTP API first (most reliable, no auth needed)
  _turso_http_query "$sql" >/dev/null 2>&1 && return 0

  # Fall back to CLI if HTTP failed and CLI is available
  if _has_turso_cli; then
    _turso_cli_query "$sql" >/dev/null 2>&1
    return $?
  fi

  return 1
}

# Execute batch SQL (multiple statements separated by semicolons)
db_batch() {
  local sql="$1"
  if ! db_enabled; then
    echo "ERROR: Database not configured. Run scripts/db-setup.sh first." >&2
    return 1
  fi

  # Try HTTP API first (most reliable, no auth needed)
  _turso_http_batch "$sql" >/dev/null 2>&1 && return 0

  # Fall back to CLI if HTTP failed and CLI is available
  if _has_turso_cli; then
    _turso_cli_query "$sql" >/dev/null 2>&1
    return $?
  fi

  return 1
}

# Run a query and return a single scalar value
db_scalar() {
  local sql="$1"
  local result
  result=$(db_query "$sql")
  # Skip header row, return first value
  echo "$result" | tail -n +2 | head -1 | cut -f1
}
