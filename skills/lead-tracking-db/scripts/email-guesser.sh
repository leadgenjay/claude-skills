#!/usr/bin/env bash
# Email Guesser + Reacher Verification Pipeline
# Takes CSV input (firstName,lastName,domain) and finds verified emails
#
# Usage:
#   ./scripts/email-guesser.sh input.csv [output.csv]
#   echo "John,Smith,acme.com" | ./scripts/email-guesser.sh - [output.csv]
#
# Generates 3 email permutations per person, verifies with Reacher (proxy),
# returns first "safe" email found.

set -euo pipefail

# ─── Database integration (optional, backward-compatible) ─────────────
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
if [[ -f "$SCRIPT_DIR/db-query.sh" ]]; then
  source "$SCRIPT_DIR/db-query.sh"
else
  DB_ENABLED="false"
fi

# Write Reacher verification result to DB
db_write_reacher() {
  [[ "$DB_ENABLED" != "true" ]] && return 0
  local email="$1" response="$2"

  python3 -c "
import json, sys

def sql_escape(val):
    if val is None: return 'NULL'
    s = str(val).replace(\"'\", \"''\")
    return f\"'{s}'\"

resp = json.loads('''$response''')
smtp = resp.get('smtp', {})
misc = resp.get('misc', {})

is_reachable = resp.get('is_reachable', 'unknown')
deliverable = 1 if smtp.get('is_deliverable') else 0
catch_all = 1 if smtp.get('is_catch_all') else 0
disposable = 1 if misc.get('is_disposable') else 0
role = 1 if misc.get('is_role_account') else 0

if is_reachable == 'safe' and not disposable and not role:
    verdict = 'safe'
elif is_reachable == 'invalid':
    verdict = 'invalid'
elif is_reachable == 'risky' or disposable or role or catch_all:
    verdict = 'risky'
else:
    verdict = 'unknown'

reasons = []
if disposable: reasons.append('disposable')
if role: reasons.append('role-account')
if catch_all: reasons.append('catch-all')
reason = ', '.join(reasons) if reasons else None

raw = json.dumps(resp)

print(f\"\"\"INSERT INTO email_verifications (email, is_reachable, smtp_deliverable, smtp_catch_all, is_disposable, is_role_account, verdict, verdict_reason, reacher_raw) VALUES ({sql_escape('$email')}, {sql_escape(is_reachable)}, {deliverable}, {catch_all}, {disposable}, {role}, {sql_escape(verdict)}, {sql_escape(reason) if reason else 'NULL'}, {sql_escape(raw)});\"\"\")
" 2>/dev/null | while IFS= read -r sql; do
    db_exec "$sql" 2>/dev/null || true
  done
}

# Write No2Bounce result to DB (updates existing verification row)
db_write_n2b() {
  [[ "$DB_ENABLED" != "true" ]] && return 0
  local email="$1" tracking_id="$2" score_status="$3"

  local esc_email esc_tid esc_status
  esc_email=$(sql_escape "$email")
  esc_tid=$(sql_escape "$tracking_id")
  esc_status=$(sql_escape "$score_status")

  local new_verdict="risky"
  if [[ "$score_status" == *"Deliverable"* && "$score_status" != *"UnDeliverable"* ]]; then
    new_verdict="safe"
  fi

  db_exec "UPDATE email_verifications SET n2b_tracking_id = '$esc_tid', n2b_score_status = '$esc_status', verdict = '$new_verdict' WHERE email = '$esc_email' AND id = (SELECT MAX(id) FROM email_verifications WHERE email = '$esc_email');" 2>/dev/null || true
}

# Link verified email to lead record
db_update_lead_email() {
  [[ "$DB_ENABLED" != "true" ]] && return 0
  local email="$1" first="$2" last="$3" domain="$4"

  local esc_email esc_first esc_last esc_domain
  esc_email=$(sql_escape "$email")
  esc_first=$(sql_escape "$first")
  esc_last=$(sql_escape "$last")
  esc_domain=$(sql_escape "$domain")

  # Try to update existing lead by name+domain
  db_exec "UPDATE leads SET email = '$esc_email', pipeline_status = 'verified', updated_at = datetime('now') WHERE first_name = '$esc_first' AND last_name = '$esc_last' AND company_domain = '$esc_domain' AND (email IS NULL OR email = '');" 2>/dev/null || true
}

# Write lead_event for verification result
db_write_lead_event() {
  [[ "$DB_ENABLED" != "true" ]] && return 0
  local email="$1" event_type="$2" event_data="$3"

  local esc_email
  esc_email=$(sql_escape "$email")

  db_exec "INSERT INTO lead_events (lead_id, event_type, event_data, source)
    SELECT id, '$event_type', '$(sql_escape "$event_data")', 'email_guesser'
    FROM leads WHERE email = '$esc_email' LIMIT 1;" 2>/dev/null || true
}
# ─── End database integration ─────────────────────────────────────────

# Reacher proxy endpoint (primary verifier) — secrets loaded from .env via db-query.sh above.
# Secrets MUST live in .env (gitignored), never hardcoded. Set these in your .env:
#   REACHER_CF_CLIENT_ID, REACHER_CF_CLIENT_SECRET, REACHER_PROXY_USER, REACHER_PROXY_PASS, N2B_API_TOKEN
REACHER_URL="${REACHER_URL:-https://reacher.nextwave.io}"
REACHER_CF_CLIENT_ID="${REACHER_CF_CLIENT_ID:?set REACHER_CF_CLIENT_ID in .env}"
REACHER_CF_CLIENT_SECRET="${REACHER_CF_CLIENT_SECRET:?set REACHER_CF_CLIENT_SECRET in .env}"
REACHER_PROXY_HOST="${REACHER_PROXY_HOST:-r1.proxy4smtp.com}"
REACHER_PROXY_PORT="${REACHER_PROXY_PORT:-1081}"
REACHER_PROXY_USER="${REACHER_PROXY_USER:?set REACHER_PROXY_USER in .env}"
REACHER_PROXY_PASS="${REACHER_PROXY_PASS:?set REACHER_PROXY_PASS in .env}"

# No2Bounce (catch-all validator)
N2B_API_TOKEN="${N2B_API_TOKEN:?set N2B_API_TOKEN in .env}"

# Args
INPUT_FILE="${1:?Usage: email-guesser.sh <input.csv> [output.csv]}"
OUTPUT_FILE="${2:-verified-emails.csv}"

# Rate limiting
RATE_LIMIT_DELAY=1.1  # seconds between requests
REQUEST_COUNT=0

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log() { echo -e "${CYAN}[guesser]${NC} $*" >&2; }
ok()  { echo -e "${GREEN}[✓]${NC} $*" >&2; }
warn(){ echo -e "${YELLOW}[!]${NC} $*" >&2; }
err() { echo -e "${RED}[✗]${NC} $*" >&2; }

# Generate email permutations for a person
generate_permutations() {
  local first="$1" last="$2" domain="$3"

  # Normalize: lowercase, remove special chars
  first=$(echo "$first" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z]//g')
  last=$(echo "$last" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z]//g')

  if [[ -z "$first" || -z "$last" || -z "$domain" ]]; then
    return 1
  fi

  local first_initial="${first:0:1}"

  # 3 highest-probability patterns for small businesses (<100 employees)
  echo "${first}@${domain}"            # john@acme.com
  echo "${first}.${last}@${domain}"    # john.smith@acme.com
  echo "${first_initial}${last}@${domain}"  # jsmith@acme.com
}

# Verify a single email with Reacher (proxy endpoint)
verify_email() {
  local email="$1"
  ((REQUEST_COUNT++))

  curl -s -X POST "${REACHER_URL}/v1/check_email" \
    -H "Content-Type: application/json" \
    -H "CF-Access-Client-Id: ${REACHER_CF_CLIENT_ID}" \
    -H "CF-Access-Client-Secret: ${REACHER_CF_CLIENT_SECRET}" \
    -d "{
      \"to_email\": \"${email}\",
      \"proxy\": {
        \"host\": \"${REACHER_PROXY_HOST}\",
        \"port\": ${REACHER_PROXY_PORT},
        \"username\": \"${REACHER_PROXY_USER}\",
        \"password\": \"${REACHER_PROXY_PASS}\"
      }
    }" \
    --max-time 45
}

# Check if email is "safe" (deliverable and not risky)
is_safe_email() {
  local response="$1"

  local reachable
  reachable=$(echo "$response" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    r = d.get('is_reachable', 'unknown')
    misc = d.get('misc', {})
    is_disposable = misc.get('is_disposable', False)
    is_role = misc.get('is_role_account', False)
    if is_disposable or is_role:
        print('risky')
    else:
        print(r)
except:
    print('unknown')
" 2>/dev/null)

  [[ "$reachable" == "safe" ]]
}

# Check if Reacher response is catch-all
is_catch_all() {
  local response="$1"
  echo "$response" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    catch_all = d.get('smtp', {}).get('is_catch_all', False)
    deliverable = d.get('smtp', {}).get('is_deliverable', False)
    print('yes' if catch_all and deliverable else 'no')
except:
    print('no')
" 2>/dev/null
}

# Validate catch-all email via No2Bounce (single email endpoint)
# Returns: "deliverable", "undeliverable", "pending", or "error:..."
verify_catch_all_n2b() {
  local email="$1"

  # Step 1: Submit email for validation
  local submit_response
  submit_response=$(curl -s -X POST 'https://connect.no2bounce.com/v2/n2b_validate_email' \
    -H "apitoken: ${N2B_API_TOKEN}" \
    -H 'Content-Type: application/json' \
    -d "{\"email\": \"${email}\"}" \
    --max-time 30)

  local tracking_id
  tracking_id=$(echo "$submit_response" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    print(d.get('data', {}).get('trackingId', ''))
except:
    print('')
" 2>/dev/null)

  if [[ -z "$tracking_id" ]]; then
    echo "error:no-tracking-id"
    return 1
  fi

  # Step 2: Poll for results (up to 3 attempts with 3s delay)
  local attempts=0
  while [[ $attempts -lt 3 ]]; do
    sleep 3

    local result
    result=$(curl -s -X GET "https://connect.no2bounce.com/v2/n2b_validate_email?trackingId=${tracking_id}" \
      -H "apitoken: ${N2B_API_TOKEN}" \
      --max-time 30)

    local status score_status
    read -r status score_status < <(echo "$result" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    overall = d.get('overallStatus', '')
    score_status = d.get('result', {}).get('scoreStatus', '')
    print(f'{overall} {score_status}')
except:
    print('error unknown')
" 2>/dev/null)

    if [[ "$status" == "Completed" ]]; then
      # scoreStatus contains delivery verdict
      # "Deliverable" = real mailbox, "UnDeliverable/AcceptAll" = catch-all fake
      if [[ "$score_status" == *"Deliverable"* && "$score_status" != *"UnDeliverable"* ]]; then
        echo "deliverable"
      else
        echo "undeliverable"
      fi
      return 0
    fi

    ((attempts++))
  done

  echo "pending"
}

# Get reachability status from response
get_status() {
  local response="$1"
  echo "$response" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    r = d.get('is_reachable', 'unknown')
    misc = d.get('misc', {})
    smtp = d.get('smtp', {})

    is_disposable = misc.get('is_disposable', False)
    is_role = misc.get('is_role_account', False)
    is_catch_all = smtp.get('is_catch_all', False)

    extras = []
    if is_disposable: extras.append('disposable')
    if is_role: extras.append('role-account')
    if is_catch_all: extras.append('catch-all')

    joined = ', '.join(extras)
    suffix = f' ({joined})' if extras else ''
    print(f'{r}{suffix}')
except:
    print('error')
" 2>/dev/null
}

# Main: Single verification mode (one-by-one with rate limiting)
process_single() {
  local input="$1"
  local output="$2"

  # Write header
  echo "firstName,lastName,domain,verifiedEmail,status,allGuesses" > "$output"

  local total=0 found=0

  # Count lines for progress
  local line_count
  if [[ "$input" == "-" ]]; then
    line_count="?"
  else
    line_count=$(tail -n +2 "$input" | wc -l | tr -d ' ')
  fi

  log "Processing $line_count leads..."
  log "Rate: ~1 verification/sec, 3 guesses/person"
  echo ""

  # Read CSV (skip header if present)
  local line_num=0
  while IFS=',' read -r first last domain rest; do
    ((line_num++))

    # Skip header row
    if [[ "$line_num" -eq 1 ]] && [[ "$first" =~ ^[Ff]irst ]]; then
      continue
    fi

    # Trim whitespace
    first=$(echo "$first" | xargs)
    last=$(echo "$last" | xargs)
    domain=$(echo "$domain" | xargs)

    if [[ -z "$first" || -z "$last" || -z "$domain" ]]; then
      warn "Skipping invalid row $line_num: '$first,$last,$domain'"
      continue
    fi

    ((total++))
    log "[$total/$line_count] $first $last @ $domain"

    # Generate permutations
    local guesses
    guesses=$(generate_permutations "$first" "$last" "$domain")
    local all_guesses
    all_guesses=$(echo "$guesses" | tr '\n' '|' | sed 's/|$//')

    local verified_email=""
    local final_status="no-match"

    # Try each permutation
    while IFS= read -r guess; do
      [[ -z "$guess" ]] && continue

      # Rate limit
      sleep "$RATE_LIMIT_DELAY"

      local response
      response=$(verify_email "$guess")
      local status
      status=$(get_status "$response")

      log "  → $guess: $status"

      # Write Reacher result to DB
      db_write_reacher "$guess" "$response"

      if is_safe_email "$response"; then
        verified_email="$guess"
        final_status="safe"
        ok "  FOUND: $guess"
        db_write_lead_event "$guess" "verified" "{\"method\":\"reacher\",\"verdict\":\"safe\"}"
        break
      else
        db_write_lead_event "$guess" "verification_failed" "{\"method\":\"reacher\",\"verdict\":\"$status\"}"
      fi

      # Catch-all: Reacher says deliverable but catch-all → validate with No2Bounce
      if [[ "$(is_catch_all "$response")" == "yes" ]]; then
        log "  → Catch-all detected, validating with No2Bounce..."
        local n2b_result
        n2b_result=$(verify_catch_all_n2b "$guess")
        log "  → No2Bounce: $n2b_result"

        # Write No2Bounce result to DB (tracking_id not in scope, pass result only)
        db_write_n2b "$guess" "" "$n2b_result"

        if [[ "$n2b_result" == "deliverable" ]]; then
          verified_email="$guess"
          final_status="safe (catch-all verified)"
          ok "  FOUND (catch-all verified): $guess"
          db_write_lead_event "$guess" "verified" "{\"method\":\"n2b_catchall\",\"verdict\":\"deliverable\"}"
          break
        else
          warn "  Catch-all rejected by No2Bounce: $n2b_result"
          db_write_lead_event "$guess" "verification_failed" "{\"method\":\"n2b_catchall\",\"verdict\":\"$n2b_result\"}"
        fi
      fi
    done <<< "$guesses"

    if [[ -z "$verified_email" ]]; then
      warn "  No valid email found for $first $last"
    else
      ((found++))
      # Link verified email to lead in DB
      db_update_lead_email "$verified_email" "$first" "$last" "$domain"
    fi

    # Write result
    echo "$first,$last,$domain,$verified_email,$final_status,$all_guesses" >> "$output"

  done < <(if [[ "$input" == "-" ]]; then cat; else cat "$input"; fi)

  echo ""
  log "═══════════════════════════════════════"
  log "Results: $found/$total verified ($((found * 100 / (total > 0 ? total : 1)))%)"
  log "Total API calls: $REQUEST_COUNT"
  log "Output: $output"
  log "═══════════════════════════════════════"
}

# Entry point
main() {
  log "Email Guesser + Reacher Verification Pipeline"
  log "Reacher endpoint: $REACHER_URL (proxy: $REACHER_PROXY_HOST)"
  echo ""

  process_single "$INPUT_FILE" "$OUTPUT_FILE"
}

main
