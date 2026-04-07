---
name: cold-email-campaign-deploy
description: "Deploy cold email campaigns to Email Bison or Instantly. Generates campaign brief, runs pre-launch checklist (8 safety gates), creates campaign via API in PAUSED state, attaches senders, configures settings. Use when deploying a campaign, launching a campaign, creating a campaign in Email Bison or Instantly, generating a campaign brief, or when someone says 'deploy campaign', 'launch campaign', 'create campaign in Email Bison', 'create campaign in Instantly', 'campaign brief'. This is Step 4 of the 4-skill chain: strategy -> copywriting -> ab-testing -> campaign-deploy."
---

# Cold Email Campaign Deploy

Deploy a fully prepared campaign to Email Bison or Instantly. This skill compiles all upstream artifacts into a campaign brief, runs safety checks, and creates the campaign via API in PAUSED state.

**Skill chain:** `cold-email-strategy` -> `cold-email-copywriting` -> `cold-email-ab-testing` -> `cold-email-campaign-deploy` (you are here)

---

## Pre-Flight: Load Workspace

Check for upstream artifacts in `scripts/campaigns/{campaign-name}/`:

| File | Source Skill | Required? |
|------|-------------|-----------|
| `strategy.md` | cold-email-strategy | Recommended (provides ICP, offer, messaging) |
| `copy/sequence.md` | cold-email-copywriting | **Required** (the emails to deploy) |
| `ab-testing/variants.md` | cold-email-ab-testing | **Required** (A/B variants with verification gate) |
| `ab-testing/ab-schema.json` | cold-email-ab-testing | Recommended (structured variant data for API) |
| `.metadata.json` | All skills | Recommended (phase tracking) |

**If copy or variants are missing:** Ask the user to run the upstream skills first, or provide the email copy and variants directly.

**If strategy is missing:** Proceed with deployment, but note that the campaign brief will have incomplete strategy sections.

### Lead Readiness

Leads are managed separately — this skill deploys the campaign structure, not the lead list. Before activating the campaign:

- Verify lead list with `email-verification` skill (bounce target < 3%)
- Upload leads via `lead-tracking-db` skill or sequencer dashboard
- Minimum 500-1000 leads for statistical significance on A/B tests
- Filter out competitors, existing clients, and spam traps
- Consider starting with a small cohort (100-200) for the first test send

Also confirm with user:
- Which sequencer? (Email Bison or Instantly)
- Sender email IDs or tags to attach
- Campaign name (for the sequencer)

---

## Campaign Brief Generation

Compile all workspace artifacts into `scripts/campaigns/{campaign-name}/deployment/campaign-brief.md` using the template in `references/campaign-brief-template.md`.

The brief is the source of truth for this campaign. It captures every decision so you can audit, reproduce, or hand off the campaign. Include:

1. **Discovery summary** (from strategy.md)
2. **ICP summary** (from strategy.md)
3. **Offer positioning** (from strategy.md)
4. **Messaging strategy** (from strategy.md)
5. **Sequence architecture** (from copy/sequence.md)
6. **All email copy with variants and spintax** (from ab-testing/variants.md)
7. **Deployment details** (sequencer, senders, settings, campaign ID)

---

## Pre-Launch Checklist (8 Mandatory Gates)

**Every gate must pass before creating the campaign.** If any gate fails, stop and resolve before proceeding.

| # | Gate | Check | Why |
|---|------|-------|-----|
| 1 | **Email verification** | Lead list verified, bounce target < 3% | Bounces destroy domain reputation faster than anything else |
| 2 | **Warmup score** | All sender accounts >= 95 warmup score | Sending cold on low-warmup accounts triggers spam detection |
| 3 | **DNS authentication** | SPF, DKIM, and DMARC configured on all sender domains | Missing auth = emails go to spam |
| 4 | **Tracking disabled** | Open tracking OFF, link tracking OFF | Tracking injects HTML that ESPs detect as automated marketing |
| 5 | **Plain text mode** | Plain text enabled (no HTML formatting) | HTML signals promotional/marketing content |
| 6 | **Spintax applied** | All emails have spintax on greetings, transitions, CTAs, sign-offs | ESPs detect identical templates across sends |
| 6.5 | **Spintax format match** | All spintax matches target sequencer format | Mismatched format renders as literal text — Email Bison: `{a\|b}`, Instantly: `{{RANDOM \| a \| b}}` |
| 7 | **A/B verification gate** | E1 >= 3 variants, E2-E4 >= 2 variants each, total >= 9 steps | Single-variant positions waste sending volume on untested copy |
| 8 | **Sender signatures** | All sender accounts have signatures configured | Signature token in emails needs a stored value to render |

**Ask the user to confirm gates 1-3** (these require checking external systems). Gates 4-8 can be verified from the workspace artifacts and API configuration.

---

## API Deployment

Read `references/api-deployment.md` for the full API payloads, field mappings, and gotchas.

### Email Bison Deployment

**Base URL:** `https://send.leadgenjay.com/api`

1. **Create campaign** (POST /campaigns)
   ```bash
   curl -s -X POST "https://send.leadgenjay.com/api/campaigns" \
     -H 'Authorization: Bearer {EMAIL_BISON_API_KEY}' \
     -H "Content-Type: application/json" \
     -d '{"name": "{campaign_name}", "type": "email"}'
   ```

2. **Create sequence steps with A/B variants** (POST /campaigns/v1.1/{id}/sequence-steps)
   - Use `variant_from_step` (positional 1-based index) when creating all steps in one call
   - Use `variant_from_step_id` (database ID) when adding variants to existing steps
   - **NEVER mix these up** (creates orphaned steps)
   - Every step needs a unique `order` value, even variants

3. **Attach sender emails** (POST /campaigns/{id}/attach-sender-emails)

4. **Configure settings** (PATCH /campaigns/{id}/update)
   - `open_tracking: false`
   - `plain_text: true`
   - `reputation_building: true`
   - `max_emails_per_day`: number of senders x 30
   - `can_unsubscribe: false`

5. **Set sender signatures** (if multiple personas)
   ```bash
   curl -s -X PATCH "https://send.leadgenjay.com/api/sender-emails/signatures/bulk" \
     -H 'Authorization: Bearer {EMAIL_BISON_API_KEY}' \
     -H "Content-Type: application/json" \
     -d '{"sender_email_ids": [...], "email_signature": "<html>"}'
   ```

### Instantly Deployment

**Base URL:** `https://api.instantly.ai/api/v2`

> **HTML Rule:** Use `<p>` tags only. `<br>` tags strip ALL text from Instantly emails.

1. **Create campaign with full payload** (POST /campaigns)
   - Full sequence structure embedded in creation (steps + variants in one call)
   - `campaign_schedule` with `schedules` array is REQUIRED (omitting returns 400)
   - Variants nested inside each step's `variants` array
   - Empty subject `""` for threaded follow-ups
   - Campaign created as status 0 (draft)

2. **Configure settings** (PATCH /campaigns/{id})
   - `open_tracking: false`
   - `link_tracking: false`
   - `text_only: true`

3. **Add leads** (POST /leads) — one lead per call with `campaign_id`
   - Verify lead upload capacity before bulk adds (workspace has a cap)
   - For large lists, use Instantly dashboard CSV import instead of API

4. **Sender accounts** — managed at workspace level, not per-campaign
   - No "attach sender" API endpoint — accounts configured in Instantly UI
   - Most campaigns inherit accounts via `email_tag_list` (tag UUIDs)
   - Ensure warmup enabled and score >= 95 before activating campaign

### Critical API Rules

- **NEVER auto-activate the campaign.** Always create in PAUSED/DRAFT state.
- **Confirm sender attachment** before reporting success.
- **Validate step/variant count** matches what was planned in ab-schema.json.

### Post-Generation Validation (run before reporting success)

After constructing the API payload but BEFORE making the call, verify:

1. **Instantly HTML check:** Scan every `body` field in the payload for `<br>` tags. If found, replace with `</p><p>` or remove entirely. This is the #1 cause of blank emails — `<br>` tags strip ALL text in Instantly. This applies to signature lines too (use `</p><p>` between name and title, not `<br>`).

2. **Spintax completeness check:** Every email body MUST have spintax on ALL of these:
   - Greeting: `{Hi|Hey|Hello}` (Email Bison) or `{{RANDOM | Hi | Hey | Hello}}` (Instantly)
   - At least one transition or qualifier phrase
   - CTA phrasing (at least 2 options)
   - Sign-off: `{Best|Cheers}` (Email Bison) or `{{RANDOM | Best | Cheers}}` (Instantly)
   If any email is missing spintax on greetings or sign-offs, add it before deploying.

3. **Order uniqueness check (Email Bison):** Verify all `order` values in the sequence_steps payload are unique. No two steps should share the same order value.

---

## Error Recovery & Troubleshooting

API deployments can fail at any step. Since campaigns are created in PAUSED state, recovery is straightforward — nothing has been sent to prospects yet.

### Common API Errors

| Error | Cause | Fix |
|-------|-------|-----|
| `400 Bad Request` | Malformed payload, missing required field, duplicate order values | Check order uniqueness, validate spintax syntax, verify all required fields present |
| `401 Unauthorized` | Invalid or expired API key | Verify `EMAIL_BISON_API_KEY` or `INSTANTLY_API_KEY` in `.env`. Email Bison keys contain pipe chars — use single quotes in shell. |
| `409 Conflict` | Duplicate campaign name | Append date or short ID to campaign name |
| `422 Unprocessable` | Step validation failed (wrong variant parent ref, order conflict) | Check `variant_from_step` (positional) vs `variant_from_step_id` (database ID) — mixing these up creates orphans |
| `500 Server Error` | Sequencer API down | Retry up to 3 times with backoff (1s, 2s, 4s). If persistent, deploy later. |

### Partial Deployment Recovery

Deployment has multiple API calls. If one fails mid-sequence:

1. **Campaign created, steps failed:** Campaign exists but is empty. POST the sequence steps again — no need to delete the campaign.

2. **Steps created, sender attach failed:** Log the campaign ID and step IDs to `deployment-log.md`. Retry sender attachment separately, or attach via sequencer UI.

3. **Steps partially created (e.g., E1-E2 succeeded, E3 failed):** Delete all created steps (`DELETE /campaigns/{id}/sequence-steps/{step_id}`), fix the issue, and POST the entire sequence again. Partial sequences are worse than restarting — variant grouping depends on the full payload.

4. **Everything created, settings update failed:** Campaign is functional. Settings can be updated via API retry or directly in the sequencer UI.

### Rollback

Since campaigns deploy in PAUSED state, rollback is simple:
- **Delete and recreate:** If the campaign is misconfigured, delete it and start fresh. No emails have been sent.
- **Don't delete steps one-by-one to "fix" them.** The variant linking depends on positional indices — editing individual steps breaks the A/B structure. Recreate the full sequence instead.

---

## Post-Deployment Report

After successful deployment, report:

```
Campaign Deployed (PAUSED)
==========================
Campaign ID:    {id}
Campaign URL:   {sequencer dashboard link}
Sequencer:      {Email Bison / Instantly}
Steps created:  {N} (E1: {n} variants, E2: {n}, E3: {n}, E4: {n})
Total variants: {N}
Senders:        {N} accounts attached
Max daily:      {N} emails/day ({senders} x 30)

NEXT STEPS (post-deployment, pre-activation):
1. Review the campaign in the sequencer dashboard
2. Verify step count and variant grouping matches the brief
3. Send a test email to yourself
4. Verify spintax renders correctly (no literal {a|b|c} in output)
5. Check sender signatures render (if using {SENDER_EMAIL_SIGNATURE})
6. Upload verified lead list (if not already attached)
7. Activate when ready
```

Write deployment details to `scripts/campaigns/{campaign-name}/deployment/deployment-log.md`.

---

## Worked Example: Consulti AI (Email Bison)

This shows the full deployment flow from a real campaign.

**Setup:** Consulti AI cold email campaign targeting B2B SaaS founders. 3 sender personas (Jay, Madison, Bob) with 30 mailboxes each = 90 senders.

**Pre-Flight:** Loaded `strategy.md` (ICP: 3-75 employees, US, 3 industry segments), `copy/sequence.md` (4-email sequence), `ab-testing/variants.md` (3/2/2/2 structure = 9 total steps). User confirmed: Email Bison, 90 sender IDs (22317-22406).

**Pre-Launch Gates:** All 9 passed:
1. Leads verified (bounce < 3%)
2. Warmup >= 95 on all 90 accounts (4+ weeks)
3. SPF/DKIM/DMARC configured on all 30 domains
4. Open tracking OFF, link tracking N/A
5. Plain text confirmed
6. Spintax format verified (Email Bison: `{a|b|c}`)
6.5. Spintax format matches Email Bison conventions
7. A/B gate passed (3+2+2+2 = 9 >= 9 minimum)
8. Signatures set per persona

**API Calls:**
1. `POST /campaigns` → Campaign ID 366
2. `POST /campaigns/v1.1/366/sequence-steps` → 9 steps with unique order values (1-9), variants linked via `variant_from_step`
3. `POST /campaigns/366/attach-sender-emails` → IDs 22317-22406
4. `PATCH /campaigns/366/update` → `open_tracking: false`, `max_emails_per_day: 2700` (90 x 30)
5. `PATCH /sender-emails/signatures/bulk` → Per-persona signatures for Jay/Madison/Bob

**Result:** Campaign 366 deployed PAUSED. Step IDs logged: E1-A: 2166, E1-B: 2167, E1-C: 2168, E2-A: 2169, E2-B: 2173, E3-A: 2170, E3-B: 2171, E4-A: 2172, E4-B: 2174.

---

## Safety Rules

These protect domain reputation, the single most valuable (and fragile) asset in cold email:

1. **4+ weeks warmup before sending** -- new domains have no reputation
2. **Verify all emails first** (bounce target < 3%) -- bounces destroy reputation fastest
3. **Open/link tracking OFF** -- tracking injects detectable HTML
4. **Max 30 emails/day per mailbox** -- volume-based spam detection threshold
5. **Plain text only** -- HTML signals promotional content
6. **Never use primary domain** -- if a cold email domain burns, business email stays safe
7. **Never auto-activate** -- always review in sequencer first
8. **Spintax on everything** -- ESPs detect identical templates
9. **Pause if bounce rate > 5%** -- something is wrong with the list
10. **Re-verify lead lists older than 30 days** -- email addresses go stale

---

## Output & Handoff

### Workspace output

Write to `scripts/campaigns/{campaign-name}/deployment/`:
- `campaign-brief.md` -- Complete campaign record
- `deployment-log.md` -- API call results, campaign ID, settings applied

### Metadata update

Update `scripts/campaigns/{campaign-name}/.metadata.json`:
```json
{
  "phases": {
    "deployment": {
      "status": "complete",
      "completed_at": "{ISO}",
      "output": "deployment/campaign-brief.md",
      "campaign_id": "{id}",
      "sequencer": "{email_bison|instantly}",
      "state": "paused"
    }
  }
}
```

### Campaign complete

Tell the user: "Campaign deployed in PAUSED state. Review in the sequencer dashboard, send a test email to yourself, then activate when ready. Full brief saved to `deployment/campaign-brief.md`."
