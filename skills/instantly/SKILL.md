---
name: instantly
description: "Manage cold email campaigns via Instantly v2 API. Use when creating campaigns, managing sequences, configuring warmup, fetching analytics, or managing sender accounts in Instantly."
---

# Instantly Campaign Management

## API Reference

- **Base URL:** `https://api.instantly.ai/api/v2`
- **Auth:** `Authorization: Bearer {INSTANTLY_API_KEY}`

## Status Codes
Instantly uses numeric status codes:
- 0 = draft
- 1 = active
- 2 = paused
- 3 = completed

## Endpoints

### Validation & Discovery
- `GET /accounts?limit=100` — List email accounts (response: `{items: [...]}`)
- `GET /campaigns?limit=100` — List campaigns with sequences embedded (response: `{items: [...]}`)

### Campaign Management
- `POST /campaigns` — Create campaign (see full payload below)
- `POST /campaigns/{id}/pause` — Pause campaign
- `POST /campaigns/{id}/activate` — Resume campaign
- `PATCH /campaigns/{id}` — Update settings (open_tracking, link_tracking, text_only, daily_limit, ab_test_winner)
  - Note: Instantly uses `text_only` instead of `plain_text`

### Analytics
- `GET /campaigns/analytics?campaign_id={id}` — Campaign analytics (returns array)
  - Fields: `emails_sent_count`, `open_count`, `reply_count`, `bounced_count`, `unsubscribed_count`

### Account Management
- `POST /accounts` — Add sending account (custom SMTP/IMAP)
  - **REQUIRED:** `provider_code: 1` for custom SMTP (numeric, NOT string)
  - Body:
    ```json
    {
      "email": "user@domain.com",
      "first_name": "First",
      "last_name": "Last",
      "provider_code": 1,
      "smtp_host": "inbound.winnr-app.com",
      "smtp_port": 465,
      "smtp_username": "user@domain.com",
      "smtp_password": "winnr-generated-pw",
      "imap_host": "inbound.winnr-app.com",
      "imap_port": 993,
      "imap_username": "user@domain.com",
      "imap_password": "winnr-generated-pw",
      "warmup_enabled": true,
      "warmup_limit": 30
    }
    ```
  - Duplicate returns: `"This account has already been added to this or a different workspace"`
- `PATCH /accounts/{email}` — Update account (daily_limit, warmup_limit, warmup_reply_rate)
  - Account ID is the email address (URL-encoded)

### Warmup
- `POST /accounts/warmup/enable` — Enable warmup (body: `{emails: [string]}`)
  - Response is async: returns job with `status: "pending"`, `type: "update-warmup-accounts"`
- `POST /accounts/warmup/disable` — Disable warmup (body: `{emails: [string]}`)

### Lead Management
- `POST /leads` — Add leads to campaign (max 100 per batch)
  ```json
  {
    "email": "john@company.com",
    "first_name": "John",
    "last_name": "Doe",
    "company_name": "Acme Inc",
    "phone": "+15551234567",
    "linkedin_url": "https://linkedin.com/in/johndoe",
    "website": "https://acme.com",
    "personalization": "VP of Sales",
    "campaign": "{campaignId}"
  }
  ```
  - `personalization` field is used for job_title

## Campaign Creation Payload

**`POST /campaigns`** — Full working payload:

```json
{
  "name": "Campaign Name",
  "campaign_schedule": {
    "schedules": [{
      "name": "Default",
      "timing": { "from": "08:00", "to": "17:00" },
      "days": { "1": true, "2": true, "3": true, "4": true, "5": true },
      "timezone": "America/Chicago"
    }]
  },
  "sequences": [{
    "steps": [
      {
        "type": "email",
        "delay": 0,
        "variants": [
          { "subject": "Subject Line A", "body": "<p>Email body here</p>" },
          { "subject": "Subject Line B", "body": "<p>A/B variant body</p>" }
        ]
      },
      {
        "type": "email",
        "delay": 3,
        "variants": [
          { "subject": "", "body": "<p>Follow-up body (threaded)</p>" }
        ]
      }
    ]
  }]
}
```

**CRITICAL gotchas:**
- `sequences` array: **only the first element is used** — put ALL steps inside it
- Follow-up emails: use **empty subject `""`** for threading (API auto-handles)
- `delay` is in days (0 = first email, 3 = send 3 days after previous step)
- Response: `{ id, name, ... }`

## A/B Test Variants

- Add multiple objects to the `variants` array in each step (up to 26 per step)
- Variant assignment is **random per step** — no cross-step matching
- Set winner: `PATCH /campaigns/{id}` with `{ "ab_test_winner": "{variantId}" }`
- Variant IDs come from campaign list response: `sequences[].steps[].variants[].id`

## HTML Formatting (CRITICAL BUG)

> **`<br>` tags cause the API to STRIP ALL TEXT CONTENT** — total data loss.

- **DO:** Wrap paragraphs in `<p>` tags: `<p>First paragraph</p><p>Second paragraph</p>`
- **DON'T:** Use `<br>` tags or plain `\n` newlines (invisible in Instantly editor)
- For plain text campaigns: set `text_only: true` via `PATCH /campaigns/{id}`

## Spintax & Personalization

### Spintax Format (differs from Email Bison!)
- **Instantly:** `{{RANDOM | option1 | option2 | option3}}`
- **Email Bison:** `{option1|option2|option3}` (native format, no conversion)

### Personalization Tokens
| Instantly | Email Bison |
|-----------|-------------|
| `{{firstName}}` | `{FIRST_NAME}` |
| `{{companyName}}` | `{COMPANY}` |
| `{{jobTitle}}` | `{JOB_TITLE}` |
| `{{industry}}` | `{INDUSTRY}` |
| `{{painPoint}}` | `{PAIN_POINT}` |
| `{{personalizedLine}}` | `{PERSONALIZED_LINE}` |
| `{{signature}}` | (appended automatically) |

## Error Handling

- **401/403:** Wrong key or missing scopes — must use **V2 API keys** (V1 won't work)
- **429:** Rate limit — implement exponential backoff
- **400:** Check `sequences` array structure (common: multiple array elements instead of one)

## Instantly MCP Server

Alternative to raw API calls — 31 tools across 6 categories:

- **URL:** `https://mcp.instantly.ai/mcp/YOUR_API_KEY`
- **Transport:** Streamable HTTP
- **Tools:** Campaigns (6), Leads (11), Email (5), Analytics (3), Accounts (6)

### Claude Code config:
```json
{
  "mcpServers": {
    "instantly": {
      "url": "https://mcp.instantly.ai/mcp",
      "headers": {
        "Authorization": "YOUR_API_KEY"
      }
    }
  }
}
```

### Alternative: GitHub `bcharleson/instantly-mcp`
- 38 tools, multi-tenant support, rate limiting, lazy loading
- Supports both HTTP (remote) and stdio (local) transport

## Key Differences from Email Bison
- Accounts are keyed by email address, not numeric ID
- Campaigns include sequences inline (no separate steps endpoint needed)
- Uses `text_only` instead of `plain_text`
- warmup_status: 1 = active (numeric, not boolean)
- Campaign URL: `https://app.instantly.ai/app/campaign/{id}/sequences`

## Critical Rules
- Open tracking MUST be OFF for cold email
- Link tracking MUST be OFF for cold email
- Max 30 emails/day per warmed account
- Warmup 4+ weeks before cold sending
