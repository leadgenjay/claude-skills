# Google Ads API — developer walkthrough (offline conversions + Customer Match)

Everything you need to wire the **durable** tracking layers (Steps 5-6 of `SKILL.md`) against the
Google Ads API directly — no SDK, no third-party tool. All code is standalone, dependency-free, and
**no-ops without credentials** so it can ship before the env is set.

> **API version:** examples target **v23**. Google sunsets a version roughly yearly — when calls
> start 404ing or returning `UNSUPPORTED_VERSION`, bump the `v23` in the URLs to the current version
> and re-test. There is no auto-upgrade.

---

## 1. OAuth2 — minting and refreshing tokens (dual scope)

Two operations need **two different scopes**:

| Operation | Scope | Endpoint host |
|---|---|---|
| Offline conversion import | `https://www.googleapis.com/auth/adwords` | `googleads.googleapis.com` |
| Customer Match (Data Manager) | `https://www.googleapis.com/auth/datamanager` | `datamanager.googleapis.com` |

You can mint **one** refresh token with **both** scopes, or two tokens (one per scope). Mint once via
the OAuth consent flow (loopback / installed-app flow is simplest):

```
https://accounts.google.com/o/oauth2/v2/auth
  ?client_id=<CLIENT_ID>
  &redirect_uri=http://localhost:<port>
  &response_type=code
  &access_type=offline
  &prompt=consent
  &scope=https://www.googleapis.com/auth/adwords%20https://www.googleapis.com/auth/datamanager
```

Exchange the returned `code` at `https://oauth2.googleapis.com/token` for a `refresh_token`. Store it
in env (`SKILL.md` Step 7). At runtime, exchange the refresh token for a short-lived access token:

```ts
// google-oauth.ts — mint/cache a Google access token from a refresh token
let cache: { token: string; exp: number } | null = null;

export async function getAccessToken(refreshToken = process.env.GOOGLE_ADS_OAUTH_REFRESH_TOKEN): Promise<string | null> {
  const clientId = process.env.GOOGLE_ADS_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_ADS_OAUTH_CLIENT_SECRET;
  if (!clientId || !clientSecret || !refreshToken) return null;      // no-op until configured
  if (cache && cache.exp > Date.now() + 5 * 60_000) return cache.token; // 5-min safety buffer

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId, client_secret: clientSecret,
      refresh_token: refreshToken, grant_type: "refresh_token",
    }),
  });
  if (!res.ok) { console.warn("[google-oauth] refresh failed", res.status, await res.text()); return null; }
  const j = await res.json();
  cache = { token: j.access_token, exp: Date.now() + j.expires_in * 1000 };
  return cache.token;
}
```

### THE gotcha — token/client mismatch is a silent no-op
A refresh token can **only** be refreshed against the **exact OAuth client that minted it**. If a
token was created with client A but your code refreshes it with client B's id/secret, the token
endpoint returns `401 invalid_client` / `unauthorized_client`, `getAccessToken()` returns `null`, and
every downstream call **silently does nothing** (`{ ok: true, attempted: 0 }` is the classic
symptom). This bites hardest when the `datamanager` token was minted by a *different* OAuth client
than the `adwords` token. **Fix:** mint each refresh token with the client whose id/secret your code
actually uses, or thread a per-scope client override. When a Customer Match upload reports success but
the audience stays at 0 members, suspect this first — refresh each candidate client directly at the
token endpoint to find the one that returns 200.

---

## 2. Offline conversion import — `uploadClickConversions`

```ts
// google-ads-offline.ts — standalone offline conversion sender (no deps, no-op without creds)
import crypto from "node:crypto";
import { getAccessToken } from "./google-oauth";

const sha256 = (v: string) => crypto.createHash("sha256").update(v.trim().toLowerCase()).digest("hex");

type Conversion = {
  conversionAction: string;        // "customers/<cid>/conversionActions/<id>"
  conversionDateTime: string;      // "yyyy-MM-dd HH:mm:ss+|-HH:mm" in the ACCOUNT time zone
  conversionValue?: number;
  currencyCode?: string;           // default USD
  orderId?: string;                // dedup key — match the browser transaction_id
  gclid?: string;                  // from auto-tagging (Step 1)
  email?: string;                  // hashed for Enhanced Conversions for Leads
};

export async function uploadGoogleAdsConversion(c: Conversion): Promise<{ ok: boolean; status?: number }> {
  const token = await getAccessToken();
  const devToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
  const customerId = process.env.GOOGLE_ADS_CUSTOMER_ID;       // 10 digits, no dashes
  if (!token || !devToken || !customerId) return { ok: false }; // no-op until configured

  const userIdentifiers = c.email ? [{ hashedEmail: sha256(c.email) }] : undefined;
  const body = {
    conversions: [{
      conversionAction: c.conversionAction,
      conversionDateTime: c.conversionDateTime,
      ...(c.gclid ? { gclid: c.gclid } : {}),
      ...(c.conversionValue != null ? { conversionValue: c.conversionValue, currencyCode: c.currencyCode ?? "USD" } : {}),
      ...(c.orderId ? { orderId: c.orderId } : {}),
      ...(userIdentifiers ? { userIdentifiers } : {}),
    }],
    partialFailure: true,                 // never fail the whole batch on one bad row
  };

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    "developer-token": devToken,
    "Content-Type": "application/json",
  };
  const loginCid = process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID;
  if (loginCid) headers["login-customer-id"] = loginCid;     // manager/MCC id, digits only

  const res = await fetch(`https://googleads.googleapis.com/v23/customers/${customerId}:uploadClickConversions`,
    { method: "POST", headers, body: JSON.stringify(body) });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.partialFailureError) {
    console.warn("[google-ads-offline] failed", res.status, JSON.stringify(json.partialFailureError ?? json));
    return { ok: false, status: res.status };
  }
  return { ok: true, status: res.status };
}
```

Wire **one** call where the conversion is truly confirmed server-side (purchase webhook /
order-success handler / booked-call webhook), reusing the gclid captured at landing and the same
`order_id` the browser tag used:

```ts
await uploadGoogleAdsConversion({
  conversionAction: `customers/${process.env.GOOGLE_ADS_CUSTOMER_ID}/conversionActions/<PURCHASE_ID>`,
  conversionDateTime: "2026-06-30 12:32:45-07:00",
  conversionValue: order.amount, currencyCode: "USD",
  orderId: `order_${order.id}`, gclid: order.gclid, email: order.email,
});
```

**Gotchas**
- **Time format is exact:** `yyyy-MM-dd HH:mm:ss+|-HH:mm` (space, not `T`) in the **account time
  zone**, with an explicit offset. A mismatched zone shifts the conversion out of the click's
  attribution window.
- **7-day-ish window for fresh leads:** opt-in style conversions imported more than ~7 days after the
  click can fall outside the event window and be rejected — import promptly.
- **gclid is single-use per conversion action + order_id** — re-uploading the same `order_id` dedups
  (no double count), which is exactly why the browser `transaction_id` must equal the server
  `order_id`.
- **`gbraid`/`wbraid`** replace `gclid` for some iOS/app clicks — capture and send whichever is
  present (Step 1 already does).

---

## 3. Customer Match — Data Manager API ingest

The Google Ads `OfflineUserDataJob` / `uploadUserData` path is **allowlist-gated** for most developer
tokens (`CUSTOMER_NOT_ALLOWLISTED_FOR_THIS_FEATURE`): `createCrmBasedUserList` succeeds but the
upload 400s, leaving the list 0/0. The reliable path is the **Data Manager API**.

```ts
// google-customer-match.ts — ingest hashed emails into a Customer Match list (Data Manager API)
import crypto from "node:crypto";
import { getAccessToken } from "./google-oauth";

const sha256 = (v: string) => crypto.createHash("sha256").update(v.trim().toLowerCase()).digest("hex");

export async function addEmailsToUserList(userListResource: string, emails: string[]): Promise<{ ok: boolean; attempted: number }> {
  // datamanager scope — falls back to the adwords token (which must then include the datamanager scope)
  const token = await getAccessToken(process.env.GOOGLE_DATAMANAGER_OAUTH_REFRESH_TOKEN ?? process.env.GOOGLE_ADS_OAUTH_REFRESH_TOKEN);
  if (!token || !emails.length) return { ok: false, attempted: 0 };  // see THE gotcha in §1

  let attempted = 0;
  for (let i = 0; i < emails.length; i += 10_000) {                  // 10k members per request
    const chunk = emails.slice(i, i + 10_000);
    const body = {
      destinations: [{ reference: "list", operatingAccount: { product: "GOOGLE_ADS", accountId: process.env.GOOGLE_ADS_CUSTOMER_ID }, productDestinationId: userListResource }],
      audienceMembers: chunk.map(e => ({ userData: { userIdentifiers: [{ emailAddress: sha256(e) }] } })),
      consent: { adUserData: "CONSENT_GRANTED", adPersonalization: "CONSENT_GRANTED" },
      encoding: "HEX",
    };
    const res = await fetch("https://datamanager.googleapis.com/v1/audienceMembers:ingest",
      { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (!res.ok) { console.warn("[customer-match] ingest failed", res.status, await res.text()); return { ok: false, attempted }; }
    attempted += chunk.length;
  }
  return { ok: true, attempted };
}
```

**Gotchas**
- **List size reads 0 via the Google Ads API even when populated** — Customer Match membership counts
  lag and under-report through the read API. Gate any "enable this audience" decision on the **UI
  eligibility** ("not Below threshold"), never on the API count.
- **Consent is required** in the EEA/UK — send `CONSENT_GRANTED` only for first-party opt-ins where
  you actually have consent.
- **Minimum match size** to target: a Customer Match list needs ~1,000+ matched members before Google
  will serve it. Below that it stays "Below threshold".
- **Hash exactly once**, lowercase + trimmed, SHA-256 hex. Double-hashing or hashing already-hashed
  values silently tanks the match rate.

---

## 4. Reporting with GAQL (for verification + the optimize/report phase)

Read delivery + conversion metrics with `searchStream` (same auth as §2, `adwords` scope):

```
POST https://googleads.googleapis.com/v23/customers/{cid}/googleAds:searchStream
{ "query": "SELECT campaign.name, metrics.cost_micros, metrics.conversions, metrics.conversions_value FROM campaign WHERE segments.date DURING LAST_7_DAYS" }
```

**GAQL gotchas**
- On the `conversion_action` resource use **`all_conversions_value`**, NOT `conversions_value`
  (the latter is prohibited there and the query errors).
- **`LAST_3_DAYS` is not a valid range** — use `segments.date BETWEEN 'YYYY-MM-DD' AND 'YYYY-MM-DD'`
  for anything other than the named presets (`LAST_7_DAYS`, `LAST_30_DAYS`, etc.).
- `cost_micros` is micros — divide by 1,000,000 for dollars.

---

## 5. Safety rails (carry into every mutate)

- **`validateOnly: true`** on any mutate request previews validation without writing — always dry-run
  a build before the real call.
- **Reversible over destructive:** `PAUSED` over removed; create-new + pause-old over modify-in-place
  for immutable creative.
- **`partialFailure: true`** on batch uploads so one bad row never drops the whole batch (read the
  `partialFailureError` to see which rows failed).
