#!/usr/bin/env bash
# Import Apify JSON or CSV into leads table with scrape_jobs tracking
# Maps fields per actor (leads-finder, xmiso, compass)
#
# Usage:
#   ./scripts/import-leads.sh <file.json|file.csv> [actor-name] [--run-id ID] [--dataset-id ID]
#   cat data.json | ./scripts/import-leads.sh - [actor-name]
#
# Actor names: leads-finder, xmiso, compass
# Auto-detects actor from field names if not specified.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/db-query.sh"

if [[ "$DB_ENABLED" != "true" ]]; then
  echo "ERROR: Database not configured. Run scripts/db-setup.sh first." >&2
  exit 1
fi

# Args
INPUT_FILE="${1:?Usage: import-leads.sh <file.json|file.csv> [actor-name] [--run-id ID] [--dataset-id ID]}"
ACTOR_NAME="${2:-auto}"
APIFY_RUN_ID=""
DATASET_ID=""

# Parse optional flags
shift 2 2>/dev/null || shift $# 2>/dev/null
while [[ $# -gt 0 ]]; do
  case "$1" in
    --run-id) APIFY_RUN_ID="$2"; shift 2 ;;
    --dataset-id) DATASET_ID="$2"; shift 2 ;;
    *) shift ;;
  esac
done

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log() { echo -e "${CYAN}[import]${NC} $*" >&2; }
ok()  { echo -e "${GREEN}[✓]${NC} $*" >&2; }
warn(){ echo -e "${YELLOW}[!]${NC} $*" >&2; }
err() { echo -e "${RED}[✗]${NC} $*" >&2; }

# Read input
read_input() {
  if [[ "$INPUT_FILE" == "-" ]]; then
    cat
  else
    cat "$INPUT_FILE"
  fi
}

# Detect if input is JSON array or CSV
detect_format() {
  local first_char
  first_char=$(read_input | head -c1)
  if [[ "$first_char" == "[" || "$first_char" == "{" ]]; then
    echo "json"
  else
    echo "csv"
  fi
}

# Import JSON using python3 for parsing and SQL generation
import_json() {
  local raw_data
  raw_data=$(read_input)

  python3 -c "
import json, sys, re

def sql_escape(val):
    if val is None:
        return 'NULL'
    s = str(val).replace(\"'\", \"''\")
    return f\"'{s}'\"

def detect_actor(item):
    keys = set(item.keys())
    if 'personal_email' in keys or 'seniority_level' in keys:
        return 'leads-finder'
    if 'business_status' in keys or 'place_id' in keys or 'reviews' in keys:
        return 'compass'
    if 'category' in keys and 'business_email' in keys:
        return 'xmiso'
    if 'job_title' in keys and 'company_name' in keys and 'id' in keys:
        return 'consulti'
    return 'unknown'

def map_leads_finder(item):
    return {
        'first_name': item.get('first_name'),
        'last_name': item.get('last_name'),
        'email': item.get('email'),
        'personal_email': item.get('personal_email'),
        'phone': item.get('phone'),
        'mobile': item.get('mobile_number'),
        'job_title': item.get('job_title'),
        'seniority': item.get('seniority_level'),
        'linkedin_url': item.get('linkedin'),
        'company_name': item.get('company_name'),
        'company_domain': item.get('company_domain'),
        'company_website': item.get('company_website'),
        'industry': item.get('industry'),
        'company_size': item.get('company_size'),
        'company_revenue': item.get('company_annual_revenue'),
        'city': item.get('city'),
        'state': item.get('state'),
        'country': item.get('country'),
    }

def map_xmiso(item):
    emails = item.get('email') or item.get('business_email') or ''
    email = emails.split(',')[0].strip() if isinstance(emails, str) else emails
    return {
        'email': email if email else None,
        'company_name': item.get('name') or item.get('business_name'),
        'company_domain': item.get('website', '').replace('https://', '').replace('http://', '').rstrip('/') if item.get('website') else None,
        'company_website': item.get('website'),
        'phone': item.get('phone'),
        'city': item.get('city'),
        'state': item.get('state'),
        'country': 'US',
        'google_place_id': item.get('place_id'),
        'business_phone': item.get('phone'),
        'business_rating': item.get('rating'),
        'reviews_count': item.get('reviews'),
        'industry': item.get('category'),
    }

def map_compass(item):
    return {
        'company_name': item.get('title') or item.get('name'),
        'company_website': item.get('website'),
        'company_domain': item.get('website', '').replace('https://', '').replace('http://', '').split('/')[0] if item.get('website') else None,
        'phone': item.get('phone'),
        'city': item.get('city'),
        'state': item.get('state'),
        'country': item.get('country', 'US'),
        'google_place_id': item.get('placeId') or item.get('place_id'),
        'business_phone': item.get('phone'),
        'business_rating': item.get('totalScore') or item.get('rating'),
        'reviews_count': item.get('reviewsCount') or item.get('reviews'),
    }

def map_consulti(item):
    return {
        'first_name': item.get('first_name'),
        'last_name': item.get('last_name'),
        'email': item.get('email'),
        'job_title': item.get('job_title'),
        'company_name': item.get('company_name'),
        'company_domain': item.get('company_domain'),
        'industry': item.get('industry'),
        'company_size': item.get('company_size'),
        'city': item.get('city'),
        'state': item.get('state'),
        'country': item.get('country', 'United States'),
        'linkedin_url': item.get('linkedin'),
        'phone': item.get('phone'),
        'icp_tier': item.get('icp_tier'),
    }

MAPPERS = {
    'leads-finder': map_leads_finder,
    'xmiso': map_xmiso,
    'compass': map_compass,
    'consulti': map_consulti,
}

raw = '''${raw_data}'''
data = json.loads(raw) if raw.strip() else []
if isinstance(data, dict):
    data = [data]

actor = '${ACTOR_NAME}'
if actor == 'auto' and data:
    actor = detect_actor(data[0])

mapper = MAPPERS.get(actor)
if not mapper:
    # Fallback: try to map common field names
    mapper = map_leads_finder

total = len(data)
imported = 0
skipped = 0

LEAD_COLS = [
    'first_name','last_name','email','personal_email','phone','mobile',
    'job_title','seniority','linkedin_url','company_name','company_domain',
    'company_website','industry','company_size','company_revenue',
    'city','state','country','google_place_id','business_phone',
    'business_rating','reviews_count','source_actor','source_type','raw_data',
    'icp_tier'
]

for item in data:
    mapped = mapper(item)

    # Skip if no email AND no company_domain (can't deduplicate)
    if not mapped.get('email') and not mapped.get('company_domain'):
        skipped += 1
        continue

    mapped['source_actor'] = actor
    mapped['source_type'] = 'apify'
    mapped['raw_data'] = json.dumps(item)

    vals = []
    for col in LEAD_COLS:
        v = mapped.get(col)
        if v is None or v == '':
            vals.append('NULL')
        elif isinstance(v, (int, float)):
            vals.append(str(v))
        else:
            vals.append(sql_escape(v))

    sql = f\"\"\"INSERT OR IGNORE INTO leads ({','.join(LEAD_COLS)}) VALUES ({','.join(vals)});\"\"\"
    print(sql)

    if mapped.get('email'):
        event_data = json.dumps({
            'actor': actor,
            'scrape_job_id': '${job_id:-}',
            'company': mapped.get('company_name') or '',
        })
        esc_email = sql_escape(mapped['email'])
        esc_event = sql_escape(event_data)
        event_sql = f\"\"\"INSERT INTO lead_events (lead_id, event_type, event_data, source) SELECT id, 'scraped', {esc_event}, 'import' FROM leads WHERE email = {esc_email} LIMIT 1;\"\"\"
        print(event_sql)

    imported += 1

# Print summary to stderr
print(f'-- SUMMARY: total={total} imported={imported} skipped={skipped} actor={actor}', file=sys.stderr)
" 2>"$SCRIPT_DIR/.import-summary.tmp" | while IFS= read -r sql; do
    db_exec "$sql"
  done

  # Read summary
  local summary
  summary=$(cat "$SCRIPT_DIR/.import-summary.tmp" 2>/dev/null || echo "")
  rm -f "$SCRIPT_DIR/.import-summary.tmp"
  echo "$summary" >&2
}

# Create scrape_job record and return its ID
create_scrape_job() {
  local actor="$1" count="$2"

  local esc_actor
  esc_actor=$(sql_escape "$actor")

  local esc_run_id="NULL"
  [[ -n "$APIFY_RUN_ID" ]] && esc_run_id="'$(sql_escape "$APIFY_RUN_ID")'"

  local esc_dataset_id="NULL"
  [[ -n "$DATASET_ID" ]] && esc_dataset_id="'$(sql_escape "$DATASET_ID")'"

  db_exec "INSERT INTO scrape_jobs (actor_name, apify_run_id, dataset_id, status, results_count, started_at, completed_at)
    VALUES ('$esc_actor', $esc_run_id, $esc_dataset_id, 'completed', $count, datetime('now'), datetime('now'));"

  db_scalar "SELECT MAX(id) FROM scrape_jobs;"
}

# Main
main() {
  log "Lead Import Pipeline"
  echo ""

  local format
  format=$(detect_format)
  log "Format: $format | Actor: $ACTOR_NAME"

  if [[ "$format" == "csv" ]]; then
    err "CSV import not yet implemented — use JSON from Apify"
    exit 1
  fi

  # Count records
  local count
  count=$(read_input | python3 -c "
import sys, json
data = json.load(sys.stdin)
if isinstance(data, list):
    print(len(data))
else:
    print(1)
" 2>/dev/null)
  log "Records in file: $count"

  # Create scrape_job
  local job_id
  job_id=$(create_scrape_job "${ACTOR_NAME}" "$count")
  log "Scrape job ID: $job_id"

  # Import leads
  log "Importing leads..."
  import_json

  # Update scrape_job with imported count
  local imported_count
  imported_count=$(db_scalar "SELECT COUNT(*) FROM leads WHERE scrape_job_id IS NULL;")
  # Assign unlinked leads to this job
  db_exec "UPDATE leads SET scrape_job_id = $job_id WHERE scrape_job_id IS NULL;"
  imported_count=$(db_scalar "SELECT COUNT(*) FROM leads WHERE scrape_job_id = $job_id;")
  db_exec "UPDATE scrape_jobs SET leads_imported = $imported_count WHERE id = $job_id;"

  echo ""
  ok "Import complete — $imported_count leads linked to job #$job_id"
  local events_count
  events_count=$(db_scalar "SELECT COUNT(*) FROM lead_events WHERE source = 'import' AND created_at >= datetime('now', '-1 minute');")
  ok "Wrote $events_count lead_events audit entries"
  log "View with: turso db shell cold-email-leads \"SELECT COUNT(*) FROM leads WHERE scrape_job_id = $job_id\""
}

main
