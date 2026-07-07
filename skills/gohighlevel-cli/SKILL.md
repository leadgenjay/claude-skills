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

> **Operator-only skill.** This documents the maintainer's local GoHighLevel CLI install. The `~/Documents/Tech & Dev/highlevel-api-docs/agent-harness/` paths below (venv, `.env`, wrapper `ghl` script, and the `ghl-superspeed-v3` fork it adapts) are the author's own environment, not something that ships with the skill. If you're installing this elsewhere, treat those paths as a template: point them at wherever you cloned the CLI and keep your GHL tokens in your own `.env`.

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

### Token Locations

All GHL tokens are stored in one `.env` file:

```
~/Documents/Tech & Dev/highlevel-api-docs/agent-harness/.env
```

Contains: `GHL_API_KEY`, `GHL_LOCATION_ID`, `GHL_FIREBASE_REFRESH_TOKEN` (plus Nextcloud creds).

Scripts that use the internal API (e.g., `ghl-add-partner-cta.py`, `ghl-aia-sales-builder.py`) auto-load this `.env` file if the env vars are not already set. The Firebase refresh token auto-refreshes every 50 min. If it expires or gets revoked, get a new one from the **GHL Chrome extension** (open GHL in Chrome, click extension, copy refresh token, paste into `.env`).

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
# iMessage (PREFERRED over native --type sms for LGJ text touches)
ghl --experimental workflows create-step --type imessage --name "Follow up" \
  --body "Did you see our email?" --output-file steps.json

# Create n8n bridge workflow (tag trigger → webhook to n8n)
ghl --experimental workflows create-n8n --name "Lead Notify" \
  --webhook-url "https://server.nextwave.io/webhook/lead-notify" \
  --tag "new-lead"
```

Step types: `email`, `sms`, `imessage`, `wait`, `tag`, `webhook`, `ai`, `goal`

`--type goal` adds a terminal `workflow_goal` exit step (`--tags` = comma-separated exit tags; the contact leaves the workflow when any is added).

### Branching (If/Else) workflows

`create-step` builds **linear** flows only — it auto-links each step to the next. **Branches cannot go through `create-step`.** To build an If/Else (e.g. "has tag X → iMessage, else → SMS"), write a builder script that uses the reusable helpers in `utils/workflow_builder.py`:

- `if_else_nodes(name, branch_name, conditions, x, y)` → the 3-node GHL branch (`condition-node` + `branch-yes`/`branch-no`). Wire children by setting each child's `parentKey` to the returned `yes_id`/`no_id` and the anchor's `next` to the first child.
- `tag_condition([tags], has=True)` / `field_condition(field_id, value)` → conditions for the branch.
- `goal_step(name, tags)` → a `workflow_goal` exit.
- Build via `CampaignBuilder` with the workflow-def flag **`"graph": True`** so the branch wiring / canvas positions are preserved (not clobbered by the linear positioner). CampaignBuilder still auto-creates the tag trigger from `wf_def["tag"]`.

**Reference builds:**
- `builders/text-blast-builder.py` — reusable iMessage/SMS blast: tag trigger → If/Else on `imessage active` → `send_i_message` / `sms` → remove-tag → goal, all DRAFT. Branch/goal schemas reverse-engineered from live workflows (`builders/reply-notify-gate-builder.py`).
- `builders/creator-bonus-followups-builder.py` — 4 Consulti workflows in ONE `build(folder_id=…)` call: If/Else branches (free/paid, boost/pro), email + iMessage with Waits, per-branch `goal_step()`, a dual-tag trigger (P3), a uniform-Arial `md_to_html` email formatter, and `.env` auto-load. Good template for a multi-workflow, branch-heavy campaign.

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

### Calendar Management (create / update / delete)

The `calendars` group can now manage the calendar object itself, not just bookings.
Common fields are named options; use `--from-json <file>` for a full payload and
repeatable `--field key=value` for anything not covered (values JSON-parsed when
possible, e.g. `openHours`, `availabilities`, `notifications`).

```bash
# Create — common fields as options (locationId auto-injected)
ghl --json calendars create --name "Strategy Call" --calendar-type round_robin \
  --team-member <userId> --team-member <userId2> \
  --slot-duration 30 --slot-duration-unit mins --slug strategy-call --active

# Create — full/complex payload from JSON (options override file values)
ghl --json calendars create --from-json calendar.json --field 'openHours=[{"daysOfTheWeek":[1,2,3]}]'

# Update — only the fields you pass change (no locationId injected)
ghl --json calendars update <calendar_id> --name "Renamed Call" --inactive

# Delete — irreversible; prompts unless --yes is passed
ghl calendars delete <calendar_id>          # interactive confirm
ghl calendars delete <calendar_id> --yes    # skip prompt (for automation)
```

> **WARNING:** GHL does **not** audit-log calendar-object deletions — a deleted
> calendar cannot be recovered from the audit trail; recovery requires escalating
> to GHL Support. `delete` requires interactive confirmation unless you pass `--yes`.

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
- **Capabilities:** Workflow + folder create/delete, step saving, trigger creation (incl. multi-tag), tag creation. Delete a workflow OR a folder with `DELETE /workflow/{loc}/{id}` → `{"success": True}`. List folders at `GET /workflow/{loc}/directory` (`rows`, mixes `type: directory` + `type: workflow`).

## Experimental Features

Commands marked EXPERIMENTAL use GHL's internal API (`backend.leadconnectorhq.com`). They require:

1. `--experimental` flag on the CLI
2. `GHL_FIREBASE_REFRESH_TOKEN` env var set
3. Understanding that the internal API may change without notice

All workflows are created as **draft** (never auto-published). 56 verified action types supported.

### Workflow Best Practices

> **Text channel = Send iMessage, NOT native SMS** (Jay 2026-06-30). For any text-channel step in an LGJ workflow, use the `send_i_message` action (`--type imessage` / `imessage_step()` in `utils/workflow_builder.py`), never the native `sms` node. Recipient = `{{contact.phone_raw}}` (raw E.164 WITH +1 country code, NOT `{{contact.phone}}`). Sends through the PB portal (the assigned GHL user needs a line mapped). Reference build: `builders/booking-pending-reminder-builder.py`.

1. **Always ask for trigger + goal** — before building any workflow, confirm: (a) what triggers entry (tag, form, event), and (b) what goal removes contacts from the sequence (purchase, booking, tag change). Every workflow needs both
2. **Always add a Goal Event step at the end** — use a `workflow_goal` step as the final step. Configure it with: goal type = "Added a contact Tag", the exit tag (e.g., "aia purchase"), and "End this workflow" if the contact reaches the goal without meeting conditions. This ensures contacts exit the sequence immediately when the goal is met, regardless of where they are in the workflow
3. **Keep workflows simple** — don't add tracking tags between steps unless specifically requested. A clean workflow is: Wait → Email → Wait → Email → Goal (not Wait → Email → Tag → Wait → Email → Tag)
4. **Email formatting = uniform Arial 16** — `dm_email()` / `email_step()` now emit one consistent Arial 16, blank lines as `<br/>` spacers, and bold/italic as `font-weight`/`font-style` spans (NOT `<strong>`/`<em>`, which GHL resets to Verdana). See gotcha #8. GHL flattens `<a>` buttons to plain links, so CTAs render as text links, not buttons.
5. **Verify all links** — never include checkout URLs, bonus offers, or resource links without confirming they exist. Ask the user if unsure. For Consulti, link `www.consulti.ai`, NEVER `app.consulti.ai`
6. **UTM tracking** — all email links must include `utm_source=ghl&utm_content=<email-identifier>`. Add UTMs to links, but NEVER add a manual address/unsubscribe footer (see gotcha #7)

**Fork provenance:** Internal API modules adapted from `ghl-superspeed-v3-main/lib/engine.py` (verified 2026-03-25). If upstream updates, sync from `~/Documents/Claude Skills/ghl-superspeed-v3-main/lib/engine.py`.

### Known Gotchas (workflow create + update)

These are real bugs hit during deployment. Encode the workaround in every new builder script.

1. **`--update` / GET → mutate → PUT pattern WIPES canvas positions.** When you swap `workflowData.templates` on an existing workflow, every new step must include `advanceCanvasMeta = {"position": {"x": ..., "y": ...}}`. Without it, the GHL UI canvas renders empty even though the workflow data has all the steps. `CampaignBuilder._create_workflow()` already adds this on initial create (lines 289-295) but the `--update` paths in custom builder scripts must replicate it. **Template snippet:**
   ```python
   steps_with_meta = []
   for idx, step in enumerate(config["templates"]):
       s = {**step}
       s["advanceCanvasMeta"] = {"position": {"x": 400 + idx * 300, "y": 0}}
       s.setdefault("cat", "")
       s.setdefault("order", idx)
       steps_with_meta.append(s)
   current["workflowData"]["templates"] = steps_with_meta
   ```

2. **Always `set -a && source .env && set +a` before running builder scripts.** Builder scripts that import `InternalGHLClient` / `TokenManager` directly do NOT auto-load `~/Documents/Tech & Dev/highlevel-api-docs/agent-harness/.env`. Running `python3 builders/foo.py` cold will fail with `No Firebase token available for internal API`. The wrapper `ghl` shell script handles this, but direct Python invocation does not. Either source the env first, or have your builder explicitly read the dotenv file at startup.

3. **Workflow UI URL format.** Correct: `https://app.leadgenjay.com/location/{loc}/workflow/{wf_id}`. The old `CampaignBuilder.format_summary()` printed `/v2/location/{loc}/automation/workflow/{wf_id}` which is a 404. Fixed in `cli_anything/gohighlevel/utils/workflow_builder.py:362` (2026-05-13). If you fork the formatter into a custom builder, use the corrected pattern.

4. **Workflow `triggers` field is empty in GET responses after the bucket migration.** Don't panic — the trigger record still exists at `triggersFilePath` (e.g., `location/{loc}/workflow-triggers/{wf_id}/{version}`). If the workflow has `isTriggerBucketMigrated: True`, treat that path as the source of truth and don't try to re-create the trigger.

5. **`workflow_goal` exits: use the `goal_step()` helper (RESOLVED 2026-07-03).** `workflow_builder.py` now ships `goal_step(name, tags)` → a `workflow_goal` step that exits when ANY listed tag is added; build it as the final step and wire it like any other node (works in linear and branched graphs). The `goal_tag` field on a campaign dict is still informational only — use the helper, not that field.

6. **NEVER add fallback syntax to GHL merge tags.** GHL does not parse `||` Brevo-style fallback operators — they render literally in the sent email (e.g., `Hey {{contact.first_name || "there"}},` ships to the inbox verbatim instead of "Hey John,"). Use the bare merge tag and let GHL substitute empty values, or rewrite the copy so empty names read naturally. **Wrong:** `{{contact.first_name || "there"}}`. **Right:** `{{contact.first_name}}`. Same rule applies to `{{custom_values.X}}`, `{{contact.custom.X}}`, and every other GHL variable. If migrating copy from Brevo to GHL, strip all `||` fallbacks first. (Confirmed by Jay 2026-05-13.)

7. **NEVER embed a manual footer (address + unsubscribe) in GHL email HTML.** GHL auto-appends the mailing address + unsubscribe link to every send, so a hand-coded footer (the `==== / 846 NW 24th Ave / Unsubscribe` block) produces a DOUBLE footer. `to_ghl_html()` in `builders/_email_sequences_parser.py` defaults `footer=False` for this reason — don't pass `footer=True`, and don't paste the footer block from any `_voice-rules.md` / `lgj-email-marketing` reference into live GHL copy. (Confirmed by Jay 2026-06-04.)

8. **Email fonts must be UNIFORM Arial 16 — no `<strong>`/`<em>`, no `<p>`-level font.** GHL's email editor overrides a `<p style="font-family:…">` to its Verdana default, AND resets `<strong>`/`<em>` to Verdana even inside an arial span — so bold looked like a different typeface from the body (Jay 2026-07-03, reported twice). Put the font on `<span>`s and render bold/italic as spans with the SAME `font-family: Arial, sans-serif; font-size: 16px` plus `font-weight: bold` / `font-style: italic`. `dm_email()` (hence `email_step()`) now does exactly this. **Caveat:** `to_ghl_html()` in `_email_sequences_parser.py` still wraps bold as `<strong><span>` and carries the same bold-font issue — for new work prefer `dm_email()` or a uniform-span formatter (see `builders/creator-bonus-followups-builder.py::md_to_html`). GHL also flattens styled `<a>` buttons to plain links, so CTAs are text links, not buttons.

9. **Folders: `folder_name` created a DUPLICATE folder every run — reuse by id.** `CampaignBuilder.build(folder_name=…)` POSTed a new directory each run; it now looks up an existing folder of that name first (Jay 2026-07-03), but the robust path is `build(camp, folder_id="<id>")`. List folders at `GET /workflow/{loc}/directory` (`rows`, mixes `type: directory` + `type: workflow`); delete a stray folder (or a workflow) with `DELETE /workflow/{loc}/{id}` → `{"success": True}` (no CLI command yet — call the internal client directly). Canonical Consulti folder id = `44b21b77-533a-4782-9684-074712654328`.

10. **Multi-tag trigger (fire on tag A OR B).** `CampaignBuilder` auto-creates ONE `contact_tag` trigger from `wf_def["tag"]`. For a second trigger tag, after `build()` POST another trigger for the same `workflowId`, then PUT it with `targetActionId` = the workflow's first-step id — replicating the `trigger_body` block in `workflow_builder.py::_create_workflow`. Reference: `builders/creator-bonus-followups-builder.py::add_second_trigger` (P3 fires on `creator-reward-boost` OR `creator-reward-pro`).

## Known Limitations

- Public Workflows API is read-only (list only) — creation requires `--experimental`
- Documents/Proposals require templates (no create-from-scratch)
- Social media posting requires OAuth-connected accounts
- Forms, Social, and Documents scopes need enabling on the Private Integration Token
- Firebase refresh tokens can be revoked — get a new one from GHL Chrome extension if auth fails
- Internal API may change without notice (mitigated by `--experimental` flag + draft-only creation)
