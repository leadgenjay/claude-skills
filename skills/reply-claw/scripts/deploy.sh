#!/bin/bash
# Host wrapper for reply-claw deployment. Invokes runtime/scripts/deploy-tenant.sh with tenant config in env.
# Usage: bash deploy.sh <slug>

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_DIR="$(dirname "$SCRIPT_DIR")"
SLUG="${1:-}"

if [[ -z "$SLUG" ]]; then
  echo "Error: slug required. Usage: bash deploy.sh <slug>" >&2
  exit 1
fi

CONFIG_FILE="$SKILL_DIR/tenants/$SLUG/config.json"
ENV_FILE="$SKILL_DIR/tenants/$SLUG/tenant.env"

if [[ ! -f "$CONFIG_FILE" ]]; then
  echo "Error: config.json not found: $CONFIG_FILE" >&2
  exit 1
fi

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Error: tenant.env not found: $ENV_FILE" >&2
  exit 1
fi

# Source tenant env vars
# shellcheck disable=SC1090
source "$ENV_FILE"

# Export RC_TENANT_CONFIG for the deploy script
export RC_TENANT_CONFIG="$CONFIG_FILE"

# Run the runtime deploy script
DEPLOY_SCRIPT="$SKILL_DIR/runtime/scripts/deploy-tenant.sh"
if [[ ! -f "$DEPLOY_SCRIPT" ]]; then
  echo "Error: deploy-tenant.sh not found: $DEPLOY_SCRIPT" >&2
  exit 1
fi

bash "$DEPLOY_SCRIPT"

# Update deployed_at timestamp in config.json
TIMESTAMP=$(date -u +'%Y-%m-%dT%H:%M:%SZ')
# Use a temp file for atomic update
TMP_FILE="$CONFIG_FILE.tmp.$$"
python3 -c "
import json
with open('$CONFIG_FILE', 'r') as f:
    cfg = json.load(f)
cfg['deployed_at'] = '$TIMESTAMP'
with open('$TMP_FILE', 'w') as f:
    json.dump(cfg, f, indent=2)
" && mv "$TMP_FILE" "$CONFIG_FILE"

echo "Deployment complete. Updated deployed_at in config.json."
