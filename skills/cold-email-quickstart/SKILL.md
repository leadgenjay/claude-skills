---
name: cold-email-quickstart
description: "First-run wizard that walks users from zero to a launched cold email campaign by chaining 8 specialist skills with user-confirmation gates between each phase: Instantly/Email Bison signup + API key → inbox-insiders mailbox order → cold-email-strategy → lead-tracking-db → consulti-scrape lead list → email-verification → cold-email-copywriting → cold-email-ab-testing → cold-email-campaign-deploy. Resumable across sessions via scripts/campaigns/{name}/.metadata.json. Use when someone says 'set up cold email', 'cold email quickstart', 'start cold email from scratch', 'new to cold email', 'first cold email campaign', 'onboard me to cold email', 'cold email wizard', or 'launch my first campaign'."
---

# Cold Email Quickstart — First-Run Wizard

One invocation, zero → launched campaign. This skill is a **thin orchestrator**: it walks the user through ten phases, hands each one off to the specialist skill that owns it, and advances once the artifact appears. It does not duplicate any specialist logic — when a phase belongs to another skill, invoke that skill and wait for its output.

**Skill chain:**

```
[0]  preflight (inline)
 → [0.5] infrastructure (inline) — Turso DB + ANTHROPIC + PERPLEXITY keys (one-time, shared across campaigns)
 → [1] sequencer signup + API key            (manual UI, you guide)
 → [2] inbox-insiders            — mailboxes + SMTP + sequencer upload (warmup runs async, 4+ weeks)
 → [3] cold-email-strategy       — ICP + offer + 3 angles → strategy.md
 → [4] lead-tracking-db          — schema check + register campaign + import Phase 2 domains/mailboxes
 → [5] consulti-scrape           — reads strategy.md ICP, pre-fills filters → leads
 → [6a] list-optimize — Phase 1+2: AI-qualify (against strategy.md) + normalize company names  (optional gate, default Y)
 → [6] email-verification        — bounce rate gate (<3%) on qualified leads only
 → [6c] list-optimize — Phase 3+4: Perplexity research + personalization (verified survivors) (skipped if 6a was skipped)
 → [7] cold-email-copywriting    — 4-email sequence with spintax (consumes optional {personalization})
 → [8] cold-email-ab-testing     — ≥9 variants
 → [9] cold-email-campaign-deploy — PAUSED deployment
 → Finalize (warmup + monitoring handoff)
```

**Note:** `cold-email-strategy` runs ahead of scraping so its ICP feeds **both** `consulti-scrape` filter recommendations (Phase 5) AND `list-optimize` Phase 1 qualification rules (Phase 6a). `list-optimize` itself is a single skill invoked twice — phases 1-2 before verification, phases 3-4 after. Run `bash scripts/list-optimize/run-pipeline.sh <campaign>` to walk both halves with the verification gate in between.

---

## Before You Start

1. **Read** `references/phase-prompts.md` for the exact user-facing copy at each phase gate. Reference as `§P{n}.{tag}`.
2. **Do not re-implement specialist logic.** When a phase has a skill handoff, invoke it and trust it. The 8 pre-launch gates live inside `cold-email-campaign-deploy` — do not re-check them here.
3. **Persist state** in `scripts/campaigns/{campaign_name}/.metadata.json`. Every phase reads and writes it.
4. **Deploy in PAUSED state only.** Never auto-activate; the user reviews in the sequencer dashboard first.

---

## Phase 0 — Preflight & Campaign Naming

**Goal:** Decide new vs resume; establish the campaign working directory + metadata.

1. **List existing in-progress quickstart campaigns:**
   ```bash
   for d in scripts/campaigns/*/; do
     [ -f "$d/.metadata.json" ] || continue
     jq -r 'select(.orchestrator == "cold-email-quickstart" and .phases.quickstart_complete != true)
            | "\(.campaign_name) | last complete: \([.phases | to_entries[] | select(.value.status == "complete") | .key] | last // "none")"' \
       "$d/.metadata.json"
   done
   ```
2. **If any rows returned:** show `§P0.resume` and ask the user to resume one or start new.
3. **On resume:** load `scripts/campaigns/{name}/.metadata.json`, find the first phase where `status != "complete"`, jump to it. Campaigns initialized under quickstart **v1.0** lack `phases.strategy` (was inline at 3b) and `phases.lead_tracking` (new in v1.1). Patch missing keys before resuming:
   ```bash
   jq '.phases.strategy //= {"status":"pending"} | .phases.lead_tracking //= {"status":"pending"}' \
     "scripts/campaigns/$NAME/.metadata.json" > "$_.tmp" && mv "$_.tmp" "scripts/campaigns/$NAME/.metadata.json"
   ```
4. **On new:** show `§P0.new` and ask for `campaign_name` (slug) + `sequencer` (`instantly` default, or `emailbison`).
5. **Initialize:**
   ```bash
   mkdir -p "scripts/campaigns/$CAMPAIGN_NAME"
   jq -n --arg name "$CAMPAIGN_NAME" --arg seq "$SEQUENCER" --arg now "$(date -u +%FT%TZ)" '
     {campaign_name: $name, sequencer: $seq, created_at: $now, orchestrator: "cold-email-quickstart",
      phases: (["preflight","infrastructure","api_key","inboxes","strategy","lead_tracking","leads","verification","copywriting","ab_testing","deployment"]
               | map({(.): {status: "pending"}}) | add + {quickstart_complete: false})}' \
     > "scripts/campaigns/$CAMPAIGN_NAME/.metadata.json"
   ```
6. Set `phases.preflight.status = "complete"`. Continue to Phase 0.5.

---

## Phase 0.5 — Infrastructure (Database + Supporting API Keys)

**Goal:** Turso DB exists with schema + `list-optimize` migration applied; `ANTHROPIC_API_KEY` and `PERPLEXITY_API_KEY` resolve in `.env`.
**Skill handoff:** _none — inline scripts (`scripts/db-setup.sh`, `scripts/list-optimize/migrate-schema.sh`)_
**Required artifact:** all four env vars resolve AND `db_query "SELECT 1 FROM leads LIMIT 1"` returns without error.
**Metadata field:** `phases.infrastructure`

> This phase is **one-time and shared across all campaigns**. Subsequent quickstart runs detect a healthy setup and skip in <1s. Per-campaign DB writes (campaign registration + Phase 2 infrastructure import) happen in **Phase 4**.

1. **Pre-check:** if all of the following pass, mark complete and skip to Phase 1:
   ```bash
   set -a; source .env 2>/dev/null; set +a
   [ -n "${TURSO_DB_URL:-}" ] && [ -n "${TURSO_DB_TOKEN:-}" ] \
     && [ -n "${ANTHROPIC_API_KEY:-}" ] && [ -n "${PERPLEXITY_API_KEY:-}" ] \
     && (source ./scripts/db-query.sh && db_query "SELECT 1 FROM leads LIMIT 1" >/dev/null 2>&1) \
     && (source ./scripts/db-query.sh && db_query "PRAGMA table_info(leads)" | cut -f2 | grep -qx qualification_status)
   ```
2. **Show `§P0.5.intro`** — explain what this phase sets up and why it's one-time.
3. **DB bootstrap** (only if `TURSO_DB_URL` missing OR the `SELECT 1 FROM leads` check fails):
   - Show `§P0.5.turso`. Run `./scripts/db-setup.sh` — installs Turso CLI, opens browser auth, creates `cold-email-leads` DB, applies `scripts/schema.sql` (13 tables), writes `TURSO_DB_URL`, `TURSO_DB_TOKEN`, `TURSO_DB_NAME` to `.env`.
   - Run `bash scripts/list-optimize/migrate-schema.sh` — adds 9 columns to `leads` (idempotent; safe to re-run).
   - Reload `.env`: `set -a; source .env; set +a` so subsequent steps see the new vars.
4. **Anthropic key** (only if `ANTHROPIC_API_KEY` missing):
   - Show `§P0.5.anthropic`. Wait for user paste.
   - Append to `.env`: `ANTHROPIC_API_KEY={pasted_value}`.
   - Smoke-test (free, no token cost): `curl -sf -o /dev/null -w '%{http_code}' -H "x-api-key: $ANTHROPIC_API_KEY" -H "anthropic-version: 2023-06-01" https://api.anthropic.com/v1/models` → expect `200`. On failure, show response body and ask user to verify.
5. **Perplexity key** (only if `PERPLEXITY_API_KEY` missing):
   - Show `§P0.5.perplexity`. Wait for user paste.
   - Append to `.env`: `PERPLEXITY_API_KEY={pasted_value}`.
   - Format-check: must start with `pplx-`. (Perplexity has no free smoke endpoint; first real call happens in Phase 6c.)
6. **Update metadata:**
   ```json
   "infrastructure": {"status": "complete", "turso_db_name": "cold-email-leads", "anthropic_verified": true, "perplexity_format_ok": true, "verified_at": "<ISO>"}
   ```

---

## Phase 1 — Sequencer Signup + API Key

**Goal:** User has an Instantly (or Email Bison) account and the API key is in `.env`.
**Skill handoff:** _manual UI step — no skill_
**Required artifact:** env var populated AND smoke-test returns HTTP 200.
**Metadata field:** `phases.api_key`

1. **Pre-check:** if the expected env var already resolves and the smoke test returns 200, mark complete and skip.
   - Instantly: `curl -sf -o /dev/null -w '%{http_code}' -H "Authorization: Bearer $INSTANTLY_API_KEY" 'https://api.instantly.ai/api/v2/campaigns?limit=1'`
   - Email Bison: `curl -sf -o /dev/null -w '%{http_code}' -H "Authorization: Bearer $EMAIL_BISON_API_KEY" 'https://send.leadgenjay.com/api/campaigns?page=1'`
2. **Otherwise:** show `§P1.instantly` or `§P1.emailbison` (branch on `sequencer`). Wait for the user to paste the key in chat.
3. **Write to `.env`** — append or update the correct var (`INSTANTLY_API_KEY` or `EMAIL_BISON_API_KEY`). Quote the value with single quotes (Email Bison keys contain `|`).
4. **Re-run smoke test.** On failure, show the HTTP code + response body and ask the user to verify.
5. **Update metadata:**
   ```json
   "api_key": {"status": "complete", "env_var": "INSTANTLY_API_KEY", "verified_at": "<ISO>"}
   ```

---

## Phase 2 — Inbox Provisioning

**Goal:** Mailboxes provisioned via Inbox Insiders, auto-uploaded to the sequencer, warmup started.
**Skill handoff:** `inbox-insiders`
**Required artifact:** `order_id` + `run_id` stored in metadata; Stripe cost gate confirmed.
**Metadata field:** `phases.inboxes`

1. **Pre-check:** if complete, skip.
2. **Show `§P2.intro`** — note the Stripe charge fires immediately. The cost gate inside `inbox-insiders` (its `SKILL.md:42-46`) will quote `quantity × $3.50/mo` recurring + `ceil(quantity/3) × $12` one-time before calling `/instant-orders` — do NOT re-quote here.
3. **Invoke `/inbox-insiders`** with:
   - `cold_email.provider` = the `sequencer` from metadata (`instantly` | `emailbison`)
   - `cold_email.api_key` = resolved env var from Phase 1
   - `brand_name`, `website_url`, `sender_name`, `quantity` collected from user
4. **Wait** for inbox-insiders to complete (async polling lives inside that skill). Capture `run_id`, `order_id`, the list of provisioned `domains`, and provisioned `mailboxes` (emails + sender names) from its output.
5. **Update metadata** — store the lists so Phase 4 can persist them to the DB without re-querying:
   ```json
   "inboxes": {"status": "complete", "inbox_insiders_run_id": "...", "order_id": "...", "quantity": 9, "provider": "instantly",
               "sender_name": "Jay Feldman",
               "domains": ["lgjmail1.com","lgjmail2.com","lgjmail3.com"],
               "mailboxes": ["jay@lgjmail1.com","madison@lgjmail1.com","bob@lgjmail1.com", "..."]}
   ```
6. **Hand off** with `§P2.done` — mailboxes are warming (4+ weeks); strategy + lead list + copy can be built in parallel.

---

## Phase 3 — Strategy

**Goal:** `strategy.md` built — ICP, offer positioning, 3 messaging angles. Drives the ICP filters used downstream by Phase 5 (`consulti-scrape`) and Phase 6a (`list-optimize` qualification).
**Skill handoff:** `cold-email-strategy`
**Required artifact:** `scripts/campaigns/{name}/strategy.md`
**Metadata field:** `phases.strategy`

1. **Pre-check:** skip if `strategy.md` exists AND `phases.strategy.status == "complete"`.
2. **Show `§P3.intro`** — ask for transcripts, docs, decks, or "no materials, run full discovery".
3. **Invoke `/cold-email-strategy`**. It handles its own 4-phase interview; do not front-run it.
4. **Verify:** `test -f scripts/campaigns/$CAMPAIGN_NAME/strategy.md`.
5. `cold-email-strategy` already writes `phases.strategy` per its `SKILL.md:230-241`. Confirm it set `status = "complete"`; if not, update it.

---

## Phase 4 — Lead Tracking DB

**Goal:** Phase 2 inbox-insiders domains + mailboxes persisted into `domains` / `mailboxes` tables; campaign creation recorded in `lead_events`. This is what makes Phase 6 verification, Phase 6a/6c list-optimize, and downstream analytics queryable end-to-end.
**Skill handoff:** `lead-tracking-db`
**Required artifact:** `phases.lead_tracking.status == "complete"` AND `db_query "SELECT COUNT(*) FROM domains WHERE registrar='inbox-insiders'"` returns ≥ Phase 2 domain count.
**Metadata field:** `phases.lead_tracking`

1. **Pre-check:** skip if complete.
2. **Show `§P4.intro`** — surface the `{N}` domains + `{M}` mailboxes that will be inserted (from `phases.inboxes.domains` / `phases.inboxes.mailboxes`).
3. **Schema health-check** (defensive — Phase 0.5 already ran the migration; this catches drift):
   ```bash
   source ./scripts/db-query.sh
   db_query "PRAGMA table_info(leads)" | cut -f2 | grep -qx qualification_status \
     || { echo "Schema drift — list-optimize migration missing"; exit 1; }
   ```
   On failure: flip `phases.infrastructure.status = "pending"` in metadata and route the user back to Phase 0.5.
4. **Insert domains** (idempotent via `INSERT OR IGNORE`; SQL templates from `lead-tracking-db/SKILL.md:60-76`):
   ```bash
   for d in $(jq -r '.phases.inboxes.domains[]' "$META"); do
     db_exec "INSERT OR IGNORE INTO domains (domain, registrar, purchase_date, status)
              VALUES ('$(sql_escape "$d")', 'inbox-insiders', date('now'), 'pending_dns')"
   done
   ```
5. **Insert mailboxes** (idempotent; templates from `lead-tracking-db/SKILL.md:78-94`):
   ```bash
   PROVIDER=$(jq -r '.phases.inboxes.provider' "$META")
   SENDER_NAME=$(jq -r '.phases.inboxes.sender_name' "$META")
   for m in $(jq -r '.phases.inboxes.mailboxes[]' "$META"); do
     domain="${m#*@}"
     db_exec "INSERT OR IGNORE INTO mailboxes (domain_id, email_address, provider, display_name, status, warmup_enabled, warmup_started_at)
              VALUES ((SELECT id FROM domains WHERE domain='$(sql_escape "$domain")'),
                      '$(sql_escape "$m")', '$PROVIDER', '$(sql_escape "$SENDER_NAME")', 'warming', 1, datetime('now'))"
   done
   ```
6. **Record campaign creation** in the audit trail (`lead-tracking-db/SKILL.md:186-191`):
   ```bash
   ORDER_ID=$(jq -r '.phases.inboxes.order_id' "$META")
   db_exec "INSERT INTO lead_events (event_type, event_data, source)
            VALUES ('campaign_created',
                    json_object('campaign_name','$CAMPAIGN_NAME','sequencer','$SEQUENCER','order_id','$ORDER_ID'),
                    'cold-email-quickstart')"
   ```
7. **Update metadata:**
   ```json
   "lead_tracking": {"status": "complete", "domains_added": 3, "mailboxes_added": 9, "registered_at": "<ISO>"}
   ```

---

## Phase 5 — Lead List Build

**Goal:** Scraped list in Turso + Consulti audience list for dedupe on re-scrape. ICP filters are pre-filled from `strategy.md` so the user only confirms / edits.
**Skill handoff:** `consulti-scrape`
**Required artifact:** `audience_list_id` + `lead_count > 0` in metadata.
**Metadata field:** `phases.leads`

1. **Pre-check:** skip if complete.
2. **Read `scripts/campaigns/$CAMPAIGN_NAME/strategy.md`** and extract ICP filter recommendations: target type (B2B / local / creators), job titles, industries, geos (countries / states / cities), company size band.
3. **Show `§P5.intro`** — display the strategy-derived filters and ask the user to confirm or edit before scraping. Always ask for the **target lead count** (hard cap to protect Consulti credits).
4. **Invoke `/consulti-scrape`** with the confirmed filters. Audience list name: `lgj-scraped-{campaign_name}`.
5. **Capture** from its output: `audience_list_id`, final `lead_count`, `leads_file` path.
6. **Update metadata:**
   ```json
   "leads": {"status": "complete", "audience_list_id": "...", "lead_count": 842, "source": "consulti", "leads_file": "..."}
   ```

---

## Phase 6 — Email Verification (with optional list-optimize 6a/6c)

**Goal:** Bounce rate <3% on the scraped list before it enters a campaign.
**Skill handoff:** `email-verification`
**Required artifact:** `verified_file` + `bounce_rate < 0.03`.
**Metadata field:** `phases.verification` (and `list_optimize.selection` for the picker choice).

> Sandwiched between `list-optimize` halves: Phase 6a (qualify + normalize) runs before, Phase 6c (Perplexity research + personalization) runs after. Use `bash scripts/list-optimize/run-pipeline.sh <campaign>` to walk all three sub-phases with the verification gate in the middle.

### Phase 6a gate — optional list-optimize (default = run)

**Pre-check:** if `list_optimize.selection` already exists in metadata (any value), skip the gate and honor the prior choice. Otherwise show `§P6.optimize_gate`:

> **Phase 6a — Run `list-optimize` (qualify + personalize)? [Y/n]**
> - **Y / yes / blank** → invoke `bash scripts/list-optimize/run-pipeline.sh <campaign>` which fires its own picker (defaults to `both`). Phases 1+2 run before verification, Phases 3+4 run after.
> - **n / no** → skip both 6a and 6c. The copywriter's `{personalization|fallback}` token will fall through to the fallback for every lead. Persist `"list_optimize": {"selection": "skipped"}` in metadata so resume doesn't re-prompt.

If user answers `n`: jump to step 1 below (verification only) and skip step 7 (Phase 6c) entirely.
If user answers `Y` or blank: proceed through 6a → 6 → 6c.

### Verification + post-verify list-optimize

1. **Pre-check:** skip if complete.
2. **Show `§P6.intro`** — even Consulti's `emailStatus: "verified"` leads still bounce; this is the deliverability gate.
3. **Invoke `/email-verification`** with `leads_file` from Phase 5 (or the qualified-survivors file from Phase 6a if `list-optimize` Phase 1+2 already ran).
4. **Read output**: `safe_count`, `risky_count`, `invalid_count`, `verified_file`, `bounce_rate_estimate`.
5. **Hard stop** if `bounce_rate_estimate > 0.03`: surface the number, ask user to narrow ICP (back to Phase 5) or accept risk. Do not mark complete until the user confirms.
6. **Update metadata:**
   ```json
   "verification": {"status": "complete", "bounce_rate": 0.018, "verified_file": "...", "safe": 802, "risky": 30, "invalid": 10}
   ```
7. **Phase 6c — list-optimize Phases 3+4** (research + personalize). Skip if `list_optimize.selection == "skipped"`. Otherwise re-invoke `bash scripts/list-optimize/run-pipeline.sh <campaign>` (it resumes from Phase 3 because phases 1-2 already wrote to DB). Before any Phase 3/4 DB writes, the orchestrator runs `validate-campaign-vars.sh` against the target campaign template.

---

## Phase 7 — Copywriting

**Goal:** 4-email sequence with spintax at `copy/sequence.md`.
**Skill handoff:** `cold-email-copywriting`
**Required artifact:** `scripts/campaigns/{name}/copy/sequence.md`
**Metadata field:** `phases.copywriting`

1. **Pre-check:** skip if complete.
2. **Show `§P7.intro`** — it auto-loads `strategy.md`.
3. **Invoke `/cold-email-copywriting`**. Pass platform = `sequencer` from metadata (spintax syntax differs between Email Bison `{a|b|c}` and Instantly `{{RANDOM | a | b | c}}`).
4. **Verify** artifact exists; confirm `phases.copywriting.status == "complete"`.

---

## Phase 8 — A/B Variants

**Goal:** ≥9 variants (3/2/2/2 positional minimums) + `ab-schema.json`.
**Skill handoff:** `cold-email-ab-testing`
**Required artifact:** `ab-testing/variants.md` AND `ab-testing/ab-schema.json`.
**Metadata field:** `phases.ab_testing`

1. **Pre-check:** skip if complete.
2. **Show `§P8.intro`** — note this is a hard gate (gate 8) inside `cold-email-campaign-deploy`.
3. **Invoke `/cold-email-ab-testing`** in pre-launch mode.
4. **Verify** both artifacts exist; confirm `phases.ab_testing.status == "complete"`.

---

## Phase 9 — Deploy (PAUSED)

**Goal:** Campaign created in the sequencer, all 8 pre-launch gates passed, status = paused.
**Skill handoff:** `cold-email-campaign-deploy`
**Required artifact:** `deployment/campaign-brief.md` AND sequencer returns `campaign_id` with `state = paused`.
**Metadata field:** `phases.deployment`

1. **Pre-check:** skip if complete.
2. **Show `§P9.intro`** — list which upstream artifacts will be loaded.
3. **Invoke `/cold-email-campaign-deploy`**. It enforces all 8 gates itself (see `cold-email-campaign-deploy/SKILL.md:63-79`) — you do NOT re-check them.
4. **Verify** `campaign_id` captured and `state == "paused"`.
5. The deploy skill writes `phases.deployment` itself; confirm the values are set.

---

## Finalize — What's Next

1. Set `phases.quickstart_complete = true` via `jq` on `.metadata.json`.
2. Show `§final` — warmup timeline, activation guidance, monitoring handoffs:
   - **Warmup:** 4+ weeks minimum before activating. Warmup score ≥95 per mailbox.
   - **Activation:** user manually toggles status in the sequencer dashboard. Never auto-activate.
   - **Monitoring:** `/campaign-analytics` weekly; `/instantly-audit` post-launch if on Instantly.
   - **Re-verify** the lead list via `/email-verification` if >30 days pass before activation.

Exit the wizard.

---

## Resume Semantics

- Re-invoking this skill mid-flow: Phase 0 detects incomplete metadata and offers to resume.
- Each phase's pre-check (`status == "complete"` guard) makes every phase idempotent.
- To redo a phase, the user flips `phases.<name>.status` back to `"pending"` in `.metadata.json` and re-invokes.
- **v1.0 → v1.1 migration:** Phase 0 step 3 patches missing `phases.strategy` / `phases.lead_tracking` keys before resuming.

## When NOT to Use This Skill

- User already has a launched campaign and just wants to iterate on copy → use `/cold-email-copywriting` directly.
- User wants to scrape a list without deploying → use `/consulti-scrape` directly.
- User is in the middle of a specific operational task — this wizard is only for the full 0→launched arc.
