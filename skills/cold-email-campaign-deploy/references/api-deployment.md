# API Deployment Reference

## Email Bison Deployment

**Base URL:** `https://send.leadgenjay.com/api`
**Auth:** `Authorization: Bearer {EMAIL_BISON_API_KEY}`

### Step 1: Create Campaign
```bash
POST /campaigns
Body: {"name": "{campaign_name}", "type": "email"}
```

### Step 2: Create Sequence Steps with A/B Variants

**All steps in one call** (recommended):

`variant_from_step` = **POSITIONAL INDEX** (1-based) of the parent step **within the same payload array**. NOT a database ID.

```bash
POST /campaigns/v1.1/{id}/sequence-steps
Body: {"title": "{campaign_name}", "sequence_steps": [
  {"email_subject": "Subject A", "email_body": "Body A", "wait_in_days": 0, "order": 1, "variant": false},
  {"email_subject": "Subject B", "email_body": "Body B", "wait_in_days": 0, "order": 2, "variant": true, "variant_from_step": 1},
  {"email_subject": "Follow-up", "email_body": "Nudge body", "wait_in_days": 2, "order": 3, "variant": false}
]}
```

> **IMPORTANT:** Every step must have a unique `order` value — even variants. Duplicate order values cause validation error: "The sequence_steps.N.order field has a duplicate value." Variant grouping is handled entirely by `variant_from_step`, NOT by shared order values.

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

### Step 2b: Delete Sequence Steps

```bash
DELETE /campaigns/{id}/sequence-steps/{step_id}
```

Delete individual steps by their database ID. To recreate a sequence, delete all existing steps first, then POST the corrected payload.

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
  "max_emails_per_day": <num_sender_emails × 30>,
  "max_new_leads_per_day": <num_sender_emails × 30>,
  "can_unsubscribe": false
}
```

> **Important:** `max_emails_per_day` is a **campaign-level total**, NOT a per-inbox limit.
> Calculate as: `number_of_attached_sender_emails × 30`.
> Example: 90 sender accounts → `90 × 30 = 2700`.
> The per-inbox safety limit (30/day) is enforced separately by Email Bison's
> "Email account limits" setting. `max_new_leads_per_day` uses the same formula —
> Email Bison's "Prioritize followups" handles follow-up capacity automatically.

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
