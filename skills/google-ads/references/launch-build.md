# Launch & Build — field rules + Google Ads API mutate recipes

How to build Search/RSA and Performance Max campaigns against the Google Ads API (v23) BYO. Auth +
headers + the OAuth flow are in `google-ads-tracking/references/developer-api.md`. **Everything is
created PAUSED, previewed with `validateOnly: true` first, and launched only on explicit approval.**

> All mutate endpoints are `POST https://googleads.googleapis.com/v23/customers/{cid}/<resource>:mutate`
> with headers `Authorization: Bearer <token>`, `developer-token: <token>`, and `login-customer-id`
> (digits) when the account sits under a manager. Multi-resource atomic builds use the combined
> `…/googleAds:mutate` with `mutateOperations[]` + **temporary resource names** (negative ids like
> `customers/{cid}/campaignBudgets/-1`, referenced by later ops in the same request).

---

## Pre-launch checklist (every build, before `validateOnly:false`)

- [ ] **Offer + destination URL confirmed** (reachable 200, the right page).
- [ ] **Tracking suffix on the final URL:** `?utm_source=google&utm_medium=cpc&utm_campaign={OFFER}&utm_content={creative}` (add the Hyros `h_*` params only if the user runs Hyros).
- [ ] **Conversion action attached** — the campaign optimizes toward the Phase-1 **Primary** action.
- [ ] **Budget + bid coherent** — daily budget large enough for the bid strategy to exit learning (a tight Target CPA on a tiny budget self-throttles; start cold accounts on Maximize Conversions).
- [ ] **Geo set** — target the offer's countries, **PRESENCE-only**, never "All countries" on a serving campaign.
- [ ] **Search:** 3-15 RSA headlines (≤30 chars, unique), 2-4 descriptions (≤90, unique), 5+ keywords (mix EXACT + PHRASE), 5+ negative keywords.
- [ ] **PMax:** 3-10 headlines, 1 long headline (≤90), 2-5 descriptions, 3+ images (operator-supplied), business name, exactly **one** audience signal per asset group, buyer exclusion, final-URL expansion **OFF** for a single-offer funnel.
- [ ] **Copy clean** — specific number + concrete outcome + proof; no vague lines; no banned AI words (delve, leverage, seamless, unlock, robust, elevate...).

---

## Search / RSA — atomic build (combined mutate)

```jsonc
// POST .../googleAds:mutate   { "validateOnly": true, "mutateOperations": [ ... ] }
[
  { "campaignBudgetOperation": { "create": {
      "resourceName": "customers/{cid}/campaignBudgets/-1",
      "name": "{offer} budget", "amountMicros": "50000000",            // $50/day in micros
      "deliveryMethod": "STANDARD", "explicitlyShared": false } } },

  { "campaignOperation": { "create": {
      "resourceName": "customers/{cid}/campaigns/-2",
      "name": "{offer} - Search", "status": "PAUSED",                   // build PAUSED
      "advertisingChannelType": "SEARCH",
      "campaignBudget": "customers/{cid}/campaignBudgets/-1",
      "maximizeConversions": {},                                        // cold-start default; add target_cpa later
      "networkSettings": { "targetGoogleSearch": true, "targetSearchNetwork": true, "targetContentNetwork": false } } } },

  { "adGroupOperation": { "create": {
      "resourceName": "customers/{cid}/adGroups/-3",
      "name": "{angle}", "status": "PAUSED",
      "campaign": "customers/{cid}/campaigns/-2", "type": "SEARCH_STANDARD" } } },

  { "adGroupCriterionOperation": { "create": {
      "adGroup": "customers/{cid}/adGroups/-3", "status": "ENABLED",
      "keyword": { "text": "cold email setup", "matchType": "PHRASE" } } } },

  { "adGroupAdOperation": { "create": {
      "adGroup": "customers/{cid}/adGroups/-3", "status": "PAUSED",
      "ad": {
        "finalUrls": ["https://example.com/offer?utm_source=google&utm_medium=cpc&utm_campaign={OFFER}"],
        "responsiveSearchAd": {
          "headlines": [ {"text":"$97 Lead System"}, {"text":"Book Qualified Calls Fast"}, {"text":"100+ Trustpilot Reviews"} ],
          "descriptions": [ {"text":"Done-for-you setup. 10,000 verified leads included."}, {"text":"Jay handles it personally."} ] } } } } }
]
```

- **Negative keywords:** add via `campaignCriterion` (campaign-level) or `adGroupCriterion` with `negative:true`.
- **Geo:** `campaignCriterion` with `location.geoTargetConstant` (campaign-level for Search/PMax). Set `geoTargetType.positiveGeoTargetType = PRESENCE`.

---

## Performance Max — build order

PMax can't be built in one combined op the way Search can; create in sequence (each PAUSED /
validateOnly first):

1. **Budget** → `campaignBudgets:mutate`.
2. **Campaign** → `campaigns:mutate` with `advertisingChannelType: "PERFORMANCE_MAX"`,
   `maximizeConversionValue: {}` (or `{ targetRoas }`), `status: "PAUSED"`,
   `urlExpansionOptOut: true` (final-URL expansion OFF for a single-offer funnel).
3. **Text + image assets** → `assets:mutate` (`textAsset` for copy; images are operator-supplied —
   upload via `imageAsset.data` base64 or reuse existing asset resource names).
4. **Asset group** → `assetGroups:mutate` (`campaign`, `finalUrls`, `status: "PAUSED"`).
5. **Link assets** → `assetGroupAssets:mutate` (one op per asset, with `fieldType`: `HEADLINE`,
   `LONG_HEADLINE`, `DESCRIPTION`, `BUSINESS_NAME`, `MARKETING_IMAGE`, `SQUARE_MARKETING_IMAGE`,
   `LOGO`). Mind the minimums (3+ headlines, 1 long headline, 2+ descriptions, 1+ marketing image,
   logo) or activation is blocked.
6. **Audience signal** → `assetGroupSignals:mutate` — **exactly one audience per asset group**
   (`ONE_AUDIENCE_ALLOWED_PER_ASSET_GROUP`); to change it later, remove-then-add. Compose multiple
   lists into one `Audience` (OR of user lists) if you need several.
7. **Buyer exclusion** → `campaignCriterion` with a `userList` and `negative: true` (keeps PMax
   prospecting-only; stops it poaching retargeting).

---

## v23 gotchas (these will bite)

- **Switching to an empty-message bid strategy needs a LEAF field mask.** Updating to
  `MAXIMIZE_CONVERSIONS` / `MAXIMIZE_CONVERSION_VALUE` with the parent mask (`maximize_conversions`)
  fails `FIELD_HAS_SUBFIELDS`. Mask the **leaf** instead (`maximize_conversions.target_cpa_micros` /
  `maximize_conversion_value.target_roas`) with an empty body — writing the leaf still flips the
  `bidding_strategy` oneof; omit the target for no CPA/ROAS ceiling. (`TARGET_CPA` / `TARGET_ROAS`
  already use leaf masks.)
- **PMax asset slots are hard-capped** (20 enabled images/group, with a FLOOR of ≥1 marketing image).
  Swapping a full group must be **interleaved/add-first** (remove N-1 → add N-1 → remove last → add
  last): plain remove-then-add deadlocks on `NOT_ENOUGH_MARKETING_IMAGE_ASSET`; add-then-remove busts
  the 20 cap.
- **What can be edited in place:** campaign/ad-group/ad status, budget, bid adjustments, negative
  keywords, and URL fields (`final_urls`, `final_url_suffix`, `tracking_url_template`) — updating URLs
  in place keeps the ad ID stable (preserves learning + attribution continuity). **Creative content is
  immutable** — to change a headline, create a new ad and pause the old.
- **Demand Gen / Responsive Display multi-asset ads:** individual assets can't be removed after
  creation — fix by creating a new ad without the bad asset, then pausing the old.
- **Always `validateOnly: true` first**, `partialFailure: true` on batches, and re-verify in the UI
  for policy disapprovals after creation.
