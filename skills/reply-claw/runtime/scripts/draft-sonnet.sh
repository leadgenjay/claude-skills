#!/usr/bin/env bash
# FORKED FROM: bison-replies/scripts/draft-sonnet.sh @ commit ba00377
# reply-claw: Multi-tenant reply drafting via Claude Sonnet.
#
# Drafts a contextual reply using Claude Sonnet based on classification category,
# sender email, subject, and body. Loads tenant config to access KB bundles and
# persona signatures.
#
# Usage:
#   draft-sonnet.sh <category> <sender> <subject> <body> <account_key>
#
# Env required:
#   RC_TENANT_CONFIG — path to tenant config JSON
#   ANTHROPIC_API_KEY
#   DRAFT_MODEL (optional, default claude-sonnet-4-6)

set -euo pipefail

if [[ $# -lt 5 ]]; then
  echo "ERROR: usage: draft-sonnet.sh <category> <sender> <subject> <body> <account_key>" >&2
  exit 2
fi

CATEGORY="$1"
SENDER="$2"
SUBJECT="$3"
BODY="$4"
ACCOUNT_KEY="$5"
MODEL="${DRAFT_MODEL:-claude-sonnet-4-6}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROMPT_FILE="$SCRIPT_DIR/../prompts/draft.md"

if [[ ! -f "$PROMPT_FILE" ]]; then
  echo "ERROR: prompt file not found: $PROMPT_FILE" >&2
  exit 2
fi

# Load tenant config for KB bundles and persona info
if [[ -z "${RC_TENANT_CONFIG:-}" ]]; then
  echo "ERROR: RC_TENANT_CONFIG env var not set" >&2
  exit 1
fi

if [[ ! -f "$RC_TENANT_CONFIG" ]]; then
  echo "ERROR: RC_TENANT_CONFIG file not found: $RC_TENANT_CONFIG" >&2
  exit 1
fi

SYSTEM_PROMPT=$(cat "$PROMPT_FILE")

# For now, pass account_key to prompt context (future: lookup KB bundle)
# KB bundles would be stored in agent_state or a kb_bundles table

# Call Anthropic API
RESP=$(curl -s -X POST https://api.anthropic.com/v1/messages \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "content-type: application/json" \
  -d "$(jq -n \
    --arg system "$SYSTEM_PROMPT" \
    --arg category "$CATEGORY" \
    --arg sender "$SENDER" \
    --arg subject "$SUBJECT" \
    --arg body "$BODY" \
    --arg account "$ACCOUNT_KEY" \
    --arg model "$MODEL" \
    '{
      model: $model,
      max_tokens: 512,
      system: $system,
      messages: [
        {
          role: "user",
          content: "Classification: \($category)\n\nFrom: \($sender)\nSubject: \($subject)\n\nBody:\n\($body)\n\nAccount: \($account)\n\nPlease draft a contextual reply."
        }
      ]
    }')")

# Extract text response
if echo "$RESP" | jq -e '.content[0].text' > /dev/null 2>&1; then
  echo "$RESP" | jq -r '.content[0].text'
else
  echo "ERROR: Anthropic API error: $(echo "$RESP" | jq -r '.error.message // .')" >&2
  exit 1
fi
