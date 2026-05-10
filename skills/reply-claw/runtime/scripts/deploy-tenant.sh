#!/usr/bin/env bash
# FORKED FROM: bison-replies/scripts/deploy-to-zeus.sh @ commit ba00377
# reply-claw: Multi-tenant deployment orchestrator.
#
# Deploys reply-claw runtime to a remote nanoclaw host via SSH.
# Syncs scripts, prompts, migrations; updates environment config;
# restarts container; installs host crontabs; verifies health.
#
# Usage:
#   deploy-tenant.sh --config <tenant-config-json>
#     [--ssh-host zeus] [--skill-path /data/nanoclaw/repo/container/skills/reply-claw]
#
# Tenant config must include:
#   {
#     "tenant_slug": "lgj",
#     "nanoclaw": {
#       "ssh_alias": "zeus",
#       "skill_install_path": "/data/nanoclaw/repo/container/skills/reply-claw",
#       "env_conf_path": "/data/nanoclaw/env.conf",
#       "docker_group_folder": "main",
#       "chat_jid": "tg:123456"
#     }
#   }

set -euo pipefail

CONFIG_FILE=""
SKILL_DIR="$(cd "$(dirname "$0")/.." && pwd)"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --config)    CONFIG_FILE="$2"; shift 2 ;;
    --help|-h)   sed -n '2,18p' "$0"; exit 0 ;;
    *)           echo "[deploy-tenant] unknown arg: $1" >&2; exit 2 ;;
  esac
done

if [[ -z "$CONFIG_FILE" ]]; then
  echo "ERROR: --config required" >&2
  exit 2
fi

if [[ ! -f "$CONFIG_FILE" ]]; then
  echo "ERROR: config file not found: $CONFIG_FILE" >&2
  exit 1
fi

# Parse config using node
CONFIG_SCRIPT=$(mktemp)
trap "rm -f '$CONFIG_SCRIPT'" EXIT

cat > "$CONFIG_SCRIPT" << 'EOFSCRIPT'
const fs = require('fs');
const cfg = JSON.parse(fs.readFileSync(process.argv[1], 'utf8'));

const required = [
  'tenant_slug',
  'nanoclaw.ssh_alias',
  'nanoclaw.skill_install_path',
  'nanoclaw.env_conf_path',
  'nanoclaw.docker_group_folder',
];

for (const key of required) {
  const parts = key.split('.');
  let val = cfg;
  for (const part of parts) {
    val = val?.[part];
  }
  if (!val) {
    console.error(`ERROR: ${key} missing from config`);
    process.exit(1);
  }
}

console.log(`TENANT_SLUG='${cfg.tenant_slug}'`);
console.log(`SSH_ALIAS='${cfg.nanoclaw.ssh_alias}'`);
console.log(`SKILL_PATH='${cfg.nanoclaw.skill_install_path}'`);
console.log(`ENV_CONF='${cfg.nanoclaw.env_conf_path}'`);
console.log(`DOCKER_GROUP='${cfg.nanoclaw.docker_group_folder}'`);
console.log(`CHAT_JID='${cfg.nanoclaw.chat_jid}'`);
EOFSCRIPT

eval "$(node "$CONFIG_SCRIPT" "$CONFIG_FILE")" || exit 1

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Deploy reply-claw to $TENANT_SLUG"
echo "  SSH host:       $SSH_ALIAS"
echo "  Skill path:     $SKILL_PATH"
echo "  Env conf:       $ENV_CONF"
echo "  Docker group:   $DOCKER_GROUP"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Step 1: Rsync scripts, prompts, migrations
echo "[1/5] Syncing files to $SSH_ALIAS:$SKILL_PATH..."
rsync -avz --delete \
  "$SKILL_DIR/scripts/" \
  "$SKILL_DIR/prompts/" \
  "$SKILL_DIR/migrations/" \
  "$SSH_ALIAS:$SKILL_PATH/" \
  || { echo "ERROR: rsync failed" >&2; exit 1; }

# Step 2: Update environment config
echo "[2/5] Appending tenant config to $ENV_CONF..."
ssh "$SSH_ALIAS" bash << EOFCMD
  set -e
  cfg_json='$CONFIG_FILE'
  if [[ ! -f "\$cfg_json" ]]; then
    echo "ERROR: config file not found on remote" >&2
    exit 1
  fi

  # Append RC_TENANT_CONFIG if not already present
  if ! grep -q "RC_TENANT_CONFIG" "$ENV_CONF"; then
    echo "" >> "$ENV_CONF"
    echo "# ─── reply-claw config ($TENANT_SLUG) ───────────────────" >> "$ENV_CONF"
    echo "export RC_TENANT_CONFIG='$cfg_json'" >> "$ENV_CONF"
    echo "Updated $ENV_CONF with RC_TENANT_CONFIG"
  else
    echo "RC_TENANT_CONFIG already present in $ENV_CONF"
  fi
EOFCMD

# Step 3: Recreate nanoclaw container (optional, depends on deployment model)
echo "[3/5] Reloading nanoclaw container..."
ssh "$SSH_ALIAS" bash << EOFCMD
  set -e
  docker compose -f /data/nanoclaw/docker-compose.yml down --remove-orphans || true
  docker compose -f /data/nanoclaw/docker-compose.yml up -d
  sleep 2
  echo "Container reloaded"
EOFCMD

# Step 4: Install host crontabs
echo "[4/5] Installing host crontabs..."
ssh "$SSH_ALIAS" bash << EOFCMD
  set -e
  cron_check_replies="*/8 * * * * cd $SKILL_PATH && env RC_TENANT_CONFIG='$CONFIG_FILE' docker exec -e RC_TENANT_CONFIG nanoclaw node scripts/check-replies.mjs"
  cron_slash_cmd="* * * * * cd $SKILL_PATH && env RC_TENANT_CONFIG='$CONFIG_FILE' docker exec -e RC_TENANT_CONFIG nanoclaw node scripts/slash-command-handler.mjs"

  # Remove old entries if they exist
  crontab -l 2>/dev/null | grep -v "$SKILL_PATH/scripts/check-replies" | grep -v "$SKILL_PATH/scripts/slash-command" > /tmp/cron.tmp || true

  # Add new entries
  echo "\$cron_check_replies" >> /tmp/cron.tmp
  echo "\$cron_slash_cmd" >> /tmp/cron.tmp

  crontab /tmp/cron.tmp
  rm /tmp/cron.tmp
  echo "Crontab updated"
EOFCMD

# Step 5: Verify health
echo "[5/5] Verifying deployment..."
ssh "$SSH_ALIAS" bash << EOFCMD
  set -e
  echo "Checking Docker container..."
  docker ps | grep -q nanoclaw && echo "✓ nanoclaw container running" || { echo "✗ nanoclaw not running"; exit 1; }

  echo "Checking scripts..."
  for script in check-replies.mjs slash-command-handler.mjs send-bison-reply.sh auto-send-interested.sh classify-haiku.sh draft-sonnet.sh; do
    [[ -f "$SKILL_PATH/scripts/\$script" ]] && echo "✓ \$script" || { echo "✗ \$script missing"; exit 1; }
  done

  echo "Checking prompts..."
  for prompt in classify.md draft.md; do
    [[ -f "$SKILL_PATH/prompts/\$prompt" ]] && echo "✓ \$prompt" || { echo "✗ \$prompt missing"; exit 1; }
  done

  echo "Checking crontabs..."
  crontab -l | grep -q "check-replies" && echo "✓ check-replies cron installed" || { echo "✗ cron not found"; exit 1; }
EOFCMD

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✓ Deployment complete: $TENANT_SLUG → $SSH_ALIAS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
