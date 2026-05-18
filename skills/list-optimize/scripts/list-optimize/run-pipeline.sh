#!/usr/bin/env bash
# End-to-end orchestrator for list-optimize.
#
# On every run:
#   1. Reads list_optimize.selection from .metadata.json (Phase Picker).
#   2. Runs Phase 1+2 (qualify + normalize) if selection includes them.
#   3. Pauses for /email-verification if any qualified leads still unverified.
#   4. Calls validate-campaign-vars.sh before any Phase 3/4 DB writes
#      (skipped for qualify_only).
#   5. Runs Phase 3+4 (Perplexity research + 1-sentence opener) if selected.
#
# Selection values (saved to scripts/campaigns/{campaign}/.metadata.json):
#   "both"             -> all four phases
#   "qualify_only"     -> phases 1+2 only, skip vars validation + 3+4
#   "personalize_only" -> phases 3+4 only (assumes qualification done upstream)
#   "skipped"          -> no-op exit
#
# Usage:
#   bash scripts/list-optimize/run-pipeline.sh <campaign-name>
#   bash scripts/list-optimize/run-pipeline.sh <campaign-name> --reset-picker  # clear saved selection
#   bash scripts/list-optimize/run-pipeline.sh <campaign-name> --skip-research # legacy alias for qualify_only
#   bash scripts/list-optimize/run-pipeline.sh <campaign-name> --auto-yes      # don't prompt for cost
#   bash scripts/list-optimize/run-pipeline.sh <campaign-name> --resume        # explicit resume (default behavior)

set -euo pipefail

LC_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$LC_DIR/../.." && pwd)"
# shellcheck disable=SC1091
source "$PROJECT_DIR/scripts/db-query.sh"   # NOTE: this redefines SCRIPT_DIR — use LC_DIR for our own paths

CAMPAIGN=""
SKIP_RESEARCH=0
AUTO_YES=0
RESUME=0
RESET_PICKER=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --skip-research) SKIP_RESEARCH=1; shift ;;
    --auto-yes|-y) AUTO_YES=1; shift ;;
    --resume) RESUME=1; shift ;;
    --reset-picker) RESET_PICKER=1; shift ;;
    -h|--help) sed -n '2,22p' "$0" | sed 's|^# ||; s|^#||'; exit 0 ;;
    *)
      if [[ -z "$CAMPAIGN" ]]; then CAMPAIGN="$1"; else
        echo "ERROR: Unknown arg: $1" >&2; exit 1
      fi
      shift
      ;;
  esac
done

[[ -z "$CAMPAIGN" ]] && { echo "Usage: $0 <campaign-name> [--skip-research] [--auto-yes] [--resume] [--reset-picker]" >&2; exit 1; }

STRATEGY_FILE="$PROJECT_DIR/scripts/campaigns/${CAMPAIGN}/strategy.md"
[[ -f "$STRATEGY_FILE" ]] || { echo "ERROR: Strategy not found: $STRATEGY_FILE" >&2; exit 1; }

META="$PROJECT_DIR/scripts/campaigns/${CAMPAIGN}/.metadata.json"
SEP="────────────────────────────────────────"

# ─── Phase 0: picker ──────────────────────────────────────────────────────
ensure_metadata() {
  if [[ ! -f "$META" ]]; then
    mkdir -p "$(dirname "$META")"
    echo '{}' > "$META"
  fi
}

read_selection() {
  ensure_metadata
  jq -r '.list_optimize.selection // empty' "$META" 2>/dev/null
}

write_selection() {
  ensure_metadata
  local sel="$1"
  local now; now="$(date -u +%FT%TZ)"
  local tmp; tmp="$(mktemp)"
  jq --arg s "$sel" --arg now "$now" \
     '.list_optimize = ((.list_optimize // {}) | .selection = $s | .picked_at = $now)' \
     "$META" > "$tmp" && mv "$tmp" "$META"
}

prompt_picker() {
  if [[ ! -t 0 && ! -e /dev/tty ]]; then
    echo "ERROR: phase picker needs an interactive TTY. Re-run from a terminal, or set list_optimize.selection in $META." >&2
    exit 1
  fi
  local choice=""
  while true; do
    {
      echo
      echo "What do you want list-optimize to run for campaign '$CAMPAIGN'?"
      echo "  1) Qualify + Personalize  (recommended, full pipeline)"
      echo "  2) Qualify only           (skip Perplexity research + opener writing — saves ~\$0.005/lead)"
      echo "  3) Personalize only       (skip ICP qualification — assumes leads pre-qualified)"
      echo "  4) Skip everything"
      printf 'Pick 1-4: '
    } >&2
    if ! read -r choice </dev/tty; then
      echo "ERROR: could not read selection from /dev/tty." >&2; exit 1
    fi
    case "$choice" in
      1|both)             echo "both"; return ;;
      2|qualify_only)     echo "qualify_only"; return ;;
      3|personalize_only) echo "personalize_only"; return ;;
      4|skip|skipped)     echo "skipped"; return ;;
      *) echo "Invalid choice. Pick 1, 2, 3, or 4." >&2 ;;
    esac
  done
}

if [[ "$RESET_PICKER" -eq 1 ]]; then
  ensure_metadata
  tmp="$(mktemp)"
  jq 'del(.list_optimize)' "$META" > "$tmp" && mv "$tmp" "$META"
  echo "Cleared list_optimize selection from $META."
fi

SELECTION="$(read_selection)"
if [[ -z "$SELECTION" ]]; then
  if [[ "$SKIP_RESEARCH" -eq 1 ]]; then
    SELECTION="qualify_only"   # legacy flag preserved
  else
    SELECTION="$(prompt_picker)"
  fi
  write_selection "$SELECTION"
fi

case "$SELECTION" in
  both|qualify_only|personalize_only|skipped) ;;
  *) echo "ERROR: invalid list_optimize.selection in metadata: '$SELECTION'. Run with --reset-picker." >&2; exit 1 ;;
esac

if [[ "$SELECTION" == "skipped" ]]; then
  echo "list_optimize.selection = 'skipped' — no work to do for $CAMPAIGN. Exiting."
  exit 0
fi

run_phase_1_2() { case "$SELECTION" in both|qualify_only) return 0 ;; *) return 1 ;; esac; }
run_phase_3_4() { case "$SELECTION" in both|personalize_only) return 0 ;; *) return 1 ;; esac; }

echo "Phase Picker selection for '$CAMPAIGN': $SELECTION"
echo "$SEP"

# ─── Phase 1 ──────────────────────────────────────────────────────────────
if run_phase_1_2; then
  echo "$SEP"
  echo "Phase 1: Qualify"
  echo "$SEP"
  unq=$(db_scalar "SELECT COUNT(*) FROM leads WHERE qualification_status IS NULL")
  unq="${unq:-0}"; unq="${unq// /}"
  if [[ "$unq" -eq 0 ]]; then
    echo "All leads already qualified. Skipping Phase 1."
  else
    bash "$LC_DIR/qualify.sh" "$CAMPAIGN"
  fi

  # ─── Phase 2 ────────────────────────────────────────────────────────────
  echo
  echo "$SEP"
  echo "Phase 2: Normalize Company Names"
  echo "$SEP"
  unn=$(db_scalar "SELECT COUNT(*) FROM leads WHERE company_name IS NOT NULL AND company_name != '' AND company_name_normalized IS NULL")
  unn="${unn:-0}"; unn="${unn// /}"
  if [[ "$unn" -eq 0 ]]; then
    echo "All company names already normalized. Skipping Phase 2."
  else
    bash "$LC_DIR/normalize-company.sh" --campaign "$CAMPAIGN"
  fi
else
  echo "Selection '$SELECTION' — skipping Phase 1+2."
fi

# ─── Verification gate ────────────────────────────────────────────────────
if run_phase_3_4; then
  echo
  echo "$SEP"
  qualified=$(db_scalar "SELECT COUNT(*) FROM leads WHERE qualification_status = 'qualified'")
  qualified="${qualified:-0}"; qualified="${qualified// /}"
  verified=$(db_scalar "SELECT COUNT(*) FROM leads WHERE qualification_status = 'qualified' AND pipeline_status = 'verified'")
  verified="${verified:-0}"; verified="${verified// /}"

  echo "Verification status:"
  echo "  Qualified leads: $qualified"
  echo "  Already verified: $verified"
  echo "  Awaiting verification: $((qualified - verified))"
  echo "$SEP"

  if [[ "$qualified" -eq 0 ]]; then
    echo "  No qualified leads in DB. If you ran 'personalize_only' without prior qualification, run /email-verification or set qualification_status manually before resuming."
    exit 0
  fi

  if [[ $((qualified - verified)) -gt 0 ]]; then
    echo
    echo "  Run /email-verification next."
    echo "  After verification completes, re-run this script to resume Phase 3-4."
    exit 0
  fi

  # ─── Pre-flight: validate campaign template variables ─────────────────
  echo
  echo "$SEP"
  echo "Pre-flight: validate Instantly/Email Bison campaign variables"
  echo "$SEP"
  if ! bash "$LC_DIR/validate-campaign-vars.sh" "$CAMPAIGN"; then
    echo "ERROR: campaign variable validation failed — aborting before any Phase 3/4 DB writes." >&2
    exit 1
  fi

  # ─── Phase 3 ─────────────────────────────────────────────────────────
  echo
  echo "$SEP"
  echo "Phase 3: Web Search Research (Zeus default, Perplexity fallback)"
  echo "$SEP"
  research_args=("$CAMPAIGN")
  [[ "$AUTO_YES" -eq 1 ]] && research_args+=(--yes)

  bash "$LC_DIR/research.sh" "${research_args[@]}"

  # ─── Phase 4 ─────────────────────────────────────────────────────────
  echo
  echo "$SEP"
  echo "Phase 4: Personalization"
  echo "$SEP"
  ready=$(db_scalar "SELECT COUNT(*) FROM leads WHERE personalization_status = 'researched'")
  ready="${ready:-0}"; ready="${ready// /}"
  if [[ "$ready" -eq 0 ]]; then
    echo "No leads with personalization_status='researched'. Phase 3 may have skipped all leads (no notable topics). Skipping Phase 4."
  else
    bash "$LC_DIR/personalize.sh" "$CAMPAIGN"
  fi
else
  echo "Selection '$SELECTION' — skipping Phase 3+4 and pre-flight variable validation."
fi

# ─── Summary ──────────────────────────────────────────────────────────────
echo
echo "$SEP"
echo "Pipeline complete. Final state:"
echo "$SEP"

q=$(db_scalar "SELECT COUNT(*) FROM leads WHERE qualification_status = 'qualified'")
dq=$(db_scalar "SELECT COUNT(*) FROM leads WHERE qualification_status = 'disqualified'")
v=$(db_scalar "SELECT COUNT(*) FROM leads WHERE pipeline_status = 'verified'")
r=$(db_scalar "SELECT COUNT(*) FROM leads WHERE personalization_status = 'researched'")
w=$(db_scalar "SELECT COUNT(*) FROM leads WHERE personalization_status = 'written'")
s=$(db_scalar "SELECT COUNT(*) FROM leads WHERE personalization_status = 'skipped'")
f=$(db_scalar "SELECT COUNT(*) FROM leads WHERE personalization_status = 'failed'")
cost=$(db_scalar "SELECT COALESCE(SUM(personalization_cost_cents), 0) FROM leads")

clean() { echo "${1:-0}" | tr -d ' '; }

cat <<EOF
  list_optimize.selection:      $SELECTION
  qualified:                    $(clean "$q")
  disqualified:                 $(clean "$dq")
  verified (cold-mail ready):   $(clean "$v")
  research had a topic:         $(clean "$r")
  personalization written:      $(clean "$w")
  personalization skipped:      $(clean "$s")
  personalization failed:       $(clean "$f")
  total Perplexity cost:        \$$(python3 -c "print(f'{$(clean "$cost") / 100:.2f}')")

Next step: run /cold-email-copywriting to write a sequence that consumes the {personalization} token in E1.
EOF
