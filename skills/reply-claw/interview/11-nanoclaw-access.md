# Phase 11 — NanoClaw Container Access

## Purpose
Configure SSH access to the host running the nanoclaw reply agent container. Validates connectivity and discovers the chat_jid for Telegram integration.

## Pre-checks
- Check `.env` for `NANOCLAW_SSH_ALIAS`, `NANOCLAW_CONTAINER`, `NANOCLAW_GROUP_FOLDER`, `NANOCLAW_ENV_CONF_PATH` (optional, ask if missing)

## Questions

### Q1 — SSH Alias
**Header**: "SSH alias"
**Type**: free-text
**Question**: "SSH alias/hostname for the Zeus host (from ~/.ssh/config or IP). Example: 'zeus', 'root@10.0.0.5', 'zeus.example.com'"
**Validation**: Non-empty
**Persists to**: `config.nanoclaw.ssh_alias`
**Default**: `zeus`

### Q2 — Container Name
**Header**: "Container"
**Type**: free-text
**Question**: "Docker container name for nanoclaw. Example: 'nanoclaw', 'reply-agent', etc."
**Validation**: Non-empty, lowercase alphanumeric/hyphens
**Persists to**: `config.nanoclaw.container_name`
**Default**: `nanoclaw`

### Q3 — Group Folder
**Header**: "Group folder"
**Type**: free-text
**Question**: "Group folder name inside nanoclaw (typically where tenant config lives). Example: 'main', 'group-a', 'default'"
**Validation**: Non-empty, lowercase alphanumeric/hyphens
**Persists to**: `config.nanoclaw.group_folder`
**Default**: `main`

### Q4 — Env Conf Path
**Header**: "Env conf"
**Type**: free-text
**Question**: "Absolute path to env.conf on the host. Example: '/data/nanoclaw/env.conf', '/app/nanoclaw/env.conf'"
**Validation**: Starts with /
**Persists to**: `config.nanoclaw.env_conf_path`
**Default**: `/data/nanoclaw/env.conf`

### Q5 — SSH Connectivity Test
**Header**: (automatic, no question)
**Type**: (auto-execute)
**Action**: Run `ssh {ssh_alias} "docker exec {container_name} echo ok"`. On success (output "ok"), continue. On failure, display error and ask AskUserQuestion: "SSH connection failed. Check your SSH config and retry? [Retry / Skip SSH validation]"
**Validation**: Returns "ok"

### Q6 — Env Conf File Check
**Header**: (automatic, no question)
**Type**: (auto-execute)
**Action**: Run `ssh {ssh_alias} "test -f {env_conf_path} && echo exists"`. On success (output "exists"), continue. On failure, warn: "env.conf not found at {env_conf_path}. It will be created during deployment."

### Q7 — Chat JID Discovery
**Header**: (automatic discovery)
**Type**: (auto-execute)
**Action**: Run `ssh {ssh_alias} "sqlite3 /data/{container_name}/store/messages.db 'SELECT DISTINCT chat_jid FROM messages WHERE chat_jid LIKE \"tg:%\" LIMIT 5'"` (may fail if DB doesn't exist; that's OK). If results found, present as AskUserQuestion with options:
- Each returned chat_jid (e.g., "tg:123456789")
- "Enter manually"

Ask: "Which Telegram chat_jid should replies be sent to?"
**On manual entry**: "Enter chat_jid in format 'tg:' followed by numeric ID (e.g., 'tg:987654321')"
**Validation**: Matches `^tg:\d+$`
**Persists to**: `config.telegram.chat_jid`
**Skip condition**: If discovery fails (no DB yet), allow user to enter manually or skip for now (will be seeded at first deploy).
