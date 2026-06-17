---
name: openai-ads-setup
description: >
  Install OpenAI (ChatGPT) Ads conversion tracking on any website — the browser measurement pixel
  (oaiq), client conversion events (lead_created / checkout_started / order_created), and the
  server-side Conversions API (CAPI) for ad-blocker-proof purchase tracking — then define the
  conversion events in Ads Manager and link them to campaigns. Stack-agnostic (works with any
  front-end + any backend); ships a labeled Next.js + Supabase + Whop reference implementation. Use
  when the user says "set up openai ads tracking", "openai ads pixel", "oaiq", "openai conversions
  api", "chatgpt ads tracking", "track openai ad conversions", or wants to measure what their OpenAI
  ads drive. Pairs with the `openai-ads` skill (which builds the campaigns).
---

# openai-ads-setup — OpenAI Ads conversion tracking

Measure what your ChatGPT ads actually drive. Three layers, mirroring how Meta/Google CAPI works:

1. **Base pixel** (`oaiq`) — loads site-wide; auto-captures the `oppref` click-ref into a first-party cookie.
2. **Client events** — `lead_created` / `checkout_started` / `order_created` fired from the browser.
3. **Server CAPI** — re-sends purchases server-side (ad-blocker-proof), deduped against the pixel on a shared id.

> This skill installs the *measurement*. The companion **`openai-ads`** skill *builds the campaigns*.
> Order: install tracking (here) → build campaigns (`openai-ads`) → define conversion events + link to
> campaigns (Step 5 below).

A complete, copy-pasteable worked implementation (Next.js 14 + Supabase + Whop) is in
[`reference/worked-implementation.md`](reference/worked-implementation.md) — adapt the patterns to
your own stack.

## Step 0 — Prerequisites

Verify these before wiring anything. If any is missing, STOP and tell the user where to get it — do NOT
emit placeholder code against a broken setup.

| Requirement | Check | Where to get it |
|---|---|---|
| OpenAI Ads account + a **pixel** (Data Source) | Ads Manager → Conversions → Data Source shows a pixel id | Create it in Ads Manager → Conversions (Beta) |
| **Pixel ID** | a ~22-char id string | Ads Manager → Conversions → Data Source |
| **CAPI key** (only for server-side purchases) | a key with the **`ads.third_party_events.write`** scope | Ads Manager → Conversions → **Conversion keys**. A plain `sk-svcacct-…` platform key 401s "Missing scopes" |
| A place to inject a `<head>` script | your site `<head>`, a tag manager (GTM), or a global layout | — |
| A server purchase hook (only for server CAPI) | your webhook / order handler fires once per paid order | — |
| *(recommended)* `openai-ads` skill | campaigns exist to attach conversions to | Install it to build the campaigns |

If anything is missing, STOP. Do NOT hardcode a placeholder pixel id or an unscoped key.

## Step 1 — Base pixel (site-wide, no per-page code)

Drop this once into your site `<head>` (or your tag manager) so **every** landing page loads it and
captures `oppref`. Replace `<YOUR_PIXEL_ID>`:

```html
<!-- OpenAI Ads Measurement Pixel -->
<script>!function(w,d,s,u){if(w.oaiq)return;var q=function(){q.q.push(arguments)};q.q=[];w.oaiq=q;var j=d.createElement(s);j.async=1;j.src=u;var f=d.getElementsByTagName(s)[0];f.parentNode.insertBefore(j,f)}(window,document,"script","https://bzrcdn.openai.com/sdk/oaiq.min.js");oaiq("init",{pixelId:"<YOUR_PIXEL_ID>"});</script>
<!-- End OpenAI Ads -->
```

The `if(w.oaiq)return` guard makes it idempotent. The SDK auto-captures `oppref` from the landing URL,
stores `__oppref`, and adds `source_url`. **Verify:** load a page and confirm `window.oaiq` exists, or
`curl` the page HTML and grep for `oaiq`.

## Step 2 — Identify the user (for match quality)

Set a **hashed** email request-scoped — never raw PII. Once you know the visitor's email (after opt-in),
call once per page/session:

```js
// SHA-256, lowercase hex, of the trimmed+lowercased email
oaiq("init", { user: { email_sha256: await sha256Hex(email.trim().toLowerCase()) } });
```

User data is request-scoped on `init`, **not** passed on individual `measure` calls. Send hashes only.

## Step 3 — Client conversion events

Fire these from the browser at the matching funnel moments. Put them next to whatever analytics event
you already fire at each step so coverage stays aligned across A/B variants.

| Funnel moment | Call |
|---|---|
| Email opt-in / lead | `oaiq("measure", "lead_created", { type: "customer_action" })` |
| Checkout page viewed | `oaiq("measure", "checkout_started", { type: "contents" })` |
| Purchase | `oaiq("measure", "order_created", { type: "contents", amount: <cents>, currency: "USD" }, { event_id: "<order_id>" })` |

- **`amount` is in MINOR UNITS (cents):** `$97.00` → `9700`.
- **`options.event_id`** on the purchase enables browser↔server dedup — use a stable order id (e.g. your
  payment/receipt id). Reuse the **same** id in Step 4.

Event taxonomy: `customer_action` (`lead_created`, `registration_completed`, `appointment_scheduled`) ·
`contents` (`checkout_started`, `order_created`, `page_viewed`) · `plan_enrollment`
(`subscription_created`, `trial_started`) · `custom` (anything else, needs `custom_event_name`, lowercase 1–64 chars).

## Step 4 — Server-side CAPI (purchases — ad-blocker-proof)

Re-send the purchase from your server (the highest-value event), deduped against the pixel. Fire it from
your one-per-order purchase hook:

```
POST https://bzr.openai.com/v1/events?pid=<YOUR_PIXEL_ID>
Authorization: Bearer <OPENAI_CONVERSIONS_KEY>
Content-Type: application/json

{ "validate_only": false, "events": [{
  "id": "<order_id>",              // MUST equal the pixel's event_id from Step 3 → dedups to one
  "type": "order_created",
  "timestamp_ms": <ms>,            // ≤ 7 days old, ≤ 10 min in the future
  "source_url": "https://<your-site>/<success-page>",
  "action_source": "web",
  "user": { "email_sha256": "<hash>", "ip_address": "<ip>", "user_agent": "<ua>" },
  "data": { "type": "contents", "amount": <cents>, "currency": "USD" }
}] }
```

- **Dedup:** OpenAI matches on `(pixelId, type, id)`. Same `id` on pixel + CAPI → counted once.
- **No-op without creds:** gate the call so it silently no-ops unless both the pixel id and the CAPI key
  are present (same pattern as a Meta/Google CAPI sender).
- **`oppref`:** the CAPI does NOT auto-capture it (no browser cookie server-side). Persist `__oppref` at
  opt-in alongside the email if you want higher server-side match quality.
- **Test without writing:** set `validate_only: true` → validates auth + payload, saves nothing. A
  `{"accepted_events":1}` response means the key + scope + shape are good.
- **Vercel/serverless:** wrap the fire-and-forget send so the function doesn't exit before it completes
  (e.g. `after()` on Next.js / Vercel; `ctx.waitUntil` on Workers).

## Step 5 — Ads Manager: define + link the conversion events (dashboard-only)

**Sending events ≠ counting them.** There is **no API to create conversion events** — it's a dashboard
step. In Ads Manager → Conversions → **Conversion Events**:

1. **Create** a conversion event for each one you send (`lead_created`, `checkout_started`,
   `order_created`), choosing your pixel as the data source.
2. **Link** the event your campaign should optimize/report toward to that campaign (e.g. `order_created`
   for a purchase funnel). For a Clicks-objective campaign this is attribution/reporting only — no
   learning reset; for a conversion-objective campaign it sets what's optimized toward.
3. Confirm data is flowing in the **Event Stream** tab (raw incoming events).

## Step 6 — Environment + verify

| Var | Purpose |
|---|---|
| `OPENAI_ADS_PIXEL_ID` | pixel id (public; required by the CAPI sender) |
| `OPENAI_CONVERSIONS_KEY` | CAPI Bearer key (**secret**, `ads.third_party_events.write` scope) |
| `OPENAI_ADS_TEST_ONLY` *(optional)* | `"1"` → CAPI sends `validate_only` (never set in production) |

> **Secrets:** never write secret env vars from an agent. The operator adds them (`.env` + their host's
> env). On most hosts, **env changes require a redeploy** before serverless code sees them.

**Verify:** (1) `window.oaiq` exists on a funnel page; (2) validate-only CAPI returns
`{"accepted_events":1}`; (3) after a real sale, Ads Manager shows ONE `order_created` per order id (pixel
+ CAPI merged, not two); (4) the Event Stream tab shows live events arriving.

## Gotchas
- **CAPI key scope:** an `sk-svcacct-…` key without `ads.third_party_events.write` → 401 "Missing scopes".
- **Env needs a redeploy:** a deploy built *before* the key was added won't have it — redeploy after adding.
- **7-day window:** CAPI rejects `timestamp_ms` older than 7 days / >10 min ahead.
- **`amount` in cents**, always. Dollars × 100.
- **Don't run two recorders / double-fire:** fire each event once per moment; the pixel + CAPI pair is
  intentional (deduped on `id`), but firing the same client event twice is not.
