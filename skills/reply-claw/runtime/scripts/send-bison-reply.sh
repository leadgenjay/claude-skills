#!/usr/bin/env bash
# FORKED FROM: bison-replies/scripts/send-bison-reply.sh @ commit ba00377
# reply-claw: Multi-tenant Bison reply sender.
#
# Sends a reply via Email Bison API using tenant config.
# Loads tenant config from RC_TENANT_CONFIG environment variable.
#
# Usage:
#   send-bison-reply.sh \
#     --account consulti|lgj \
#     --reply-id 4123 \
#     --body "reply text..." \
#     [--content-type html|plain]
#
# Env required:
#   RC_TENANT_CONFIG — path to tenant config JSON
#   ANTHROPIC_API_KEY (not directly used here, but inherited from host env)

set -euo pipefail

ACCOUNT=""
REPLY_ID=""
BODY=""
CONTENT_TYPE="html"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --account)       ACCOUNT="$2"; shift 2 ;;
    --reply-id)      REPLY_ID="$2"; shift 2 ;;
    --body)          BODY="$2"; shift 2 ;;
    --content-type)  CONTENT_TYPE="$2"; shift 2 ;;
    --help|-h)       sed -n '2,13p' "$0"; exit 0 ;;
    *)               echo "[send-bison-reply] unknown arg: $1" >&2; exit 2 ;;
  esac
done

for v in ACCOUNT REPLY_ID BODY; do
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

# Parse JSON config using node (simpler than jq)
CONFIG_SCRIPT=$(mktemp)
trap "rm -f '$CONFIG_SCRIPT'" EXIT

cat > "$CONFIG_SCRIPT" << 'EOFSCRIPT'
const fs = require('fs');
const cfg = JSON.parse(fs.readFileSync(process.argv[1], 'utf8'));
const account = process.argv[2];

// Lookup account in bison.workspaces array
const ws = cfg.bison?.workspaces?.find(w => w.account_key === account);
if (!ws) {
  console.error(`ERROR: account '${account}' not found in bison.workspaces`);
  process.exit(1);
}

// Output as shell vars
console.log(`BISON_API_KEY='${ws.api_key}'`);
console.log(`BISON_BASE_URL='${cfg.bison.base_url || 'https://send.leadgenjay.com/api'}'`);
EOFSCRIPT

eval "$(node "$CONFIG_SCRIPT" "$RC_TENANT_CONFIG" "$ACCOUNT")" || exit 1

REPLY_URL="${BISON_BASE_URL}/replies/${REPLY_ID}/reply"

# Send via Bison API
SEND_RESP=$(curl -s -X POST "$REPLY_URL" \
  -H "Authorization: Bearer $BISON_API_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"body\":$(printf '%s' "$BODY" | jq -Rs .),\"content_type\":\"$CONTENT_TYPE\"}")

# Check response
if echo "$SEND_RESP" | jq -e '.success' > /dev/null 2>&1; then
  echo "OK sent reply_id=$REPLY_ID account=$ACCOUNT"
  echo "$SEND_RESP" | jq .
else
  echo "ERROR: Bison API error for reply_id=$REPLY_ID: $(echo "$SEND_RESP" | jq -r '.error // .message // .' 2>/dev/null || echo "$SEND_RESP")" >&2
  exit 3
fi
