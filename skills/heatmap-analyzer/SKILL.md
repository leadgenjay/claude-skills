---
name: heatmap-analyzer
description: Analyze Microsoft Clarity scroll depth, rage clicks, dead clicks, engagement, and session-recording signals (broken out by funnel / landing_variant / device) to produce conversion optimization recommendations. Generates structured reports (saved to the LGJ admin dashboard, or a local markdown file outside it) and proposes PIE-scored AB test hypotheses. Use when analyzing landing page performance, diagnosing conversion drop-offs, tracking optimization trends, or generating data-driven AB test ideas.
---

# Clarity Heatmap Analyzer

Analyzes Microsoft Clarity analytics (project `qk5hok8gx8` — session recordings, heatmaps, scroll depth, dead/rage clicks, Smart Events) and produces structured reports with conversion optimization recommendations and AB test hypotheses.

> **Clarity vs PostHog split.** Recordings, heatmaps, scroll depth, and dead/rage-click telemetry live in Microsoft Clarity (moved 2026-05-26). PostHog still owns server-side events (`$pageview`, `user_opted_in`, `purchase_completed`) — for those, use the `check-tracking` skill or the PostHog MCP `query-run` tool directly.

---

## Step 0 — Prerequisites (verify before every run)

Before any query or analysis, verify these. **Only the first two are hard requirements.** If either is missing, STOP and set it up — do NOT fabricate metrics, emit placeholder data, or proceed on an empty Clarity response. The rest are optional; the skill degrades gracefully without them.

| Requirement | Check | Where to get it |
|---|---|---|
| **Clarity MCP server** · required | `claude mcp get clarity` → `Connected`; in a fresh session ask "list MCP tools" → `get-clarity-data` is present | `claude mcp add -s user clarity -- npx -y @microsoft/clarity-mcp-server --clarity_api_token=<JWT>`. JWT: Clarity → Settings → Data Export → new token (`Data.Export` scope, non-expiring). The token is **project-scoped**, so `get-clarity-data` returns that project's data automatically. Add the server BEFORE the session — MCP loads at session start only. |
| **Clarity is recording the site** · required | On the target page, browser console: `typeof window.clarity === 'function'` → `true` | Add the Clarity tracking snippet to your site `<head>`. LGJ: it lives in `app_settings.global_tracking.customHeadScripts` (project `qk5hok8gx8`); confirm that ID appears in the rendered HTML. New properties have a few hours of ingestion delay. |
| **Report storage** · optional | `GET /api/admin/reports` → `200` | Built into the LGJ Web-Designer app. **No admin API (non-LGJ install)?** Skip it — the skill saves each report to a local markdown file instead (nothing to install). |
| **Custom Clarity tags** · optional (LGJ) | Clarity dashboard → Filters → Custom shows `funnel`, `landing_variant`, `page_type`, `ab_test_id` | LGJ ships these via `<ClarityContext />` (mounted in `src/app/layout.tsx`; audit with the `tracking-check` skill). Other sites: skip the funnel/variant cuts in Step 2f, or set your own Clarity custom tags. |
| **`ab-test-designer` skill** · optional | present in `~/.claude/skills/ab-test-designer/` | Skills Marketplace — sharpens the hypothesis output in Step 5. |

> **Quota.** The Clarity Data Export API allows **10 requests/day** per project and caps each query at a **1–3 day** window (no 7-day option). Treat every query as expensive — plan the dimension cuts you need before firing (see the MCP Tool Reference at the bottom). A full `analyze` pass costs ~6 of the 10 daily calls.

### Step-by-Step Setup

#### 1. Install the Clarity MCP Server

The skill queries Clarity directly via MCP tools. The server is published by Microsoft and runs locally over stdio.

```bash
claude mcp add -s user clarity -- npx -y @microsoft/clarity-mcp-server --clarity_api_token=<JWT>
```

Get the JWT at Clarity → Settings → Data Export → Generate new API token (`Data.Export` scope, non-expiring). Token persists in `~/.claude.json` under `mcpServers.clarity`.

**Verify it works:** in a fresh Claude Code session, ask "list available MCP tools" — `get-clarity-data` should be present. MCP servers load at session start, so add the server BEFORE the session you want to use it in.

#### 2. Verify Clarity Tracking Is Live

The site must be sending data to Clarity. Check by visiting any page and running in the browser console:

```javascript
typeof window.clarity === 'function'  // Should be true
```

If Clarity isn't loading, check Admin → Settings → Custom Head Scripts contains the Clarity snippet (search for `qk5hok8gx8`). Custom-head-scripts cache has a 5-min TTL per Vercel function instance — fresh writes may not appear immediately.

#### 3. Verify Custom Tags Are Firing

Open the Clarity dashboard → Filters → Custom. You should see at least `funnel`, `page_type`, `landing_variant`, `ab_test_id` available as filter dimensions. If none appear, `<ClarityContext />` isn't mounted — re-run `/tracking-check /<some-funnel-path>` to audit.

#### 4. Verify Reports API

Reports are stored via the admin dashboard. Test the endpoint:

```
GET /api/admin/reports
```

Reports appear at `/admin/reports` in the sidebar.

#### 5. Install the Skill

```bash
curl -sL 'https://leadgenjay.com/api/skills/install.sh?items=heatmap-analyzer' | bash
```

Or copy `SKILL.md` to `~/.claude/skills/heatmap-analyzer/SKILL.md`.

### Configuration Reference

| Setting | Value | Location |
|---------|-------|----------|
| Clarity Project ID | `qk5hok8gx8` | Clarity dashboard URL |
| Clarity API Host | `https://www.clarity.ms/export-data/api/v1/` | Used by MCP server internally |
| API Rate Limit | **10 requests / day** per project | Treat every query as expensive |
| MCP Config | `~/.claude.json` → `mcpServers.clarity` | Added via `claude mcp add -s user` |
| Time Window Cap | **1, 2, or 3 days** per query | No 7-day option — for trends, re-run regularly |
| Reports API (optional) | `/api/admin/reports` | LGJ app only — local-file fallback otherwise |
| Reports Dashboard | `/admin/reports` | LGJ admin sidebar |

### Troubleshooting

| Problem | Solution |
|---------|----------|
| "No Clarity data found" | Confirm `typeof window.clarity === 'function'` in console. Confirm `qk5hok8gx8` appears in rendered HTML. Wait — Clarity has up to a few hours of ingestion delay for new properties. |
| MCP tool `get-clarity-data` not available | Verify `claude mcp get clarity` returns `Connected`. Start a fresh Claude Code session — MCP servers load at session start only. |
| 10 req/day exceeded | Cache results to local notes or memory. Plan queries before firing — pick the dimension cut you actually need. |
| Custom-tag dimensions missing in Clarity | `<ClarityContext />` isn't firing on the page. Run `/tracking-check /<path>` to audit the mount. |
| Reports not saving | Verify you're logged into the admin dashboard. Check `/api/admin/reports` returns 200. |

---

## Commands

### `/heatmap analyze [page-url]`

Full heatmap analysis for a single page.

**Example:** `/heatmap analyze /aia-v2`

### `/heatmap funnel [start-page] [end-page]`

Multi-step funnel analysis between two pages.

**Example:** `/heatmap funnel /aia-v2 /aia-checkout`

### `/heatmap compare [page-url]`

Trend comparison against the previous report for a page.

**Example:** `/heatmap compare /aia-v2`

---

## Workflow: `/heatmap analyze [page-url]`

### Step 0: Verify Clarity Is Tracking

Before running analysis, verify Clarity is receiving data for this page:

1. Run a small probe query via `get-clarity-data` with `numOfDays=1`, `dimension1=URL` filtered to the target page. Look for non-zero Traffic.
2. If **sessions found** — proceed to Step 1.
3. If **no sessions found** — warn the user:
   - "No Clarity sessions found for this page in the last 24h. Either the page has zero traffic or Clarity isn't firing on it."
   - Suggest checking: Admin → Settings → Custom Head Scripts contains the Clarity snippet (search for `qk5hok8gx8`).
   - Suggest verifying: `typeof window.clarity === 'function'` in the browser console on the page.
   - Suggest running `/tracking-check /<path>` to confirm `<ClarityContext />` is wired and custom tags are firing.
   - Do NOT proceed with analysis — results would be empty/misleading.

> **Note on event tracking:** if you also need to verify *event-level* tracking (`$pageview`, `user_opted_in`, `purchase_completed`), run the `check-tracking` skill instead — those events live on PostHog, not Clarity.

### Step 1: Fetch Previous Reports

Check for existing reports to enable trend tracking:

```
GET /api/admin/reports?pageUrl=[url]
```

If a previous report exists, note its `id` and `version` for comparison later.

### Step 2: Query Clarity MCP (max 3 days per call)

Run these queries via the `get-clarity-data` MCP tool. The Clarity Data Export API caps `numOfDays` at **1, 2, or 3** — no 7-day window. For "last 7 days" trends, plan to run 3 consecutive calls (days 1–3, days 4–6, day 7) and stitch — but **mind the 10 req/day quota.** A complete analyze pass costs ~6 of the 10 daily quota, so don't loop.

Each `get-clarity-data` call accepts `numOfDays` (1–3) plus up to three dimension parameters. Dimension values that matter for our setup: `URL`, `Browser`, `Device`, `OS`, `Country`, `Source`, and the custom tags `<ClarityContext />` writes — `funnel`, `landing_variant`, `ab_test_id`, `page_type`, `is_admin`. Filter to the target page by passing the URL prefix or by combining a `funnel` tag filter with a `URL` dimension.

#### 2a. Traffic + Engagement Summary

Call `get-clarity-data` with `numOfDays=3`, `dimension1=URL`. Filter the response to rows where URL matches the target page. Pull: total sessions, engaged sessions, total recordings, average engagement time. Subtract `bot_sessions` if surfaced. This replaces the old "pageviews + unique visitors" metric.

#### 2b. Scroll Depth Distribution

Call `get-clarity-data` with `numOfDays=3`, `dimension1=URL`. The response includes `average_scroll_depth` per URL. For a deeper distribution (25/50/75/100 thresholds), open the Clarity dashboard → Heatmaps → Scroll Map for the target page and read the bands visually — the API only surfaces the average, not the distribution. Cite this limitation if asked.

#### 2c. Rage Clicks + Dead Clicks (Smart Events)

Call `get-clarity-data` with `numOfDays=3`, `dimension1=URL`. Smart Events (rage clicks, dead clicks, quick backs, excessive scrolling, JS errors) are surfaced as columns per URL row. **These are Clarity's native equivalents of `$rageclick`** and are detected algorithmically — no client-side instrumentation needed. For per-element selectors, open the recording from the Clarity dashboard — the API doesn't expose selectors.

#### 2d. Top Clicked Elements (Click Heatmap)

Open the Clarity dashboard → Heatmaps → Click Map for the target page. The API does not expose per-element click counts. If you need this programmatically, you must either (a) export the heatmap PNG and visually inspect, or (b) wire `clarity('event', 'cta_clicked')` calls into the click handlers for the CTAs you care about, then query Smart Events. Recommend (b) for repeat analyses; flag this gap in the Findings if it blocks a recommendation.

#### 2e. Device + Browser Breakdown

Call `get-clarity-data` with `numOfDays=3`, `dimension1=URL`, `dimension2=Device`. Pull desktop/mobile/tablet split. Re-run with `dimension2=Browser` for a browser cut if needed (counts against the 10/day budget).

#### 2f. Funnel-Variant Cut (LGJ-specific, high value)

Call `get-clarity-data` with `numOfDays=3`, `dimension1=URL`, `dimension2=landing_variant`. This gives per-variant scroll depth + engagement + Smart Events for the page — the critical cut for A/B test interpretation. If `landing_variant` doesn't appear as a dimension in the response, `<ClarityContext />` isn't wired correctly — bail and instruct the user to fix tracking first.

#### 2g. Exit / Next-Page Behavior

Clarity's API doesn't expose exit pages directly. For sequence behavior, switch to PostHog: use the `check-tracking` skill or PostHog MCP `query-run` against `$pageview` event sequences. Note this in the Findings as "follow-up via PostHog."

### Step 3: Analyze Against Conversion Best Practices

Apply this analysis framework to the data:

#### Above the Fold (0-25% scroll depth)
- [ ] Is the value proposition clear within 3 seconds?
- [ ] Is there a visible CTA above the fold?
- [ ] Is the hero engaging or causing immediate bounce?
- [ ] What percentage of visitors never scroll past this zone?

#### Engagement Zone (25-75% scroll depth)
- [ ] Where is the biggest scroll drop-off point?
- [ ] Are rage clicks concentrated on specific elements?
- [ ] Is social proof being seen and interacted with?
- [ ] Are benefits/features getting engagement?

#### Conversion Zone (CTA areas)
- [ ] What is the CTA click-through rate?
- [ ] Is there form abandonment?
- [ ] How much time do users spend near the CTA vs rest of page?
- [ ] Are there rage clicks near CTA (indicating confusion)?

#### Mobile vs Desktop
- [ ] Are there tap target issues on mobile?
- [ ] Is scroll depth significantly different on mobile?
- [ ] Are mobile users reaching the CTA?
- [ ] Are form fields usable on mobile?

### Step 4: Generate Findings

For each issue identified, create a Finding:

```typescript
{
  id: "f1",                              // Sequential ID
  category: "conversion",                // engagement | conversion | usability | performance
  issue: "60% of mobile users don't scroll past the hero section",
  recommendation: "Add a scroll indicator or move key benefits into the hero",
  confidence: "high",                    // Based on data strength
  dataPoints: [                          // Supporting evidence
    "Mobile scroll depth: 25% avg vs 62% desktop",
    "Mobile bounce rate: 72% vs 45% desktop"
  ],
  priority: "critical",                  // critical | high | medium | low
  section: "hero"                        // Page section name
}
```

**Priority Assignment:**
- **Critical:** >30% conversion impact, affects majority of visitors
- **High:** 15-30% impact, affects significant segment
- **Medium:** 5-15% impact, noticeable but not urgent
- **Low:** <5% impact, nice to fix

### Step 5: Generate AB Test Recommendations

For each high-priority finding, create an AB test recommendation using the `ab-test-designer` hypothesis framework:

```typescript
{
  id: "rec1",
  hypothesis: "Based on scroll data showing 60% mobile drop-off at hero, moving the CTA into the hero section will increase mobile conversions by 15-25% because users will see the action step before dropping off.",
  element: "hero-cta",
  control: "CTA below fold after benefits section",
  variation: "CTA button in hero section with benefit subtitle",
  expectedLift: "15-25% increase in mobile CTA clicks",
  pieScore: {
    potential: 8,    // High: majority of mobile traffic affected
    importance: 9,   // High: key conversion page
    ease: 7,         // Medium: simple layout change
    total: 8         // (8+9+7)/3
  },
  basedOnFindingIds: ["f1", "f3"],
  status: "proposed"
}
```

### Step 6: Compare with Previous Report (if exists)

If a previous report exists:
- Calculate deltas for all summary metrics
- Mark findings as "new", "recurring", or "resolved"
- Note which previous recommendations were implemented

### Step 7: Save Report

Persist the report — **never silently drop it.** Pick the target based on the Step 0 storage check:

- **Admin API available** (`GET /api/admin/reports` returned `200`, i.e. you're in the LGJ Web-Designer app): `POST` the complete report to `/api/admin/reports`.
- **No admin API** (non-LGJ install, or the check failed): write the report as a local markdown file at `./heatmap-reports/<page-slug>-<YYYY-MM-DD>.md` and tell the user the path. The `compare` workflow reads these files back for trend deltas — same analysis, only the storage target changes.

POST body (admin API):

```typescript
{
  pageUrl: "/aia-v2",
  pageTitle: "AIA v2 Landing Page",
  summary: {
    totalPageviews: 2340,
    avgScrollDepth: 58,
    avgTimeOnPage: 34,
    rageClickCount: 15,
    dateRange: { from: "2026-02-27", to: "2026-03-06" },
    bounceRate: 52,
    uniqueVisitors: 1890,
    topClickElements: ["CTA button", "Video play", "FAQ accordion"],
    deviceSplit: { desktop: 35, mobile: 58, tablet: 7 }
  },
  findings: [...],
  abTestRecommendations: [...],
  previousReportId: "uuid-of-previous-report",  // If exists
  version: 2                                      // Increment from previous
}
```

### Step 8: Present Summary

Output a formatted summary to the user:

```markdown
## Heatmap Analysis: [Page Title]
**URL:** [url] | **Period:** [dates] | **Report #[version]**

### Summary Metrics
| Metric | Value | Delta |
|--------|-------|-------|
| Pageviews | 2,340 | +12% |
| Unique Visitors | 1,890 | +8% |
| Avg Scroll Depth | 58% | -3% |
| Bounce Rate | 52% | +5% |
| Rage Clicks | 15 | -40% |
| Avg Time on Page | 34s | +2s |

### Device Split
Desktop: 35% | Mobile: 58% | Tablet: 7%

### Key Findings (by priority)
1. **[CRITICAL]** [issue] → [recommendation]
2. **[HIGH]** [issue] → [recommendation]
...

### Proposed AB Tests (PIE-scored)
| # | Element | PIE | Expected Lift | Hypothesis |
|---|---------|-----|---------------|------------|
| 1 | hero-cta | 8.0 | +15-25% mobile CTR | Move CTA into hero |
...

### Trend vs Previous
[improvements and regressions]

Report saved: /admin/reports → [report title]
```

---

## Workflow: `/heatmap funnel [start-page] [end-page]`

### Step 1: Define Funnel Steps

Identify the conversion path between start and end pages. Common patterns:

```
/aia-v2 → /aia-checkout → /aia-thank-you
/insiders → /insiders-checkout → /insiders-thank-you
/lead-machine → /consult
```

### Step 2: Query the Funnel

Funnel sequence analysis (step 1 → step 2 → step 3) is a PostHog strength, not a Clarity one — Clarity's `get-clarity-data` doesn't model multi-step sequences. Use the PostHog MCP `query-run` tool with a funnel query type:
- Steps = sequential pageviews on the start and end URLs
- Get conversion rate + drop-off count per step
- Breakdown by `$device_type` or our `landing_variant` cookie property

Then come back to Clarity for the per-step UX investigation in Step 3.

### Step 3: Identify Biggest Drop-offs

For each step with significant drop-off (>30%):
- Run heatmap analysis on that specific page (use analyze workflow)
- Cross-reference click data with drop-off timing
- Check for rage clicks or confusion indicators

### Step 4: Generate Funnel Report

Save report with `funnelSteps` in the summary:

```typescript
funnelSteps: [
  { name: "Landing Page View", url: "/aia-v2", count: 2340, dropoffRate: 0 },
  { name: "Checkout Page", url: "/aia-checkout", count: 468, dropoffRate: 80 },
  { name: "Purchase Complete", url: "/aia-thank-you", count: 94, dropoffRate: 80 }
]
```

### Step 5: Generate Funnel-Specific Recommendations

Focus AB test recommendations on the weakest funnel steps (highest drop-off rates).

---

## Workflow: `/heatmap compare [page-url]`

### Step 1: Fetch Latest Report

```
GET /api/admin/reports?pageUrl=[url]
```

Take the most recent report.

### Step 2: Run Fresh Analysis

Execute the full `/heatmap analyze` workflow for the same page.

### Step 3: Calculate Deltas

For every metric in summary, calculate:
- Absolute change (new - old)
- Percentage change ((new - old) / old * 100)
- Direction indicator (improvement vs regression)

### Step 4: Update Finding Statuses

Compare findings between reports:
- **Resolved:** Previous finding no longer appears in data
- **Recurring:** Same issue persists
- **New:** Issue not in previous report
- **Worsened:** Same issue but metrics are worse

### Step 5: Check AB Test Status

If previous report had AB test recommendations:
- Check if any were implemented (user confirmation or PostHog experiment data)
- Pull results via `experiment-results-get` if tests are running
- Update recommendation status accordingly

### Step 6: Save as New Version

Save with `previousReportId` linking to the previous report and incremented `version`.

---

## Clarity MCP Tool Reference

The Clarity MCP server exposes a single tool — `get-clarity-data` — but it is multi-purpose. Plan dimension cuts before firing to respect the 10 req/day cap.

| Parameter | Values | Notes |
|---|---|---|
| `numOfDays` | `1`, `2`, or `3` | No 7-day window. For longer windows, run multiple calls and stitch. |
| `dimension1` / `dimension2` / `dimension3` | `URL`, `Browser`, `Device`, `OS`, `Country`, `Source`, plus any custom tag set by `<ClarityContext />` (`funnel`, `landing_variant`, `ab_test_id`, `page_type`, `is_admin`) | Up to three per call. |
| Output metrics | Traffic, Engaged Sessions, Total Recordings, Average Engagement Time, Average Scroll Depth, Smart Events (rage clicks, dead clicks, quick backs, excessive scrolling, JS errors), Bot Sessions | Single JSON response covering all metrics for the cut. |

### Surfaces the Clarity API does NOT cover (use a different tool)

| Need | Where to go |
|---|---|
| Event-level analysis (`user_opted_in`, `purchase_completed`, `$pageview`) | PostHog MCP `query-run` |
| Funnel sequence (page A → page B → page C) | PostHog MCP `query-run` with funnel query type |
| Per-element click counts | Clarity dashboard → Heatmaps → Click Map (not API-exposed). Or instrument `clarity('event', '<name>')` for specific CTAs. |
| Scroll-depth distribution (25/50/75/100 thresholds) | Clarity dashboard → Heatmaps → Scroll Map (API only surfaces the average) |
| Individual session replay | Clarity dashboard → Recordings (use `identify` filter to find a specific user) |

## Integration with AB Test Skills

This skill generates AB test recommendations that follow the `ab-test-designer` hypothesis framework:

1. **Analysis produces recommendations** — Each finding can spawn one or more AB test hypotheses
2. **User approves** — Review recommendations in the report summary
3. **Create tests** — Use `/ab-test create` to implement approved recommendations
4. **Track conversion** — The LGJ A/B test infrastructure on `customer_journeys` + PostHog handles attribution (NOT Clarity). Clarity provides the qualitative UX read; PostHog answers "did the variant convert better?"
5. **Measure results** — Next `/heatmap compare` checks Clarity UX deltas; `/ab-winner` checks conversion deltas.

## Fallback: No Clarity MCP

If the Clarity MCP server isn't installed (verify with `claude mcp get clarity`):

1. Instruct the user to install it: `claude mcp add -s user clarity -- npx -y @microsoft/clarity-mcp-server --clarity_api_token=<JWT>`. Token comes from Clarity → Settings → Data Export.
2. After install, **start a new Claude Code session** — MCP servers load at session start only.
3. Manual fallback while waiting: open the Clarity dashboard directly. Heatmaps, Recordings, Smart Events, and Filters all live in the UI. User can paste screenshots or hand-copied metrics to this skill for analysis.

## Report Storage

**LGJ Web-Designer app** — reports persist via the built-in reports API:

- **Create:** `POST /api/admin/reports`
- **List:** `GET /api/admin/reports`
- **View:** `/admin/reports` in the admin dashboard
- **Types (app-internal, for reference — not shipped with the skill):** `src/types/heatmap-report.ts`

**Any other environment** — there is no admin API to install. Save each report as a local markdown file under `./heatmap-reports/` and read prior files back for the `compare` workflow's trend deltas. The analysis, findings, and PIE-scored hypotheses are identical; only the storage target changes.
