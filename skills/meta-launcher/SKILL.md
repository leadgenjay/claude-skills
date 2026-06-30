---
name: meta-launcher
description: >
  Launch Meta (Facebook/Instagram) ad campaigns with structured A/B testing, copy generation,
  UTM tracking, audience targeting, and safety gates. Creates campaigns, ad sets, creatives, and
  ads via the Meta Marketing API using your own ad account - always PAUSED until you explicitly
  approve, with a mandatory pre-flight checklist. Ad sets optimize toward your own custom
  conversion (Meta Conversions API by default); no Hyros required. Use when the user says
  "launch ads", "create campaign", "new campaign", "launch meta ads", "test campaign", "launch
  creative", "set up ads", "new ad test", or "meta launcher".
---

# meta-launcher — Campaign Creation & A/B Testing (standalone)

Launch new Meta ad campaigns with proper targeting, UTM tracking, an A/B test structure, and copy.
**Every entity is created PAUSED until you explicitly approve the plan and the daily spend.**

> **Tracking source.** Ad sets optimize toward **your** custom conversion. Default = the server-side
> Meta **Conversions API** custom conversion you set up in `meta-ads-tracking` (no third-party tool
> required). Judge winners on that conversion, never raw CTR or the browser pixel. If you also run
> Hyros, you may use it as the revenue truth in reporting, but Meta still optimizes toward the
> custom conversion.

> **Creative rule.** Keep Meta's Advantage+ **"Standard Enhancements"** OFF (the client below opts
> out by default). Auto image/video transforms garble text and drift off-brand.

## Step 0 — Prerequisites

Before any other operation, verify these are present. If any are missing, STOP and tell the user where to get each — do NOT proceed with broken state or placeholder bash.

| Requirement | Check | Where to get it |
|---|---|---|
| `META_ACCESS_TOKEN` (ads_management) | `[ -n "$META_ACCESS_TOKEN" ]` | developers.facebook.com → your app → Marketing API → token with `ads_management` |
| `META_AD_ACCOUNT_ID` | `[ -n "$META_AD_ACCOUNT_ID" ]` | Ads Manager → account dropdown (`act_<digits>`) |
| `META_PAGE_ID` | `[ -n "$META_PAGE_ID" ]` | your Facebook Page → About → Page transparency |
| `META_PIXEL_ID` | `[ -n "$META_PIXEL_ID" ]` | Events Manager (run the `meta-ads-tracking` skill first) |
| Tracking live + verified | a deduped test conversion shows in Events Manager Test Events | run `meta-ads-tracking` first |
| Approved creative + copy | files exist on disk; copy reviewed by the user | from the user or a creative/copywriter skill |

If anything is missing, STOP. Do NOT generate placeholder bash.

## The vendored Meta client (drop in once)

This skill is standalone - it ships its own minimal Meta Marketing API client. Save as
`scripts/meta-ads-client.mjs` in your project. It reads your env vars and converts dollar budgets to
cents.

```js
// scripts/meta-ads-client.mjs — minimal standalone Meta Marketing API client
const V = "v21.0";
const TOKEN = process.env.META_ACCESS_TOKEN;
const ACCT = (process.env.META_AD_ACCOUNT_ID || "").replace(/^act_/, "");
const base = `https://graph.facebook.com/${V}`;

async function call(path, params = {}, method = "POST") {
  const url = new URL(`${base}/${path}`);
  const body = new URLSearchParams({ access_token: TOKEN, ...params });
  const res = await fetch(url, method === "GET"
    ? undefined
    : { method, headers: { "Content-Type": "application/x-www-form-urlencoded" }, body });
  const json = await res.json();
  if (json.error) throw new Error(`Meta API: ${json.error.message}`);
  return json;
}

export const createCampaign = (p) => call(`act_${ACCT}/campaigns`, {
  name: p.name, objective: p.objective, status: "PAUSED",
  special_ad_categories: JSON.stringify(p.special_ad_categories ?? []),
  ...(p.daily_budget ? { daily_budget: Math.round(p.daily_budget * 100) } : {}),
});
export const createAdSet = (p) => call(`act_${ACCT}/adsets`, {
  campaign_id: p.campaign_id, name: p.name, status: "PAUSED",
  billing_event: "IMPRESSIONS", optimization_goal: p.optimization_goal ?? "OFFSITE_CONVERSIONS",
  ...(p.daily_budget ? { daily_budget: Math.round(p.daily_budget * 100) } : {}),
  targeting: JSON.stringify(p.targeting),
  promoted_object: JSON.stringify(p.promoted_object), // { pixel_id, custom_event_type } or { pixel_id, custom_conversion_id }
});
export const uploadAdImage = (p) => call(`act_${ACCT}/adimages`, { filename: p.filename, bytes: p.base64 });
export const createAdCreative = (p) => call(`act_${ACCT}/adcreatives`, {
  name: p.name, object_story_spec: JSON.stringify(p.object_story_spec),
  url_tags: p.url_tags,
  degrees_of_freedom_spec: JSON.stringify({ creative_features_spec: { standard_enhancements: { enroll_status: "OPT_OUT" } } }),
});
export const createAd = (p) => call(`act_${ACCT}/ads`, {
  adset_id: p.adset_id, name: p.name, creative: JSON.stringify({ creative_id: p.creative_id }), status: "PAUSED",
});
export const enable = (id) => call(id, { status: "ACTIVE" });
export const searchInterests = (q) => call("search", { type: "adinterest", q }, "GET");
export const getCustomAudiences = () => call(`act_${ACCT}/customaudiences`, { fields: "id,name,subtype,approximate_count" }, "GET");
```

## Campaign Brief (gather from the user)

1. **Offer** — what's advertised (course, consult, lead magnet, product).
2. **Objective** — `OUTCOME_LEADS`, `OUTCOME_SALES`, or `OUTCOME_TRAFFIC`.
3. **Destination URL** — the landing page (must return 200; UTMs appended automatically).
4. **Creative assets** — paths to approved images/videos.
5. **Budget** — default $15-20/day per ad set (ABO).
6. **Duration** — test window (default 7 days).
7. **Audiences** — interests, lookalikes, retargeting, or broad (see Audiences below).
8. **Optimization event** — the custom conversion to optimize toward (your `meta-ads-tracking` purchase/lead).

## Test Structure Selection

Ask which structure to use:

| Structure | When |
|---|---|
| **Audience Test** | 1 campaign, 3 ad sets (different audiences), same creative. Which audience converts. |
| **Creative Test** | 1 campaign, 1 ad set, 3-5 ads (different creatives). Which visual wins. |
| **Copy Test** | 1 campaign, 1 ad set, 3 ads (same image, different copy). Which message wins. |
| **Full Launch** | 1 campaign, 3 ad sets x 3 ads. Audience AND creative at once. |
| **Advantage+ (Sales/Audience)** | Meta's consolidated AI campaign. Test it against your manual structure; don't make it the default until it beats your baseline on the custom conversion. |

**Naming:** `Campaign: [Date] [Offer] - [Test Type]` / `Ad Set: [Audience] - $[Budget]/day` / `Ad: [Creative] - [Copy Variant]`.

## UTM Tracking

Append to every creative via `url_tags`:
```
utm_source=meta&utm_medium=paid&utm_campaign={{campaign.name}}&utm_term={{adset.name}}&utm_content={{ad.name}}
```
All lowercase, hyphens for spaces, Meta dynamic macros for auto-population. Verify the destination is reachable before launch.

## Audiences

- **Cold / prospecting:** 1% lookalikes seeded on your best customers (purchasers > bookers > opt-ins), plus interest or broad as a control. Build lookalikes from a seed custom audience of sufficient size.
- **Warm / retargeting:** website visitors, video viewers, page/IG engagers, CRM-list custom audiences - split by recency (favor 0-30d) and engagement tier; weight ABO budgets toward recent + engaged.
- **Always exclude existing buyers** from cold prospecting.

Use `getCustomAudiences()` to list what exists and `searchInterests(q)` to find interest targeting.

## Execution Workflow

1. **Create campaign (PAUSED)** — `createCampaign({ name, objective })`. Add `daily_budget` only for CBO.
2. **Create ad sets (PAUSED)** — `createAdSet({ campaign_id, name, daily_budget, optimization_goal: "OFFSITE_CONVERSIONS", targeting, promoted_object: { pixel_id: META_PIXEL_ID, custom_event_type: "PURCHASE" } })`. Point `promoted_object` at your custom conversion.
3. **Upload creative** — `uploadAdImage({ filename, base64 })` → returns a hash. (Video: upload via Ads Manager.)
4. **Create ad creative** — `createAdCreative({ object_story_spec: { page_id: META_PAGE_ID, link_data: { message, link, name, description, image_hash, call_to_action } }, url_tags })`.
5. **Create ads (PAUSED)** — `createAd({ adset_id, name, creative_id })` for each ad set x creative.
6. **Pre-flight checklist — every item must pass:**
   - [ ] All entities PAUSED
   - [ ] Destination URL returns 200
   - [ ] UTM params verified
   - [ ] Creative specs correct (dimensions, format)
   - [ ] Copy within limits (headline 40, primary 125, description 30 chars)
   - [ ] Budget math confirmed ($X/day x Y ad sets = $Z/day)
   - [ ] Targeting size reasonable
   - [ ] Optimization event = your live custom conversion (tracking verified)
7. **Launch (explicit approval only)** — present the full plan + **total daily spend**; warn if > $100/day. Only on an explicit "launch" do you `enable()` the campaign, then ad sets, then ads (2s between calls).

## Safety Rules

1. Always create PAUSED.
2. Pre-flight checklist is mandatory.
3. Warn if total daily spend > $100.
4. Never launch without the user approving the copy.
5. Rate-limit: 2s between creation calls, 5s between enables.
6. Log every created entity id (save a test-plan JSON).
7. One test variable at a time (unless Full Launch).

## Post-Launch

Remind the user to review performance in 48-72h (`meta-report`), then optimize on a cadence
(`meta-optimize`). Document winners/losers when each test concludes. Judge winners on the custom
conversion, never CTR.
