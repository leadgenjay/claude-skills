---
name: google-ads-tracking
description: >
  Set up perfect Google Ads conversion tracking from scratch — the Google tag (gtag),
  client-side conversion events, Enhanced Conversions for web, and the server-side / offline
  conversion import that survives privacy and ad-blockers — plus Customer Match audiences, so
  Google's Smart Bidding finally optimizes against real money. Interview-driven: it asks for
  your own Customer ID, developer token, OAuth credentials, and the events that equal money,
  then walks the install and verifies it. Hyros is optional, never assumed. Use when the user
  says "set up google ads tracking", "google conversion tracking", "enhanced conversions",
  "gclid", "offline conversion import", "google tag", "customer match", "track google
  conversions", or is starting the Google Ads Pro System.
---

# google-ads-tracking — Conversion Tracking + Customer Match (Hyros-free)

The foundation of profitable Google Ads is **measurement Google's Smart Bidding can optimize
against**. The bidding algorithm only gets as smart as the conversion signal you feed it. This
skill installs that signal end to end on **your** funnel, using Google's own first-party stack —
no third-party attribution tool required.

> **Why this matters:** browser privacy + ad-blockers + iOS quietly erase a big slice of
> tag-only conversions. The durable fix is **first-party data on every conversion** (Enhanced
> Conversions) plus a **server-side / offline conversion import** keyed on the **gclid** (Google
> Click ID), so the click that drove the sale gets credited even when the browser tag never
> fires. Get this right and your cost-per-result drops without touching budget, because Google
> finally sees the conversions it was missing.

## Mental model — four layers

1. **The Google tag (gtag.js, browser)** — loads site-wide under your conversion ID (`AW-XXXXXXX`)
   and fires a **conversion event** the moment the user converts. Each event carries a
   `transaction_id` (your dedup key).
2. **Enhanced Conversions for web (browser, first-party match)** — alongside each conversion you
   send **hashed** email/phone from the form. Google matches it to a signed-in Google account and
   recovers conversions the cookie alone would lose. This is the Google analog of a server-side
   match and it is the single biggest free accuracy win.
3. **Server-side / offline conversion import (the durable layer)** — your server re-sends the
   money event to the Google Ads API keyed on the **gclid** captured at landing, with hashed
   email and a stable `order_id`. This is what survives ad-blockers and late/multi-session
   purchases. For lead-gen with no transaction, the same upload is **Enhanced Conversions for
   Leads**. (Full walkthrough + standalone code: `references/developer-api.md`.)
4. **Conversion actions (Google Ads UI)** — you *define* which event = a result and mark it
   **Primary** so Smart Bidding optimizes toward it. **Sending a conversion does not decide what
   Google bids for — the conversion goal does.**

**Customer Match** (hashed customer lists for audience targeting + exclusions) rides the same
hashed-data plumbing and is set up in Step 6 via the Data Manager API.

Hyros (or any third-party attribution) is an **optional reconciliation layer** on top — never the
thing Google optimizes against. The default path below never requires it.

---

## Step 0 — Interview (gather inputs before touching code)

Ask the user for each. Do not guess; do not write secrets yourself (see Step 7).

| Input | Where they find it | Notes |
|---|---|---|
| **Customer ID** | Google Ads → top-right, under the account name | 10 digits, no dashes (e.g. `1234567890`). |
| **Manager (MCC) / login-customer-id** | the manager account above this one, if any | Optional. Sent as the `login-customer-id` header when present. |
| **Developer token** | Google Ads → Tools → **API Center** (manager account) | Required for the API tiers (Steps 5-6). A "Test" token only hits test accounts; you need Basic access for production. |
| **OAuth client id + secret** | Google Cloud Console → APIs & Services → Credentials → OAuth client | One OAuth client. **Note which client** — it matters (see the token gotcha in `references/developer-api.md`). |
| **Refresh token(s)** | minted once via the OAuth consent flow | One for the `adwords` scope (conversions). A second for the `datamanager` scope (Customer Match) — or one token minted with **both** scopes. |
| **Conversion ID + labels** | created in Step 2 | `AW-XXXXXXX` (account) + a per-action label `AbC-D_efGh`. |
| **Primary domain** | their funnel root, e.g. `getoffer.com` | Where the Google tag installs. |
| **Stack** | ask them | Next.js / WordPress / Shopify / GTM / plain HTML — changes *where* snippets go, not *what* fires. |
| **Money events** | ask them | Which action = a result? Usually a **Lead** (opt-in / booked call) and a **Purchase**. Capture the value + currency for each. |
| **Auto-tagging ON?** | Google Ads → Admin → Account settings → Auto-tagging | Must be **ON** so `gclid` lands on your URLs. Default on; confirm it. |
| **Hyros?** (optional) | ask | Only to wire the optional appendix. Absence changes nothing in the default path. |

Echo back the resolved `{ customerId, loginCustomerId?, conversionId, domain, moneyEvents[] }` and
confirm before proceeding. The **irreducible prerequisites** are a Google Ads account with
**auto-tagging on** and the ability to **create conversion actions** (Steps 1-4 — the no-code
baseline). The API tiers (Steps 5-6) additionally need the developer token + OAuth credentials; if
the user can't get those yet, ship the baseline and come back for the durable layer. Do NOT generate
placeholder values.

---

## Step 1 — The Google tag (site-wide)

Install once, as high in `<head>` as possible on **every** page (so any ad landing page is
covered). Replace `AW-XXXXXXX` with the conversion ID. Idempotent — guard so it can't double-load.

```html
<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=AW-XXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'AW-XXXXXXX');
</script>
<!-- End Google tag -->
```

- **Next.js (App Router):** load via `next/script` `strategy="afterInteractive"` in `app/layout.tsx`, or inject through your existing `customHeadScripts` settings blob. Guard on `window.gtag`.
- **GTM:** use the **Google Ads Conversion Tracking** tag (set the Conversion ID) instead of hard-coding. Pick one loader — never both.
- **WordPress/Shopify:** the official Google/Google Ads channel app, or a header-snippet plugin.

**Capture the gclid at landing** (you'll need it in Step 5). Auto-tagging appends `?gclid=...` to ad
clicks; persist it the moment a page loads so it survives to conversion time:

```js
(function(){
  var p = new URLSearchParams(location.search);
  var gclid = p.get('gclid') || p.get('wbraid') || p.get('gbraid');
  if (gclid) { try { localStorage.setItem('gclid', gclid); document.cookie = 'gclid='+gclid+';path=/;max-age=7776000'; } catch(e){} }
})();
```

Verify before moving on: `curl -s 'https://<domain>/' | grep -o 'AW-XXXXXXX'` returns a hit, and **Google Tag Assistant** (tagassistant.google.com) shows the tag firing on the page.

---

## Step 2 — Conversion actions (Google Ads UI)

Create one conversion action per money event — this is what Smart Bidding can optimize toward.

1. Google Ads → **Goals → Conversions → + New conversion action → Website**.
2. Create one per money event: e.g. **"Booked Call"** (category: *Book appointment* or *Submit lead form*) and **"Purchase $97"** (category: *Purchase*, with a value).
3. **Mark the real result Primary** ("Primary action" / included in a conversion goal). Everything else is **Secondary** (observe-only). Smart Bidding bids for Primary actions only.
4. Choose the tag setup **"Use Google tag"** (you installed it in Step 1) and copy each action's **conversion label** (`AW-XXXXXXX/AbC-D_efGh`).

> **Sending a conversion ≠ optimizing toward it.** The conversion goal (Primary actions) decides
> what Google bids for. Tracking just makes the signal *available* and *trustworthy*.

---

## Step 3 — Enhanced Conversions for web (the free accuracy win)

Turn it on per conversion action (**conversion action → Settings → Enhanced conversions → Turn on →
API/gtag method**), then send hashed first-party data with the conversion. With gtag you can pass
**plain** values and let Google hash client-side:

```js
// Call BEFORE the conversion event fires (Step 4), with the user's form data.
gtag('set', 'user_data', {
  email: formEmail,                     // Google normalizes + SHA256-hashes client-side
  phone_number: formPhoneE164,          // optional, E.164 (+15551234567)
  address: { first_name: firstName, last_name: lastName } // optional, boosts match
});
```

- **GTM:** use the built-in **Enhanced Conversions** setting on the Conversion Tracking tag and map
  the email/phone variables — no manual `user_data` needed.
- If you pre-hash yourself, send `sha256_email_address` / `sha256_phone_number` instead (lowercase,
  trimmed, SHA-256 hex). Either way, raw PII never has to leave the page un-hashed.

This recovers the conversions a third-party cookie loses. It is the highest-leverage step here.

---

## Step 4 — Client-side conversion events (with a dedup key)

Fire a conversion event at each money moment. Use a **stable `transaction_id`** (derived from your
order/lead id) so the browser conversion and the later server import (Step 5) **dedup to one**.

```js
// purchase (browser) — transaction_id MUST match the server import's order_id
gtag('event', 'conversion', {
  send_to: 'AW-XXXXXXX/PURCHASE_LABEL',
  value: 97.0,
  currency: 'USD',
  transaction_id: 'order_' + orderId
});

// lead / booked call (no value, or a proxy value)
gtag('event', 'conversion', {
  send_to: 'AW-XXXXXXX/LEAD_LABEL',
  transaction_id: 'lead_' + leadId
});
```

**Rules**
- Derive `transaction_id` from a **stable order/lead id** so the browser tag and the server import
  compute the *same* id independently → guaranteed dedup (Google dedups a conversion action on
  `order_id` / `transaction_id`).
- Fire the same events across **every A/B variant** of a page, or you under-report on some arms.
- Keep `value` in **major units** (dollars) for gtag.

---

## Step 5 — Server-side / offline conversion import (the durable layer)

This is what survives ad-blockers and late/multi-session purchases, and what makes lead-gen
trackable (Enhanced Conversions for Leads). Your server re-sends the money event to the Google Ads
API keyed on the **gclid** captured in Step 1, with a hashed email and the same `order_id` as the
browser `transaction_id`.

Endpoint: `POST https://googleads.googleapis.com/v23/customers/{customerId}:uploadClickConversions`

The full OAuth flow, headers, a standalone no-dependency `uploadGoogleAdsConversion()` sender, and
the failure modes are in **`references/developer-api.md` § Offline conversion import**. The shape:

```jsonc
{
  "conversions": [{
    "gclid": "<captured at landing>",
    "conversionAction": "customers/1234567890/conversionActions/<id>",
    "conversionDateTime": "2026-06-30 12:32:45-07:00",   // 'yyyy-MM-dd HH:mm:ss+|-HH:mm', account time zone
    "conversionValue": 97.0,
    "currencyCode": "USD",
    "orderId": "order_123",                               // dedup key — same as the browser transaction_id
    "userIdentifiers": [{ "hashedEmail": "<sha256 lowercase-trimmed email>" }]  // Enhanced Conversions for Leads
  }],
  "partialFailure": true
}
```

> No gclid (organic / pre-auto-tagging click)? Send `userIdentifiers` only — that is **Enhanced
> Conversions for Leads** and still attributes via the hashed email match.

---

## Step 6 — Customer Match audiences (optional but recommended)

Upload hashed customer lists (buyers, opt-ins) to build retargeting + exclusion audiences and seed
Smart Bidding / lookalike-style signals. **The classic Google Ads `uploadUserData` is allowlist-gated
for most developer tokens** (`CUSTOMER_NOT_ALLOWLISTED_FOR_THIS_FEATURE`) — the reliable path is the
**Data Manager API**:

`POST https://datamanager.googleapis.com/v1/audienceMembers:ingest` (scope:
`https://www.googleapis.com/auth/datamanager`), SHA-256-hashed emails, consent
`CONSENT_GRANTED`, up to 10k members per request. Standalone `addEmailsToUserList()` code + the list
resource format + the gotchas are in **`references/developer-api.md` § Customer Match**.

---

## Step 7 — Env vars (the operator adds these — never the agent)

```
GOOGLE_ADS_DEVELOPER_TOKEN=<from API Center>
GOOGLE_ADS_CUSTOMER_ID=<10 digits, no dashes>
GOOGLE_ADS_LOGIN_CUSTOMER_ID=<manager/MCC id, only if you have one>
GOOGLE_ADS_OAUTH_CLIENT_ID=<oauth client id>
GOOGLE_ADS_OAUTH_CLIENT_SECRET=<oauth client secret>
GOOGLE_ADS_OAUTH_REFRESH_TOKEN=<refresh token with the 'adwords' scope>
# Customer Match (Data Manager API). Omit to fall back to the adwords token (must then include the datamanager scope).
GOOGLE_DATAMANAGER_OAUTH_REFRESH_TOKEN=<refresh token with the 'datamanager' scope>
```

Give the user the exact `printf … >> .env.local` / hosting-dashboard commands — **do not write
secrets to any `.env*` yourself.** These are server-only; the conversion ID (`AW-XXXXXXX`) is the
only Google value that is also safe client-side. After adding env on a host (Vercel/Netlify/etc.),
**redeploy** so the server picks them up.

---

## Step 8 — Verify (prove it works before scaling spend)

1. **Tag live:** Google Tag Assistant shows the Google tag + your conversion event firing; `curl | grep AW-` hits.
2. **gclid captured:** click an ad (or append `?gclid=TESTGCLID` locally) and confirm `localStorage.gclid` / the cookie persists to the conversion page.
3. **Conversions recording:** Google Ads → Goals → Conversions → each action moves to **"Recording conversions"** within a few hours of real traffic (test conversions can take longer).
4. **Enhanced Conversions healthy:** the conversion action's **Diagnostics** tab shows enhanced conversions **"Recording"** with a healthy match rate (not "Needs attention").
5. **Offline import accepted:** the API call returns no `partialFailureError`; the action's offline import status shows uploads received. (Conversions appear with Google's reporting delay — hours, not seconds.)
6. **Dedup works:** a purchase that fires both the browser tag and the server import shows as **one** conversion, not two — confirm the `transaction_id` (browser) equals the `order_id` (server).

When these pass, tracking is "perfect" enough to optimize against. Hand back to the **Google Ads Pro
System** orchestrator (or the launcher) to build audiences + campaigns.

---

## Optional — If you also run Hyros (or another attribution tool)

Purely additive; **never required**. If the user has Hyros:
- Keep Google's own conversion actions as the **optimization** signal (what Smart Bidding trains on).
  Hyros stays a **reporting/reconciliation** layer for cross-channel last-click truth.
- Add Hyros's hard-tracking params to ad final URLs via a **ValueTrack** suffix (the launcher /
  orchestrator handles this), and install the Hyros universal script — independent of everything above:
  ```
  ?utm_source=google&utm_medium=cpc&utm_campaign={OFFER}&h_campaign_id={campaignid}&h_adgroup_id={adgroupid}&h_ad_id={creative}
  ```
  Google fills `{campaignid}` / `{adgroupid}` / `{creative}` at click time; Hyros reconciles
  server-side, no pixel needed.
- **Do not** make Google bid toward a Hyros-defined event; Google optimizes toward the conversion
  actions from Step 2. Reconcile the two in reporting, don't couple them.

If the user does **not** have Hyros (the default assumption), skip this entire section. Google's own
conversion tracking + Enhanced Conversions + offline import is a complete, profitable measurement
stack on its own.

---

## When NOT to use this skill

- They already have verified conversion actions + Enhanced Conversions + offline import and just want
  to *launch* → go to the `google-ads` orchestrator.
- They only need a performance report or campaign edits → that's the `google-ads` orchestrator's
  optimize/report phase.
- They want cross-channel last-click attribution specifically → that's a Hyros/attribution-tool setup,
  layered on top of this, not a replacement for it.
