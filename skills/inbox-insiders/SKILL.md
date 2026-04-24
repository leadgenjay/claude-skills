---
name: inbox-insiders
description: "End-to-end cold email mailbox ordering via Inbox Insiders Instant Order API. Use when ordering new mailboxes, provisioning domains + SMTP + Instantly upload in a single async order, polling order status, exporting credentials, or replacing the buy-domain → DNS → Winnr → Instantly upload chain."
---

# Inbox Insiders — Instant Mailbox Orders

End-to-end mailbox provisioning in one async order: domain registration (Dynadot) → SMTP setup → optional auto-upload to Instantly or Email Bison. Internal Studio Apps product. Replaces the multi-skill `domain-management → cloudflare-dns → winnr-smtp → instantly` chain when a new persona/brand needs fresh infrastructure.

## API Reference

- **Base URL:** `https://inboxinsiders.io/api/v1`
- **Auth:** `Authorization: Bearer ${INBOX_INSIDERS_API_KEY}` — env var, key MUST start with `ii_live_`. Get the key at inboxinsiders.io → Settings → API Keys.
- **Required scope:** `instant_orders` (key must have this scope or returns 403 `MISSING_SCOPE`)
- **Rate limit:** 60 req/min default per key (returns 429 `RATE_LIMITED`)
- **Request timeout:** 30s server-side (use `--max-time 35` on curl)
- **Pricing:** $3.50/mailbox/month recurring (Stripe) + $12/domain registration (easy mode only). 3 mailboxes per domain.
- **Source repo:** `Studio Apps/INBOX INSIDERS/` (API routes: `src/app/api/v1/instant-orders/`)

## Required Environment Variables

| Variable | Required for | Format |
|----------|--------------|--------|
| `INBOX_INSIDERS_API_KEY` | All endpoints | `ii_live_...` |
| `INSTANTLY_API_KEY` | Auto-upload to Instantly (`cold_email.provider="instantly"`) | Bearer token |
| `EMAIL_BISON_API_KEY` | Auto-upload to Email Bison (`cold_email.provider="emailbison"`) | Bearer token |

## Endpoints

| Method | Path | Purpose | Charges? |
|--------|------|---------|----------|
| POST | `/domains/check` | Validate availability of specific domains via Dynadot. Max 50/call. | No |
| POST | `/domains/suggest` | AI domain suggestions with real-time availability. | No |
| POST | `/instant-orders` | Create paid order. Returns `run_id` (uuid). | **YES — Stripe** |
| GET | `/instant-orders?run_id={uuid}` | Poll order status. | No |
| GET | `/instant-orders/export?run_id={uuid}` | Decrypted SMTP/IMAP creds. Plaintext passwords. | No |

## Standard Order Workflow (Easy Mode + Instantly)

The default happy path. One POST replaces the entire legacy chain.

### Step 1 — Confirm cost with user (REQUIRED GATE)

Total = `quantity × $3.50/mo` recurring + `ceil(quantity / 3) × $12` one-time domain registration. Quote both numbers explicitly before calling `POST /instant-orders`.

Example for 9 mailboxes: `9 × $3.50 = $31.50/mo recurring` + `3 × $12 = $36 one-time` = **$67 first invoice, $31.50/mo after**.

### Step 2 — (Optional) Suggest domains

```bash
curl -s -X POST "https://inboxinsiders.io/api/v1/domains/suggest" \
  -H "Authorization: Bearer ${INBOX_INSIDERS_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"brand_name":"Consulti AI","website_url":"https://consulti.ai","count":10}'
```

Inspect output but do NOT pre-purchase — `POST /instant-orders` handles registration.

### Step 3 — Generate idempotency key

A v4 UUID. Reuse on retry; rotate only when intentionally placing a new order after a fix.

```bash
IDEMPOTENCY_KEY=$(uuidgen | tr 'A-Z' 'a-z')
```

### Step 4 — Create the order

**CRITICAL:** `cold_email` is a NESTED object. Both `provider` and `api_key` must be present, or auto-upload silently skips.

```bash
curl -s -X POST "https://inboxinsiders.io/api/v1/instant-orders" \
  -H "Authorization: Bearer ${INBOX_INSIDERS_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "easy",
    "sender_name": "Jay Feldman",
    "quantity": 9,
    "brand_name": "Consulti AI",
    "website_url": "https://consulti.ai",
    "special_instructions": "...",
    "idempotency_key": "'"${IDEMPOTENCY_KEY}"'",
    "cold_email": {
      "provider": "instantly",
      "api_key": "'"${INSTANTLY_API_KEY}"'"
    }
  }'
```

**Required fields:** `sender_name` (first + last), `website_url`, and either `quantity` (easy mode) or `domains[]`. Omitting `website_url` returns 400 `VALIDATION_ERROR: "website_url is required"`. Omitting `mode` defaults to `full_control` server-side — always set `mode` explicitly.

Response includes `run_id` (uuid) and `order_id`. **Stripe charge fires immediately on this call.**

### Step 5 — Poll status

Every 60s until terminal status (`completed`, `completed_with_warnings`, `failed`):

```bash
curl -s "https://inboxinsiders.io/api/v1/instant-orders?run_id=${RUN_ID}" \
  -H "Authorization: Bearer ${INBOX_INSIDERS_API_KEY}"
```

Typical run time 5–30 min. Instantly auto-upload adds 5–10 min on top.

### Step 6 — Export credentials (after terminal status only)

```bash
curl -s "https://inboxinsiders.io/api/v1/instant-orders/export?run_id=${RUN_ID}" \
  -H "Authorization: Bearer ${INBOX_INSIDERS_API_KEY}"
```

Returns decrypted SMTP/IMAP credentials. Treat passwords as plaintext secrets — do not log to `.notepad` or commit.

### Step 7 — Log to `lead-tracking-db`

Insert domains + mailboxes via the `lead-tracking-db` skill so future audits and reports stay accurate.

## Full Control Mode (existing domains)

Use when domains are already registered (e.g., bought via the `domain-management` skill) and you only need II to provision mailboxes on them. Skips the $12/domain charge.

```bash
curl -s -X POST "https://inboxinsiders.io/api/v1/instant-orders" \
  -H "Authorization: Bearer ${INBOX_INSIDERS_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "full_control",
    "sender_name": "Jay Feldman",
    "website_url": "https://consulti.ai",
    "domains": ["example1.com","example2.com","example3.com"],
    "idempotency_key": "'"${IDEMPOTENCY_KEY}"'",
    "cold_email": {
      "provider": "instantly",
      "api_key": "'"${INSTANTLY_API_KEY}"'"
    }
  }'
```

`website_url` is required even in full_control mode. Domains must be importable into II's Dynadot account or already there. Omit `quantity` — II provisions exactly 3 mailboxes per domain (`domains.length × 3` total).

## Critical Rules

- **CRITICAL: `POST /instant-orders` CHARGES STRIPE IMMEDIATELY.** Always quote the dollar total to the user and wait for explicit confirmation before calling. No silent re-runs after errors — investigate first.
- **CRITICAL: Always set `idempotency_key`** (uuid v4). Reuse the same key on retry to prevent duplicate charges. The server caches the original response (including errors) for that key.
- **CRITICAL: `sender_name` requires first + last.** API rejects single names like `"Jay"`. Use canonical Standard Senders (below) unless the user specifies otherwise.
- **CRITICAL: Export only works on terminal status.** Calling export on `pending`/`running` orders returns an error. Always poll status first.
- **CRITICAL: `cold_email` is a nested object.** Setting `cold_email.provider` triggers `want_mailbox_upload`; without `cold_email.api_key` the upload step will fail at runtime even though the order accepts the payload. Always set both. Never use flat `cold_email_provider` at the top level — it gets dropped silently.
- **CRITICAL: `mode` defaults to `full_control`** server-side when omitted. Always set `"mode": "easy"` explicitly when you want easy mode, otherwise the request will fail with `"domains array is required for full_control mode"`.
- Poll cadence: never faster than 30s. 60s is the recommended interval.
- `run_id` is a UUID — quote it correctly in URLs.
- Auth header uses `Bearer ` prefix; key must NOT be URL-encoded.

## Standard Senders (project convention)

Match `winnr-smtp` naming. II accepts one `sender_name` per order, so place separate orders if you need multiple personas:

- `Jay Feldman` — primary
- `Madison Popoff` — head of partnerships
- `Bob Porter` — executive assistant

## Status Codes

Returned in the `status` field of `GET /instant-orders?run_id=...`. Verified against `Studio Apps/INBOX INSIDERS/src/lib/instant-orders/types.ts` (`RunStatus` enum):

| Status | Terminal? | Action |
|--------|-----------|--------|
| `pending` | No | Order accepted, fulfillment not yet started — poll |
| `running` | No | Active step executing — poll at 60s |
| `waiting_propagation` | No | DNS NS propagation in progress — poll (can take 30+ min) |
| `waiting_provisioning` | No | Winnr provisioning queued — poll |
| `completed` | **Yes** | Run export, log to lead DB |
| `completed_with_warnings` | **Yes** | Same as completed; inspect `steps[]` for the warning (often `connect_cold_email` partial failure) |
| `failed` | **Yes** | Read top-level `error_message` and `error_step`. Re-run with the SAME idempotency_key for cached response, or rotate the key to retry only after confirming no duplicate charge. |
| `cancelled` | **Yes** | Order was cancelled (manual ops or refund). No further polling. |

The response also includes `current_step` (one of the 12 step names below), `steps[]` (each with `name`, `index`, `label`, `status`, `error_message`), `step_metadata` (passwords stripped), `error_message`, `started_at`, `completed_at`, and `created_at`.

### Step Names (in order)

`validate_inputs` → `purchase_domains` → `connect_domains_winnr` → `set_redirects` → `set_nameservers` → `verify_ns_propagation` → `await_winnr_provisioning` → `create_mailboxes` → `export_and_store` → `connect_cold_email` → `finalize` → `start_warmup`

When status is `failed`, `error_step` tells you exactly which step blew up.

## API Quirks & Gotchas

- **Recurring subscription:** $3.50/mailbox/month is a Stripe subscription. Cancellations happen via the II dashboard, not the API.
- **Instantly auto-upload uses Playwright,** not the Instantly v2 API. Adds 5–10 min and a separate failure mode. If `completed_with_warnings` and the warning is on the Instantly step, fall back to the `instantly` skill: export credentials → CSV → `POST /accounts` per mailbox.
- **Idempotency caches errors too.** If a charge succeeded but post-charge logic failed, the cached response will keep returning the same error. Use a fresh key only after you've confirmed (via dashboard or a fresh status poll) that no duplicate charge will occur.
- **Domain registration is bundled into the first invoice,** not a separate charge.
- **Single-name `sender_name` is rejected server-side,** with a validation error. The schema only enforces `string`; the `first + last` rule is in the route handler.
- **Domains check has rate limiting:** internally batched 5 at a time with 200ms gaps to stay under Dynadot rate limits. Don't pre-batch; just send all domains in one call.
- **`/domains/check` costs ~$12/domain** when used to actually register (via subsequent `POST /instant-orders`). The check itself is free.

## Cross-Skill Handoffs

- `lead-tracking-db` — log domains + mailboxes after every successful order
- `instantly` — fallback for manual upload if II's auto-upload step warns or fails
- `email-bison` — alternative target sequencer (`cold_email.provider: "emailbison"`)
- `cold-email-campaign-deploy` — next step after 4+ weeks of warmup (per project safety rule)

## Setup

Add `INBOX_INSIDERS_API_KEY=ii_live_...` to the project `.env`. No MCP server required — all calls go through curl. The internal MCP server in `Studio Apps/INBOX INSIDERS/mcp-server/` exists but this skill intentionally uses raw HTTP for parity with `winnr-smtp`, `instantly`, `email-bison`, and to keep `.mcp.json` minimal.

## Source of Truth

When the API surface seems off, read the source directly:
- Order endpoint (payload + pricing): `Studio Apps/INBOX INSIDERS/src/app/api/v1/instant-orders/route.ts`
- Status polling: same file (GET handler)
- Export endpoint: `Studio Apps/INBOX INSIDERS/src/app/api/v1/instant-orders/export/route.ts`
- Domain check / suggest: `Studio Apps/INBOX INSIDERS/src/app/api/v1/domains/{check,suggest}/route.ts`
- Instantly callback (Playwright auto-upload): `Studio Apps/INBOX INSIDERS/src/app/api/n8n/instantly-setup-complete/route.ts`
- Reference MCP wrapper (for parameter shapes): `Studio Apps/INBOX INSIDERS/mcp-server/src/tools.ts`
