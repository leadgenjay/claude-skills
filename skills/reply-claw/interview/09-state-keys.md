# Phase 9 — Database Keys (Turso)

## Purpose
Configure Turso DB credentials for lead state persistence, reply tracking, and auto-send logs.

## Pre-checks
- Check `.env` for `TURSO_DB_URL`, `TURSO_DB_TOKEN`, `TURSO_DB_NAME`
- If all present, ask user to confirm re-use or update

## Questions

### Q1 — Turso DB URL (if missing)
**Header**: "DB URL"
**Type**: free-text
**Question**: "Paste your Turso database URL. Create one at https://docs.turso.tech/cli/install if needed. Example: 'libsql://database-name-user.turso.io'"
**Validation**:
- Starts with `libsql://` or `https://`
- Valid hostname
**Persists to**: `.env` as `TURSO_DB_URL={url}`
**Skip condition**: If already in `.env` with valid format, ask AskUserQuestion: "TURSO_DB_URL found. Use existing? [Yes / No, update]"

### Q2 — Turso DB Token (if missing)
**Header**: "DB token"
**Type**: free-text (masked input)
**Question**: "Paste your Turso auth token. Get it from https://console.turso.tech"
**Validation**: Non-empty, typically 64+ chars
**Persists to**: `.env` as `TURSO_DB_TOKEN={token}`
**Skip condition**: If already in `.env`, ask AskUserQuestion: "TURSO_DB_TOKEN found. Use existing? [Yes / No, update]"

### Q3 — Database Name
**Header**: "DB name"
**Type**: free-text
**Question**: "Database name (e.g., 'cold-email-leads')"
**Validation**: Non-empty, lowercase letters/numbers/hyphens
**Persists to**: `.env` as `TURSO_DB_NAME={name}`
**Default**: `cold-email-leads`

### Q4 — Run Migrations (automatic)
**Header**: (automatic, no question)
**Type**: (auto-execute)
**Action**: After credentials are saved to `.env`, run: `sqlite3 "{TURSO_DB_URL}" < migrations/001_agent_replies.sql` (idempotent — will create tables if missing, skip if they exist). On error, display and ask: "Migration failed. Check your Turso credentials and retry? [Retry / Skip migrations for now]"
**Persists to**: (migrations run, no config change)
