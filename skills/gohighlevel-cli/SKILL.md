---
name: "gohighlevel-cli"
description: "CLI interface for GoHighLevel CRM/Marketing API — contacts, opportunities, calendars, workflows, conversations, emails, payments, forms, social media, locations, documents. v2: email reading, workflow creation via internal API."
triggers:
  - gohighlevel
  - ghl cli
  - ghl contacts
  - ghl workflows
  - ghl calendars
  - ghl opportunities
  - ghl conversations
  - ghl payments
  - ghl locations
  - ghl emails
  - ghl create workflow
  - ghl read emails
---

# GoHighLevel CLI v2

Agent-usable CLI for the GoHighLevel CRM and Marketing API. Built with CLI-Anything framework (Click + REPL).

**v2 additions:** Email reading via conversations, workflow creation via internal API (`--experimental`), workflow enrollment, version routing fix.

## Quick Start

```bash
# Wrapper script (auto-activates venv)
~/Documents/Tech\ &\ Dev/highlevel-api-docs/agent-harness/ghl --help

# Or activate manually
source ~/Documents/Tech\ &\ Dev/highlevel-api-docs/agent-harness/.venv/bin/activate
ghl --help
```

## Requirements

- Python 3.13 (Homebrew) — venv at `~/Documents/Tech & Dev/highlevel-api-docs/agent-harness/.venv/`
- `GHL_API_KEY` env var — Private Integration Token (bearer) for public API
- `GHL_LOCATION_ID` env var (optional, defaults to `YB8rMdFShcHGcZGW87mA`)
- `GHL_FIREBASE_REFRESH_TOKEN` env var — required for `--experimental` commands (internal API)

## Command Groups

| Group | Commands | Status |
|-------|----------|--------|
| `contacts` | list, get, create, update, delete, search, add-tag, remove-tag | LIVE |
| `opportunities` | list, get, create, update, delete, pipelines | LIVE |
| `calendars` | list, get, slots, appointments, book, groups | LIVE |
| `workflows` | list, enroll, remove | LIVE |
| `workflows` | create, create-step, create-n8n | EXPERIMENTAL |
| `conversations` | list (--type), get, messages (--type), get-email, send | LIVE |
| `emails` | list-campaigns | LIVE |
| `payments` | transactions, orders, invoices, create-invoice | LIVE |
| `locations` | get, search, tags, custom-fields, custom-values | LIVE |
| `forms` | list, submissions | NEEDS SCOPE |
| `social` | accounts, posts, create-post | NEEDS SCOPE |
| `documents` | list, send, templates, send-template | NEEDS SCOPE |

## Agent Usage

Always use `--json` for programmatic output:
```bash
ghl --json contacts list --limit 50
ghl --json contacts search "john"
ghl --json opportunities list --status open
ghl --json opportunities pipelines
ghl --json calendars list
ghl --json calendars slots <cal_id> --start 2026-03-25 --end 2026-03-30
ghl --json workflows list
ghl --json conversations list --limit 10
ghl --json conversations list --type Email --limit 10
ghl --json payments transactions --limit 20
ghl --json locations get
ghl --json locations tags
ghl --json locations custom-fields
```

## Key Patterns

### Email Reading (Conversation Filtering)

Emails in GHL flow through the Conversations API, not a separate inbox. Two-step workflow:

```bash
# Step 1: List email conversations
ghl --json conversations list --type Email --limit 10

# Step 2: Get messages from a conversation (email only)
ghl --json conversations messages <conversation_id> --type Email

# Step 3: Get full email details (subject, body HTML, headers, attachments)
ghl --json conversations get-email <email_message_id>
```

Available `--type` choices: `Email`, `SMS`, `WhatsApp`, `GMB`, `IG`, `FB`, `Live_Chat`, `Custom`

### Workflow Enrollment (Public API)

```bash
# Enroll contact in workflow (no --experimental needed)
ghl workflows enroll --contact-id <contact_id> --workflow-id <workflow_id>

# Remove contact from workflow
ghl workflows remove --contact-id <contact_id> --workflow-id <workflow_id>
```

### Workflow Creation (Experimental — Internal API)

Requires `--experimental` flag and `GHL_FIREBASE_REFRESH_TOKEN` env var.

```bash
# Create workflows from campaign JSON
ghl --experimental workflows create --name "My Campaign" --from-json campaign.json

# Build steps incrementally
ghl --experimental workflows create-step --type email --name "Welcome" \
  --subject "Welcome!" --body "Thanks for signing up." --output-file steps.json
ghl --experimental workflows create-step --type wait --name "Pause" \
  --value 2 --unit days --output-file steps.json
ghl --experimental workflows create-step --type sms --name "Follow up" \
  --body "Did you see our email?" --output-file steps.json

# Create n8n bridge workflow (tag trigger → webhook to n8n)
ghl --experimental workflows create-n8n --name "Lead Notify" \
  --webhook-url "https://server.nextwave.io/webhook/lead-notify" \
  --tag "new-lead"
```

Step types: `email`, `sms`, `wait`, `tag`, `webhook`, `ai`

### Contact Management

```bash
# Create contact with tags
ghl contacts create --email lead@co.com --first-name Jane --last-name Smith --tag "hot-lead" --tag "webinar"

# Tag operations
ghl contacts add-tag <contact_id> hot-lead qualified
ghl contacts remove-tag <contact_id> cold

# Search by name
ghl contacts search "john doe"
```

### Opportunities Pipeline

```bash
ghl --json opportunities pipelines
ghl --json opportunities list --status open
ghl opportunities create --name "New Deal" --pipeline-id <id> --stage-id <id> --contact-id <id>
```

### Calendar Scheduling

```bash
ghl --json calendars list
ghl --json calendars slots <calendar_id> --start 2026-03-25 --end 2026-03-30
ghl calendars book --calendar-id <id> --contact-id <id> --slot-id <id> --start "2026-03-26T10:00:00" --end "2026-03-26T10:30:00"
```

### Conversations & Messaging

```bash
ghl --json conversations list --limit 10
ghl conversations send <conversation_id> --type SMS --message "Thanks for your interest!"
ghl conversations send <conversation_id> --type Email --message "Follow up email body"
```

## Architecture

```
~/Documents/Tech & Dev/highlevel-api-docs/agent-harness/
├── setup.py                          # Package config (cli-anything-gohighlevel)
├── ghl                               # Shell wrapper (auto-activates venv)
├── .venv/                            # Python 3.13 virtual environment
└── cli_anything/
    └── gohighlevel/
        ├── gohighlevel_cli.py        # Main CLI (~1050 lines, Click-based)
        ├── __main__.py               # python -m support
        ├── utils/
        │   ├── ghl_client.py         # Public API client (bearer token, version routing)
        │   ├── ghl_internal_client.py # Internal API client (Firebase JWT auth) [EXPERIMENTAL]
        │   ├── workflow_builder.py   # Step builders + CampaignBuilder [EXPERIMENTAL]
        │   └── repl_skin.py          # Interactive REPL (prompt-toolkit)
        └── skills/
            └── SKILL.md              # Package-level skill doc
```

## API Details

### Public API (stable)
- **Base URL:** `https://services.leadconnectorhq.com`
- **Auth:** Bearer token via `GHL_API_KEY` env var
- **Version Header:** Auto-routed by path (`2021-04-15` for conversations/calendars, `2021-07-28` for everything else)
- **Location:** `YB8rMdFShcHGcZGW87mA` (Lead Gen Jay)

### Internal API (experimental)
- **Base URL:** `https://backend.leadconnectorhq.com`
- **Auth:** Firebase JWT via `token-id` header (NOT `Authorization: Bearer`)
- **Token Source:** `GHL_FIREBASE_REFRESH_TOKEN` env var → auto-refreshed every 50 min
- **Headers:** `channel: APP`, `source: WEB_USER`
- **Capabilities:** Workflow creation, step saving, trigger creation, tag creation

## Experimental Features

Commands marked EXPERIMENTAL use GHL's internal API (`backend.leadconnectorhq.com`). They require:

1. `--experimental` flag on the CLI
2. `GHL_FIREBASE_REFRESH_TOKEN` env var set
3. Understanding that the internal API may change without notice

All workflows are created as **draft** (never auto-published). 56 verified action types supported.

### Workflow Best Practices

1. **Always ask for trigger + goal** — before building any workflow, confirm: (a) what triggers entry (tag, form, event), and (b) what goal removes contacts from the sequence (purchase, booking, tag change). Every workflow needs both
2. **Always add a Goal Event step at the end** — use a `workflow_goal` step as the final step. Configure it with: goal type = "Added a contact Tag", the exit tag (e.g., "aia purchase"), and "End this workflow" if the contact reaches the goal without meeting conditions. This ensures contacts exit the sequence immediately when the goal is met, regardless of where they are in the workflow
3. **Keep workflows simple** — don't add tracking tags between steps unless specifically requested. A clean workflow is: Wait → Email → Wait → Email → Goal (not Wait → Email → Tag → Wait → Email → Tag)
3. **Paragraph spacing** — the `dm_email()` formatter skips blank lines and uses tight 12px margins. For proper spacing in GHL, use a custom formatter that renders blank lines as `<br/>` spacers or use the GHL HTML template from the `lgj-email-marketing` skill (`<p>...<br/>` pattern)
4. **Verify all links** — never include checkout URLs, bonus offers, or resource links without confirming they exist. Ask the user if unsure
5. **UTM tracking** — all email links must include `utm_source=ghl&utm_content=<email-identifier>`

**Fork provenance:** Internal API modules adapted from `ghl-superspeed-v3-main/lib/engine.py` (verified 2026-03-25). If upstream updates, sync from `~/Documents/Claude Skills/ghl-superspeed-v3-main/lib/engine.py`.

## Known Limitations

- Public Workflows API is read-only (list only) — creation requires `--experimental`
- Documents/Proposals require templates (no create-from-scratch)
- Social media posting requires OAuth-connected accounts
- Forms, Social, and Documents scopes need enabling on the Private Integration Token
- Firebase refresh tokens can be revoked — get a new one from GHL Chrome extension if auth fails
- Internal API may change without notice (mitigated by `--experimental` flag + draft-only creation)
