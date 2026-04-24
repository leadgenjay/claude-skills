---
name: cold-email-quickstart
description: "First-run wizard that walks users from zero to a launched cold email campaign by chaining 7 specialist skills with user-confirmation gates between each phase: Instantly/Email Bison signup + API key → inbox-insiders mailbox order → consulti-scrape lead list → email-verification → cold-email-strategy → cold-email-copywriting → cold-email-ab-testing → cold-email-campaign-deploy. Resumable across sessions via scripts/campaigns/{name}/.metadata.json. Use when someone says 'set up cold email', 'cold email quickstart', 'start cold email from scratch', 'new to cold email', 'first cold email campaign', 'onboard me to cold email', 'cold email wizard', or 'launch my first campaign'."
---

# Cold Email Quickstart — First-Run Wizard

One invocation, zero → launched campaign. This skill is a **thin orchestrator**: it walks the user through 9 phases, hands each one off to the specialist skill that owns it, and advances once the artifact appears. It does not duplicate any specialist logic — when a phase belongs to another skill, invoke that skill and wait for its output.

**Skill chain:**

```
[0] preflight (inline)
 → [1] sequencer signup + API key       (manual UI, you guide)
 → [2] inbox-insiders       — mailboxes + SMTP + sequencer upload
 → [3] consulti-scrape      — lead list
 → [4] email-verification   — bounce rate gate (<3%)
 → [5] cold-email-strategy      — ICP + offer + angles
 → [6] cold-email-copywriting   — 4-email sequence with spintax
 → [7] cold-email-ab-testing    — ≥9 variants
 → [8] cold-email-campaign-deploy — PAUSED deployment
 → Finalize (warmup + monitoring handoff)
```

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
3. **On resume:** load `scripts/campaigns/{name}/.metadata.json`, find the first phase where `status != "complete"`, jump to it.
4. **On new:** show `§P0.new` and ask for `campaign_name` (slug) + `sequencer` (`instantly` default, or `emailbison`).
5. **Initialize:**
   ```bash
   mkdir -p "scripts/campaigns/$CAMPAIGN_NAME"
   jq -n --arg name "$CAMPAIGN_NAME" --arg seq "$SEQUENCER" --arg now "$(date -u +%FT%TZ)" '
     {campaign_name: $name, sequencer: $seq, created_at: $now, orchestrator: "cold-email-quickstart",
      phases: (["preflight","api_key","inboxes","leads","verification","strategy","copywriting","ab_testing","deployment"]
               | map({(.): {status: "pending"}}) | add + {quickstart_complete: false})}' \
     > "scripts/campaigns/$CAMPAIGN_NAME/.metadata.json"
   ```
6. Set `phases.preflight.status = "complete"`. Continue to Phase 1.

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
4. **Wait** for inbox-insiders to complete (async polling lives inside that skill). Capture `run_id`, `order_id` from its output.
5. **Update metadata:**
   ```json
   "inboxes": {"status": "complete", "inbox_insiders_run_id": "...", "order_id": "...", "quantity": 9, "provider": "instantly"}
   ```
6. **Hand off** with `§P2.done` — mailboxes are warming (4+ weeks); lead list + copy can be built in parallel.

---

## Phase 3 — Lead List Build

**Goal:** Scraped list in Turso + Consulti audience list for dedupe on re-scrape.
**Skill handoff:** `consulti-scrape`
**Required artifact:** `audience_list_id` + `lead_count > 0` in metadata.
**Metadata field:** `phases.leads`

1. **Pre-check:** skip if complete.
2. **Show `§P3.intro`** — collect ICP filters and target lead count.
3. **Invoke `/consulti-scrape`** with the filters. Audience list name: `lgj-scraped-{campaign_name}`.
4. **Capture** from its output: `audience_list_id`, final `lead_count`, `leads_file` path.
5. **Update metadata:**
   ```json
   "leads": {"status": "complete", "audience_list_id": "...", "lead_count": 842, "source": "consulti", "leads_file": "..."}
   ```

---

## Phase 4 — Email Verification

**Goal:** Bounce rate <3% on the scraped list before it enters a campaign.
**Skill handoff:** `email-verification`
**Required artifact:** `verified_file` + `bounce_rate < 0.03`.
**Metadata field:** `phases.verification`

1. **Pre-check:** skip if complete.
2. **Show `§P4.intro`** — even Consulti's `emailStatus: "verified"` leads still bounce; this is the deliverability gate.
3. **Invoke `/email-verification`** with `leads_file` from Phase 3.
4. **Read output**: `safe_count`, `risky_count`, `invalid_count`, `verified_file`, `bounce_rate_estimate`.
5. **Hard stop** if `bounce_rate_estimate > 0.03`: surface the number, ask user to narrow ICP (back to Phase 3) or accept risk. Do not mark complete until the user confirms.
6. **Update metadata:**
   ```json
   "verification": {"status": "complete", "bounce_rate": 0.018, "verified_file": "...", "safe": 802, "risky": 30, "invalid": 10}
   ```

---

## Phase 5 — Strategy

**Goal:** `strategy.md` built — ICP, offer positioning, 3 messaging angles.
**Skill handoff:** `cold-email-strategy`
**Required artifact:** `scripts/campaigns/{name}/strategy.md`
**Metadata field:** `phases.strategy`

1. **Pre-check:** skip if `strategy.md` exists AND `phases.strategy.status == "complete"`.
2. **Show `§P5.intro`** — ask for transcripts, docs, decks, or "no materials, run full discovery".
3. **Invoke `/cold-email-strategy`**. It handles its own 4-phase interview; do not front-run it.
4. **Verify:** `test -f scripts/campaigns/$CAMPAIGN_NAME/strategy.md`.
5. `cold-email-strategy` already writes `phases.strategy` per its SKILL.md:230-241. Confirm it set `status = "complete"`; if not, update it.

---

## Phase 6 — Copywriting

**Goal:** 4-email sequence with spintax at `copy/sequence.md`.
**Skill handoff:** `cold-email-copywriting`
**Required artifact:** `scripts/campaigns/{name}/copy/sequence.md`
**Metadata field:** `phases.copywriting`

1. **Pre-check:** skip if complete.
2. **Show `§P6.intro`** — it auto-loads `strategy.md`.
3. **Invoke `/cold-email-copywriting`**. Pass platform = `sequencer` from metadata (spintax syntax differs between Email Bison `{a|b|c}` and Instantly `{{RANDOM | a | b | c}}`).
4. **Verify** artifact exists; confirm `phases.copywriting.status == "complete"`.

---

## Phase 7 — A/B Variants

**Goal:** ≥9 variants (3/2/2/2 positional minimums) + `ab-schema.json`.
**Skill handoff:** `cold-email-ab-testing`
**Required artifact:** `ab-testing/variants.md` AND `ab-testing/ab-schema.json`.
**Metadata field:** `phases.ab_testing`

1. **Pre-check:** skip if complete.
2. **Show `§P7.intro`** — note this is a hard gate (gate 7) inside `cold-email-campaign-deploy`.
3. **Invoke `/cold-email-ab-testing`** in pre-launch mode.
4. **Verify** both artifacts exist; confirm `phases.ab_testing.status == "complete"`.

---

## Phase 8 — Deploy (PAUSED)

**Goal:** Campaign created in the sequencer, all 8 pre-launch gates passed, status = paused.
**Skill handoff:** `cold-email-campaign-deploy`
**Required artifact:** `deployment/campaign-brief.md` AND sequencer returns `campaign_id` with `state = paused`.
**Metadata field:** `phases.deployment`

1. **Pre-check:** skip if complete.
2. **Show `§P8.intro`** — list which upstream artifacts will be loaded.
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

## When NOT to Use This Skill

- User already has a launched campaign and just wants to iterate on copy → use `/cold-email-copywriting` directly.
- User wants to scrape a list without deploying → use `/consulti-scrape` directly.
- User is in the middle of a specific operational task — this wizard is only for the full 0→launched arc.
