#!/usr/bin/env bash
# FORKED FROM: bison-replies/scripts/auto-send-interested.sh @ commit ba00377
# reply-claw: Multi-tenant INTERESTED-HANDOFF auto-send.
#
# Composes the persona's pre-vetted booking template, substitutes the
# account-keyed booking URL, sends via Bison, increments the daily counter,
# posts a 🔥 alert to Telegram, marks the agent_replies row.
#
# Refuses to fire if any precondition fails (TODO marker in template,
# TODO booking URL, daily cap reached, agent_replies row missing,
# persona not in auto_send_eligible list).
#
# Usage:
#   auto-send-interested.sh \
#     --account consulti|lgj \
#     --persona jay|madison \
#     --reply-id 4123 \
#     --thread-id THR_ID \
#     --first-name "Jane" \
#     [--company "Acme Inc"] \
#     [--sender-email-id 22317]
#
# Env required:
#   RC_TENANT_CONFIG — path to tenant config JSON

set -euo pipefail

ACCOUNT=""
PERSONA=""
REPLY_ID=""
THREAD_ID=""
FIRST_NAME=""
COMPANY=""
SENDER_EMAIL_ID=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --account)          ACCOUNT="$2"; shift 2 ;;
    --persona)          PERSONA="$2"; shift 2 ;;
    --reply-id)         REPLY_ID="$2"; shift 2 ;;
    --thread-id)        THREAD_ID="$2"; shift 2 ;;
    --first-name)       FIRST_NAME="$2"; shift 2 ;;
    --company)          COMPANY="$2"; shift 2 ;;
    --sender-email-id)  SENDER_EMAIL_ID="$2"; shift 2 ;;
    --help|-h)          sed -n '2,21p' "$0"; exit 0 ;;
    *)                  echo "[auto-send-interested] unknown arg: $1" >&2; exit 2 ;;
  esac
done

for v in ACCOUNT PERSONA REPLY_ID; do
  if [[ -z "${!v}" ]]; then echo "ERROR: --${v,,} required" >&2; exit 2; fi
done

# Load tenant config
if [[ -z "${RC_TENANT_CONFIG:-}" ]]; then
  echo "ERROR: RC_TENANT_CONFIG env var not set" >&2
  exit 1
fi

if [[ ! -f "$RC_TENANT_CONFIG" ]]; then
  echo "ERROR: RC_TENANT_CONFIG file not found: $RC_TENANT_CONFIG" >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SKILL_DIR="$(dirname "$SCRIPT_DIR")"
KB_DIR="$SKILL_DIR/kb"

TEMPLATE="$KB_DIR/$ACCOUNT/booking-handoff-${PERSONA}.md"
LINKS="$KB_DIR/shared/booking-links.md"

[[ ! -f "$TEMPLATE" ]] && { echo "ERROR: missing template $TEMPLATE" >&2; exit 5; }
[[ ! -f "$LINKS"    ]] && { echo "ERROR: missing $LINKS" >&2; exit 5; }

# Parse tenant config and check persona eligibility
CONFIG_SCRIPT=$(mktemp)
trap "rm -f '$CONFIG_SCRIPT'" EXIT

cat > "$CONFIG_SCRIPT" << 'EOFSCRIPT'
const fs = require('fs');
const cfg = JSON.parse(fs.readFileSync(process.argv[1], 'utf8'));
const persona = process.argv[2];

const personaConfig = cfg.personas?.[persona];
if (!personaConfig) {
  console.error(`ERROR: persona '${persona}' not found in config`);
  process.exit(1);
}

if (!personaConfig.auto_send_eligible) {
  console.error(`ERROR: persona '${persona}' is not auto_send_eligible`);
  process.exit(1);
}

console.log(`TENANT_SLUG='${cfg.tenant_slug}'`);
console.log(`TURSO_DB_URL='${cfg.turso?.db_url || ''}'`);
console.log(`TURSO_DB_TOKEN='${cfg.turso?.token || ''}'`);
console.log(`TELEGRAM_BOT_TOKEN='${cfg.telegram?.bot_token || ''}'`);
console.log(`TELEGRAM_CHAT_ID='${cfg.telegram?.chat_id || ''}'`);
console.log(`DAILY_AUTO_SEND_CAP='${cfg.preferences?.daily_auto_send_cap || 15}'`);
console.log(`DRY_RUN='${cfg.preferences?.dry_run ? 1 : 0}'`);
EOFSCRIPT

eval "$(node "$CONFIG_SCRIPT" "$RC_TENANT_CONFIG" "$PERSONA")" || exit 1

# Refuse if template has a TODO marker
if grep -qiE '^\s*TODO|needs [A-Za-z]+-specific content|status:\s*stub' "$TEMPLATE"; then
  echo "[auto-send-interested] template $TEMPLATE is still a stub; refusing auto-send" >&2
  exit 6
fi

# Pull the booking URL for this account from booking-links.md
BOOKING_URL=$(awk -v acct="$ACCOUNT" '
  /^```yaml/    { in_yaml = 1; this_acct = ""; next }
  /^```/        { in_yaml = 0; this_acct = ""; next }
  in_yaml && $1 == "account_key:" { this_acct = $2; next }
  in_yaml && this_acct == acct && $1 == "booking_url:" { print $2; exit }
' "$LINKS")

if [[ -z "$BOOKING_URL" ]]; then
  echo "ERROR: no booking_url for account=$ACCOUNT in $LINKS" >&2
  exit 7
fi
if [[ "$BOOKING_URL" == TODO_* ]]; then
  echo "ERROR: booking_url for $ACCOUNT is still a placeholder ($BOOKING_URL)" >&2
  exit 7
fi
if [[ "$BOOKING_URL" != *"utm_source=bison"* ]]; then
  echo "ERROR: booking_url for $ACCOUNT missing utm_source=bison ($BOOKING_URL)" >&2
  exit 7
fi

# ─── Turso helpers ──────────────────────────────────────────────────────
turso_exec() {
  local sql="$1"
  BR_SQL="$sql" node --input-type=module -e '
    const url = (process.env.TURSO_DB_URL || "").replace(/^libsql:/, "https:").replace(/\/+$/, "");
    const pipeline = url.endsWith("/v2/pipeline") ? url : `${url}/v2/pipeline`;
    const body = JSON.stringify({ requests: [{ type: "execute", stmt: { sql: process.env.BR_SQL } }, { type: "close" }] });
    const r = await fetch(pipeline, {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.TURSO_DB_TOKEN}`, "Content-Type": "application/json" },
      body
    });
    if (!r.ok) { process.stderr.write(`[turso] HTTP ${r.status}: ${(await r.text()).slice(0,200)}\n`); process.exit(1); }
    const j = await r.json();
    const result = j.results?.[0];
    if (result?.error) { process.stderr.write(`[turso] ${result.error.message}\n`); process.exit(1); }
    const res = result?.response?.result;
    if (res && res.rows) {
      for (const row of res.rows) process.stdout.write(row.map(c => c.type === "null" ? "" : c.value).join("\t") + "\n");
    }
  '
}

# ─── Cap check ──────────────────────────────────────────────────────────
COUNT_KEY="auto_sends_today_${ACCOUNT}"
COUNT_NOW=$(turso_exec "SELECT value FROM agent_state WHERE tenant_slug='$TENANT_SLUG' AND key='$COUNT_KEY'" | head -1)
COUNT_NOW="${COUNT_NOW:-0}"

if (( COUNT_NOW >= DAILY_AUTO_SEND_CAP )); then
  echo "[auto-send-interested] daily cap reached for $ACCOUNT ($COUNT_NOW/$DAILY_AUTO_SEND_CAP); refusing" >&2
  exit 8
fi

# ─── Compose body ───────────────────────────────────────────────────────
# Templates have explanation text + a verbatim body block fenced with ```
# under "## Body (verbatim — sent as-is)". Extract just the body block.
TEMPLATE_BODY=$(awk '
  /^## Body/        { saw_body = 1; next }
  saw_body && /^```/ { in_body = !in_body; if (!in_body) exit; next }
  in_body           { print }
' "$TEMPLATE")

if [[ -z "$TEMPLATE_BODY" ]]; then
  echo "ERROR: could not extract verbatim body block from $TEMPLATE" >&2
  exit 5
fi

# Look up sender signature from cache if --sender-email-id provided
SIGNATURE=""
if [[ -n "$SENDER_EMAIL_ID" ]]; then
  SIGNATURE=$(turso_exec "SELECT signature_html FROM sender_email_signatures WHERE tenant_slug='$TENANT_SLUG' AND account_key='$ACCOUNT' AND sender_email_id=$SENDER_EMAIL_ID LIMIT 1" | head -1)
fi

# Substitute {first_name}, {company}, {booking_url}, {sender_signature}.
# Templates use single-brace style (NOT double).
REPLY_BODY="${TEMPLATE_BODY//\{first_name\}/${FIRST_NAME:-there}}"
REPLY_BODY="${REPLY_BODY//\{company\}/${COMPANY:-your team}}"
REPLY_BODY="${REPLY_BODY//\{booking_url\}/$BOOKING_URL}"
REPLY_BODY="${REPLY_BODY//\{sender_signature\}/$SIGNATURE}"

# ─── Send ───────────────────────────────────────────────────────────────
SEND_OUT=$("$SCRIPT_DIR/send-bison-reply.sh" \
  --account "$ACCOUNT" \
  --reply-id "$REPLY_ID" \
  --body "$REPLY_BODY" \
  --content-type html) || {
  echo "[auto-send-interested] send failed for reply_id=$REPLY_ID" >&2
  turso_exec "UPDATE agent_replies SET state='error', error_msg='send_failed', decided_at=datetime('now'), decided_by='auto:rule:interested' WHERE tenant_slug='$TENANT_SLUG' AND account_key='$ACCOUNT' AND bison_reply_id='$REPLY_ID'" >/dev/null
  exit 9
}

# ─── State updates (skip on dry-run) ────────────────────────────────────
NEW_COUNT=$((COUNT_NOW + 1))
if [[ "${DRY_RUN:-0}" == "1" ]]; then
  echo "[DRY_RUN] would increment $COUNT_KEY to $NEW_COUNT and update agent_replies.state=sent_auto" >&2
else
  turso_exec "UPDATE agent_state SET value='$NEW_COUNT', updated_at=datetime('now') WHERE tenant_slug='$TENANT_SLUG' AND key='$COUNT_KEY'" >/dev/null
  SAFE_BODY=$(printf '%s' "$REPLY_BODY" | sed "s/'/''/g")
  turso_exec "UPDATE agent_replies SET state='sent_auto', sent_at=datetime('now'), decided_at=datetime('now'), decided_by='auto:rule:interested', draft_body='$SAFE_BODY' WHERE tenant_slug='$TENANT_SLUG' AND account_key='$ACCOUNT' AND bison_reply_id='$REPLY_ID'" >/dev/null
fi

# ─── Telegram alert (best-effort) ───────────────────────────────────────
if [[ -n "${TELEGRAM_BOT_TOKEN:-}" && -n "${TELEGRAM_CHAT_ID:-}" ]]; then
  TG_TEXT=$(printf '🔥 INTERESTED-HANDOFF auto-sent\n  account: %s\n  persona: %s\n  reply_id: %s\n  daily count: %s/%s\n  booking_url: %s' \
    "$ACCOUNT" "$PERSONA" "$REPLY_ID" "$NEW_COUNT" "$DAILY_AUTO_SEND_CAP" "$BOOKING_URL")
  curl -sS -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
    -d "chat_id=${TELEGRAM_CHAT_ID}" \
    --data-urlencode "text=$TG_TEXT" \
    --max-time 10 >/dev/null || echo "[auto-send-interested] telegram alert failed (non-fatal)" >&2
fi

echo "OK auto-sent reply_id=$REPLY_ID account=$ACCOUNT count=$NEW_COUNT/$DAILY_AUTO_SEND_CAP"
echo "$SEND_OUT"
