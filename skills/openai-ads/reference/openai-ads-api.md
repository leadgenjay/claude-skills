# OpenAI Ads (ChatGPT Ads) — Platform + API Reference & Rules

**Maintained for future use.** Last verified: **2026-06-16** against the live API
(`api.ads.openai.com/v1`) + OpenAI docs + B2B practitioner playbooks. The platform is in **beta and
specs change weekly** — re-verify constraints marked ⚠️ before a real build.

> TL;DR: Ads run **inside ChatGPT conversations**. Targeting is **not keywords** — it's **"context
> hints"** (plain-language descriptions of the conversations where your ad fits). The **API**
> (`api.ads.openai.com/v1`, Bearer auth) does full CRUD on campaigns→ad groups→ads→files→insights, but
> the **beta API is currently CPM/impression-billed + lifetime-budget only** (the **web UI** additionally
> offers **Clicks/CPC + daily budget**). Avoid manipulative urgency/overblown claims — this audience is
> mid-research and OpenAI reviews for it.

---

## 1. Account facts (your account)

| Field | Value |
|---|---|
| Ad account ID | `<YOUR_ADACCT_ID>` |
| Account name | your account · currency + timezone set at creation · review must be **approved** before ads serve |
| UI | `https://ads.openai.com/manage/campaigns?act=<YOUR_ADACCT_ID>` |
| API base | `https://api.ads.openai.com/v1` |
| **API key** | service-account key (`sk-svcacct-…`) stored in **your** key file (`OPENAI_ADS_API_KEY` in `.env.local`, or a path you point the CLI at) — **secret**. Issue/rotate in Ads Manager → Settings. Each key is scoped to **one** ad account. |

**Secret handling:** never print, log, or commit the key. In shell use it inline and redact:
`-H "Authorization: Bearer $OPENAI_ADS_API_KEY"` and pipe output through
`sed -E 's/(sk-svcacct-)[A-Za-z0-9_-]+/\1<REDACTED>/g'`. For tooling, put it in `.env` as
`OPENAI_ADS_API_KEY` (`.env` is gitignored; `.env.example` only documents the name).

---

## 2. How the channel works (vs. Meta/Google)

- **Placement:** sponsored "chat cards" shown inside ChatGPT, matched to the live conversation.
- **Targeting = context hints (NO keywords).** Free-form strings describing the *buyer's situation /
  conversation*, written from the user's POV. Auto-signals also used: current conversation topic, the
  user's chat history, and prior ad interactions. Geo on top.
- **Objective / billing:** **Views (CPM)** or **Clicks (CPC)** in the UI. ⚠️ **API beta = `impression`
  (CPM) only** right now.
- **Budget:** daily or lifetime in the UI (type locked at creation). ⚠️ **API = lifetime only**
  (`lifetime_spend_limit_micros`).
- **Geo:** country in the main flow; US expandable to **state / DMA / ZIP**. Look up IDs via
  `/geo_lookup/search`.
- **Tracking:** UTM params on the landing URL are supported; in-platform conversion events + insights
  reporting. **No pixel/CRM closed-loop yet** (roadmapped late 2026). **No dynamic macros** (can't pass
  Meta-style `{{ad.id}}`/`fbc_id`).
- **Funnel fit:** awareness/consideration sweet spot; pre-qualified, research-mode users.

---

## 3. API reference (verified)

**Auth:** `Authorization: Bearer $OPENAI_ADS_API_KEY` · `Content-Type: application/json`
**Rate limits:** 600 req/min per endpoint, 1,200 req/min overall (per ad-account *and* per IP).
**Micros:** all money is micros → **USD × 1,000,000** (e.g. $60 = `60000000`; $0.06 = `60000`).

### Object model & endpoints
Ad Account → Campaigns → Ad Groups → Ads → (Files = creative assets, Insights = reporting).

| Resource | Endpoints |
|---|---|
| Ad account | `GET /ad_account` (verify key, returns id/name/currency/timezone/review) |
| Campaigns | `GET/POST /campaigns` · `GET/POST /campaigns/{id}` · `POST /campaigns/{id}/activate\|pause\|archive` |
| Ad groups | `GET/POST /ad_groups` · `GET/POST /ad_groups/{id}` · `POST /ad_groups/{id}/activate\|pause\|archive` |
| Ads | `GET/POST /ads` · `GET/POST /ads/{id}` · `POST /ads/{id}/activate\|pause\|archive` (archive irreversible) |
| Files | `POST /upload` (JSON `{image_url}` **or** multipart `file`) → `{ "file_id": "file_…" }` |
| Geo | `GET /geo_lookup/search?q=<text>` (param is **`q`**) |
| Insights | read-only reporting |

### Campaign schema (`POST /campaigns`)
| Field | Req | Notes |
|---|---|---|
| `name` | ✓ | 3–1000 chars |
| `status` | ✓ | `active` \| `paused` \| `archived` — **create as `paused`** until reviewed |
| `description` | — | optional |
| `budget.lifetime_spend_limit_micros` | ✓ | min `1000000` ($1). ⚠️ lifetime only via API |
| `targeting.locations.include` | — | array of `{ "id": "<geo_id>" }`; **US country = `1000232`** |
| `start_time` / `end_time` | — | unix seconds |

### Ad group schema (`POST /ad_groups`)
| Field | Req | Notes |
|---|---|---|
| `campaign_id` | ✓ | parent |
| `name` | ✓ | 3–1000 |
| `status` | ✓ | `active`\|`paused`\|`archived` |
| `context_hints` | ✓ | `string[]`, free-form buyer-situation descriptions (the targeting) |
| `bidding_config.billing_event_type` | ✓ | ⚠️ `impression` only (CPM) in beta |
| `bidding_config.max_bid_micros` | ✓ | 1–100,000,000. CPM default ≈ **$60 → `60000`** (per-impression micros) |

### Ad / creative schema (`POST /ads`)
| Field | Req | Notes |
|---|---|---|
| `ad_group_id` | ✓ | parent |
| `name` | ✓ | 3–1000 (internal label) |
| `status` | ✓ | `active`\|`paused`\|`archived` |
| `creative.type` | ✓ | `chat_card` (only type) |
| `creative.title` | ✓ | **3–50 chars** |
| `creative.body` | ✓ | **≤100 chars** |
| `creative.target_url` | ✓ | UTM/query params supported |
| `creative.file_id` | ✓ | from `POST /upload` |
| `review_status` | — | response: `in_review`\|`approved`\|`rejected` |

**No `cta`/call-to-action field. ⚠️ Image format/dimension/size limits are undocumented** — use a clean
PNG (start 1080×1080) and verify on upload.

---

## 4. Rules / do's & don'ts (recommended)

1. **Create everything `paused`; activate only after review.**
2. **Context hints are the #1 lever** — describe the buyer's *conversation/problem* from their POV, not
   the product/category. One ad group = one angle; **never mix awareness + conversion** in one group.
3. **No manipulative urgency / overblown claims** (policy + audience). Drop "LIMITED TIME." Keep
   *substantiated* proof (real "30 leads in 30 days" guarantee, 10K leads, real dashboards).
4. **Respect creative limits:** title ≤50, body ≤100, no CTA button. Tighten copy to fit.
5. **Brand voice + plain language** apply (use your own voice rules). Plain, human, problem-first.
6. **Tracking:** static UTMs (no macros). Taxonomy: `utm_source=chatgpt`,
   `utm_medium=cpm|cpc`, `utm_campaign=<slug>`, `utm_term=<angle>`, `utm_content=<adgroup>-<arm>`.
   Your attribution tool attributes via your landing page + UTMs (add a source rule for `utm_source=chatgpt`;
   you **cannot** pass a click-id like Meta's `fbc_id`). Add a "How did you hear about us?" capture.
7. **Money truth = your attribution tool + checkout**, not platform metrics. Judge front-end CPA + backend LTV.
8. **Treat as a learning budget:** 60–90 day window, bi-weekly reviews, don't kill ad groups early.
   In-platform: CTR <0.3% ⇒ rewrite hints first, then creative, then bids.
9. **Cold-email is a policy-sensitive category** — keep framing legitimate/CAN-SPAM-safe; no
   spam-enabling claims.

---

## 5. curl recipes

```bash
KEY="$OPENAI_ADS_API_KEY"; BASE="https://api.ads.openai.com/v1"
H=(-H "Authorization: Bearer $KEY" -H "Content-Type: application/json")
red(){ sed -E 's/(sk-svcacct-)[A-Za-z0-9_-]+/\1<REDACTED>/g'; }   # always pipe output through red

# verify key (read-only)
curl -sS "${H[@]}" "$BASE/ad_account" | red
# find a geo id
curl -sS "${H[@]}" "$BASE/geo_lookup/search?q=United%20States" | red

# 1) campaign (PAUSED, lifetime budget). $3000 lifetime = 3000000000 micros
curl -sS "${H[@]}" -X POST "$BASE/campaigns" -d '{
  "name":"LGJ 97 Cold Email Setup","status":"paused",
  "budget":{"lifetime_spend_limit_micros":3000000000},
  "targeting":{"locations":{"include":[{"id":"1000232"}]}}}' | red

# 2) ad group (PAUSED, CPM $60 max bid = 60000 micros)
curl -sS "${H[@]}" -X POST "$BASE/ad_groups" -d '{
  "campaign_id":"<CMPN_ID>","name":"AG1 Deliverability","status":"paused",
  "context_hints":["Someone whose cold emails keep landing in spam and wants them in the inbox",
                   "A founder asking how to warm up a new email domain before outreach"],
  "bidding_config":{"billing_event_type":"impression","max_bid_micros":60000}}' | red

# 3) upload image by URL → file_id  (use an R2 public URL, e.g. <your-public-image-host>/...)
curl -sS "${H[@]}" -X POST "$BASE/upload" -d '{"image_url":"https://<your-public-image-host>/<img>.png"}' | red

# 4) ad (PAUSED)
curl -sS "${H[@]}" -X POST "$BASE/ads" -d '{
  "ad_group_id":"<ADGRP_ID>","name":"AG1 native A","status":"paused",
  "creative":{"type":"chat_card","title":"Cold emails landing in spam?",
    "body":"We set up domains, warmup & SPF/DKIM/DMARC so your cold email hits the inbox. $97.",
    "target_url":"https://<your-site>/<offer>?utm_source=chatgpt&utm_medium=cpm&utm_campaign=lgj-97-cold-email&utm_term=deliverability&utm_content=ag1-native",
    "file_id":"<FILE_ID>"}}' | red

# activate later (per object): POST /campaigns/{id}/activate , /ad_groups/{id}/activate , /ads/{id}/activate
```

---

## 6. $97 Cold Email Setup — worked example *(Lead Gen Jay)*

**Offer:** Done-For-You Cold Email, **$97** — full setup · 10K verified leads · copywriting · A/B testing
· AI reply agent · **guaranteed 30 leads in 30 days**. **Destination (sales page):**
`https://<your-site>/<offer>` (`/97` redirects here; checkout = `/cold-email-checkout`).
Framing = **direct offer, ChatGPT-native** (problem-led, soft, no urgency). 3 ad groups, **A/B native vs
the approved direct-response images** (your top-performing static creatives — strip any "LIMITED TIME"
overlay first). All copy below already fits title ≤50 / body ≤100.

**AG1 — Deliverability / spam pain** · hints: "cold emails keep landing in spam, wants the inbox" ·
"how to warm up a new email domain before outreach" · "troubleshooting low open rates / deliverability"
· "how to set up SPF, DKIM, DMARC for cold email"
- `Cold emails landing in spam?` / `We set up domains, warmup & SPF/DKIM/DMARC so your cold email hits the inbox. $97.`
- `Fix your cold email deliverability` / `Done-for-you inbox setup + 14-day warmup. 30 leads in 30 days, guaranteed. $97.`

**AG2 — Setup / infrastructure** · hints: "how to set up cold email outreach from scratch" · "what
domains/inboxes do I need to start cold emailing" · "do it myself vs pay to have cold email set up" ·
"cheapest reliable cold email infrastructure setup"
- `Cold email setup, done for you` / `Domains, inboxes, warmup, copy & 10K verified leads — all set up for you. $97.`
- `Skip the cold email setup headache` / `We build your whole cold email system in days. You just hit send. $97.`

**AG3 — Get clients / outcome** · hints: "how to get B2B clients with cold email" · "how to book more
sales meetings through outbound" · "how to generate B2B leads predictably" · "does cold email still work
in 2026 to land clients"
- `Get B2B clients with cold email` / `Done-for-you cold email + 10K leads. 30 leads in 30 days, guaranteed. $97.`
- `Turn cold email into booked calls` / `The outbound system agencies use to book meetings — set up for you. $97.`

**Budget/bid:** UI → Clicks/CPC, Daily $100. API → lifetime (e.g. $3000 = 30 days × $100) + CPM
`max_bid_micros` 60000 ($60). UTM `utm_term` per group: `deliverability` / `setup` / `outcome`;
`utm_content` = `agN-native` | `agN-dr`.

---

## 7. Build approaches

| | Web UI (`ads.openai.com`) | API (`api.ads.openai.com/v1`) |
|---|---|---|
| Billing | **Clicks/CPC** or Views/CPM | ⚠️ **CPM/impression only** (beta) |
| Budget | **Daily** or lifetime | ⚠️ **Lifetime only** |
| Build | manual clicks | scripted, repeatable, version-controlled, paused |
| Reporting | dashboard | Insights API (automatable) |

**Guidance:** for a click-to-sale test, CPC+daily (UI) is the better economics today; use the API now for
**read-only verification + reporting** and for **future automation** once CPC/daily land in the API.
A reusable CLI would fit the repo's `cli/{tiktok,reddit,linkedin}-ads/` pattern (`cli/openai-ads/`).

## 8. Open items / re-verify (⚠️ specs move weekly)
- Image format/dimension/size limits (undocumented — verify on upload).
- Whether/when the API gains **CPC billing** + **daily budget** + an explicit **objective** field.
- Exact `context_hints` count/length caps.
- Hyros source rule for `utm_source=chatgpt`.

## Sources
OpenAI Developers — Ads API quickstart / overview / reference (campaigns, ad_groups, ads, files);
help.openai.com Ads Manager Beta; Search Engine Land (budgeting+geo); Just Global B2B playbook;
aitarget / ai.cc walkthroughs; live API calls, 2026-06.
