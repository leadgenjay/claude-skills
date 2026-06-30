---
name: meta-ads
description: >
  Meta Ads Pro System — the first-run wizard that takes you from zero to a launched,
  continuously-optimized Meta (Facebook/Instagram) ad account. One invocation chains the
  specialist skills with a confirmation gate between every phase: set up perfect tracking
  (Pixel + Conversions API, no Hyros required) → build the strategy → build custom audiences
  → build campaigns + ad sets → launch your creative → then optimize on a recurring cadence.
  Everything builds PAUSED; nothing spends until you explicitly approve. Resumable across
  sessions via scripts/campaigns/<name>/.metadata.json. Use when someone says "set up meta
  ads", "meta ads pro", "launch meta ads from scratch", "new to meta ads", "first meta
  campaign", "onboard me to meta ads", "meta ads wizard", or "build my meta ads system".
---

# Meta Ads Pro System — First-Run Wizard

One invocation, zero → launched + optimizing. This skill is a **thin orchestrator**: it walks
the user through eight phases, hands each one to the specialist skill that owns it, and advances
once that phase's artifact appears. It does **not** re-implement specialist logic — when a phase
belongs to another skill, invoke that skill and trust it.

> **Two laws of this wizard (never violate):**
> 1. **Build PAUSED, launch only on explicit approval.** Every campaign / ad set / ad is created
>    PAUSED. The user must see the full plan + total daily spend and say "launch" before anything
>    goes ACTIVE.
> 2. **Hyros is never assumed.** The measurement foundation is Meta's own Pixel + Conversions API.
>    A user with no third-party attribution tool gets a complete, profitable system.

## Step 0 — Prerequisites (install the chain first)

This orchestrator ships only `SKILL.md`, `manifest.yaml`, and `references/phase-prompts.md`.
Every phase delegates to a specialist skill. Install the whole bundle BEFORE invoking, using the
**public Lead Gen Jay marketplace install endpoint** (`leadgenjay.com/api/skills/install.sh` — the
standard public skill installer, not an app-internal API):

```bash
curl -sSL 'https://leadgenjay.com/api/skills/install.sh?items=meta-ads,meta-ads-tracking,meta-research,meta-launcher,meta-ads-creative,meta-optimize,meta-report' | bash
```

(Installing the `meta-ads` system from the marketplace pulls all of these as bundled items.)

**Fallback (offline / no marketplace access):** if `leadgenjay.com` is unreachable, install each skill
by hand — copy its folder into `~/.claude/skills/<id>/`. The system still runs; only the installer
differs. The install URL above is the public Lead Gen Jay marketplace endpoint, not an app-internal API.

**Verify the chain is present before Phase 1.** Each phase below invokes its specialist skill
(`/meta-ads-tracking`, `/meta-research`, `/meta-launcher`, `/meta-ads-creative`, `/meta-optimize`).
If any isn't installed, STOP and re-run the install command above — do NOT fake a phase's output.

**Required env vars** (Phase 1 + the launcher write/verify these; this list is informational):

| Var | Phase | Source |
|---|---|---|
| `META_PIXEL_ID`, `META_CAPI_TOKEN` | 1 | `meta-ads-tracking` (Events Manager) |
| `META_ACCESS_TOKEN` | 5 | Meta Marketing API token, `ads_management` scope |
| `META_AD_ACCOUNT_ID`, `META_PAGE_ID` | 5 | the user's ad account + Page |
| `HYROS_API_KEY` | optional | only if the user runs Hyros; nothing requires it |

**Working directory:** the orchestrator writes state to `scripts/campaigns/<name>/.metadata.json`
relative to the CURRENT working directory. Have the user `cd` to a dedicated project root
(`mkdir -p ~/meta-ads/<account> && cd ~/meta-ads/<account>`) before invoking.

**Skill chain:**

```
[0]  preflight + naming (inline)
 → [1] meta-ads-tracking  — Pixel + Conversions API + custom conversions (NO Hyros)   ← perfect tracking
 → [2] meta-research      — niche + competitor research → ICP, offer, angles          ← strategy
 → [3] audiences          — custom audiences (site/CRM/engagement) + lookalikes        ← custom audiences
 → [4] meta-ads-creative  — render on-brand ad creatives for the chosen angles         ← creative
 → [5] meta-launcher      — campaign + ad sets + ads, all PAUSED                        ← campaigns + ad sets
 → [6] launch             — pre-flight checklist + explicit approval → ACTIVE           ← launch
 → [7] meta-optimize      — first review + recurring cadence                           ← continuously optimize
 → Finalize (reporting cadence via meta-report; re-run optimize weekly)
```

## Before You Start

1. **Read** `references/phase-prompts.md` for the exact user-facing copy at each gate (`§P{n}.{tag}`).
2. **Do not re-implement specialist logic.** When a phase has a skill handoff, invoke it and trust it.
3. **Persist state** in `scripts/campaigns/<name>/.metadata.json`. Every phase reads and writes it.
4. **Tracking before spend.** Phase 1 is a hard gate — never build campaigns against an unverified
   conversion signal. A blind algorithm wastes budget.

---

## Phase 0 — Preflight & Account Naming

**Goal:** decide new vs resume; establish the working directory + metadata.

1. **List existing in-progress runs:**
   ```bash
   for d in scripts/campaigns/*/; do
     [ -f "$d/.metadata.json" ] || continue
     jq -r 'select(.orchestrator=="meta-ads" and .phases.system_complete!=true)
            | "\(.account_name) | last complete: \([.phases|to_entries[]|select(.value.status=="complete")|.key]|last // "none")"' \
       "$d/.metadata.json"
   done
   ```
2. **If rows returned:** show `§P0.resume`; offer resume vs new.
3. **On resume:** load the metadata, jump to the first phase where `status != "complete"`.
4. **On new:** show `§P0.new`; ask for `account_name` (slug) + the **offer** being advertised.
5. **Initialize:**
   ```bash
   mkdir -p "scripts/campaigns/$ACCOUNT"
   jq -n --arg name "$ACCOUNT" --arg now "$(date -u +%FT%TZ)" '
     {account_name:$name, created_at:$now, orchestrator:"meta-ads",
      phases:(["preflight","tracking","strategy","audiences","creative","build","launch","optimize"]
              | map({(.):{status:"pending"}}) | add + {system_complete:false})}' \
     > "scripts/campaigns/$ACCOUNT/.metadata.json"
   ```
6. Set `phases.preflight.status="complete"`. Continue to Phase 1.

---

## Phase 1 — Tracking (Pixel + Conversions API)

**Goal:** verified Meta tracking — Pixel live, CAPI deduplicating, custom conversions defined.
This is the **money signal** Meta optimizes against. No Hyros required.
**Skill handoff:** `meta-ads-tracking`
**Required artifact:** `META_PIXEL_ID` + `META_CAPI_TOKEN` resolve AND a Test-Events conversion was
seen deduped in Events Manager.
**Metadata field:** `phases.tracking`

1. Pre-check: skip if complete and `META_PIXEL_ID`/`META_CAPI_TOKEN` resolve.
2. Show `§P1.intro` — explain why measurement comes first.
3. Invoke `/meta-ads-tracking`. It runs its own interview (Pixel/Dataset ID, CAPI token, ad account,
   Page, domain, money events) and verify steps. Do not front-run it.
4. Confirm its Step 7 verification passed (dedup + EMQ). Capture `pixel_id`, `ad_account_id`,
   `page_id` into metadata for downstream phases.
5. Update `phases.tracking` → `complete`.

---

## Phase 2 — Strategy (Research → ICP, Offer, Angles)

**Goal:** a strategy the campaigns inherit — who to target, what to say, which angles to test.
**Skill handoff:** `meta-research`
**Required artifact:** a strategy/brief file with ICP + offer positioning + ≥3 ad angles.
**Metadata field:** `phases.strategy`

1. Pre-check: skip if complete.
2. Show `§P2.intro` — ask for the offer, target customer, current ads/competitors, and budget band.
3. Invoke `/meta-research` (it handles competitor pull + angle synthesis). For a lean run with no
   research budget, gather the ICP + 3 angles directly from the user instead.
4. Save the brief under `scripts/campaigns/<name>/strategy.md` (the launcher + creative read it).
5. Update `phases.strategy` → `complete`.

---

## Phase 3 — Custom Audiences

**Goal:** the targeting inventory — custom audiences from first-party signal + lookalikes.
**Skill handoff:** `meta-launcher` (audience tooling) — inline for the plan.
**Required artifact:** a documented audience plan (which audiences exist / will be created, per tier).
**Metadata field:** `phases.audiences`

1. Pre-check: skip if complete.
2. Show `§P3.intro`. Build the audience plan from first-party signal (now flowing from Phase 1):
   - **Cold / prospecting:** 1% lookalikes seeded on the highest-intent list available
     (purchasers > bookers > opt-ins), plus interest/broad as a control.
   - **Warm / retargeting:** website visitors, video viewers, page/IG engagers, and CRM-list
     custom audiences — split by recency (0-30d favored) + engagement tier.
   - **Exclusions:** always exclude existing buyers from cold prospecting.
3. Use the launcher's audience helpers (`searchInterests`, `getCustomAudiences`, lookalike build)
   to confirm what already exists vs. what to create. Creating a lookalike needs a seed audience of
   sufficient size — note any that can't be built yet.
4. Record the plan in metadata (`phases.audiences.plan`) and `strategy.md`.

---

## Phase 4 — Creative

**Goal:** on-brand ad creatives for the chosen angles, sized for Meta placements.
**Skill handoff:** `meta-ads-creative` (and/or `ad-creative` for photo-style creative)
**Required artifact:** rendered creative files for each angle in `output/ads/`.
**Metadata field:** `phases.creative`

1. Pre-check: skip if complete.
2. Show `§P4.intro` — map each Phase-2 angle to a creative concept.
3. Invoke `/meta-ads-creative` to render the templated creatives (and/or `/ad-creative` for image
   generation). The user reviews and approves the pair(s) before they enter a campaign.
   > **No auto-enhanced creative.** Keep Meta's Advantage+ "Standard Enhancements" OFF — it garbles
   > text and drifts off-brand. The launcher already opts out by default; do not re-enable.
4. Update `phases.creative` → `complete` with the approved file paths.

---

## Phase 5 — Build Campaign + Ad Sets + Ads (PAUSED)

**Goal:** the full campaign structure created in the ad account, **all PAUSED**.
**Skill handoff:** `meta-launcher`
**Required artifact:** campaign + ad set + ad IDs captured; every entity `PAUSED`.
**Metadata field:** `phases.build`

1. Pre-check: skip if complete.
2. Show `§P5.intro`. Invoke `/meta-launcher` with: the offer + destination URL (from strategy), the
   audiences (Phase 3), the creatives (Phase 4), the test structure, and the budget.
   - Optimization event = the purchase/lead **custom conversion** defined in Phase 1
     (`OFFSITE_CONVERSIONS` + the pixel/custom-conversion). This is the whole point of Phase 1.
3. The launcher builds everything PAUSED and runs its pre-flight checklist (URL 200, UTMs, specs,
   budget math, targeting size, tracking wired). Capture all entity IDs into `phases.build`.
4. Update `phases.build` → `complete`. **Do NOT launch here** — that's Phase 6.

---

## Phase 6 — Launch (explicit approval only)

**Goal:** flip the verified, PAUSED structure to ACTIVE — only after the user approves.
**Skill handoff:** `meta-launcher` (Step 7)
**Required artifact:** entities ACTIVE; launch logged with total daily spend.
**Metadata field:** `phases.launch`

1. Pre-check: skip if complete.
2. Show `§P6.intro` — present the full plan summary: campaigns, ad sets, audiences, creatives, and
   **total daily spend** ($X/day × Y ad sets = $Z/day). Warn if total > $100/day.
3. **Wait for an explicit "launch".** Anything ambiguous = do not launch.
4. On approval, run the launcher's enable sequence (rate-limited). Confirm each entity ACTIVE.
5. Update `phases.launch` → `complete` with the launched timestamp + total daily budget.

---

## Phase 7 — Optimize (recurring)

**Goal:** turn the launched account into a system that improves — kill losers, scale winners, on a
cadence, judged on real conversions (Meta CAPI by default; Hyros only if present).
**Skill handoff:** `meta-optimize`
**Required artifact:** a first optimization review logged; a recurring cadence agreed.
**Metadata field:** `phases.optimize`

1. Pre-check: skip if complete (first review done).
2. Show `§P7.intro` — set expectations: let the first 48-72h gather data before cutting; judge winners
   on the **conversion source from Phase 1** (Meta custom conversions), never raw CTR or pixel-only.
3. Invoke `/meta-optimize` for the first review once data exists. Establish the cadence (e.g. weekly)
   and the report cadence via `/meta-report`.
4. Update `phases.optimize` → `complete` (first pass) and note the recurring schedule.

---

## Finalize — What's Next

1. Set `phases.system_complete = true` via `jq` on `.metadata.json`.
2. Show `§final`:
   - **Optimization cadence:** re-run `/meta-optimize` weekly (sooner if spend is high).
   - **Reporting:** `/meta-report` for the deep performance read; `/meta-audit` for periodic
     account-level health.
   - **Tracking hygiene:** keep EMQ green; re-verify the CAPI feed after any funnel change.
   - **Scaling:** graduate proven winners per the launcher's CBO-discovers / ABO-scales doctrine.
3. Exit the wizard.

---

## Resume Semantics

- Re-invoking mid-flow: Phase 0 detects incomplete metadata and offers to resume.
- Each phase's pre-check (`status == "complete"` guard) makes every phase idempotent.
- To redo a phase, flip `phases.<name>.status` back to `"pending"` and re-invoke.

## When NOT to Use This Skill

- The user already runs Meta ads and just wants to optimize → use `/meta-optimize` directly.
- They only need creative → `/meta-ads-creative`. Only tracking → `/meta-ads-tracking`.
- They want a one-off report → `/meta-report`. This wizard is for the full 0 → launched → optimizing arc.
