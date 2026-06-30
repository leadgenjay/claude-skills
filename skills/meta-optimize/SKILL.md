---
name: meta-optimize
description: >
  Optimize a live Meta (Facebook/Instagram) ad account on a recurring cadence: pull performance,
  classify each entity, then kill losers and scale winners through tiered approval gates - logging
  every change with before/after state so you can revert. Judges winners on your own conversion
  source (Meta Conversions API custom conversion by default; Hyros optional), never raw CTR or the
  browser pixel. Use when the user says "optimize meta ads", "meta optimize", "scale my ads", "cut
  losers", "review ad performance", or "apply ad changes".
---

# meta-optimize — Recurring Meta Ads Optimization (standalone)

Turn a launched account into a system that improves: cut what loses, scale what wins, on a cadence,
with safety gates and a change log. Standalone - ships its own minimal Meta client.

> **Tracking source (read first).** Every scale/kill/budget decision keys off your **configured
> conversion source**:
> - **Default = Meta Conversions API.** Judge entities on the server-side **custom conversion**
>   value (the dedup'd Purchase/Lead from `meta-ads-tracking`). No third-party tool required.
> - **Hyros optional.** Use it as revenue truth only if `HYROS_API_KEY` is set; otherwise read money
>   from the custom conversion. Never make a money decision on raw CTR or the browser pixel - it
>   over-reports.

## Step 0 — Prerequisites

Before any other operation, verify these are present. If any are missing, STOP and tell the user where to get each — do NOT proceed with broken state or placeholder bash.

| Requirement | Check | Where to get it |
|---|---|---|
| `META_ACCESS_TOKEN` (ads_management) | `[ -n "$META_ACCESS_TOKEN" ]` | developers.facebook.com → your app → Marketing API → token with `ads_management` |
| `META_AD_ACCOUNT_ID` | `[ -n "$META_AD_ACCOUNT_ID" ]` | Ads Manager → account dropdown (`act_<digits>`) |
| A live account with spend | the account has active campaigns + conversion data | you must have launched (see `meta-launcher`) |
| Tracking live + verified | your custom conversion is recording in Events Manager | run `meta-ads-tracking` first |

If anything is missing, STOP. Do NOT generate placeholder bash.

Save the vendored read/write client below as `scripts/meta-ads-optimize-client.mjs`.

```js
// scripts/meta-ads-optimize-client.mjs — minimal pull + push
const V = "v21.0", TOKEN = process.env.META_ACCESS_TOKEN;
const ACCT = (process.env.META_AD_ACCOUNT_ID || "").replace(/^act_/, "");
const base = `https://graph.facebook.com/${V}`;
async function call(path, params = {}, method = "GET") {
  const u = new URL(`${base}/${path}`);
  if (method === "GET") Object.entries({ access_token: TOKEN, ...params }).forEach(([k, v]) => u.searchParams.set(k, v));
  const res = await fetch(u, method === "GET" ? undefined
    : { method, body: new URLSearchParams({ access_token: TOKEN, ...params }) });
  const j = await res.json(); if (j.error) throw new Error(`Meta API: ${j.error.message}`); return j;
}
// Pull ad-set insights incl. your custom conversion (pass its action_type, e.g. "offsite_conversion.custom.<id>")
export const adsetInsights = (level = "adset", since, until) =>
  call(`act_${ACCT}/insights`, { level, time_range: JSON.stringify({ since, until }),
    fields: "adset_id,adset_name,campaign_name,spend,impressions,clicks,ctr,frequency,actions,action_values" });
export const setBudget = (adsetId, dailyDollars) => call(adsetId, { daily_budget: Math.round(dailyDollars * 100) }, "POST");
export const pause = (id) => call(id, { status: "PAUSED" }, "POST");
export const activate = (id) => call(id, { status: "ACTIVE" }, "POST");
```

> Read your custom-conversion result + value from each row's `actions` / `action_values` (match the
> `action_type` of your purchase/lead custom conversion). That is the money number every rule uses.

## Step 1 — Load performance

Pull the period (default last 7 days). For each ad set / ad compute: spend, the **custom-conversion
count + value**, CPA (spend / conversions), ROAS (value / spend), frequency, CTR. Detect ABO vs CBO
(if the campaign has a `daily_budget`, it's CBO - move budget at the campaign level, not the ad set).

## Step 2 — Classify each entity

| Class | Rule (uses the custom conversion) |
|---|---|
| **Winner** | ROAS >= your target AND >= ~10 conversions. Candidate to scale. |
| **Watch** | Profitable but thin data (< 10 conversions). Hold; let it gather data. |
| **Loser** | >= 1x your target CPA in spend with **0 conversions**, OR ROAS well below break-even with enough data. Pause candidate. |
| **Fatigued** | Frequency rising + CTR falling + CPA climbing. Refresh creative or pause. |

## Step 3 — Risk tiers (approval gates)

- **Safe (single confirmation):** pause a clear 0-conversion loser; refresh a fatigued creative.
- **Moderate (per-item confirmation):** budget changes within +/-30%; pause a marginal ad set.
- **Aggressive (explicit "yes, scale"):** budget increases > 30%; duplicating a winner into a new ad set. Scale in steps (e.g. +20-30% every 2-3 days), never double overnight - it resets learning.

## Step 4 — Execute

1. Present the action plan grouped by tier with the numbers behind each.
2. Get approval per the gates above.
3. Execute with the client (`pause` / `activate` / `setBudget`), rate-limited (2s between writes).
4. **Change log:** append every change to `optimization-log.md` with timestamp, entity id, before -> after, and the reason (the conversion numbers). This is what makes Step 6 + revert possible.
5. Verify each change took effect (re-read status/budget).

## Step 5 — Safety rules

- Never pause/scale on raw CTR or pixel-only data - use the custom conversion.
- Give a new entity 48-72h before cutting (learning phase).
- One major change per entity per cadence; don't thrash.
- Keep a daily spend ceiling in mind; flag if total active budget jumps.

## Step 6 — Revert + effectiveness review

- **Revert:** the change log lets you restore any prior budget/status.
- **Effectiveness (next run):** compare each prior change's before/after on the custom conversion; grade it (worked / neutral / backfired) and feed that into the next round's recommendations.

## Cadence

Weekly is a sensible default (sooner if spend is high). Pair with `meta-report` for the deep read and
`meta-launcher` to add new tests as winners are found.
