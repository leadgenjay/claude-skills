# Phase 3 — Reply Agent Personas

## Purpose
Define one or more personas (mailbox owners) for each workspace. Personas receive customer replies on their behalf and can auto-send interested handoffs if eligible.

## Pre-checks
- For each workspace, fetch live sender emails from Email Bison: `GET /api/sender-emails?workspace={account_key}`

## Questions

### Q1 — Persona Count (per workspace loop)
**Header**: "Persona count"
**Type**: AskUserQuestion (single-select)
**Question**: "How many personas in workspace '{account_key}'?"
**Options**:
- "1 persona"
- "2 personas"
- "3 personas"
- "4 personas"
**Persists to**: Used by wizard to loop through personas

### Q2 — First Name (per persona)
**Header**: "First name"
**Type**: free-text
**Question**: "First name of this persona"
**Validation**: Non-empty, max 50 chars
**Persists to**: `config.bison.workspaces[].personas[].first_name`

### Q3 — Last Name (per persona)
**Header**: "Last name"
**Type**: free-text
**Question**: "Last name of this persona"
**Validation**: Non-empty, max 50 chars
**Persists to**: `config.bison.workspaces[].personas[].last_name`

### Q4 — Role/Title (per persona)
**Header**: "Role"
**Type**: free-text
**Question**: "Job title or role (e.g., 'Founder', 'Head of Partnerships', 'Executive Assistant')"
**Validation**: Non-empty, max 100 chars
**Persists to**: `config.bison.workspaces[].personas[].role`

### Q5 — Email (per persona)
**Header**: "Email"
**Type**: free-text
**Question**: "Email address for this persona (must exist in workspace)"
**Validation**:
- Valid email format
- Matches a sender in `GET /api/sender-emails` for this workspace
- On mismatch: "Email not found in workspace. Create it first and retry."
**Persists to**: `config.bison.workspaces[].personas[].email`

### Q6 — Auto-Send Eligible (per persona)
**Header**: "Auto-send?"
**Type**: AskUserQuestion (single-select)
**Question**: "Can interested replies be auto-sent on behalf of {first_name}? (Recommend: No for support, Yes for sales)"
**Options**:
- "Yes, auto-send interested" — Unlocks auto-handoff for this persona
- "No, review first" — All replies require human approval
**Validation**: None
**Persists to**: `config.bison.workspaces[].personas[].auto_send_eligible`

### Q7 — Signature (optional, auto-fetched)
**Header**: "Signature"
**Type**: (auto-retrieve)
**Action**: If email exists in Bison, fetch signature from `GET /api/sender-emails?email={email}` → `signature` field. Display it read-only; allow user to override if different.
**Persists to**: `config.bison.workspaces[].personas[].email_signature` (HTML string)
