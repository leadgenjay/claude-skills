---
name: email-bison
description: "Manage cold email campaigns via Email Bison API. Use when creating campaigns, managing sequences, configuring warmup, fetching analytics, or adding leads to campaigns."
---

# Email Bison Campaign Management

## API Reference

- **Base URL:** `https://send.leadgenjay.com/api` (custom domain — NOT `dedi.emailbison.com`)
- **Auth:** `Authorization: Bearer {EMAIL_BISON_API_KEY}`

## Endpoints

### Validation & Discovery
- `GET /sender-emails` — List all sender email accounts
- `GET /campaigns` — List all campaigns (max 100)

### Campaign Management
- `POST /campaigns` — Create campaign (body: `{name, type}`)
- `PATCH /campaigns/{id}/pause` — Pause campaign
- `PATCH /campaigns/{id}/resume` — Resume campaign
- `PATCH /campaigns/{id}/update` — Update settings (open_tracking, plain_text, max_emails_per_day, max_new_leads_per_day, reputation_building, can_unsubscribe, sequence_prioritization). Note: link_tracking is NOT supported.

### Sequence Steps
- `GET /campaigns/{id}/sequence-steps` — List sequence steps for campaign
- `POST /campaigns/v1.1/{id}/sequence-steps` — Create steps (body: `{title, sequence_steps: [...]}`)
  - Each step: `{email_subject, email_body, wait_in_days, order, variant, variant_from_step}`
  - Primary steps: `variant: false`
  - A/B variants: `variant: true, variant_from_step: {parent_step_id}`
- `PUT /campaigns/v1.1/sequence-steps/{step_id}` — Update step delay (body: `{wait_in_days}`)
- `PATCH /campaigns/sequence-steps/{step_id}/activate-or-deactivate` — Toggle variant (body: `{active: bool}`)

### Lead Management
- `POST /leads/bulk` — Create leads in bulk (batches of 100)
- `POST /campaigns/{id}/leads/attach-leads` — Attach existing leads to campaign

### Sender Email Management
- `POST /sender-emails/imap-smtp` — Create IMAP/SMTP email account (see full workflow below)
- `POST /sender-emails/bulk` — Bulk add via CSV upload (`multipart/form-data`, field: `csv`)
- `GET /sender-emails?page={n}` — List sender emails (paginated, 15/page, check `meta.last_page`)
- `GET /sender-emails/{id}` — Get single sender email
- `DELETE /sender-emails/{id}` — Delete sender email
- `PATCH /sender-emails/signatures/bulk` — Bulk update signatures (body: `{sender_email_ids: [int], email_signature: "html"}`)
- `PATCH /sender-emails/daily-limits/bulk` — Update daily send limits (body: `{sender_email_ids: [int], daily_limit: int}`)
- `POST /sender-emails/{id}/check-mx-records` — Verify MX records for sender email
- `POST /sender-emails/bulk-check-missing-mx-records` — Bulk MX check
- `POST /campaigns/{campaign_id}/attach-sender-emails` — Attach senders to campaign
- `POST /campaigns/{campaign_id}/remove-sender-emails` — Remove senders from campaign

### Warmup
- `PATCH /warmup/sender-emails/enable` — Enable warmup (body: `{sender_email_ids: [int]}`)
- `PATCH /warmup/sender-emails/disable` — Disable warmup (body: `{sender_email_ids: [int]}`)
- `PATCH /warmup/sender-emails/update-daily-warmup-limits` — Set warmup daily limit (body: `{sender_email_ids, daily_limit}`)
- `GET /warmup/sender-emails?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD` — Warmup stats (score, emails sent)

### Analytics
- `POST /campaigns/{id}/stats` — Campaign analytics (body: `{start_date, end_date}`)
  - Response: `{data: {emails_sent, opened, unique_replies_per_contact, bounced, unsubscribed}}` — all values are STRINGS

## Critical Rules
- Open tracking MUST be OFF for cold email
- Link tracking is NOT available in EmailBison update endpoint
- Max 30 emails/day per warmed account
- Warmup 4+ weeks before cold sending
- Warmup score >= 95 before sending
- All stats values from the API are returned as strings, parse with parseInt()

## Adding Winnr Mailboxes to Email Bison — Full Workflow

### Step 1: Export Winnr Credentials
Winnr generates unique SMTP passwords per mailbox (NOT the password you set during creation).
Export via Winnr API to get real credentials:
```bash
curl -s -X POST "https://api.winnr.app/v1/export" \
  -H 'Authorization: Bearer {WINNR_API_KEY}' \
  -H "Content-Type: application/json" \
  -d '{"format":"smartlead","get_all":true}'
# Returns: {"data": {"download_url": "https://s3...", "count": N}}
# Download the CSV — columns: domain, from_email, from_name, user_name, password,
#   smtp_host, smtp_port, imap_host, imap_port, imap_username, imap_password, footer
```

### Step 2: Add Sender Emails via IMAP/SMTP Endpoint
```bash
curl -s -X POST "https://send.leadgenjay.com/api/sender-emails/imap-smtp" \
  -H 'Authorization: Bearer {EMAIL_BISON_API_KEY}' \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Jay Feldman",
    "email": "jay@domain.com",
    "password": "{winnr_generated_password}",
    "imap_server": "inbound.winnr-app.com",
    "imap_port": 993,
    "smtp_server": "inbound.winnr-app.com",
    "smtp_port": 465,
    "smtp_secure": true,
    "imap_secure": true,
    "email_signature": "<p>Jay Feldman, Founder<br>Consulti AI</p>"
  }'
# Returns: {"data": {"id": 22317, "status": "Connected", ...}}
```

**Required fields:** `name`, `email`, `password`, `imap_server`, `imap_port`, `smtp_server`, `smtp_port`
**Optional fields:** `smtp_secure`, `imap_secure`, `email_signature`

**Winnr SMTP settings (always the same):**
- SMTP host: `inbound.winnr-app.com`, port `465`, secure: `true`
- IMAP host: `inbound.winnr-app.com`, port `993`, secure: `true`

### Step 3: Set Signatures in Bulk (by person)
```bash
curl -s -X PATCH "https://send.leadgenjay.com/api/sender-emails/signatures/bulk" \
  -H 'Authorization: Bearer {EMAIL_BISON_API_KEY}' \
  -H "Content-Type: application/json" \
  -d '{"sender_email_ids": [22317, 22318, ...], "email_signature": "<p>Jay Feldman, Founder<br>Consulti AI</p>"}'
```
Group sender IDs by person, then one bulk call per person.

### Step 4: Enable Warmup
```bash
curl -s -X PATCH "https://send.leadgenjay.com/api/warmup/sender-emails/enable" \
  -H 'Authorization: Bearer {EMAIL_BISON_API_KEY}' \
  -H "Content-Type: application/json" \
  -d '{"sender_email_ids": [22317, 22318, ...]}'
```

### API Quirks & Gotchas
- **Auth key contains pipe `|`** — MUST use single quotes in shell: `-H 'Authorization: Bearer 191|xxx'`
- **Pagination:** `GET /sender-emails` returns 15/page. Use `?page=N`. Check `meta.last_page` and `meta.total`.
- **Signature on create is ignored** — set via bulk endpoint after creation
- **Stats are strings** — all analytics values returned as strings, parse with `parseInt()`
- **Warmup takes ~4 weeks** — score must be >= 95 before cold sending

## Consulti AI Email Signatures

| Person | Username | Signature |
|--------|----------|-----------|
| Jay Feldman | jay@ | `<p>Jay Feldman, Founder<br>Consulti AI</p>` |
| Madison Popoff | madison@ | `<p>Madison Popoff, Head of Partnerships<br>Consulti AI</p>` |
| Bob Porter | bob@ | `<p>Bob Porter, Executive Assistant<br>Consulti AI</p>` |

## Full API Spec
See `docs/email-bison-api.yaml` for the complete OpenAPI 3.0 specification.
