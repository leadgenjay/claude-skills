#!/usr/bin/env bash
# FORKED FROM: bison-replies/scripts/classify-haiku.sh @ commit ba00377
# reply-claw: Multi-tenant reply classification via Claude Haiku.
#
# Classifies an inbound email reply into one of 8 categories:
# interested, question, referral, not_interested, ooo, unsubscribe,
# do_not_contact, wrong_person.
#
# Outputs JSON: { "category": "...", "confidence": 0.85, "reason": "..." }
#
# Usage:
#   classify-haiku.sh "Subject line" "Email body..."
#
# Env required:
#   ANTHROPIC_API_KEY
#   CLASSIFY_MODEL (optional, default claude-haiku-4-5-20251001)

set -euo pipefail

if [[ $# -lt 2 ]]; then
  echo "ERROR: usage: classify-haiku.sh <subject> <body>" >&2
  exit 2
fi

SUBJECT="$1"
BODY="$2"
MODEL="${CLASSIFY_MODEL:-claude-haiku-4-5-20251001}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROMPT_FILE="$SCRIPT_DIR/../prompts/classify.md"

if [[ ! -f "$PROMPT_FILE" ]]; then
  echo "ERROR: prompt file not found: $PROMPT_FILE" >&2
  exit 2
fi

SYSTEM_PROMPT=$(cat "$PROMPT_FILE")

# Call Anthropic API
RESP=$(curl -s -X POST https://api.anthropic.com/v1/messages \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "content-type: application/json" \
  -d "$(jq -n \
    --arg system "$SYSTEM_PROMPT" \
    --arg subject "$SUBJECT" \
    --arg body "$BODY" \
    --arg model "$MODEL" \
    '{
      model: $model,
      max_tokens: 256,
      system: $system,
      messages: [
        {
          role: "user",
          content: "Subject: \($subject)\n\nBody:\n\($body)"
        }
      ]
    }')")

# Extract JSON from response
if echo "$RESP" | jq -e '.content[0].text' > /dev/null 2>&1; then
  TEXT=$(echo "$RESP" | jq -r '.content[0].text')
  # Response should be JSON-parseable
  if echo "$TEXT" | jq . > /dev/null 2>&1; then
    echo "$TEXT"
  else
    echo "ERROR: invalid JSON response from Haiku: $TEXT" >&2
    exit 1
  fi
else
  echo "ERROR: Anthropic API error: $(echo "$RESP" | jq -r '.error.message // .')" >&2
  exit 1
fi
