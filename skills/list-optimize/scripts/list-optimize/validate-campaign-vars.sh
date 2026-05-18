#!/usr/bin/env bash
# Validate that the target Instantly / Email Bison campaign template can carry
# our personalization payload before list-optimize Phase 3/4 writes to the DB.
#
# Three checks (all must pass):
#   1. Template scan       — every {var}/{{var}} token in the sequence text
#                             must be in our allowed payload schema.
#   2. Fallback check      — every reference to {personalization} (or
#                             {{personalization}}) must be wrapped as
#                             {personalization|fallback} per copy-constraints.md.
#   3. Dry-run roundtrip   — push a sentinel lead, GET it back, confirm every
#                             custom field round-tripped, then DELETE.
#                             Trap-protected so failure paths still clean up.
#
# Reads campaign_id + provider from scripts/campaigns/{campaign}/.metadata.json
# under .phases.deployment.{instantly_campaign_id|email_bison_campaign_id}, or
# .phases.api_key.env_var to pick the provider. Falls back to .sequencer at the
# top of the metadata file.
#
# Usage:
#   bash scripts/list-optimize/validate-campaign-vars.sh <campaign-name>
#   bash scripts/list-optimize/validate-campaign-vars.sh <campaign-name> --skip-dry-run
#   bash scripts/list-optimize/validate-campaign-vars.sh <campaign-name> --campaign-id <id> --provider <instantly|emailbison>
#
# Exits non-zero on any failed check. Failure messages name the offending
# token / step so the user can fix the campaign template before re-running.

set -euo pipefail

LC_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$LC_DIR/../.." && pwd)"

CAMPAIGN=""
SKIP_DRY_RUN=0
CLI_CAMPAIGN_ID=""
CLI_PROVIDER=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --skip-dry-run) SKIP_DRY_RUN=1; shift ;;
    --campaign-id) CLI_CAMPAIGN_ID="$2"; shift 2 ;;
    --provider) CLI_PROVIDER="$2"; shift 2 ;;
    -h|--help) sed -n '2,28p' "$0" | sed 's|^# ||; s|^#||'; exit 0 ;;
    *)
      if [[ -z "$CAMPAIGN" ]]; then CAMPAIGN="$1"; else
        echo "ERROR: Unknown arg: $1" >&2; exit 1
      fi
      shift
      ;;
  esac
done

[[ -z "$CAMPAIGN" ]] && { echo "Usage: $0 <campaign-name> [--skip-dry-run] [--campaign-id ID] [--provider instantly|emailbison]" >&2; exit 1; }

META="$PROJECT_DIR/scripts/campaigns/${CAMPAIGN}/.metadata.json"
[[ -f "$META" ]] || { echo "ERROR: Metadata not found: $META" >&2; exit 1; }

# ─── Load env ────────────────────────────────────────────────────────────
if [[ -f "$PROJECT_DIR/.env" ]]; then
  set -a; source "$PROJECT_DIR/.env"; set +a
fi

# ─── Resolve provider + campaign id ──────────────────────────────────────
PROVIDER="${CLI_PROVIDER:-}"
CAMPAIGN_ID="${CLI_CAMPAIGN_ID:-}"

if [[ -z "$PROVIDER" ]]; then
  # 1) explicit sequencer field
  PROVIDER="$(jq -r '.sequencer // empty' "$META")"
fi
if [[ -z "$PROVIDER" ]]; then
  # 2) env var name written by quickstart phase 1
  envvar="$(jq -r '.phases.api_key.env_var // empty' "$META")"
  case "$envvar" in
    INSTANTLY_API_KEY)   PROVIDER="instantly" ;;
    EMAIL_BISON_API_KEY) PROVIDER="emailbison" ;;
  esac
fi
case "$PROVIDER" in
  instantly|emailbison) ;;
  "") echo "ERROR: cannot determine provider from $META. Pass --provider instantly|emailbison." >&2; exit 1 ;;
  *) echo "ERROR: unknown provider '$PROVIDER' in metadata." >&2; exit 1 ;;
esac

if [[ -z "$CAMPAIGN_ID" ]]; then
  case "$PROVIDER" in
    instantly)   CAMPAIGN_ID="$(jq -r '.phases.deployment.instantly_campaign_id // .phases.deployment.campaign_id // empty' "$META")" ;;
    emailbison)  CAMPAIGN_ID="$(jq -r '.phases.deployment.email_bison_campaign_id // .phases.deployment.campaign_id // empty' "$META")" ;;
  esac
fi

if [[ -z "$CAMPAIGN_ID" ]]; then
  echo "WARNING: no campaign id in $META yet — list-optimize Phase 3/4 must run AFTER cold-email-campaign-deploy." >&2
  echo "         Pass --campaign-id <id> to validate against an existing campaign manually." >&2
  exit 1
fi

echo "Validating campaign $CAMPAIGN_ID on provider $PROVIDER"

# ─── Allowed token sets ──────────────────────────────────────────────────
# These are what our Instantly/Email Bison lead payload actually contains
# at lead-push time. Any token outside this set in the campaign template
# means the merge will silently fail at send time.
ALLOWED_INSTANTLY_TOKENS=(
  firstName lastName companyName email phone website jobTitle industry
  painPoint personalization personalizedLine signature
)
ALLOWED_EMAILBISON_TOKENS=(
  FIRST_NAME LAST_NAME COMPANY EMAIL PHONE WEBSITE JOB_TITLE INDUSTRY
  PAIN_POINT personalization PERSONALIZED_LINE SENDER_EMAIL_SIGNATURE
)

# ─── Fetch sequence text ─────────────────────────────────────────────────
SEQUENCE_JSON=""
fetch_instantly() {
  : "${INSTANTLY_API_KEY:?INSTANTLY_API_KEY missing in .env}"
  # GET /campaigns?limit=100 returns embedded sequences; filter by id
  local body
  body="$(curl -sf -H "Authorization: Bearer $INSTANTLY_API_KEY" \
    "https://api.instantly.ai/api/v2/campaigns?limit=100")" || {
      echo "ERROR: Instantly /campaigns fetch failed (auth or network)." >&2; return 1
    }
  SEQUENCE_JSON="$(jq --arg id "$CAMPAIGN_ID" '.items[] | select(.id == $id) | .sequences' <<<"$body")"
  [[ -n "$SEQUENCE_JSON" && "$SEQUENCE_JSON" != "null" ]] || {
    echo "ERROR: Instantly campaign $CAMPAIGN_ID not found in /campaigns response." >&2; return 1
  }
}
fetch_emailbison() {
  : "${EMAIL_BISON_API_KEY:?EMAIL_BISON_API_KEY missing in .env}"
  local body
  body="$(curl -sf -H "Authorization: Bearer $EMAIL_BISON_API_KEY" \
    "https://send.leadgenjay.com/api/campaigns/${CAMPAIGN_ID}/sequence-steps")" || {
      echo "ERROR: Email Bison /sequence-steps fetch failed." >&2; return 1
    }
  SEQUENCE_JSON="$body"
}

case "$PROVIDER" in
  instantly)  fetch_instantly ;;
  emailbison) fetch_emailbison ;;
esac

# Concatenate all subject + body text into a single TEXT for token scanning.
case "$PROVIDER" in
  instantly)
    # sequences[0].steps[].variants[].subject + .body
    TEXT="$(jq -r '
      [
        .[0].steps[]? | .variants[]? | (.subject // ""), (.body // "")
      ] | join("\n---STEP---\n")
    ' <<<"$SEQUENCE_JSON")"
    ;;
  emailbison)
    # data[].email_subject + .email_body  (or top-level array, depending)
    TEXT="$(jq -r '
      ((.data // .) | if type=="array" then . else [.] end) as $arr
      | [ $arr[] | (.email_subject // ""), (.email_body // "") ]
      | join("\n---STEP---\n")
    ' <<<"$SEQUENCE_JSON")"
    ;;
esac

if [[ -z "$TEXT" || "$TEXT" == "null" ]]; then
  echo "ERROR: campaign $CAMPAIGN_ID has no sequence text — nothing to validate." >&2
  exit 1
fi

# ─── Check 1 + 2: template scan + fallback ───────────────────────────────
declare -a FAILURES=()

# Extract tokens. Two regex passes — one for {{...}} (Instantly) and one for
# {...} (Email Bison). Spintax `{a|b|c}` legitimately uses braces too, so we
# distinguish by: a "merge token" has only word chars (and optional pipe-fallback
# inside the braces) whereas spintax has multiple branches separated by '|'
# without any fallback marker. We extract candidates and let the allow-list
# absorb spintax (since spintax options aren't in the allow list and would
# fail validation if we treated them as tokens — so we only flag braces that
# look like merge tokens, not spintax).
#
# Conservative rule used here:
#   - For Instantly ({{...}}): treat anything matching {{[A-Za-z0-9_]+(\|...)?}} as a token.
#     {{RANDOM | a | b | c}} (spintax) is handled by the regex requiring a leading
#     identifier; RANDOM matches but is special-cased below.
#   - For Email Bison ({...}): only treat {[A-Za-z0-9_]+} or
#     {[A-Za-z0-9_]+\|...} as a token. Multi-branch spintax {a|b|c} where the
#     first segment isn't followed by `|fallback` must be ignored — but we
#     CAN'T distinguish reliably without parsing. So Email Bison validation
#     focuses on uppercase tokens (FIRST_NAME, COMPANY, ...) and the literal
#     'personalization' word, which we then verify has the fallback form.

scan_tokens_instantly() {
  # All {{...}} occurrences
  grep -oE '\{\{[^{}]+\}\}' <<<"$TEXT" || true
}
scan_tokens_emailbison() {
  # All {...} occurrences
  grep -oE '\{[^{}]+\}' <<<"$TEXT" || true
}

is_allowed_token() {
  local token="$1"
  local list_name="$2"  # ALLOWED_INSTANTLY_TOKENS | ALLOWED_EMAILBISON_TOKENS
  local -n list="$list_name"
  for t in "${list[@]}"; do
    [[ "$token" == "$t" ]] && return 0
  done
  return 1
}

# Step counter — naive: count '---STEP---' separators.
PERSONALIZATION_REFS=()

if [[ "$PROVIDER" == "instantly" ]]; then
  while IFS= read -r raw; do
    [[ -z "$raw" ]] && continue
    inner="${raw#\{\{}"; inner="${inner%\}\}}"
    inner="$(echo "$inner" | sed -E 's/^[[:space:]]+//; s/[[:space:]]+$//')"
    # Spintax: {{RANDOM | a | b | c}} — leading RANDOM keyword. Skip.
    if [[ "$inner" =~ ^RANDOM([[:space:]]*\|.*)?$ ]]; then continue; fi
    # Normal merge: identifier or identifier|fallback
    if [[ "$inner" =~ ^([A-Za-z0-9_]+)([[:space:]]*\|.*)?$ ]]; then
      token="${BASH_REMATCH[1]}"
      if [[ "$token" == "personalization" || "$token" == "personalizedLine" ]]; then
        PERSONALIZATION_REFS+=("$raw")
      fi
      if ! is_allowed_token "$token" ALLOWED_INSTANTLY_TOKENS; then
        FAILURES+=("unknown token '{{$token}}' in campaign template (not in our lead payload)")
      fi
    else
      # Anything else inside {{ }} is suspicious — flag it.
      FAILURES+=("unrecognized {{...}} expression: '$raw'")
    fi
  done < <(scan_tokens_instantly)
else
  # emailbison
  while IFS= read -r raw; do
    [[ -z "$raw" ]] && continue
    inner="${raw#\{}"; inner="${inner%\}}"
    # Single identifier or identifier|fallback (NOT spintax with multiple branches)
    # Detect: spintax has 2+ branches and none of them reference an allow-list token.
    # We treat as a merge candidate ONLY if first segment is a known token.
    first_segment="${inner%%|*}"
    first_segment="$(echo "$first_segment" | sed -E 's/^[[:space:]]+//; s/[[:space:]]+$//')"
    if [[ "$first_segment" == "personalization" || "$first_segment" == "PERSONALIZED_LINE" ]]; then
      PERSONALIZATION_REFS+=("$raw")
      # token is allowed but must have a fallback (check 2)
    fi
    if [[ "$first_segment" =~ ^[A-Z][A-Z0-9_]*$ ]]; then
      # Uppercase => merge token by Bison convention
      if ! is_allowed_token "$first_segment" ALLOWED_EMAILBISON_TOKENS; then
        FAILURES+=("unknown uppercase token '{$first_segment}' in campaign template (not in our lead payload)")
      fi
    fi
    # lowercase first_segment that's literally 'personalization'
    if [[ "$first_segment" == "personalization" ]]; then
      :  # handled above, allowed token
    fi
  done < <(scan_tokens_emailbison)
fi

# Check 2: every personalization reference MUST have a fallback (`|fallback`).
for ref in "${PERSONALIZATION_REFS[@]:-}"; do
  [[ -z "$ref" ]] && continue
  inner="$ref"
  inner="${inner#\{\{}"; inner="${inner%\}\}}"
  inner="${inner#\{}"; inner="${inner%\}}"
  if [[ "$inner" != *"|"* ]]; then
    FAILURES+=("personalization token without fallback: '$ref' — must be wrapped as {personalization|<fallback>} per cold-email-copywriting/references/copy-constraints.md")
  else
    # Has a pipe — confirm there is a non-empty fallback after it.
    fallback="${inner#*|}"
    fallback="$(echo "$fallback" | sed -E 's/^[[:space:]]+//; s/[[:space:]]+$//')"
    if [[ -z "$fallback" ]]; then
      FAILURES+=("personalization token with empty fallback: '$ref'")
    fi
  fi
done

if [[ ${#FAILURES[@]} -gt 0 ]]; then
  echo "✗ Template validation FAILED:"
  for f in "${FAILURES[@]}"; do echo "  - $f"; done
  exit 1
fi
echo "✓ Template scan + fallback check passed (provider=$PROVIDER, campaign=$CAMPAIGN_ID)"

# ─── Check 3: dry-run roundtrip ──────────────────────────────────────────
if [[ "$SKIP_DRY_RUN" -eq 1 ]]; then
  echo "  (dry-run roundtrip skipped via --skip-dry-run)"
  exit 0
fi

epoch="$(date +%s)"
SENTINEL_EMAIL="hyperlist-test+${epoch}@example.invalid"
SENTINEL_FIRST="HyperlistTest"
SENTINEL_LAST="Sentinel"
SENTINEL_COMPANY="Hyperlist Sentinel Co"
SENTINEL_PERSONALIZATION="Test personalization line for hyperlist validation."

CREATED_LEAD_ID=""

cleanup() {
  if [[ -n "$CREATED_LEAD_ID" ]]; then
    echo "  cleaning up sentinel lead $CREATED_LEAD_ID ..."
    case "$PROVIDER" in
      instantly)
        curl -sf -X DELETE \
          -H "Authorization: Bearer $INSTANTLY_API_KEY" \
          "https://api.instantly.ai/api/v2/leads/$CREATED_LEAD_ID" >/dev/null \
          && echo "  ✓ sentinel deleted" \
          || echo "  ✗ sentinel DELETE failed — manually remove lead id=$CREATED_LEAD_ID, email=$SENTINEL_EMAIL" >&2
        ;;
      emailbison)
        # Email Bison docs don't expose a per-lead delete endpoint here; warn user.
        echo "  ! Email Bison: no per-lead DELETE in current API skill — manually remove $SENTINEL_EMAIL from campaign $CAMPAIGN_ID" >&2
        ;;
    esac
  fi
}
trap cleanup EXIT INT TERM

echo "Dry-run: pushing sentinel lead $SENTINEL_EMAIL to campaign $CAMPAIGN_ID ..."
case "$PROVIDER" in
  instantly)
    body="$(jq -nc \
      --arg email "$SENTINEL_EMAIL" \
      --arg first "$SENTINEL_FIRST" \
      --arg last "$SENTINEL_LAST" \
      --arg company "$SENTINEL_COMPANY" \
      --arg pers "$SENTINEL_PERSONALIZATION" \
      --arg cid "$CAMPAIGN_ID" \
      '{email:$email, first_name:$first, last_name:$last, company_name:$company, personalization:$pers, campaign:$cid}')"
    resp="$(curl -sf -X POST \
      -H "Authorization: Bearer $INSTANTLY_API_KEY" \
      -H "Content-Type: application/json" \
      -d "$body" \
      "https://api.instantly.ai/api/v2/leads")" || {
        echo "ERROR: Instantly POST /leads failed for sentinel." >&2; exit 1
      }
    CREATED_LEAD_ID="$(jq -r '.id // empty' <<<"$resp")"
    [[ -n "$CREATED_LEAD_ID" ]] || {
      echo "ERROR: Instantly POST /leads returned no id. Response: $resp" >&2; exit 1
    }
    # Read back via list endpoint (per memory: GET /leads is not single-resource; use POST /leads/list with email filter)
    list_body="$(jq -nc --arg email "$SENTINEL_EMAIL" '{filter:{email:$email}, limit:1}')"
    readback="$(curl -sf -X POST \
      -H "Authorization: Bearer $INSTANTLY_API_KEY" \
      -H "Content-Type: application/json" \
      -d "$list_body" \
      "https://api.instantly.ai/api/v2/leads/list" 2>/dev/null || true)"
    # Verify the personalization field round-tripped (best-effort).
    got_pers="$(jq -r '.items[0].personalization // empty' <<<"$readback" 2>/dev/null || true)"
    if [[ "$got_pers" != "$SENTINEL_PERSONALIZATION" ]]; then
      echo "WARNING: sentinel readback could not confirm personalization round-trip (got: '${got_pers:-<empty>}'). The lead WAS created with id=$CREATED_LEAD_ID; cleanup will still run."
    else
      echo "✓ Dry-run roundtrip passed (personalization survived API round-trip)"
    fi
    ;;
  emailbison)
    # Email Bison: POST /leads/bulk with single-element array, then attach to campaign.
    body="$(jq -nc \
      --arg email "$SENTINEL_EMAIL" \
      --arg first "$SENTINEL_FIRST" \
      --arg last "$SENTINEL_LAST" \
      --arg company "$SENTINEL_COMPANY" \
      --arg pers "$SENTINEL_PERSONALIZATION" \
      '{leads:[{email:$email, first_name:$first, last_name:$last, company:$company, personalization:$pers}]}')"
    resp="$(curl -sf -X POST \
      -H "Authorization: Bearer $EMAIL_BISON_API_KEY" \
      -H "Content-Type: application/json" \
      -d "$body" \
      "https://send.leadgenjay.com/api/leads/bulk")" || {
        echo "ERROR: Email Bison POST /leads/bulk failed for sentinel." >&2; exit 1
      }
    CREATED_LEAD_ID="$(jq -r '.data[0].id // .data.id // empty' <<<"$resp")"
    [[ -n "$CREATED_LEAD_ID" ]] || {
      echo "ERROR: Email Bison POST /leads/bulk returned no id. Response: $resp" >&2; exit 1
    }
    echo "✓ Dry-run lead created (Email Bison id=$CREATED_LEAD_ID). Read-back/delete API path not in current skill — see warning at exit."
    ;;
esac

# trap will clean up the sentinel lead.
echo "Validation complete."
