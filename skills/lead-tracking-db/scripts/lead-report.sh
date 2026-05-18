#!/usr/bin/env bash
# CLI reports for lead tracking database
#
# Usage:
#   ./scripts/lead-report.sh summary           # Overview dashboard
#   ./scripts/lead-report.sh sources            # Leads by source/actor
#   ./scripts/lead-report.sh verification       # Verification rates
#   ./scripts/lead-report.sh campaigns          # Campaign performance
#   ./scripts/lead-report.sh stale              # Leads >30 days without action
#   ./scripts/lead-report.sh pipeline           # Pipeline funnel
#   ./scripts/lead-report.sh jobs               # Recent scrape jobs

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/db-query.sh"

if [[ "$DB_ENABLED" != "true" ]]; then
  echo "ERROR: Database not configured. Run scripts/db-setup.sh first." >&2
  exit 1
fi

REPORT="${1:-summary}"

CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BOLD='\033[1m'
NC='\033[0m'

header() { echo -e "\n${BOLD}${CYAN}$*${NC}"; echo "$(printf '─%.0s' {1..60})"; }

# ─── Summary ──────────────────────────────────────────────────────────

report_summary() {
  header "Lead Database Summary"

  local total_leads verified assigned active
  total_leads=$(db_scalar "SELECT COUNT(*) FROM leads;")
  verified=$(db_scalar "SELECT COUNT(*) FROM leads WHERE pipeline_status = 'verified';")
  assigned=$(db_scalar "SELECT COUNT(*) FROM leads WHERE pipeline_status = 'assigned';")
  active=$(db_scalar "SELECT COUNT(*) FROM leads WHERE pipeline_status = 'active';")
  local replied bounced new_leads
  replied=$(db_scalar "SELECT COUNT(*) FROM leads WHERE pipeline_status = 'replied';")
  bounced=$(db_scalar "SELECT COUNT(*) FROM leads WHERE pipeline_status = 'bounced';")
  new_leads=$(db_scalar "SELECT COUNT(*) FROM leads WHERE pipeline_status = 'new';")

  echo -e "${BOLD}Total Leads:${NC}  $total_leads"
  echo -e "  New:        $new_leads"
  echo -e "  Verified:   $verified"
  echo -e "  Assigned:   $assigned"
  echo -e "  Active:     $active"
  echo -e "  Replied:    $replied"
  echo -e "  Bounced:    $bounced"

  header "Scrape Jobs"
  local total_jobs
  total_jobs=$(db_scalar "SELECT COUNT(*) FROM scrape_jobs;")
  local total_imported
  total_imported=$(db_scalar "SELECT COALESCE(SUM(leads_imported), 0) FROM scrape_jobs;")
  echo -e "Total Jobs:   $total_jobs"
  echo -e "Total Imported: $total_imported"

  header "Verifications"
  local total_checks safe_count risky_count invalid_count
  total_checks=$(db_scalar "SELECT COUNT(*) FROM email_verifications;")
  safe_count=$(db_scalar "SELECT COUNT(*) FROM email_verifications WHERE verdict = 'safe';")
  risky_count=$(db_scalar "SELECT COUNT(*) FROM email_verifications WHERE verdict = 'risky';")
  invalid_count=$(db_scalar "SELECT COUNT(*) FROM email_verifications WHERE verdict = 'invalid';")
  echo -e "Total Checks: $total_checks"
  echo -e "  Safe:       $safe_count"
  echo -e "  Risky:      $risky_count"
  echo -e "  Invalid:    $invalid_count"

  header "Campaigns"
  local total_campaigns
  total_campaigns=$(db_scalar "SELECT COUNT(DISTINCT campaign_id) FROM campaign_assignments;")
  local total_assigned
  total_assigned=$(db_scalar "SELECT COUNT(*) FROM campaign_assignments;")
  echo -e "Active Campaigns: $total_campaigns"
  echo -e "Total Assignments: $total_assigned"
}

# ─── Sources ──────────────────────────────────────────────────────────

report_sources() {
  header "Leads by Source Actor"
  db_query "SELECT
    COALESCE(source_actor, 'unknown') AS actor,
    COUNT(*) AS total,
    SUM(CASE WHEN email IS NOT NULL THEN 1 ELSE 0 END) AS with_email,
    SUM(CASE WHEN pipeline_status = 'verified' THEN 1 ELSE 0 END) AS verified,
    SUM(CASE WHEN pipeline_status IN ('assigned','active') THEN 1 ELSE 0 END) AS in_campaign
  FROM leads
  GROUP BY source_actor
  ORDER BY total DESC;" | column -t -s $'\t'
}

# ─── Verification ────────────────────────────────────────────────────

report_verification() {
  header "Verification Rates by Verdict"
  db_query "SELECT
    verdict,
    COUNT(*) AS total,
    ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM email_verifications), 1) AS pct
  FROM email_verifications
  GROUP BY verdict
  ORDER BY total DESC;" | column -t -s $'\t'

  header "Catch-All Analysis"
  local catchall_total
  catchall_total=$(db_scalar "SELECT COUNT(*) FROM email_verifications WHERE smtp_catch_all = 1;")
  local catchall_verified
  catchall_verified=$(db_scalar "SELECT COUNT(*) FROM email_verifications WHERE smtp_catch_all = 1 AND n2b_score_status IS NOT NULL;")
  local catchall_deliverable
  catchall_deliverable=$(db_scalar "SELECT COUNT(*) FROM email_verifications WHERE smtp_catch_all = 1 AND n2b_score_status LIKE '%Deliverable%' AND n2b_score_status NOT LIKE '%UnDeliverable%';")
  echo -e "Catch-all emails:     $catchall_total"
  echo -e "N2B verified:         $catchall_verified"
  echo -e "N2B deliverable:      $catchall_deliverable"
}

# ─── Campaigns ────────────────────────────────────────────────────────

report_campaigns() {
  header "Campaign Performance (Latest Snapshot)"
  db_query "SELECT
    sequencer,
    campaign_name,
    total_sent,
    total_opened,
    total_replied,
    total_bounced,
    open_rate || '%' AS open_pct,
    reply_rate || '%' AS reply_pct,
    bounce_rate || '%' AS bounce_pct,
    synced_at
  FROM campaign_analytics ca1
  WHERE synced_at = (SELECT MAX(synced_at) FROM campaign_analytics ca2 WHERE ca2.campaign_id = ca1.campaign_id AND ca2.sequencer = ca1.sequencer)
  ORDER BY total_sent DESC;" | column -t -s $'\t'
}

# ─── Stale Leads ──────────────────────────────────────────────────────

report_stale() {
  header "Stale Leads (>30 days, still 'new')"
  db_query "SELECT
    id, first_name, last_name, email, company_name, source_actor,
    created_at,
    CAST(julianday('now') - julianday(created_at) AS INTEGER) AS days_old
  FROM leads
  WHERE pipeline_status = 'new'
    AND julianday('now') - julianday(created_at) > 30
  ORDER BY created_at ASC
  LIMIT 50;" | column -t -s $'\t'

  local stale_count
  stale_count=$(db_scalar "SELECT COUNT(*) FROM leads WHERE pipeline_status = 'new' AND julianday('now') - julianday(created_at) > 30;")
  echo -e "\n${YELLOW}Total stale leads: $stale_count${NC}"
}

# ─── Pipeline ─────────────────────────────────────────────────────────

report_pipeline() {
  header "Pipeline Funnel"
  db_query "SELECT
    pipeline_status AS stage,
    COUNT(*) AS count,
    ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM leads), 1) AS pct
  FROM leads
  GROUP BY pipeline_status
  ORDER BY
    CASE pipeline_status
      WHEN 'new' THEN 1
      WHEN 'verified' THEN 2
      WHEN 'assigned' THEN 3
      WHEN 'active' THEN 4
      WHEN 'replied' THEN 5
      WHEN 'bounced' THEN 6
    END;" | column -t -s $'\t'
}

# ─── Jobs ─────────────────────────────────────────────────────────────

report_jobs() {
  header "Recent Scrape Jobs"
  db_query "SELECT
    id, actor_name, status, results_count, leads_imported,
    COALESCE(target_cities, '') AS cities,
    COALESCE(target_states, '') AS states,
    created_at
  FROM scrape_jobs
  ORDER BY created_at DESC
  LIMIT 20;" | column -t -s $'\t'
}

# ─── A/B Tests ────────────────────────────────────────────────────────

report_ab_tests() {
  header "A/B Test Results"
  db_query "SELECT
    cv.campaign_id,
    cv.sequence_step AS step,
    cv.variant_label AS variant,
    cv.subject_line,
    COALESCE(ab.total_sent, 0) AS sent,
    COALESCE(ab.total_opened, 0) AS opened,
    COALESCE(ab.total_replied, 0) AS replied,
    COALESCE(ab.open_rate, 0) || '%' AS open_pct,
    COALESCE(ab.reply_rate, 0) || '%' AS reply_pct,
    CASE WHEN cv.is_control = 1 THEN 'CTRL' ELSE '' END AS ctrl,
    cv.status
  FROM copy_variants cv
  LEFT JOIN ab_test_results ab ON ab.variant_id = cv.id
    AND ab.calculated_at = (SELECT MAX(calculated_at) FROM ab_test_results WHERE variant_id = cv.id)
  ORDER BY cv.campaign_id, cv.sequence_step, cv.variant_label;" | column -t -s $'\t'

  local variant_count
  variant_count=$(db_scalar "SELECT COUNT(*) FROM copy_variants;")
  echo -e "\n${YELLOW}Total variants: $variant_count${NC}"
}

# ─── Replies ──────────────────────────────────────────────────────────

report_replies() {
  header "Reply Classification Summary"
  db_query "SELECT
    classification,
    COUNT(*) AS total,
    ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM replies), 1) AS pct
  FROM replies
  GROUP BY classification
  ORDER BY total DESC;" | column -t -s $'\t'

  header "Recent Replies"
  db_query "SELECT
    r.id,
    l.first_name || ' ' || l.last_name AS name,
    l.company_name,
    r.classification,
    r.folder,
    r.is_automated AS auto,
    r.replied_at
  FROM replies r
  JOIN leads l ON l.id = r.lead_id
  ORDER BY r.replied_at DESC
  LIMIT 20;" | column -t -s $'\t'

  local total_replies
  total_replies=$(db_scalar "SELECT COUNT(*) FROM replies;")
  local interested_count
  interested_count=$(db_scalar "SELECT COUNT(*) FROM replies WHERE classification = 'interested';")
  echo -e "\n${GREEN}Total replies: $total_replies | Interested: $interested_count${NC}"
}

# ─── Timeline ─────────────────────────────────────────────────────────

report_timeline() {
  local lead_id="${2:-}"
  if [[ -z "$lead_id" ]]; then
    echo "Usage: lead-report.sh timeline <lead_id>"
    exit 1
  fi

  # Show lead info
  header "Lead #$lead_id Timeline"
  db_query "SELECT
    id, first_name, last_name, email, company_name, pipeline_status, interest_status
  FROM leads WHERE id = $lead_id;" | column -t -s $'\t'

  header "Events"
  db_query "SELECT
    le.created_at AS timestamp,
    le.event_type,
    le.source,
    le.event_data
  FROM lead_events le
  WHERE le.lead_id = $lead_id
  ORDER BY le.created_at ASC;" | column -t -s $'\t'

  local event_count
  event_count=$(db_scalar "SELECT COUNT(*) FROM lead_events WHERE lead_id = $lead_id;")
  echo -e "\n${YELLOW}Total events: $event_count${NC}"
}

# ─── Infrastructure ───────────────────────────────────────────────────

report_infrastructure() {
  header "Domains"
  db_query "SELECT
    d.domain,
    d.registrar,
    d.status,
    d.spf_configured AS spf,
    d.dkim_configured AS dkim,
    d.dmarc_configured AS dmarc,
    (SELECT COUNT(*) FROM mailboxes m WHERE m.domain_id = d.id) AS mailboxes,
    d.redirect_target,
    d.purchase_date
  FROM domains d
  ORDER BY d.created_at DESC;" | column -t -s $'\t'

  header "Mailboxes"
  db_query "SELECT
    m.email_address,
    m.provider,
    m.display_name,
    m.status,
    m.warmup_score,
    m.warmup_ready AS ready,
    m.daily_send_limit AS limit_day,
    m.sequencer,
    d.domain
  FROM mailboxes m
  JOIN domains d ON d.id = m.domain_id
  ORDER BY d.domain, m.email_address;" | column -t -s $'\t'

  local domain_count mailbox_count active_count warming_count
  domain_count=$(db_scalar "SELECT COUNT(*) FROM domains;")
  mailbox_count=$(db_scalar "SELECT COUNT(*) FROM mailboxes;")
  active_count=$(db_scalar "SELECT COUNT(*) FROM mailboxes WHERE status = 'active';")
  warming_count=$(db_scalar "SELECT COUNT(*) FROM mailboxes WHERE status = 'warming';")
  echo -e "\n${GREEN}Domains: $domain_count | Mailboxes: $mailbox_count (active: $active_count, warming: $warming_count)${NC}"
}

# ─── Main ─────────────────────────────────────────────────────────────

case "$REPORT" in
  summary)        report_summary ;;
  sources)        report_sources ;;
  verification)   report_verification ;;
  campaigns)      report_campaigns ;;
  stale)          report_stale ;;
  pipeline)       report_pipeline ;;
  jobs)           report_jobs ;;
  ab-tests)       report_ab_tests ;;
  replies)        report_replies ;;
  timeline)       report_timeline ;;
  infrastructure) report_infrastructure ;;
  *)
    echo "Usage: lead-report.sh <summary|sources|verification|campaigns|stale|pipeline|jobs|ab-tests|replies|timeline|infrastructure>"
    exit 1
    ;;
esac

echo ""
