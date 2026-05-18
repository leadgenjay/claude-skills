#!/usr/bin/env bash
# Sync campaign analytics from Email Bison + Instantly into database
#
# Usage:
#   ./scripts/sync-analytics.sh                    # sync all
#   ./scripts/sync-analytics.sh --sequencer instantly
#   ./scripts/sync-analytics.sh --sequencer email_bison

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/db-query.sh"

if [[ "$DB_ENABLED" != "true" ]]; then
  echo "ERROR: Database not configured. Run scripts/db-setup.sh first." >&2
  exit 1
fi

# Load API keys from .env (already loaded by db-query.sh)
EMAIL_BISON_API_KEY="${EMAIL_BISON_API_KEY:-}"
INSTANTLY_API_KEY="${INSTANTLY_API_KEY:-}"

SEQUENCER_FILTER="${2:-all}"

# Parse args
while [[ $# -gt 0 ]]; do
  case "$1" in
    --sequencer) SEQUENCER_FILTER="$2"; shift 2 ;;
    *) shift ;;
  esac
done

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log() { echo -e "${CYAN}[sync]${NC} $*" >&2; }
ok()  { echo -e "${GREEN}[✓]${NC} $*" >&2; }
warn(){ echo -e "${YELLOW}[!]${NC} $*" >&2; }
err() { echo -e "${RED}[✗]${NC} $*" >&2; }

# ─── Email Bison ──────────────────────────────────────────────────────

sync_email_bison() {
  if [[ -z "$EMAIL_BISON_API_KEY" ]]; then
    warn "EMAIL_BISON_API_KEY not set, skipping Email Bison sync"
    return
  fi

  log "Syncing Email Bison campaigns..."

  # Fetch campaigns list
  local campaigns_json
  campaigns_json=$(curl -s -X GET "https://dedi.emailbison.com/api/campaigns" \
    -H "Authorization: Bearer ${EMAIL_BISON_API_KEY}" \
    -H "Accept: application/json" \
    --max-time 30)

  # Parse and insert analytics
  python3 -c "
import json, sys

def sql_escape(val):
    if val is None:
        return 'NULL'
    s = str(val).replace(\"'\", \"''\")
    return f\"'{s}'\"

data = json.loads('''${campaigns_json}''')
campaigns = data if isinstance(data, list) else data.get('data', [])

for c in campaigns:
    cid = c.get('id', '')
    name = c.get('name', '')
    stats = c.get('stats', c)

    sent = int(stats.get('total_sent', stats.get('sent', 0)) or 0)
    opened = int(stats.get('total_opened', stats.get('opened', 0)) or 0)
    replied = int(stats.get('total_replied', stats.get('replied', 0)) or 0)
    bounced = int(stats.get('total_bounced', stats.get('bounced', 0)) or 0)

    open_rate = round(opened / sent * 100, 2) if sent > 0 else 0
    reply_rate = round(replied / sent * 100, 2) if sent > 0 else 0
    bounce_rate = round(bounced / sent * 100, 2) if sent > 0 else 0

    print(f\"\"\"INSERT INTO campaign_analytics (sequencer, campaign_id, campaign_name, total_sent, total_opened, total_replied, total_bounced, open_rate, reply_rate, bounce_rate) VALUES ('email_bison', {sql_escape(str(cid))}, {sql_escape(name)}, {sent}, {opened}, {replied}, {bounced}, {open_rate}, {reply_rate}, {bounce_rate});\"\"\")
" 2>/dev/null | while IFS= read -r sql; do
    db_exec "$sql"
  done

  ok "Email Bison campaigns synced"
}

# ─── Instantly ────────────────────────────────────────────────────────

sync_instantly() {
  if [[ -z "$INSTANTLY_API_KEY" ]]; then
    warn "INSTANTLY_API_KEY not set, skipping Instantly sync"
    return
  fi

  log "Syncing Instantly campaigns..."

  # Fetch campaigns list
  local campaigns_json
  campaigns_json=$(curl -s -X GET "https://api.instantly.ai/api/v2/campaigns" \
    -H "Authorization: Bearer ${INSTANTLY_API_KEY}" \
    -H "Content-Type: application/json" \
    --max-time 30)

  # Extract campaign IDs and fetch analytics per campaign
  local campaign_ids
  campaign_ids=$(python3 -c "
import json
data = json.loads('''${campaigns_json}''')
items = data if isinstance(data, list) else data.get('data', data.get('items', []))
for c in items:
    print(c.get('id', '') + '|' + (c.get('name', '') or ''))
" 2>/dev/null)

  while IFS='|' read -r cid cname; do
    [[ -z "$cid" ]] && continue

    # Fetch campaign analytics
    local analytics_json
    analytics_json=$(curl -s -X GET "https://api.instantly.ai/api/v2/campaigns/${cid}/analytics" \
      -H "Authorization: Bearer ${INSTANTLY_API_KEY}" \
      -H "Content-Type: application/json" \
      --max-time 30)

    python3 -c "
import json

def sql_escape(val):
    if val is None:
        return 'NULL'
    s = str(val).replace(\"'\", \"''\")
    return f\"'{s}'\"

data = json.loads('''${analytics_json}''')

sent = int(data.get('total_sent', data.get('sent', 0)) or 0)
opened = int(data.get('total_opened', data.get('opened', 0)) or 0)
replied = int(data.get('total_replied', data.get('replied', 0)) or 0)
bounced = int(data.get('total_bounced', data.get('bounced', 0)) or 0)

open_rate = round(opened / sent * 100, 2) if sent > 0 else 0
reply_rate = round(replied / sent * 100, 2) if sent > 0 else 0
bounce_rate = round(bounced / sent * 100, 2) if sent > 0 else 0

cid_esc = sql_escape('${cid}')
cname_esc = sql_escape('''${cname}''')

print(f\"\"\"INSERT INTO campaign_analytics (sequencer, campaign_id, campaign_name, total_sent, total_opened, total_replied, total_bounced, open_rate, reply_rate, bounce_rate) VALUES ('instantly', {cid_esc}, {cname_esc}, {sent}, {opened}, {replied}, {bounced}, {open_rate}, {reply_rate}, {bounce_rate});\"\"\")
" 2>/dev/null | while IFS= read -r sql; do
      db_exec "$sql"
    done

  done <<< "$campaign_ids"

  ok "Instantly campaigns synced"
}

# ─── Email Bison V2: Per-Lead Sent Emails ─────────────────────────────

sync_eb_sent_emails() {
  if [[ -z "$EMAIL_BISON_API_KEY" ]]; then
    warn "EMAIL_BISON_API_KEY not set, skipping Email Bison sent-email sync"
    return
  fi

  log "Syncing Email Bison per-lead sent emails..."

  local assignments
  assignments=$(db_query "SELECT id, lead_id, campaign_id FROM campaign_assignments WHERE sequencer='email_bison';")

  local count=0
  while IFS=$'\t' read -r assignment_id lead_id campaign_id; do
    [[ -z "$assignment_id" || "$assignment_id" == "id" ]] && continue

    local sent_json
    sent_json=$(curl -s -X GET \
      "https://dedi.emailbison.com/api/campaigns/${campaign_id}/leads/${lead_id}/sent-emails" \
      -H "Authorization: Bearer ${EMAIL_BISON_API_KEY}" \
      -H "Accept: application/json" \
      --max-time 30)

    python3 -c "
import json, sys

def sql_escape(val):
    if val is None:
        return 'NULL'
    s = str(val).replace(\"'\", \"''\")
    return f\"'{s}'\"

try:
    data = json.loads('''${sent_json}''')
except Exception:
    sys.exit(0)

emails = data if isinstance(data, list) else data.get('data', [])

for e in emails:
    eid        = sql_escape(str(e.get('id', '')))
    step       = int(e.get('sequence_step', e.get('step', 0)) or 0)
    subject    = sql_escape(e.get('subject', ''))
    status     = sql_escape(e.get('status', 'sent'))
    sent_at    = sql_escape(e.get('sent_at', e.get('sentAt', '')))
    opens      = int(e.get('opens', 0) or 0)
    u_opens    = int(e.get('unique_opens', e.get('uniqueOpens', 0)) or 0)
    clicks     = int(e.get('clicks', 0) or 0)
    replied    = int(e.get('replied', 0) or 0)
    interested = int(e.get('interested', 0) or 0)

    # Insert sent_email if not already present
    print(f\"\"\"INSERT INTO sent_emails (assignment_id, lead_id, sequencer, sequencer_email_id, sequence_step, subject, status, sent_at, opens, unique_opens, clicks, replied, interested) SELECT ${assignment_id}, ${lead_id}, 'email_bison', {eid}, {step}, {subject}, {status}, {sent_at}, {opens}, {u_opens}, {clicks}, {replied}, {interested} WHERE NOT EXISTS (SELECT 1 FROM sent_emails WHERE sequencer_email_id={eid} AND sequencer='email_bison');\"\"\")

    # Insert lead_event for new sent email
    event_data = sql_escape(json.dumps({{'campaign_id': '${campaign_id}', 'step': step}}))
    print(f\"\"\"INSERT INTO lead_events (lead_id, event_type, source, event_data) SELECT ${lead_id}, 'email_sent', 'sync_eb', {event_data} WHERE NOT EXISTS (SELECT 1 FROM sent_emails WHERE sequencer_email_id={eid} AND sequencer='email_bison');\"\"\")
" 2>/dev/null | while IFS= read -r sql; do
      db_exec "$sql"
      count=$((count + 1))
    done

  done <<< "$assignments"

  ok "Email Bison sent emails synced"
}

# ─── Email Bison V2: Replies ───────────────────────────────────────────

sync_eb_replies() {
  if [[ -z "$EMAIL_BISON_API_KEY" ]]; then
    warn "EMAIL_BISON_API_KEY not set, skipping Email Bison reply sync"
    return
  fi

  log "Syncing Email Bison replies..."

  local assignments
  assignments=$(db_query "SELECT id, lead_id, campaign_id FROM campaign_assignments WHERE sequencer='email_bison';")

  while IFS=$'\t' read -r assignment_id lead_id campaign_id; do
    [[ -z "$assignment_id" || "$assignment_id" == "id" ]] && continue

    local replies_json
    replies_json=$(curl -s -X GET \
      "https://dedi.emailbison.com/api/campaigns/${campaign_id}/leads/${lead_id}/replies" \
      -H "Authorization: Bearer ${EMAIL_BISON_API_KEY}" \
      -H "Accept: application/json" \
      --max-time 30)

    python3 -c "
import json, sys

def sql_escape(val):
    if val is None:
        return 'NULL'
    s = str(val).replace(\"'\", \"''\")
    return f\"'{s}'\"

try:
    data = json.loads('''${replies_json}''')
except Exception:
    sys.exit(0)

replies = data if isinstance(data, list) else data.get('data', [])

for r in replies:
    rid        = sql_escape(str(r.get('id', '')))
    replied_at = sql_escape(r.get('replied_at', r.get('repliedAt', '')))
    folder     = sql_escape(r.get('folder', 'inbox'))

    print(f\"\"\"INSERT INTO replies (lead_id, assignment_id, sequencer, sequencer_reply_id, classification, replied_at, folder) SELECT ${lead_id}, ${assignment_id}, 'email_bison', {rid}, 'interested', {replied_at}, {folder} WHERE NOT EXISTS (SELECT 1 FROM replies WHERE sequencer_reply_id={rid} AND sequencer='email_bison');\"\"\")

    print(f\"\"\"INSERT INTO lead_events (lead_id, event_type, source) SELECT ${lead_id}, 'replied', 'sync_eb' WHERE NOT EXISTS (SELECT 1 FROM replies WHERE sequencer_reply_id={rid} AND sequencer='email_bison');\"\"\")

    # Update lead replied_at and interest_status
    print(f\"\"\"UPDATE leads SET replied_at=COALESCE(replied_at, {replied_at}), interest_status='interested', updated_at=datetime('now') WHERE id=${lead_id};\"\"\")
" 2>/dev/null | while IFS= read -r sql; do
      db_exec "$sql"
    done

  done <<< "$assignments"

  ok "Email Bison replies synced"
}

# ─── A/B Test Results ─────────────────────────────────────────────────

sync_ab_test_results() {
  log "Syncing A/B test results..."

  local variants
  variants=$(db_query "SELECT id, campaign_id FROM copy_variants;")

  while IFS=$'\t' read -r variant_id campaign_id; do
    [[ -z "$variant_id" || "$variant_id" == "id" ]] && continue

    python3 -c "
import json

variant_id  = ${variant_id}
campaign_id = '$(echo "${campaign_id}" | sed "s/'/\\'\\'/g")'

agg_sql = (
    f\"SELECT COUNT(*) AS total_sent, \"
    f\"SUM(opens) AS total_opened, \"
    f\"SUM(replied) AS total_replied, \"
    f\"SUM(CASE WHEN status='bounced' THEN 1 ELSE 0 END) AS total_bounced, \"
    f\"SUM(interested) AS total_interested \"
    f\"FROM sent_emails WHERE variant_id={variant_id};\"
)
print(agg_sql)
" 2>/dev/null | while IFS= read -r agg_sql; do
      local agg
      agg=$(db_query "$agg_sql" | tail -n +2 | head -1)
      if [[ -z "$agg" ]]; then continue; fi

      python3 -c "
import json

row = '''${agg}'''.strip().split('\t')
def iv(x): return int(x) if x and x != '' else 0

total_sent       = iv(row[0]) if len(row) > 0 else 0
total_opened     = iv(row[1]) if len(row) > 1 else 0
total_replied    = iv(row[2]) if len(row) > 2 else 0
total_bounced    = iv(row[3]) if len(row) > 3 else 0
total_interested = iv(row[4]) if len(row) > 4 else 0

open_rate     = round(total_opened     / total_sent * 100, 2) if total_sent > 0 else 0
reply_rate    = round(total_replied    / total_sent * 100, 2) if total_sent > 0 else 0
interest_rate = round(total_interested / total_sent * 100, 2) if total_sent > 0 else 0

cid = '''${campaign_id}'''.replace(\"'\", \"''\")

print(f\"INSERT INTO ab_test_results (variant_id, campaign_id, total_sent, total_opened, total_replied, total_bounced, total_interested, open_rate, reply_rate, interest_rate, calculated_at) VALUES (${variant_id}, '{cid}', {total_sent}, {total_opened}, {total_replied}, {total_bounced}, {total_interested}, {open_rate}, {reply_rate}, {interest_rate}, datetime('now'));\")
" 2>/dev/null | while IFS= read -r sql; do
        db_exec "$sql"
      done
    done

  done <<< "$variants"

  ok "A/B test results synced"
}

# ─── Main ─────────────────────────────────────────────────────────────

main() {
  log "Campaign Analytics Sync"
  log "======================="
  echo ""

  if [[ "$SEQUENCER_FILTER" == "all" || "$SEQUENCER_FILTER" == "email_bison" ]]; then
    sync_email_bison
    sync_eb_sent_emails
    sync_eb_replies
  fi

  if [[ "$SEQUENCER_FILTER" == "all" || "$SEQUENCER_FILTER" == "instantly" ]]; then
    sync_instantly
  fi

  sync_ab_test_results

  echo ""
  local total
  total=$(db_scalar "SELECT COUNT(*) FROM campaign_analytics;")
  ok "Sync complete — $total total analytics snapshots"
}

main
