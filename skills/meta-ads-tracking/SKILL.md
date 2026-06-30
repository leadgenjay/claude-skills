---
name: meta-ads-tracking
description: >
  Set up perfect Meta (Facebook/Instagram) ads conversion tracking from scratch — the
  browser Pixel, client-side standard events, the server-side Conversions API (CAPI), and
  the custom conversions Meta optimizes toward — with event deduplication so the Pixel and
  CAPI never double-count. Interview-driven: it asks for your own Pixel/Dataset ID, CAPI
  token, ad account, Page, and the events that equal money, then walks the install and
  verifies it in Events Manager. Hyros is optional, never assumed. Use when the user says
  "set up meta tracking", "facebook pixel", "meta pixel", "conversions api", "meta capi",
  "track meta conversions", "facebook ads tracking", "EMQ", "custom conversions", or is
  starting the Meta Ads Pro System.
---

# meta-ads-tracking — Pixel + Conversions API (Hyros-free)

The foundation of profitable Meta ads is **measurement Meta can optimize against**. Meta's
algorithm only gets as smart as the conversion signal you feed it. This skill installs that
signal end to end on **your** funnel, using Meta's own first-party stack — no third-party
attribution tool required.

> **Why this matters:** iOS + browser privacy killed ~half of pixel-only signal. The fix is
> a **server-side Conversions API** feed that mirrors the Pixel and **deduplicates on a shared
> `event_id`**, plus a high **Event Match Quality (EMQ)** score from hashed customer data. Get
> this right and your cost-per-result drops without touching budget — because Meta finally
> sees the conversions it was missing.

## Mental model — three layers

1. **Pixel (browser)** — `fbq` loads site-wide; fires standard events (`PageView`, `Lead`,
   `InitiateCheckout`, `Purchase`) as the user acts. Each event carries an `eventID`.
2. **Conversions API / CAPI (server)** — your server re-sends the money events (purchase,
   qualified lead) with **hashed** customer data and the **same `event_id`** as the Pixel.
   Meta merges the two and keeps one. This is what survives ad-blockers and iOS.
3. **Custom conversions (Events Manager)** — you *define* which event = a result and point
   each campaign at it. **Sending an event ≠ optimizing toward it.** The dashboard decides.

Hyros (or any third-party attribution) is an **optional reconciliation layer** on top — never
the thing Meta optimizes against. The default path below never requires it.

---

## Step 0 — Interview (gather inputs before touching code)

Ask the user for each. Do not guess; do not write secrets yourself (see Step 5).

| Input | Where they find it | Notes |
|---|---|---|
| **Pixel / Dataset ID** | Events Manager → Data Sources → your dataset | 15-16 digit id. Create one if none exists. |
| **CAPI access token** | Events Manager → Settings → **Conversions API → Generate access token** | Long-lived dataset token. Treat as a password. |
| **Ad account ID** | Ads Manager → top-left account dropdown | `act_<digits>` (with or without `act_`). |
| **Page ID** | Facebook Page → About → Page transparency | Needed later by the launcher, captured here. |
| **Primary domain** | their funnel root, e.g. `getoffer.com` | Must be **verified** in Business Settings → Brand Safety → Domains. |
| **Money events** | ask them | Which action = a result? Usually `Lead` (opt-in / booked call) and `Purchase`. Capture the value + currency for each. |
| **Stack** | ask them | Next.js / WordPress / Shopify / GTM / plain HTML — changes *where* snippets go, not *what* fires. |
| **Hyros?** (optional) | ask | Only to wire the optional appendix. Absence changes nothing in the default path. |

Echo back the resolved `{ pixelId, adAccountId, pageId, domain, moneyEvents[] }` and confirm
before proceeding. If the user has no Pixel/Dataset ID and cannot create one, or cannot generate a
Conversions API token, STOP — those two are the irreducible prerequisites; the rest of this skill
cannot run without them. Do NOT generate placeholder values.

---

## Step 1 — Base Pixel loader (site-wide)

Install once, as high in `<head>` as possible on **every** page (so any ad landing page is
covered). Replace `<PIXEL_ID>`. Idempotent — guard so it can't double-load.

```html
<!-- Meta Pixel -->
<script>
!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init','<PIXEL_ID>');fbq('track','PageView');
</script>
<noscript><img height="1" width="1" style="display:none"
src="https://www.facebook.com/tr?id=<PIXEL_ID>&ev=PageView&noscript=1"/></noscript>
<!-- End Meta Pixel -->
```

- **Next.js (App Router):** put it in `app/layout.tsx` via `next/script` `strategy="afterInteractive"`, or inject through your existing `customHeadScripts` settings blob if you have one. Guard on `window.fbq`.
- **GTM:** add as a Custom HTML tag on All Pages. Do **not** also hard-code it — pick one loader.
- **WordPress/Shopify:** use the official Pixel field if present; otherwise a header-snippet plugin.

Verify before moving on: `curl -s 'https://<domain>/?cb=$RANDOM' | grep -o fbevents` returns a hit, and the **Meta Pixel Helper** browser extension shows the Pixel firing `PageView`.

---

## Step 2 — Client standard events (with a shared `event_id`)

Fire a standard event at each money moment. **Generate one `eventID` per logical event and reuse
it on the server (Step 3)** — this is the dedup key.

```js
// helper: a stable id per conversion (reuse server-side)
function metaEventId(prefix){ return prefix + '_' + (crypto.randomUUID?.() || Date.now()+'_'+Math.random()); }

// opt-in / booked call
const leadId = metaEventId('lead');           // persist (e.g. dataLayer / hidden field) so the server can reuse it
fbq('track','Lead', { content_name:'optin' }, { eventID: leadId });

// checkout intent
fbq('track','InitiateCheckout', { value: 97, currency:'USD' }, { eventID: metaEventId('ic') });

// purchase (client side — server CAPI will mirror this exact event_id)
fbq('track','Purchase', { value: 97, currency:'USD' }, { eventID: orderEventId }); // orderEventId derived from the order id
```

**Rules**
- Derive the purchase `eventID` from a **stable order id** (e.g. `order_<id>`) so the client Pixel
  and the server CAPI compute the *same* id independently → guaranteed dedup.
- Mirror the event coverage across **every A/B variant** of a page (fire the same events regardless
  of which variant renders), or you'll under-report on some arms.
- `value` is in **major units** for the Pixel (dollars), but **minor units (cents)** for some CAPI
  SDKs — keep them consistent per the code you ship (Step 3 sends dollars).

---

## Step 3 — Server-side Conversions API (the part that survives iOS)

Re-send the money events from your server with **hashed** customer data and the **same `event_id`**.
Self-contained, zero dependencies, no-ops without creds. Drop into your backend (Next.js route
handler / serverless function / any Node server).

```ts
// meta-capi.ts — standalone Meta Conversions API sender (no third-party deps)
import crypto from "node:crypto";

const PIXEL_ID = process.env.META_PIXEL_ID;
const CAPI_TOKEN = process.env.META_CAPI_TOKEN;
const TEST_CODE = process.env.META_CAPI_TEST_CODE; // set ONLY while testing in Events Manager

const sha256 = (v: string) => crypto.createHash("sha256").update(v.trim().toLowerCase()).digest("hex");

type MoneyEvent = {
  eventName: "Lead" | "Purchase" | "InitiateCheckout" | string;
  eventId: string;            // MUST equal the Pixel eventID for this action
  email?: string;
  value?: number;             // dollars
  currency?: string;          // default USD
  eventSourceUrl?: string;    // the page URL where it happened
  clientIp?: string;          // from request headers (improves match)
  userAgent?: string;         // from request headers (improves match)
  fbp?: string; fbc?: string; // _fbp / _fbc cookies if available (big EMQ boost)
};

export async function sendMetaEvent(e: MoneyEvent) {
  if (!PIXEL_ID || !CAPI_TOKEN) return; // no-op until configured — never throws
  const user_data: Record<string, unknown> = {};
  if (e.email) user_data.em = [sha256(e.email)];
  if (e.clientIp) user_data.client_ip_address = e.clientIp;
  if (e.userAgent) user_data.client_user_agent = e.userAgent;
  if (e.fbp) user_data.fbp = e.fbp;
  if (e.fbc) user_data.fbc = e.fbc;

  const body = {
    data: [{
      event_name: e.eventName,
      event_time: Math.floor(Date.now() / 1000),
      event_id: e.eventId,                       // <-- dedup key shared with the Pixel
      action_source: "website",
      event_source_url: e.eventSourceUrl,
      user_data,
      custom_data: e.value != null ? { value: e.value, currency: e.currency ?? "USD" } : undefined,
    }],
    ...(TEST_CODE ? { test_event_code: TEST_CODE } : {}),
  };

  const res = await fetch(`https://graph.facebook.com/v21.0/${PIXEL_ID}/events?access_token=${CAPI_TOKEN}`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
  if (!res.ok) console.warn("[meta-capi] failed", res.status, await res.text());
}
```

Wire **one** call where the conversion is truly confirmed server-side (e.g. your purchase webhook /
order-success handler), reusing the same `event_id` the Pixel used:

```ts
await sendMetaEvent({
  eventName: "Purchase", eventId: `order_${order.id}`, email: order.email,
  value: order.amount, currency: "USD", eventSourceUrl: order.sourceUrl,
  clientIp: req.headers["x-forwarded-for"], userAgent: req.headers["user-agent"],
});
```

> **Match quality:** sending hashed **email** alone gets you a usable EMQ; adding `fbp`/`fbc`
> cookies + IP + user-agent pushes it into the green. Read the `_fbp` and `_fbc` cookies in the
> browser at conversion time and pass them through to the server call.

---

## Step 4 — Custom conversions + the optimization event (Events Manager)

Sending events does **not** decide what Meta optimizes toward — you do, in the dashboard.

1. Events Manager → your dataset → **Custom Conversions → Create** one per money event (e.g.
   "Booked Call" from `Lead`, "Sale $97" from `Purchase`, optionally rule-filtered by URL).
2. **Aggregated Event Measurement** (Events Manager → dataset → Settings → Aggregated Event
   Measurement): rank your **8 priority events** with the real purchase highest. This is what
   iOS users are measured on — get the order right.
3. The **optimization event** is chosen later **per ad set** in the launcher (`OFFSITE_CONVERSIONS`
   → your purchase/lead custom conversion). Tracking just makes it *available* and *trustworthy*.

---

## Step 5 — Env vars (the operator adds these — never the agent)

```
META_PIXEL_ID=<pixel/dataset id>
META_CAPI_TOKEN=<conversions api access token>
# META_CAPI_TEST_CODE=<TESTxxptr>   # set ONLY during Step 7 verification, then remove
```

Give the user the exact `printf … >> .env.local` / hosting-dashboard commands — **do not write
secrets to any `.env*` yourself.** Server-side vars only; the Pixel ID is also safe client-side.
After adding env on a host (Vercel/Netlify/etc.), **redeploy** so the server picks them up.

---

## Step 6 — Business setup the install depends on (operator)

- **Verify the domain** (Business Settings → Brand Safety → Domains) — required for AEM + accurate
  attribution on your own URLs.
- Confirm the **dataset is connected to the ad account** (Events Manager → Settings → Connected
  assets).
- Generate the **CAPI access token** on the dataset (Step 0) if not already.

---

## Step 7 — Verify (prove it works before spending a dollar)

1. **Pixel live:** Meta Pixel Helper shows `PageView` + your standard events firing; `curl | grep fbevents` hits.
2. **CAPI live (Test Events):** Events Manager → dataset → **Test Events**, copy the test code into
   `META_CAPI_TEST_CODE`, trigger a real conversion. You should see the server event arrive.
3. **Dedup works:** for one purchase you see **one** deduplicated event (Pixel + Server merged on
   `event_id`), not two. If you see two, the client and server `event_id` don't match — fix the id
   derivation (Step 2/3).
4. **EMQ:** dataset → your event → **Event Match Quality** should be ≥ "Good" (green) within ~24-48h
   of live traffic. Low EMQ → add `fbp`/`fbc`/IP/UA to `user_data`.
5. **Remove `META_CAPI_TEST_CODE`** when done — never leave it set in production (it routes events to
   the test stream, not live).

When all five pass, tracking is "perfect" enough to optimize against. Hand back to the launcher
(or the Meta Ads Pro System orchestrator) to build audiences + campaigns.

---

## Optional — If you also run Hyros (or another attribution tool)

Purely additive; **never required**. If the user has Hyros:
- Keep Meta CAPI as the **optimization** signal (what the algorithm trains on). Hyros stays a
  **reporting/reconciliation** layer for cross-channel last-click truth.
- Add Hyros's hard-tracking URL params to ad destination URLs (the launcher handles this) and
  install the Hyros universal script — independent of everything above.
- **Do not** make Meta optimize toward a Hyros-defined event; Meta optimizes toward the custom
  conversions from Step 4. Reconcile the two in reporting, don't couple them.

If the user does **not** have Hyros (the default assumption), skip this entire section. Meta's own
Pixel + CAPI is a complete, profitable measurement stack on its own.

---

## When NOT to use this skill

- They already have a verified Pixel + CAPI + custom conversions and just want to *launch* → go to
  the launcher / `meta-ads` orchestrator.
- They only need creative rendered → that's the creative skill.
- They want cross-channel last-click attribution specifically → that's a Hyros/attribution-tool
  setup, layered on top of this, not a replacement for it.
