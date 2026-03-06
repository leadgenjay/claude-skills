---
name: heatmap-analyzer
description: Analyze PostHog heatmap data, session recordings, scroll depth, rage clicks, and funnel metrics to produce actionable conversion optimization recommendations. Generates structured reports stored in the admin dashboard and proposes PIE-scored AB test hypotheses. Use when analyzing landing page performance, diagnosing conversion drop-offs, tracking optimization trends, or generating data-driven AB test ideas.
---

# PostHog Heatmap Analyzer

Analyzes PostHog analytics data and produces structured heatmap reports with conversion optimization recommendations and AB test hypotheses.

---

## Setup & Requirements

### Prerequisites

| Requirement | Purpose | Install/Configure |
|-------------|---------|-------------------|
| **PostHog MCP Server** | Query analytics data from Claude Code | `npx @posthog/wizard@latest mcp add` |
| **PostHog tracking live on site** | Ensures data exists to analyze | Admin → Settings → Custom Head Scripts |
| **Admin reports API** | Store and view reports in dashboard | Built into Lead Gen Jay Web Designer |
| **AB Test Designer skill** (optional) | Enhanced hypothesis generation | Install from Skills Marketplace |

### Step-by-Step Setup

#### 1. Install PostHog MCP Server

The skill queries PostHog directly via MCP tools. Install the PostHog MCP server into Claude Code:

```bash
npx @posthog/wizard@latest mcp add
```

This configures `~/.claude/.mcp.json` with `mcp-remote` pointing to `https://mcp.posthog.com/mcp`. You'll need your PostHog **Personal API Key** (not project API key).

**Verify it works:** Ask Claude Code "list my PostHog event definitions" — if the MCP is configured, it will return your tracked events.

#### 2. Verify PostHog Tracking Is Live

The site must be sending data to PostHog. Check by visiting any page and running in the browser console:

```javascript
window.posthog  // Should return the PostHog object, not undefined
```

If PostHog isn't loading, check Admin → Settings → Custom Head Scripts contains the PostHog snippet. Custom scripts support both raw `<script>` tags and pure JavaScript.

#### 3. Verify Reports API

Reports are stored via the admin dashboard. Test the endpoint:

```
GET /api/admin/reports
```

Reports appear at `/admin/reports` in the sidebar.

#### 4. Install the Skill

```bash
curl -sL 'https://web.leadgenjay.com/api/skills/install.sh?items=heatmap-analyzer' | bash
```

Or copy `SKILL.md` to `~/.claude/skills/heatmap-analyzer/SKILL.md`.

### Configuration Reference

| Setting | Value | Location |
|---------|-------|----------|
| PostHog Project ID | `284008` | PostHog → Settings |
| PostHog API Host | `https://us.i.posthog.com` | PostHog → Settings |
| MCP Config | `~/.claude/.mcp.json` | Auto-configured by wizard |
| Reports API | `/api/admin/reports` | Built-in |
| Reports Dashboard | `/admin/reports` | Admin sidebar |

### Troubleshooting

| Problem | Solution |
|---------|----------|
| "No PostHog events found" | Verify tracking is live (`window.posthog` in console). Check Admin → Settings → Custom Head Scripts. |
| MCP tools not responding | Run `npx @posthog/wizard@latest mcp add` to reinstall. Check `~/.claude/.mcp.json` has the PostHog entry. |
| Reports not saving | Verify you're logged into the admin dashboard. Check `/api/admin/reports` returns 200. |
| Stale data | PostHog has ~5 min ingestion delay. Wait and retry. |

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

### Step 0: Verify PostHog Is Tracking

Before running analysis, verify PostHog is receiving data for this page:

1. Query PostHog for recent `$pageview` events on the target URL (last 24 hours)
2. If **events found** — proceed to Step 1
3. If **no events found** — warn the user:
   - "No PostHog events found for this page in the last 24 hours. Tracking may not be working."
   - Suggest checking: Admin → Settings → Custom Head Scripts contains the PostHog snippet
   - Suggest verifying: `window.posthog` exists in browser console on the page
   - Do NOT proceed with analysis — results would be empty/misleading

### Step 1: Fetch Previous Reports

Check for existing reports to enable trend tracking:

```
GET /api/admin/reports?pageUrl=[url]
```

If a previous report exists, note its `id` and `version` for comparison later.

### Step 2: Query PostHog MCP (Last 7 Days)

Run these queries using PostHog MCP tools. Default to last 7 days unless user specifies otherwise.

#### 2a. Pageview Trends + Unique Visitors

Use `query-run` with a trends query:
- Event: `$pageview`
- Filter: `$current_url` contains `[page-url]`
- Breakdown: by day
- Also query unique visitors (persons)

#### 2b. Bounce Rate

Use `query-run` or `query-generate-hogql-from-question`:
- "What is the bounce rate for [page-url] in the last 7 days?"
- Bounce = single-page sessions

#### 2c. Scroll Depth Distribution

Use `query-generate-hogql-from-question`:
- "What is the scroll depth distribution for [page-url]?"
- Get percentages at 25%, 50%, 75%, 100% thresholds

#### 2d. Rage Click Events

Use `query-run`:
- Event: `$rageclick`
- Filter: `$current_url` contains `[page-url]`
- Include element selectors if available

#### 2e. Top Clicked Elements (Click Heatmap)

Use `query-run`:
- Event: `$autocapture` with action type `click`
- Filter: `$current_url` contains `[page-url]`
- Breakdown by `$el_text` or element selector
- Top 10 most-clicked elements

#### 2f. Device Breakdown

Use `query-run`:
- Event: `$pageview`
- Filter: `$current_url` contains `[page-url]`
- Breakdown by `$device_type`

#### 2g. Average Time on Page

Use `query-generate-hogql-from-question`:
- "What is the average session duration for sessions that included [page-url]?"

#### 2h. Exit Pages

Use `query-generate-hogql-from-question`:
- "What pages do users visit after [page-url]?"
- Shows if users convert or leave

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

POST to `/api/admin/reports` with the complete report:

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

### Step 2: Query PostHog Funnel

Use `query-run` with funnel query type:
- Define steps as sequential pageviews
- Get conversion rate between each step
- Get drop-off count at each step
- Breakdown by device type

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

## PostHog MCP Tools Reference

| Tool | Use For |
|------|---------|
| `query-run` | Trend, funnel, and retention queries |
| `query-generate-hogql-from-question` | Natural language → HogQL query |
| `event-definitions-list` | Discover what events are tracked |
| `property-definitions` | Understand event properties |
| `insights-get-all` / `insight-get` | Retrieve saved PostHog insights |
| `experiment-create` | Create AB tests in PostHog |
| `experiment-results-get` | Pull experiment results |

## Integration with AB Test Skills

This skill generates AB test recommendations that follow the `ab-test-designer` hypothesis framework:

1. **Analysis produces recommendations** — Each finding can spawn one or more AB test hypotheses
2. **User approves** — Review recommendations in the report summary
3. **Create tests** — Use `/ab-test create` to implement approved recommendations
4. **Track in PostHog** — Optionally create PostHog experiments via `experiment-create`
5. **Measure results** — Next `/heatmap compare` checks experiment outcomes

## Fallback: No PostHog MCP

If PostHog MCP is not installed (configured in `~/.claude/.mcp.json` via `mcp-remote` → `https://mcp.posthog.com/mcp`):

1. Instruct the user to install it: `npx @posthog/wizard@latest mcp add`
2. Alternatively, user can paste PostHog data manually
3. Use the PostHog toolbar for visual heatmap overlay
4. The skill can still generate reports from manually provided data

## Report Storage

All reports are stored via the existing reports API:

- **Create:** `POST /api/admin/reports`
- **List:** `GET /api/admin/reports`
- **View:** `/admin/reports` in the admin dashboard
- **Types:** `src/types/heatmap-report.ts`
