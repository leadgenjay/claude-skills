# Phase 2 — Email Bison Workspaces

## Purpose
Register Email Bison workspaces and API credentials. Each workspace can have multiple personas.

## Pre-checks
- Scan `.env` for existing `EMAIL_BISON_*_API_KEY` entries
- Test network connectivity to Email Bison API

## Questions

### Q1 — Workspace Count
**Header**: "Workspace count"
**Type**: AskUserQuestion (single-select)
**Question**: "How many Email Bison workspaces do you want to connect?"
**Options**:
- "1 workspace"
- "2 workspaces"
- "3 workspaces"
- "4 workspaces"
**Persists to**: `config.bison.workspace_count` (used by wizard to loop)

### Q2 — Workspace Account Key (per workspace, loop)
**Header**: "Account key"
**Type**: free-text
**Question**: "Enter an internal identifier for workspace {N}. (lowercase letters, hyphens. e.g., 'consulti', 'lgj', 'partner-1')"
**Validation**:
- Regex: `^[a-z][a-z0-9-]{0,20}$`
- Unique within workspaces array
**Persists to**: `config.bison.workspaces[].account_key`

### Q3 — Base URL (per workspace)
**Header**: "Base URL"
**Type**: free-text
**Question**: "Email Bison API base URL (default: https://send.leadgenjay.com/api)"
**Validation**:
- Valid HTTPS URL
- Responds to `GET /me` with 200
**Persists to**: `config.bison.workspaces[].base_url`
**Default**: `https://send.leadgenjay.com/api`

### Q4 — API Key (per workspace)
**Header**: "API key"
**Type**: free-text (masked input)
**Question**: "Paste your Email Bison API key (will be stored masked in env)."
**Validation**:
- Non-empty
- Test: `GET {base_url}/me` with `Authorization: Bearer {key}` returns 200 + valid workspace metadata
- On failure: "Invalid key or base URL. Check both and retry."
**Persists to**: Environment variable `EMAIL_BISON_{account_key_upper}_API_KEY` in `.env`; also cached in `config.bison.workspaces[].api_key_ref` as env var name for later use.
