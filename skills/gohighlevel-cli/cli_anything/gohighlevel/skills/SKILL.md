---
name: "cli-anything-gohighlevel"
description: "CLI interface for GoHighLevel CRM/Marketing API - contacts, opportunities, calendars, workflows, conversations, email, payments, forms, surveys, funnels, landing pages, social media, and locations."
triggers:
  - gohighlevel
  - ghl cli
  - ghl contacts
  - ghl workflows
  - ghl calendars
  - ghl funnels
  - ghl landing page
---

# cli-anything-gohighlevel

CLI interface for the GoHighLevel (GHL) CRM and Marketing API. Manage contacts,
pipeline opportunities, calendars, workflows, conversations, forms, surveys,
funnels, landing pages, email, payments, social posts, and locations from the
command line or interactive REPL.

## Prerequisites

- Python 3.10+
- `GHL_API_KEY` environment variable set with your GHL API bearer token
- `GHL_LOCATION_ID` environment variable — your sub-account's location ID (the long ID in your GHL URL)

## Installation

From the root of this repo (wherever you cloned or unzipped it):

```bash
./install.sh
```

The installer creates a `.venv/`, installs the package, and copies `.env.example` -> `.env`. Open `.env` and set `GHL_API_KEY` + `GHL_LOCATION_ID`. Then run commands via the `./ghl` wrapper (it auto-activates the venv), or `pip install -e .` into your own environment.

## Usage

### CLI Mode (one-shot commands)
```bash
ghl contacts list --json
ghl contacts get <contact_id>
ghl contacts create --email user@example.com --first-name John --last-name Doe
ghl opportunities list --status open
ghl calendars list
ghl workflows list
ghl conversations list --status unread
ghl payments transactions
ghl forms list
ghl social posts
ghl locations get
```

### REPL Mode (interactive)
```bash
ghl
# or
cli-anything-gohighlevel
```

### Global Options
- `--json` — Output as machine-readable JSON (recommended for agents)
- `--location-id <ID>` — Override GHL_LOCATION_ID for this command
- `--version` — Show CLI version
- `--help` — Show help

## Command Groups

| Group | Description | Key Commands |
|-------|-------------|--------------|
| `contacts` | Contact management | list, get, create, update, delete, search, add-tag, remove-tag |
| `opportunities` | Pipeline deals | list, get, create, update, delete, pipelines |
| `calendars` | Scheduling | list, get, slots, appointments, book, groups, create, update, delete |
| `workflows` | Automation workflows | list, enroll, remove; create/build (`--experimental`) |
| `conversations` | Messaging (SMS, email, chat) | list, get, messages, send |
| `emails` | Email campaigns/templates | list-campaigns |
| `payments` | Financial operations | transactions, orders, invoices, create-invoice |
| `forms` | Form management | list, submissions, create, delete |
| `surveys` | Survey management | list, create, delete |
| `funnels` | Funnel and landing-page building | templates, init-template, lint, preview, list, pages, export-page, create-page, set-content |
| `social` | Social media posting | accounts, posts, create-post |
| `locations` | Sub-account management | get, search, tags, custom-fields, custom-values |

## Agent Usage Notes

- Always use `--json` flag for programmatic consumption
- Contact search uses `contacts search <query>` for name-based search
- Workflow enrollment is done via `contacts` group (not workflows): the GHL API triggers workflows through contact endpoints
- Social media posting requires OAuth-connected accounts
- All endpoints require valid `GHL_API_KEY` bearer token
- API base URL: `https://services.leadconnectorhq.com`
- API version header: `2021-07-28`

## Builders (experimental - unofficial internal API)

The public API is read-only for workflows (`workflows list` only). Creating/updating
workflows requires the `--experimental` flag, which uses GHL's **unofficial** internal
API (`backend.leadconnectorhq.com`) authenticated with `GHL_FIREBASE_REFRESH_TOKEN`.

**Surface this to the user before using it:**
- That Firebase token is the user's **entire GHL login** (full account access), not a
  scoped key. Use it **only on the user's own agency account — never a client's**.
- To provision workflows for client sub-accounts, prefer **Snapshots** (build once in
  the UI, sub-accounts inherit it) — no token, no internal API.
- The internal API has no SLA and may change/break without notice. Workflows are
  created as draft. The CLI prints a one-time warning on use
  (`GHL_SUPPRESS_INTERNAL_WARNING=1` to silence).

The same guarded internal path can create native forms, surveys, calendars, and
complete funnel pages. `funnels set-content` backs up the current draft before
replacement. Keep pages draft-only until the user explicitly approves publishing.

Before calling a landing page complete, test the real served GHL draft after
fonts and native embeds settle. Personally inspect 1440x900, 768x1024, and
393x852 captures; exercise every form, CTA, and calendar path twice without
submitting or booking; and pass overflow/WebKit checks. Local previews and lint
scores are not visual proof.

## Examples

```bash
# List contacts as JSON
ghl --json contacts list --limit 50

# Create a contact with tags
ghl contacts create --email lead@company.com --first-name Jane --last-name Smith --tag "hot-lead" --tag "webinar"

# Search contacts
ghl contacts search "john"

# List pipeline opportunities
ghl --json opportunities list --status open

# Get available calendar slots
ghl calendars slots <calendar_id> --start 2026-03-25 --end 2026-03-30

# Create a native form and calendar
ghl --experimental forms create --from-json form.json
ghl --json calendars create --from-json calendar.json

# Create and validate a two-step funnel draft
ghl funnels init-template optin --theme modern --output step-1.json
ghl funnels lint step-1.json
ghl --experimental funnels set-content <page-id> --from-json step-1.json

# Send SMS in conversation
ghl conversations send <conversation_id> --type SMS --message "Thanks for your interest!"

# List transactions
ghl --json payments transactions --limit 50

# Create social post
ghl social create-post --account-id <id> --text "New blog post!" --schedule "2026-03-26T10:00:00Z"
```
