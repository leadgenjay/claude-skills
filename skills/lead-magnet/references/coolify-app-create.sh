#!/usr/bin/env bash
# coolify-app-create.sh
# Create a Coolify v4 application for a reverse-lead-magnet repo, set its env
# vars, and trigger + poll the first deploy. Bakes in every gotcha learned on
# the bestsellerangle.com build.
#
# Usage:
#   ./coolify-app-create.sh <slug> <domain> <host_port> <git_repo_ssh_url> [git_branch]
#
# Reads from env (see SKILL.md Step 0):
#   COOLIFY_API_TOKEN, COOLIFY_API_URL, ANTHROPIC_API_KEY, APIFY_API_TOKEN
#   COOLIFY_PROJECT_UUID, COOLIFY_SERVER_UUID, COOLIFY_DEPLOY_KEY_UUID
#
# The PROJECT/SERVER/DEPLOY-KEY UUIDs are LGJ-INTERNAL on Zeus. Yours differ —
# create a "Lead Magnets" project + register a deploy key once, then reuse.
#
# Requires: curl, jq
set -euo pipefail

SLUG="${1:?missing slug}"
DOMAIN="${2:?missing domain}"
HOST_PORT="${3:?missing host_port}"
REPO_URL="${4:?missing git_repo_ssh_url}"   # e.g. git@github.com:leadgenjay/<slug>.git
GIT_BRANCH="${5:-main}"

API_TOKEN="${COOLIFY_API_TOKEN:?missing COOLIFY_API_TOKEN}"
API_URL="${COOLIFY_API_URL:?missing COOLIFY_API_URL}"
PROJECT_UUID="${COOLIFY_PROJECT_UUID:?missing COOLIFY_PROJECT_UUID}"
SERVER_UUID="${COOLIFY_SERVER_UUID:?missing COOLIFY_SERVER_UUID}"
DEPLOY_KEY_UUID="${COOLIFY_DEPLOY_KEY_UUID:?missing COOLIFY_DEPLOY_KEY_UUID}"
ANTH_KEY="${ANTHROPIC_API_KEY:?missing ANTHROPIC_API_KEY}"
APIFY_KEY="${APIFY_API_TOKEN:?missing APIFY_API_TOKEN}"

auth=(-H "Authorization: Bearer $API_TOKEN" -H "Content-Type: application/json")

echo "▶ Creating Coolify application '$SLUG'…"
# ports_mappings is NON-OPTIONAL: it publishes a STABLE host port. Without it the
# tunnel must target the timestamp-suffixed container name, which rotates on every
# redeploy and breaks routing. (§Gotchas/coolify-aliases)
APP_PAYLOAD=$(jq -n \
  --arg p "$PROJECT_UUID" --arg s "$SERVER_UUID" --arg k "$DEPLOY_KEY_UUID" \
  --arg repo "$REPO_URL" --arg br "$GIT_BRANCH" --arg name "$SLUG" \
  --arg pm "${HOST_PORT}:3000" --arg dom "https://$DOMAIN" '{
    project_uuid: $p, server_uuid: $s, private_key_uuid: $k,
    environment_name: "production",
    git_repository: $repo, git_branch: $br, name: $name,
    build_pack: "dockerfile", dockerfile_location: "/Dockerfile",
    ports_exposes: "3000", ports_mappings: $pm,
    domains: $dom, instant_deploy: false }')

APP_RESP=$(curl -sS "${auth[@]}" -d "$APP_PAYLOAD" "$API_URL/applications")
APP_UUID=$(echo "$APP_RESP" | jq -r '.uuid // .data.uuid // empty')
[ -z "$APP_UUID" ] && { echo "✗ App create failed:"; echo "$APP_RESP" | jq -r '.'; exit 1; }
echo "  app uuid: $APP_UUID"

echo "▶ Setting env vars…"
# Only is_preview + is_literal are valid. is_build_time -> 422. (§Gotchas/coolify-envs)
set_env() {
  local k="$1" v="$2"
  curl -sS "${auth[@]}" \
    -d "$(jq -n --arg k "$k" --arg v "$v" '{key:$k, value:$v, is_preview:false, is_literal:true}')" \
    "$API_URL/applications/$APP_UUID/envs" >/dev/null
  echo "  set $k"
}
set_env ANTHROPIC_API_KEY "$ANTH_KEY"
set_env APIFY_API_TOKEN  "$APIFY_KEY"
set_env NODE_ENV         "production"

echo "▶ Triggering deploy…"
DEP_RESP=$(curl -sS "${auth[@]}" -X POST "$API_URL/deploy?uuid=$APP_UUID&force=false")
DEPLOY_UUID=$(echo "$DEP_RESP" | jq -r '.deployment_uuid // .deployments[0].deployment_uuid // empty')
[ -z "$DEPLOY_UUID" ] && { echo "✗ Deploy trigger failed:"; echo "$DEP_RESP" | jq -r '.'; exit 1; }
echo "  deployment uuid: $DEPLOY_UUID"

echo "▶ Polling deploy (first build ~3-5 min for native canvas compile)…"
ELAPSED=0
while [ "$ELAPSED" -lt 600 ]; do
  STATUS=$(curl -sS "${auth[@]}" "$API_URL/deployments/$DEPLOY_UUID" | jq -r '.status // .data.status // "unknown"')
  case "$STATUS" in
    finished|success) echo "✓ Deploy finished. App UUID: $APP_UUID (host port $HOST_PORT)"; exit 0 ;;
    failed|error|cancelled) echo "✗ Deploy $STATUS"; exit 1 ;;
  esac
  sleep 30; ELAPSED=$((ELAPSED + 30))
  echo "  …$STATUS (${ELAPSED}s)"
done
echo "✗ Deploy timed out after ${ELAPSED}s"; exit 1
