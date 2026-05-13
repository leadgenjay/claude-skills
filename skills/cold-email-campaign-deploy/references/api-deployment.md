# API Deployment Reference

## Email Bison Deployment

**Base URL:** `https://send.leadgenjay.com/api`
**Auth:** `Authorization: Bearer {EMAIL_BISON_API_KEY}`

### Step 1: Create Campaign
```bash
POST /campaigns
Body: {"name": "{campaign_name}", "type": "outbound"}
```

Created campaigns start in `status: "draft"` (the paused-equivalent). Bison never auto-sends a draft. The user activates manually via the Bison UI after pre-launch checks.

### Step 2: Create Sequence Steps with A/B Variants

**All steps in one call** (recommended):

`variant_from_step` = **POSITIONAL INDEX** (1-based) of the parent step **within the same payload array**. NOT a database ID.

```bash
POST /campaigns/v1.1/{id}/sequence-steps
Body: {"title": "{campaign_name}", "sequence_steps": [
  {"email_subject": "Subject A", "email_body": "Body A", "wait_in_days": 0, "order": 1, "active": true},
  {"email_subject": "Subject B", "email_body": "Body B", "wait_in_days": 0, "order": 2, "active": true, "variant": true, "variant_from_step": 1},
  {"email_subject": "Follow-up", "email_body": "Nudge body", "wait_in_days": 2, "order": 3, "active": true}
]}
```

> **CRITICAL — variant: true is REQUIRED on every variant row.** Bison's API silently strips `variant_from_step` if the boolean is not set. The response will show `variant: true` was auto-set but `variant_from_step: null` — the variant is unlinked. Always send BOTH `variant: true` AND `variant_from_step: N` together. Parent rows can omit the `variant` key entirely (or send `variant: false`).

> **Bison auto-renumbers parent `order` to sequential 1-N when variants link.** If you send parents at orders 1, 4, 6, 8 (interspersed with variants at 2, 3, 5, 7, 9), the response will renumber parents to 1, 2, 3, 4 while variants keep their sent orders. This creates "duplicate" order numbers across rows but is functionally correct — variant grouping uses `variant_from_step_id` (returned in the response), not order. Do not attempt to "fix" the orders post-create.

In the example above, `variant_from_step: 1` means "variant of the 1st item in this array" (Subject A).

**Adding variants to already-saved steps** (separate call):

`variant_from_step_id` = **DATABASE ID** of the already-saved parent step. NOT a positional index. Use this when the parent step was created in a prior API call and you know its database ID.

```bash
POST /campaigns/v1.1/{id}/sequence-steps
Body: {"title": "{campaign_name}", "sequence_steps": [
  {"email_subject": "Subject B", "email_body": "Body B", "wait_in_days": 0, "order": 1, "variant": true, "variant_from_step_id": 2150}
]}
```

**NEVER mix up these two fields:**
- `variant_from_step` = position in the current payload array (1-based)
- `variant_from_step_id` = saved step database ID from a previous API response

Using the wrong field creates orphaned steps instead of linked A/B variants.

> **Do NOT attempt to repair variant linkage via the deprecated PUT `/campaigns/sequence-steps/{sequence_id}` bulk-update.** That endpoint accepts the payload but does NOT persist `variant_from_step_id` even when sent correctly with `variant: true`. The only reliable path to fix bad linkage is `DELETE /campaigns/{id}` (full removal) followed by re-POSTing the create payload. The `PUT /campaigns/v1.1/sequence-steps/{step_id}` endpoint is fine for updating `wait_in_days` on a single step but does not change variant relationships.

### Step 2b: Verify Variant Linking After Create

```bash
GET /campaigns/v1.1/{id}/sequence-steps
# Each variant row should have variant_from_step_id set to the parent's DB id.
# If any variant has variant_from_step_id: null, linkage failed — DELETE and re-POST.
```

### Step 2c: Delete Sequence Steps

```bash
DELETE /campaigns/{id}/sequence-steps/{step_id}
# Cannot delete the last remaining step — Bison requires ≥1 step per campaign.

DELETE /campaigns/{id}
# Returns 200 even for draft campaigns. Removes the campaign and all its sequence
# steps in a single call. Primary rollback path when variant linkage is broken.
```

### Step 3: Attach Sender Emails
```bash
POST /campaigns/{id}/attach-sender-emails
Body: {"sender_email_ids": [...]}
```

### Step 4: Configure Settings
```bash
PATCH /campaigns/{id}/update
Body: {
  "open_tracking": false,
  "plain_text": true,
  "reputation_building": true,
  "max_emails_per_day": <num_sender_emails × per_mailbox_daily_limit>,
  "max_new_leads_per_day": <num_sender_emails × per_mailbox_daily_limit>,
  "can_unsubscribe": false
}
```

> **`max_emails_per_day` is a campaign-level total**, NOT a per-inbox limit. Calculate as:
> `number_of_attached_sender_emails × per_mailbox_daily_limit`.
> Pilot ramp: 264 senders × 20/day = 5,280. After 7 days clean: 264 × 30 = 7,920.
> The per-inbox limit is enforced separately by Email Bison's "Email account limits" setting (Step 4b below). `max_new_leads_per_day` uses the same formula — Email Bison's `sequence_prioritization` handles follow-up vs. new-lead capacity automatically.

> **`sequence_prioritization` valid values:** `"followups"` (default — drains followups before adding new leads). **Do NOT send `"top"`** — Bison rejects it with `422 "The selected sequence prioritization is invalid."`.

> **`link_tracking` quirk:** Bison accepts `link_tracking: false` in the request body but the response field returns `null` regardless. The reliable way to suppress link tracking is to keep links out of the copy (E1/E2/E3 should have zero links per cold-email-copywriting constraints).

### Step 4b: Bump Per-Mailbox Daily Limit (recommended for pilot)

Default per-mailbox `daily_limit` is 10/day, which throttles the campaign below the campaign-level cap. Bump to 20 for a clean pilot ramp:

```bash
PATCH /sender-emails/daily-limits/bulk
Body: {"sender_email_ids": [811, 812, ..., 94621], "daily_limit": 20}
# Response: {"data": {"success": true, "message": "Successfully updated email daily limits..."}}
```

> **Daily-limit changes are workspace-global.** This PATCH affects every campaign these senders are attached to, not just the new pilot. To revert: re-PATCH with the previous limit.

After 7 days of clean reply/bounce metrics (bounce ≤ 3%, no warmup-score regressions), bump again to 30.

### Spintax Format
`{option1|option2|option3}`

### Personalization Tokens
| Purpose | Token |
|---------|-------|
| First name | `{FIRST_NAME}` |
| Company | `{COMPANY}` |
| Job title | `{JOB_TITLE}` |
| Custom line | `{PERSONALIZED_LINE}` |

---

## Instantly Deployment

**Base URL:** `https://api.instantly.ai/api/v2`
**Auth:** `Authorization: Bearer {INSTANTLY_API_KEY}`

> **CRITICAL HTML RULE:** Use `<p>` tags for paragraph breaks. NEVER use `<br>` — Instantly strips ALL text content from emails containing `<br>` tags. This is the #1 cause of blank emails in Instantly deployments.
>
> Correct: `<p>Hi John,</p><p>Here's an idea...</p>`
> Wrong: `Hi John,<br>Here's an idea...`

### Step 1: Create Campaign with Full Payload

`campaign_schedule` with a `schedules` array is REQUIRED — omitting it or passing `{}` causes a 400 error.

```bash
POST /campaigns
Body: {
  "name": "{campaign_name}",
  "campaign_schedule": {
    "schedules": [{
      "name": "Default",
      "timing": {"from": "08:00", "to": "17:00"},
      "days": {"1": true, "2": true, "3": true, "4": true, "5": true},
      "timezone": "America/Chicago"
    }]
  },
  "sequences": [{"steps": [
    {"type": "email", "delay": 0, "variants": [
      {"subject": "Subject A", "body": "<p>Body A</p>"},
      {"subject": "Subject B", "body": "<p>Body B</p>"}
    ]},
    {"type": "email", "delay": 2, "variants": [
      {"subject": "", "body": "<p>Follow-up (threaded)</p>"}
    ]}
  ]}]
}
```

**Schedule customization:**
- `timing.from` / `timing.to`: 24-hour format (e.g., `"09:00"` to `"16:00"` for tighter window)
- `days`: Keys `"1"`-`"7"` (Monday-Sunday). Omit weekends for B2B.
- `timezone`: Named timezone (e.g., `"America/New_York"`, `"America/Los_Angeles"`)
- Only the first element in `schedules` array is used

**Campaign status codes:** 0=draft, 1=active, 2=paused, 3=completed

### Step 2: Configure Settings
```bash
PATCH /campaigns/{id}
Body: {"open_tracking": false, "link_tracking": false, "text_only": true}
```

### Step 3: Add Leads

Leads are added AFTER campaign creation. One lead per call (batch format not supported).

```bash
POST /leads
Body: {
  "email": "john@company.com",
  "first_name": "John",
  "last_name": "Doe",
  "company_name": "Acme Inc",
  "campaign_id": "{campaign_id}"
}
```

> **Lead upload limits:** Instantly workspaces have a lead upload cap. When the limit is reached (0 remaining), no new leads can be added via API. Check remaining capacity before bulk uploads. For large lists, upload via Instantly dashboard CSV import instead.

### Step 4: Sender Accounts

Instantly manages sender accounts at the workspace level, not per-campaign. There is no "attach sender" API endpoint.

- Accounts must already exist and have warmup enabled in Instantly
- Most campaigns use `email_tag_list` (tag UUIDs) for account inheritance — copy tags to new campaigns
- Alternatively, assign specific accounts via Instantly dashboard
- Warmup configuration happens in Instantly UI, not via campaign API
- Ensure 4+ weeks warmup and score >= 95 before activating campaign

### Gotchas
- Follow-ups: empty subject `""` for threading
- `sequences` array: only first element used — put ALL steps inside it
- Variant assignment is random per step, NOT matched across steps (E1 variant A does not pair with E2 variant A)
- Pause/activate require `{}` body (empty JSON) — empty body returns 400
- Must use V2 API keys (V1 returns 401/403)
- Use `curl` for API calls — Python urllib is blocked by Cloudflare

### Spintax Format
`{{RANDOM | option1 | option2 | option3}}`

### Personalization Tokens
| Purpose | Token |
|---------|-------|
| First name | `{{firstName}}` |
| Company | `{{companyName}}` |
| Job title | `{{jobTitle}}` |
| Custom line | `{{personalizedLine}}` |

---

## Post-Deployment Output
After deploying, always report:
- Campaign ID and URL
- Number of steps and variants created
- Sender accounts attached (Email Bison) or tags configured (Instantly)
- Reminder: campaign is PAUSED/DRAFT — review in sequencer before activating
