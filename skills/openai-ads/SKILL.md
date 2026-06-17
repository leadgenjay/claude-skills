---
name: openai-ads
description: >
  Plan, build, verify, and manage advertising campaigns on the OpenAI Ads Manager (ads served
  INSIDE ChatGPT) — via the REST API (api.ads.openai.com/v1) and/or the web UI (ads.openai.com).
  Covers the platform model (context hints, NOT keywords), the full API surface
  (campaigns → ad groups → ads → file upload → geo → insights), the UI-vs-API differences
  (UI = Clicks/CPC + daily budget; beta API = CPM/impression + lifetime only), char limits,
  creative + context-hint best practices (1 focused hint per ad group beats 3–5; no manipulative
  urgency), and UTM tracking. Ships a safe, key-redacting CLI and a worked $97 example. Always
  builds PAUSED for review. Use when the user says "openai ads", "chatgpt ads", "ads.openai.com",
  "openai ads manager", "context hints", "build an openai/chatgpt campaign", "openai ad group",
  "openai ads api", or references their OpenAI/ChatGPT ad account.
---

# openai-ads — OpenAI Ads Manager (ChatGPT ads)

Ads served inside ChatGPT conversations. Beta, **specs change weekly** — re-verify anything marked ⚠️.
Deep API dump: [`reference/openai-ads-api.md`](reference/openai-ads-api.md). CLI: [`cli/README.md`](cli/README.md).

**To measure what these campaigns drive** (pixel + conversion events + server-side Conversions API),
install the companion **`openai-ads-setup`** skill — it wires `lead_created` / `checkout_started` /
`order_created` so you can optimize toward real conversions, not just clicks.

## Step 0 — Prerequisites

Before any build or API call, verify these. If any are missing, STOP and tell the user where to get
each — do NOT generate placeholder commands against a broken setup.

| Requirement | Check | Where to get it |
|---|---|---|
| OpenAI Ads account, review **approved** | log in to `ads.openai.com`; account status = approved | Apply at `ads.openai.com` (beta) |
| **Your** ad account ID (`adacct_…`) | it's in the Ads Manager URL: `?act=adacct_…` | Ads Manager URL |
| Service-account **API key** | `GET /ad_account` → 200 (`npx tsx cli/index.ts verify`) | Ads Manager → Settings → API keys. Scoped to ONE ad account. Store in `.env`/`.env.local` as `OPENAI_ADS_API_KEY` (gitignored) — **never commit it** |
| CLI runtime (only if using the bundled CLI) | `node -v`; `npm ls commander tsx` | `npm i commander tsx` (or `npm i -g`) |
| *(recommended)* `openai-ads-setup` skill | conversion pixel + CAPI installed | Install it to measure conversions, not just clicks |

If anything is missing, STOP. Do NOT proceed with a placeholder account ID or key.

## Your account + key

- **Ad account:** your `adacct_…` (currency/timezone/review set in Ads Manager).
- **API base:** `https://api.ads.openai.com/v1` · Bearer auth.
- **Key (secret):** a service-account key (`sk-svcacct-…`). Put it in `.env`/`.env.local` as
  `OPENAI_ADS_API_KEY` (the bundled CLI auto-loads it by walking up for `.env.local`, or reads a key
  file you point it at). **Never print/commit it**; always redact `sk-svcacct-…` in any output.
- **UI:** `https://ads.openai.com/manage/campaigns?act=<YOUR_ADACCT_ID>`

## Platform model (vs Meta/Google)
- **Targeting = "context hints" — NOT keywords.** A free-text description of the *conversation/situation*
  the buyer is in, from their POV (e.g. "Someone whose cold emails keep landing in spam"). OpenAI also
  uses auto-signals: live conversation topic, the user's chat history, prior ad interactions. Geo on top.
- Ads render as **`chat_card`** units: **title + body are native ChatGPT text**; the **image is a
  separate small in-chat visual** (must read at ~200px). Advertiser name + logo come from the account.
- **Funnel fit:** awareness/consideration — users are mid-research and pre-qualified.

## API essentials
Auth `Authorization: Bearer $OPENAI_ADS_API_KEY` · `Content-Type: application/json` · money in **micros**
(USD×1e6) · rate 600/min per endpoint, 1200/min overall.

| Resource | Endpoints |
|---|---|
| Account | `GET /ad_account` (verify key) |
| Campaigns | `GET/POST /campaigns` · `GET/POST /campaigns/{id}` · `POST /campaigns/{id}/activate\|pause\|archive` |
| Ad groups | `GET/POST /ad_groups` (filter `?campaign_id=`) · `GET/POST /ad_groups/{id}` · `/{id}/activate\|pause\|archive` |
| Ads | `GET /ads?ad_group_id=` · `POST /ads` · `GET/POST /ads/{id}` · `/{id}/activate\|pause\|archive` |
| Files | `POST /upload` — multipart `file=@img` **or** JSON `{image_url}` → `{file_id}` |
| Geo | `GET /geo_lookup/search?q=<text>` (param is `q`). **US country = `1000232`** |

**Key field rules (⚠️ beta):**
- Campaign: `name`, `status` (`active`/`paused`/`archived`), `budget.lifetime_spend_limit_micros`
  (min $1; **API = lifetime only**), `targeting.locations.include:[{id}]`.
- Ad group: `campaign_id`, `name`, `status`, `context_hints` (`string[]`),
  `bidding_config.billing_event_type` (**API = `impression`/CPM only**) + `max_bid_micros`
  (CPM default ≈ `60000` = $60).
- Ad: `ad_group_id`, `name`, `status`, `creative{ type:"chat_card", title (≤50 chars), body (≤100 chars),
  target_url (UTMs OK, NO dynamic macros), file_id }`. **No CTA field.** Image dims undocumented → use
  **1080×1080** (1:1).

## UI vs API (critical)
| | Web UI (ads.openai.com) | REST API (beta) |
|---|---|---|
| Billing | **Clicks/CPC** or Views/CPM | ⚠️ **CPM/impression only** |
| Budget | **Daily** or lifetime | ⚠️ **Lifetime only** |
| Context hints | **one free-text box per ad group** (type/paste your description) | `string[]` array |
| Build | manual | scripted, repeatable, PAUSED |

→ For a click-to-sale test, **CPC + daily is built in the UI**; use the **API for paused staging, QA,
reporting, and future automation.**

## Best practices (channel)
- **1 focused context hint per ad group beats 3–5** (OpenAI behavioral testing). One ad group = one
  intent; match its creative + landing.
- **No manipulative urgency / overblown claims** (policy + audience) — drop "LIMITED TIME"; keep
  *substantiated* proof (real guarantees, real dashboards). Income/results claims may draw a
  claims-policy review flag.
- Bids: CPC ~$3–5 (B2B can run $8–15); CPM default ~$60. Learning window **60–90 days**, bi-weekly
  reviews, don't kill early. CTR <0.3% ⇒ rewrite hints first.
- Min meaningful test ≈ $2–5k/mo. Dedicated, intent-matched landing pages > generic homepage.

## Operator rules (recommended defaults)
1. **Build everything PAUSED**; activate only after review.
2. **Reuse proven existing creative** before generating new — pull your best historical performers
   (ranked by real purchases/CPA). Don't invent "native" concepts when winners exist.
3. **Generate ad graphics with a real image model**, then overlay any text **deterministically**
   (canvas + TTF) — image models garble text. Avoid flat SVG/Sharp mockups.
4. **EYEBALL every creative yourself** — automated "all pass" verdicts are unreliable (they ship blanks
   + un-stripped text). Compositing is a hard-fail gate.
5. **Money truth = your attribution tool + checkout**, not platform metrics. Judge front-end CPA +
   backend LTV.
6. Policy-sensitive categories (e.g. cold email) — keep framing legitimate / compliant.

## Workflow
The bundled CLI runs from wherever the skill is installed. Set an alias once:
```bash
alias openai-ads='npx tsx ~/.claude/skills/openai-ads/cli/index.ts'   # adjust path to your install
```

**Verify key / explore (read-only, safe):**
```bash
openai-ads verify              # GET /ad_account
openai-ads geo "United States" # → geo id (US country = 1000232)
openai-ads campaigns list      # full account QA: campaigns → ad groups → ads
```
**Build PAUSED via API** (uploads creatives, then creates campaign → ad groups → ads) — every mutation is
`--dry-run` (preview) then `--confirm`:
```bash
openai-ads campaigns create --name "97 Cold Email Setup" --budget-usd 3000 --geo 1000232 --dry-run
openai-ads adgroups create --campaign-id <id> --name "AG1 Deliverability" \
  --context-hint "Someone whose cold emails keep landing in spam" --max-bid-usd 60 --confirm
openai-ads upload image-url https://<your-public-image-host>/ad.png   # → file_id
openai-ads ads create --ad-group-id <id> --name "AG1 A" --title "…(≤50)" --body "…(≤100)" \
  --target-url "https://<your-site>/<offer>?utm_source=chatgpt&utm_medium=cpm&utm_campaign=<slug>" \
  --file-id <file_id> --confirm
```
**Build in the UI (CPC/daily):** create the campaign in `ads.openai.com` (Clicks/CPC + daily budget is
UI-only today), paste one context hint per ad group, then QA with `openai-ads campaigns list`.
**Activate when approved:** `openai-ads campaigns activate <id> --confirm` (or `POST
/{campaigns|ad_groups|ads}/{id}/activate`).

> The full curl equivalents (no CLI needed) are in [`reference/openai-ads-api.md`](reference/openai-ads-api.md) §5.

## Tracking
UTM taxonomy (static, no macros): `utm_source=chatgpt` · `utm_medium=cpc|cpm` · `utm_campaign=<slug>` ·
`utm_term=<angle>` · `utm_content=<adgroup>-<variant>`. Your attribution tool attributes via the landing
page + UTMs (add a source rule for `utm_source=chatgpt`; you **cannot** pass a Meta-style click-id). Add
a "How did you hear about us?" capture. For platform-native conversion counting, configure conversion
events with the **`openai-ads-setup`** skill.

## Worked example — $97 Cold Email Setup *(real example from Lead Gen Jay)*
Offer: Done-For-You Cold Email **$97** (full setup · 10K verified leads · copywriting · A/B testing · AI
reply agent · **guaranteed 30 leads in 30 days**). Dest: a dedicated sales page. 4 ad groups, one intent each:

| Ad group | Angle | Winner creative |
|---|---|---|
| AG1 Deliverability | spam / inbox / warmup | proven $97 winner |
| AG2 Setup | how to set it up | offer-stack (founder + dashboard) |
| AG3 Get clients | agency / leads / outcome | top-CTR performer |
| AG4 Tools & Alternatives | "skip the $300/mo tools" | brand + logo |

- **Paused API version** (CPM/lifetime $3000) and a **live UI version** (CPC $3.50/click, $50/day) were
  built as two campaigns (one paused for QA/automation, one live for the click-to-sale test).
- Full copy/hints/URLs for all 4 ad groups: [`reference/openai-ads-api.md`](reference/openai-ads-api.md) §6.

## Open items (⚠️ re-verify — specs move weekly)
- Exact image format/dimension/size limits (undocumented).
- Whether/when the API gains **CPC billing**, **daily budget**, and an explicit **objective** field.
- Attribution source rule for `utm_source=chatgpt` (configure in your attribution tool).

## Sources
OpenAI Developers Ads API (quickstart/overview/reference) · help.openai.com Ads Manager + Create Ad Groups
· Search Engine Land · B2B practitioner playbooks · 1-hint-per-group targeting guidance · live API, 2026-06.
