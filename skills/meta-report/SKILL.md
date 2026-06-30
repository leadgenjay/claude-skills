---
name: meta-report
description: >
  Deep Meta (Facebook/Instagram) ads performance report: pull your account's delivery breakdowns
  (placement, device, demographics, creative, destination) and merge them with your real conversion
  data, then surface patterns and prioritized recommendations with exact entity IDs and dollar
  amounts. Conversion-source-first - Meta Conversions API custom conversion by default, with an
  optional Hyros reconciliation section. Standalone; ships its own minimal Meta client. Use when the
  user says "meta report", "ad performance report", "weekly meta report", "meta ads analysis", or
  "how are my ads doing".
---

# meta-report — Deep Meta Ads Performance Report (standalone)

Produce a decision-grade report: what's working, what's wasting money, and the exact changes to make.
Every recommendation carries entity IDs, dollar amounts, and projected impact.

## Step 0 — Prerequisites

Before any other operation, verify these are present. If any are missing, STOP and tell the user where to get each — do NOT proceed with broken state or placeholder bash.

| Requirement | Check | Where to get it |
|---|---|---|
| `META_ACCESS_TOKEN` (ads_read or ads_management) | `[ -n "$META_ACCESS_TOKEN" ]` | developers.facebook.com → your app → Marketing API token |
| `META_AD_ACCOUNT_ID` | `[ -n "$META_AD_ACCOUNT_ID" ]` | Ads Manager → account dropdown (`act_<digits>`) |
| Live spend in the window | the account ran ads in the period you're reporting | you must have launched (see `meta-launcher`) |
| Custom conversion recording | your purchase/lead custom conversion has data | run `meta-ads-tracking` first |

If anything is missing, STOP. Do NOT generate placeholder bash.

## Conversion-Source-First Rule

- **Money truth = your custom conversion** (the server-side, deduplicated Purchase/Lead from
  `meta-ads-tracking`). Read it from Insights `actions` / `action_values` matching your custom
  conversion's `action_type`. This is the default - no third-party tool required.
- **Meta delivery metrics** (impressions, reach, frequency, CTR, quality rankings, video funnel,
  placements) = signal only, never the revenue read.
- **Never** make a money judgment on the raw browser-pixel optimization column - it over-reports.
- **Optional Hyros section:** only if `HYROS_API_KEY` is set, add a Hyros-vs-Meta reconciliation and
  flag any mismatch > 20% with the delta. Without Hyros, skip it - the custom conversion stands alone.

## Step 1 — Pull the data

Save the vendored client as `scripts/meta-ads-report-client.mjs`:

```js
const V = "v21.0", TOKEN = process.env.META_ACCESS_TOKEN;
const ACCT = (process.env.META_AD_ACCOUNT_ID || "").replace(/^act_/, "");
async function insights(params) {
  const u = new URL(`https://graph.facebook.com/${V}/act_${ACCT}/insights`);
  Object.entries({ access_token: TOKEN, ...params }).forEach(([k, v]) => u.searchParams.set(k, v));
  const j = await (await fetch(u)).json(); if (j.error) throw new Error(j.error.message); return j.data;
}
const FIELDS = "campaign_name,adset_name,ad_name,spend,impressions,reach,frequency,clicks,ctr,actions,action_values";
export const byAdset = (since, until) => insights({ level: "adset", time_range: JSON.stringify({ since, until }), fields: FIELDS });
export const byAd = (since, until) => insights({ level: "ad", time_range: JSON.stringify({ since, until }), fields: FIELDS });
export const breakdown = (b, since, until) => insights({ level: "account", time_range: JSON.stringify({ since, until }), breakdowns: b, fields: "spend,actions,action_values" });
// breakdown keys: "publisher_platform,platform_position" (placement), "device_platform", "age,gender", "impression_device"
```

Pull, for the chosen window (default last 7 days vs the prior 7 for WoW): account summary, per-ad-set,
per-ad, and the breakdowns (placement, device, demographics). Compute per entity: spend, custom-conversion
count + value, CPA, ROAS, frequency, CTR.

## Step 2 — Analyze

- **Merge** delivery + conversion per entity.
- **Patterns:** which audiences, creatives, placements, devices, and demos drive the custom conversion
  most efficiently; where frequency is climbing (fatigue); where spend has 0 conversions (waste).
- **Rank creatives** on custom-conversion value per ad, not CTR.

## Step 3 — Output (the report)

1. **Executive summary** - spend, conversions, ROAS, biggest win, biggest leak, WoW delta.
2. **Key metrics table** - account totals this period vs last.
3. **Ad-set performance** - sorted by ROAS; flag winners + losers with IDs.
4. **Creative analysis** - top + bottom creatives by custom-conversion value.
5. **Breakdowns** - placement / device / demographics efficiency.
6. **Destination performance** - which landing pages convert.
7. **Recommendations** - prioritized, each with the entity ID, the change, and projected impact.
8. **Action items** - the exact scale/pause/budget moves (hand to `meta-optimize`).
9. *(Optional)* **Hyros vs Meta** - only if Hyros is configured.
10. **Confidence notes** - where data is thin.

## Step 4 — Handoff

Pass the action items to `meta-optimize` for execution (it applies them with approval gates), and note
fatiguing creatives for a refresh via your creative skill.

## Benchmarks (rules of thumb - tune to your offer)

- Frequency > ~2.5-3 on prospecting = fatigue risk.
- An ad set at >= 1x your target CPA in spend with 0 conversions = pause candidate.
- ROAS target is your offer's break-even x your margin goal - set it per account, don't hardcode.
