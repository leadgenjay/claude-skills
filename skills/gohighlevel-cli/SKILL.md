---
name: "gohighlevel-cli"
description: "Build and manage GoHighLevel from the command line: contacts, opportunities, workflows, forms, calendars, funnels, landing pages, conversations, email, payments, locations, and real-preview page QA."
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
  - ghl funnels
  - ghl landing page
  - ghl form builder
---

## Step 0 — Prerequisites

Before any operation, work from the installed `gohighlevel-cli` skill folder
and verify the requirements below. If any required check fails, stop and tell
the user how to fix it. Do not generate placeholder commands or continue with
partial credentials.

| Requirement | Check | Where to get it |
|---|---|---|
| Python 3.10+ | `python3 -c 'import sys; assert sys.version_info >= (3,10)'` | [python.org/downloads](https://www.python.org/downloads/) |
| Installed CLI wrapper | `test -x ./ghl && ./ghl --help >/dev/null` | Re-run `bash install.sh` in this skill folder |
| Public API credentials for public commands | `grep -Eq '^GHL_API_KEY=.+$' .env && grep -Eq '^GHL_LOCATION_ID=.+$' .env` | GHL Settings -> Private Integrations and the location URL |
| Browser setup values for `--experimental` commands | `grep -Eq '^GHL_FIREBASE_API_KEY=.+$' .env && grep -Eq '^GHL_FIREBASE_REFRESH_TOKEN=.+$' .env` | Run the no-network helper in `docs/get-firebase-token.md` |

The fourth row is required only for workflow, form, survey, and funnel builder
commands that use `--experimental`. If anything required for the requested
operation is missing, STOP.

# GoHighLevel CLI v2.2

Command-line interface for GoHighLevel that lets you or Claude Code build and
manage CRM data, automations, forms, calendars, and complete funnel pages from
the terminal. Built with the CLI-Anything framework (Click + interactive REPL).

**v2.2 additions:** native form and calendar creation, two-step funnel building,
draft backup before replacement, reusable landing-page templates, and a blocking
real-preview visual QA gate.

## Install (60 seconds)

Everything the CLI needs ships in this skill folder. Requirements: **Python 3.10+** and a GoHighLevel sub-account.

```bash
cd ~/.claude/skills/gohighlevel-cli
./install.sh
```

The installer creates a local `.venv/`, installs the package, and copies `.env.example` → `.env`. (The marketplace installer already runs this step for you — if it printed "post-install complete", skip to filling in `.env`.)

Open `.env` and fill in your credentials:

```env
GHL_API_KEY=pit-xxxxxxxx-...        # GHL Settings → Private Integrations
GHL_LOCATION_ID=YOUR_LOCATION_ID    # the long ID in your GHL URL
```

Smoke test:

```bash
./ghl contacts list --limit 5
```

You should see contacts from your account. Run `./ghl` with no arguments for an interactive REPL with autocomplete.

## Requirements

- Python 3.10+ (the venv lives at `.venv/` inside this skill folder)
- `GHL_API_KEY` env var — Private Integration Token (bearer) for the public API
- `GHL_LOCATION_ID` env var — your sub-account's location ID
- `GHL_FIREBASE_REFRESH_TOKEN` env var — only for `--experimental` commands (internal API). Grab it with the DevTools console snippet in `docs/get-firebase-token.md`.

All three live in the `.env` file next to the `ghl` wrapper; the wrapper auto-loads it.

## Command Groups

| Group | Commands | Status |
|-------|----------|--------|
| `contacts` | list, get, create, update, delete, search, add-tag, remove-tag | LIVE |
| `opportunities` | list, get, create, update, delete, pipelines | LIVE |
| `calendars` | list, get, slots, appointments, book, groups, create, update, delete | LIVE |
| `workflows` | list, enroll, remove | LIVE |
| `workflows` | create, create-step, create-n8n | EXPERIMENTAL |
| `conversations` | list (--type), get, messages (--type), get-email, send | LIVE |
| `emails` | list-campaigns | LIVE |
| `payments` | transactions, orders, invoices, create-invoice | LIVE |
| `locations` | get, search, tags, custom-fields, custom-values, set-custom-value | LIVE |
| `forms` | list, submissions | NEEDS SCOPE |
| `forms` | create, delete | EXPERIMENTAL |
| `surveys` | list, create, delete | EXPERIMENTAL |
| `funnels` | templates, init-template, lint, preview | LOCAL |
| `funnels` | list, create, pages, export-page, create-page, set-content, delete | EXPERIMENTAL |
| `social` | accounts, posts, create-post | NEEDS SCOPE |
| `documents` | list, send, templates, send-template | NEEDS SCOPE |

"NEEDS SCOPE" = enable that scope on your Private Integration Token in GHL Settings.

## Agent Usage

Always use `--json` for programmatic output:

```bash
./ghl --json contacts list --limit 50
./ghl --json contacts search "john"
./ghl --json opportunities list --status open
./ghl --json opportunities pipelines
./ghl --json calendars list
./ghl --json calendars slots <cal_id> --start 2026-03-25 --end 2026-03-30
./ghl --json workflows list
./ghl --json conversations list --type Email --limit 10
./ghl --json payments transactions --limit 20
./ghl --json locations get
./ghl --json locations custom-fields
```

`--json` works on most read commands and pipes cleanly into `jq`.

## Key Patterns

### Funnel and Landing-Page Builds (Mandatory Completion Gate)

The CLI can create the native form, calendar, funnel, and page content for a
complete two-step lead-generation funnel. Use built-in templates as the base,
then keep the result in draft until the user explicitly approves publishing.

```bash
# Create the native assets
./ghl --experimental forms create --from-json form.json
./ghl --json calendars create --from-json calendar.json

# Build and validate the page specs locally
./ghl funnels templates
./ghl funnels init-template optin --theme modern --output step-1.json
./ghl funnels lint step-1.json
./ghl funnels preview step-1.json --output step-1-preview.html

# Back up and write the actual GHL drafts
./ghl --experimental funnels export-page <page-id> --output backup.json
./ghl --experimental funnels set-content <page-id> --from-json step-1.json
```

`set-content` automatically backs up the current draft before replacement.
Never add `--publish` without explicit user authorization.

For every landing page, the real served GHL draft is the source of truth. Wait
for native forms, calendars, and fonts to settle, then personally inspect
full-page captures at 1440x900, 768x1024, and 393x852. Run every CTA, form, and
calendar path twice without submitting a lead or booking a call. Check for
literal escaped markup, horizontal overflow, mobile/WebKit failures, and
above-fold conversion controls. Local `funnels preview`, DOM snapshots, lint
scores, and worker prose are supporting evidence only.

Default page typography is Inter 700 for headlines and Roboto 400/500 for body
copy. True single-column sections center every child block; native field labels
remain left-aligned for usability. See `docs/landing-page-design-system.md` and
`docs/reference-funnel-patterns.md` for the complete guardrails.

### Email Reading (Conversation Filtering)

Emails in GHL flow through the Conversations API, not a separate inbox. Three-step workflow:

```bash
# Step 1: List email conversations
./ghl --json conversations list --type Email --limit 10

# Step 2: Get messages from a conversation (email only)
./ghl --json conversations messages <conversation_id> --type Email

# Step 3: Get full email details (subject, body HTML, headers, attachments)
./ghl --json conversations get-email <email_message_id>
```

Available `--type` choices: `Email`, `SMS`, `WhatsApp`, `GMB`, `IG`, `FB`, `Live_Chat`, `Custom`

### Workflow Enrollment (Public API)

```bash
./ghl workflows enroll --contact-id <contact_id> --workflow-id <workflow_id>
./ghl workflows remove --contact-id <contact_id> --workflow-id <workflow_id>
```

### Workflow Creation (Experimental — Internal API)

Requires the `--experimental` flag and `GHL_FIREBASE_REFRESH_TOKEN` set. All workflows are created as **draft** — never auto-published.

```bash
# Create a workflow from campaign JSON
./ghl --experimental workflows create --name "My Campaign" --from-json campaign.json

# Build steps incrementally
./ghl --experimental workflows create-step --type email --name "Welcome" \
  --subject "Welcome!" --body "Thanks for signing up." --output-file steps.json
./ghl --experimental workflows create-step --type wait --name "Pause" \
  --value 2 --unit days --output-file steps.json

# Create an n8n bridge workflow (tag trigger → webhook to n8n)
./ghl --experimental workflows create-n8n --name "Lead Notify" \
  --webhook-url "https://your-n8n.example.com/webhook/lead-notify" \
  --tag "new-lead"
```

Step types: `email`, `sms`, `imessage`, `wait`, `tag`, `webhook`, `ai`, `goal`

`--type goal` adds a terminal `workflow_goal` exit step (`--tags` = comma-separated exit tags; the contact leaves the workflow when any is added).

### Branching (If/Else) workflows

`create-step` builds **linear** flows only. To build an If/Else branch (e.g. "has tag X → email A, else → email B"), write a builder script using the helpers in `cli_anything/gohighlevel/utils/workflow_builder.py`:

- `if_else_nodes(name, branch_name, conditions, x, y)` → the 3-node GHL branch; wire children via the returned `yes_id`/`no_id`.
- `tag_condition([tags], has=True)` / `field_condition(field_id, value)` → branch conditions.
- `goal_step(name, tags)` → a `workflow_goal` exit.
- Build via `CampaignBuilder` with `"graph": True` in the workflow def so branch wiring / canvas positions are preserved.

Reference builds live in `builders/` — study one before writing your own.

### Contact Management

```bash
./ghl contacts create --email lead@co.com --first-name Jane --last-name Smith --tag "hot-lead" --tag "webinar"
./ghl contacts add-tag <contact_id> hot-lead qualified
./ghl contacts remove-tag <contact_id> cold
./ghl contacts search "john doe"
```

### Calendar Scheduling & Management

```bash
./ghl --json calendars slots <calendar_id> --start 2026-03-25 --end 2026-03-30
./ghl calendars book --calendar-id <id> --contact-id <id> --slot-id <id> \
  --start "2026-03-26T10:00:00" --end "2026-03-26T10:30:00"

# Manage the calendar object itself
./ghl --json calendars create --name "Strategy Call" --calendar-type round_robin \
  --team-member <userId> --slot-duration 30 --slot-duration-unit mins --slug strategy-call --active
./ghl --json calendars update <calendar_id> --name "Renamed Call" --inactive
./ghl calendars delete <calendar_id>          # interactive confirm; --yes to skip
```

> **WARNING:** GHL does not audit-log calendar-object deletions — a deleted calendar cannot be recovered without escalating to GHL Support.

## Workflow Best Practices

1. **Always confirm trigger + goal** before building — what starts the workflow (tag, form, event) and what exit removes contacts (purchase, booking, tag change).
2. **End every workflow with a Goal Event step** (`workflow_goal`) so contacts exit the moment the goal is met, wherever they are in the sequence.
3. **Keep workflows simple** — Wait → Email → Wait → Email → Goal. Don't sprinkle tracking tags between steps unless asked.
4. **Verify all links** in email copy before shipping — never include checkout URLs or resources you haven't confirmed exist.

## Known Gotchas (real bugs, encode the workaround)

1. **GET → mutate → PUT on a workflow WIPES canvas positions.** Every step you write back must include `advanceCanvasMeta = {"position": {"x": ..., "y": ...}}` or the GHL canvas renders empty.
2. **Builder scripts don't auto-load `.env`.** `source .env` (or `set -a && source .env && set +a`) before `python3 builders/foo.py`, or run through the `./ghl` wrapper which handles it.
3. **Workflow UI URL format** is `https://app.gohighlevel.com/location/{loc}/workflow/{wf_id}` (some whitelabel domains vary).
4. **`triggers` comes back empty on migrated workflows** — the trigger record lives at `triggersFilePath`; don't re-create it.
5. **NEVER add fallback syntax to GHL merge tags.** `{{contact.first_name || "there"}}` renders literally in the sent email. Use the bare merge tag.
6. **NEVER embed a manual footer (address + unsubscribe) in GHL email HTML.** GHL auto-appends one; a hand-coded footer ships a double footer.
7. **Email fonts must be uniform** — put `font-family`/`font-size` on `<span>`s and render bold/italic as styled spans, not `<strong>`/`<em>` (GHL resets those to Verdana). GHL also flattens styled `<a>` buttons to plain links.
8. **Reuse workflow folders by id**, not name — creating by `folder_name` can duplicate folders. List folders at `GET /workflow/{loc}/directory`.

## Architecture

```
gohighlevel-cli/            (this skill folder)
├── install.sh              # One-shot installer (.venv + package + .env)
├── ghl                     # Shell wrapper (auto-activates venv, loads .env)
├── setup.py                # Package config (cli-anything)
├── .env.example            # Credential template → copy to .env
├── builders/               # Reference workflow-builder scripts
├── docs/                   # get-firebase-token.md, workflows-map.md, how-it-works.png
└── cli_anything/
    └── gohighlevel/
        ├── gohighlevel_cli.py         # Main CLI (Click-based)
        └── utils/
            ├── ghl_client.py          # Public API client (bearer token, version routing)
            ├── ghl_internal_client.py # Internal API client (Firebase JWT) [EXPERIMENTAL]
            ├── form_survey_builder.py # Native form/survey payload builder
            ├── funnel_page_builder.py # Compact spec -> GHL builder content
            ├── landing_page_design.py # Templates, themes, lint, local preview
            ├── workflow_builder.py    # Step builders + CampaignBuilder [EXPERIMENTAL]
            └── repl_skin.py           # Interactive REPL (prompt-toolkit)
```

## API Details

### Public API (stable)
- **Base URL:** `https://services.leadconnectorhq.com`
- **Auth:** Bearer token via `GHL_API_KEY`
- **Version header:** auto-routed by path (`2021-04-15` for conversations/calendars, `2021-07-28` for everything else)

### Internal API (experimental)
- **Base URL:** `https://backend.leadconnectorhq.com`
- **Auth:** Firebase JWT via `token-id` header (NOT `Authorization: Bearer`), auto-refreshed every ~50 min from `GHL_FIREBASE_REFRESH_TOKEN`
- **Capabilities:** workflow + folder create/delete, step saving, trigger creation (incl. multi-tag), tag creation
- **Only use against your own agency account** — never a client sub-account. Use Snapshots for clients.

## Known Limitations

- Public Workflows API is read-only (list only) — creation requires `--experimental`
- Documents/Proposals require templates (no create-from-scratch)
- Social media posting requires OAuth-connected accounts
- Forms, Social, and Documents scopes need enabling on the Private Integration Token
- Firebase refresh tokens can be revoked — grab a fresh one via `docs/get-firebase-token.md` if auth fails
- The internal API may change without notice (mitigated by `--experimental` + draft-only creation)
