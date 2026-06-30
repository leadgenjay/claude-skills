---
name: google-ads
description: >
  Google Ads Pro System — the first-run wizard that takes you from zero to a launched,
  continuously-optimized Google Ads account. One invocation runs six phases with a confirmation
  gate between each: set up perfect conversion tracking (Enhanced Conversions + offline import, no
  Hyros required) → build the strategy (Search vs Performance Max) → build Customer Match audiences
  → build campaigns + ads with generated RSA + PMax copy → launch → optimize + report on a recurring
  cadence. Everything builds PAUSED; nothing spends until you explicitly approve. Resumable across
  sessions via scripts/campaigns/<name>/.metadata.json. Use when someone says "set up google ads",
  "google ads pro", "launch google ads from scratch", "new google campaign", "performance max",
  "responsive search ad", "pmax", "google ads wizard", or "build my google ads system".
---

# Google Ads Pro System — First-Run Wizard

One invocation, zero → launched + optimizing. This skill is the **orchestrator**: it walks the user
through six phases, hands tracking to the `google-ads-tracking` companion, and runs strategy,
audiences, build, launch, and optimization **inline** against the Google Ads API. Everything is BYO
(your account, your credentials) and nothing spends until you approve.

> **Two laws of this wizard (never violate):**
> 1. **Build PAUSED, launch only on explicit approval.** Every campaign / ad group / ad / asset group
>    is created PAUSED. The user must see the full plan + total daily spend and say "launch" before
>    anything goes ENABLED. Preview every mutate with `validateOnly: true` first.
> 2. **Hyros is never assumed (conversion-source-first).** The measurement foundation is Google's own
>    conversion actions (Enhanced Conversions + offline import). A user with no third-party
>    attribution tool gets a complete, profitable system. Judge winners on the conversion source from
>    Phase 1 — never raw clicks or a pixel-only count.

## Step 0 — Prerequisites (install the chain first)

Install the bundle BEFORE invoking, using the **public Lead Gen Jay marketplace install endpoint**:

```bash
curl -sSL 'https://leadgenjay.com/api/skills/install.sh?items=google-ads,google-ads-tracking' | bash
```

(Installing the `google-ads` system from the marketplace pulls both as bundled items.)

**Fallback (offline):** copy each skill folder into `~/.claude/skills/<id>/`. The system still runs;
only the installer differs.

**Verify the chain is present before Phase 1.** Phase 1 invokes `/google-ads-tracking`. If it isn't
installed, STOP and re-run the install above — do NOT fake a phase's output.

**Required env vars** (Phase 1 sets the tracking ones; Phases 3-6 need the API ones — see
`google-ads-tracking/references/developer-api.md` for how to mint them):

| Var | Phase | Source |
|---|---|---|
| Google tag `AW-XXXXXXX` + conversion labels | 1 | `google-ads-tracking` (Google Ads UI) |
| `GOOGLE_ADS_DEVELOPER_TOKEN` | 3-6 | Google Ads → API Center |
| `GOOGLE_ADS_CUSTOMER_ID` (+ `GOOGLE_ADS_LOGIN_CUSTOMER_ID` if MCC) | 3-6 | the account being built |
| `GOOGLE_ADS_OAUTH_CLIENT_ID` / `_SECRET` / `_REFRESH_TOKEN` (`adwords` scope) | 3-6 | OAuth client + consent flow |
| `GOOGLE_DATAMANAGER_OAUTH_REFRESH_TOKEN` (`datamanager` scope) | 3 | Customer Match (or reuse adwords token with both scopes) |

**Working directory:** the orchestrator writes state to `scripts/campaigns/<name>/.metadata.json`
relative to the CURRENT working directory. Have the user `cd` to a dedicated project root
(`mkdir -p ~/google-ads/<account> && cd ~/google-ads/<account>`) before invoking.

**Phase map:**

```
[0]  preflight + naming (inline)
 → [1] google-ads-tracking — Enhanced Conversions + offline import (NO Hyros)   ← perfect tracking
 → [2] strategy            — ICP, offer, angles + Search vs Performance Max      ← strategy
 → [3] audiences           — Customer Match lists + PMax audience signals        ← audiences
 → [4] build               — Search/RSA + PMax campaigns + generated copy, PAUSED ← campaigns + creative
 → [5] launch              — pre-flight checklist + explicit approval → ENABLED   ← launch
 → [6] optimize            — first review + report + recurring cadence            ← optimize + report
```

## Before You Start

1. **Read** `references/phase-prompts.md` for the exact user-facing copy at each gate (`§P{n}.{tag}`),
   and `references/launch-build.md` for the campaign-build field rules + the API mutate recipes.
2. **Tracking before spend.** Phase 1 is a hard gate — never build campaigns against an unverified
   conversion signal. Smart Bidding with no signal wastes budget.
3. **Persist state** in `scripts/campaigns/<name>/.metadata.json`. Every phase reads and writes it.
4. **Preview every write** with `validateOnly: true` before the real mutate; create everything PAUSED.

---

## Phase 0 — Preflight & Account Naming

**Goal:** decide new vs resume; establish the working directory + metadata.

1. **List existing in-progress runs:**
   ```bash
   for d in scripts/campaigns/*/; do
     [ -f "$d/.metadata.json" ] || continue
     jq -r 'select(.orchestrator=="google-ads" and .phases.system_complete!=true)
            | "\(.account_name) | last complete: \([.phases|to_entries[]|select(.value.status=="complete")|.key]|last // "none")"' \
       "$d/.metadata.json"
   done
   ```
2. **If rows returned:** show `§P0.resume`; offer resume vs new.
3. **On resume:** load the metadata, jump to the first phase where `status != "complete"`.
4. **On new:** show `§P0.new`; ask for `account_name` (slug) + the **offer** being advertised + price.
5. **Initialize:**
   ```bash
   mkdir -p "scripts/campaigns/$ACCOUNT"
   jq -n --arg name "$ACCOUNT" --arg now "$(date -u +%FT%TZ)" '
     {account_name:$name, created_at:$now, orchestrator:"google-ads",
      phases:(["preflight","tracking","strategy","audiences","build","launch","optimize"]
              | map({(.):{status:"pending"}}) | add + {system_complete:false})}' \
     > "scripts/campaigns/$ACCOUNT/.metadata.json"
   ```
6. Set `phases.preflight.status="complete"`. Continue to Phase 1.

---

## Phase 1 — Tracking (Conversion actions + Enhanced Conversions)

**Goal:** verified Google tracking — the Google tag live, conversion actions Recording, Enhanced
Conversions healthy, and the offline import accepted. This is the **money signal** Smart Bidding
optimizes against. No Hyros required.
**Skill handoff:** `google-ads-tracking`
**Required artifact:** the Google tag fires, at least one conversion action is **Primary**, and a
test conversion (browser + offline) was seen deduped.
**Metadata field:** `phases.tracking`

1. Pre-check: skip if complete and the tag + conversion actions resolve.
2. Show `§P1.intro` — explain why measurement comes first.
3. Invoke `/google-ads-tracking`. It runs its own interview (Customer ID, developer token, OAuth,
   domain, money events) + verify steps. Do not front-run it.
4. Confirm its Step 8 verification passed (conversions Recording + Enhanced Conversions healthy +
   dedup). Capture `customer_id`, `conversion_id`, the Primary conversion action resource names, and
   the offer's destination URL into metadata for downstream phases.
5. Update `phases.tracking` → `complete`.

---

## Phase 2 — Strategy (Search vs Performance Max)

**Goal:** a strategy the campaigns inherit — who to target, what to say, and the **campaign-type
decision** that shapes everything after.
**Required artifact:** `scripts/campaigns/<name>/strategy.md` with ICP + offer positioning + ≥3 ad
angles + the Search/PMax call.
**Metadata field:** `phases.strategy`

1. Pre-check: skip if complete.
2. Show `§P2.intro` — gather the offer, ideal customer, competitors/keywords, and a daily budget band.
3. **Pick the campaign type** (record the reasoning in `strategy.md`):

   | | Search (Responsive Search Ads) | Performance Max |
   |---|---|---|
   | **Targeting** | keywords (user intent) | asset-group + audience signals; Google auto-targets across Search/YouTube/Display/Discover/Gmail |
   | **Best for** | intent-rich niches (specific pain, clear search demand) | broad conversion scaling when intent keywords are few |
   | **Creative** | 3-15 headlines, 2-4 descriptions | 3-10 headlines, 1 long headline, 2-5 descriptions, 3+ images |
   | **Bidding** | Maximize Conversions / Target CPA | Maximize Conversion Value / Target ROAS |

   Default doctrine for a cold account with little conversion history: **start on Maximize
   Conversions** for a 2-3 week learning sprint, then move to a target once data exists (switching
   strategies resets learning ~1-2 weeks). Budget × bid must be coherent — a tight Target CPA on a
   tiny budget self-throttles.
4. Save the brief to `strategy.md`. Update `phases.strategy` → `complete`.

---

## Phase 3 — Audiences (Customer Match + signals)

**Goal:** the targeting inventory — Customer Match lists from first-party data + (for PMax) the
audience signal that steers modeling.
**Required artifact:** a documented audience plan (which lists exist / will be created, who is
excluded).
**Metadata field:** `phases.audiences`

1. Pre-check: skip if complete.
2. Show `§P3.intro`. Build the plan from first-party signal now flowing from Phase 1:
   - **Customer Match lists** (buyers, opt-ins) ingested via the **Data Manager API** (see
     `google-ads-tracking/references/developer-api.md § Customer Match`). Remember: list size reads 0
     via the API even when populated — gate "enable" on UI eligibility, never the API count.
   - **Exclusions:** always exclude existing buyers from cold prospecting. For **PMax**, add a
     customer-list exclusion (past purchasers minimum) so PMax stays prospecting-only and doesn't
     poach your retargeting.
   - **PMax audience signal:** seed with first-party buyer data — it is the single biggest PMax lever.
     **Exactly one audience signal per asset group** (`ONE_AUDIENCE_ALLOWED_PER_ASSET_GROUP`).
3. Record the plan in metadata (`phases.audiences.plan`) and `strategy.md`. Update `phases.audiences`
   → `complete`.

---

## Phase 4 — Build Campaign + Ads (PAUSED) + generate creative

**Goal:** the full campaign structure created in the account, **all PAUSED**, with RSA / PMax copy
generated for the chosen angles.
**Required artifact:** campaign + ad group + ad / asset-group IDs captured; every entity `PAUSED`.
**Metadata field:** `phases.build`

1. Pre-check: skip if complete.
2. Show `§P4.intro`. Follow `references/launch-build.md` for the field rules + mutate recipes:
   - **Generate the copy** for the chosen angles: RSA = 3-15 unique headlines (≤30 chars) + 2-4
     descriptions (≤90 chars); PMax = 3-10 headlines + 1 long headline (≤90) + 2-5 descriptions + 3+
     images (operator supplies images; you write copy + asset-group text). **Winning pattern:** a
     specific number + a concrete outcome + proof (e.g. "$97 Lead System", "100+ Trustpilot reviews").
     Cut vague, no-number lines. No banned AI words (delve, leverage, seamless, unlock, robust...).
   - **Optimize toward the Primary conversion action** from Phase 1 (the whole point of Phase 1).
   - **Set the final URL** to the offer's destination (from Phase 1) with the tracking suffix; for
     Search keep keyword + 5+ negative keywords; for PMax attach exactly one audience signal +
     the buyer exclusion (Phase 3). Geo: target the offer's countries, PRESENCE-only — never "All
     countries" on a serving campaign.
   - **Preview with `validateOnly: true`**, then create for real **PAUSED**. Capture every entity ID.
3. Update `phases.build` → `complete`. **Do NOT launch here** — that's Phase 5.

---

## Phase 5 — Launch (explicit approval only)

**Goal:** flip the verified, PAUSED structure to ENABLED — only after the user approves.
**Required artifact:** entities ENABLED; launch logged with total daily spend.
**Metadata field:** `phases.launch`

1. Pre-check: skip if complete.
2. Show `§P5.intro` — present the full plan: campaign(s), ad groups / asset groups, audiences, copy,
   destination, and **total daily spend** ($X/day). Run the pre-launch checklist
   (`references/launch-build.md`): URL 200, tracking suffix present, conversion action attached,
   budget × bid coherent, geo set, negatives in place, copy clean.
3. **Wait for an explicit "launch".** Anything ambiguous = do not launch.
4. On approval, enable the campaign(s) (`campaign.status = ENABLED` via the mutate; bidding-strategy
   leaf-mask gotcha noted in `launch-build.md`). Confirm each entity ENABLED in the UI (check for
   disapprovals).
5. Update `phases.launch` → `complete` with the launched timestamp + total daily budget.

---

## Phase 6 — Optimize + Report (recurring)

**Goal:** turn the launched account into a system that improves — kill losers, scale winners, on a
cadence, judged on real conversions (Google's own; Hyros only if present).
**Required artifact:** a first optimization review logged; a recurring cadence agreed.
**Metadata field:** `phases.optimize`

1. Pre-check: skip if complete (first review done).
2. Show `§P6.intro` — let the first 48-72h gather data before cutting. Pull the report with GAQL
   (`google-ads-tracking/references/developer-api.md § Reporting`) and produce the standard sections:
   - **Executive summary:** spend, conversions, conversion value, CPA / ROAS, WoW deltas.
   - **Deep dive:** winners, losers, stable — by campaign / ad group / search term.
   - **Waste & leakage:** spend with zero attributed conversions; high-click / zero-conversion search
     terms → negative keywords.
   - **Recommendations:** PAUSE (entity + reason + waste avoided), SCALE (entity + budget change),
     NEGATIVES (exact terms), bid/device/time adjustments.
   - **Next 7-day test plan:** 3-5 highest-impact experiments with success criteria.
   - Thresholds: pause candidate = spend > $100 with 0 conversions (7d); scale candidate = ROAS > 2.0
     with 3+ conversions.
3. Apply changes only with explicit approval (`validateOnly` preview → confirm → mutate; PAUSE over
   remove). Establish the cadence (weekly default). Update `phases.optimize` → `complete` (first pass)
   and note the recurring schedule.

---

## Finalize — What's Next

1. Set `phases.system_complete = true` via `jq` on `.metadata.json`.
2. Show `§final`:
   - **Optimization cadence:** re-run the optimize phase weekly (sooner if spend is high).
   - **Tracking hygiene:** keep Enhanced Conversions healthy; re-verify the offline import after any
     funnel change.
   - **Scaling:** graduate proven winners; for PMax, strengthen the audience signal and cut the
     consistent dead-weight assets (specific-number winners beat vague lines).
3. Exit the wizard.

---

## Resume Semantics

- Re-invoking mid-flow: Phase 0 detects incomplete metadata and offers to resume.
- Each phase's pre-check (`status == "complete"` guard) makes every phase idempotent.
- To redo a phase, flip `phases.<name>.status` back to `"pending"` and re-invoke.

## When NOT to Use This Skill

- The user already runs Google Ads and just wants a one-off report or edit → run the optimize phase
  (or ask directly). Only tracking → `/google-ads-tracking`.
- They want cross-channel last-click attribution specifically → that's a Hyros/attribution-tool setup,
  layered on top of Phase 1, not a replacement for it.
