---
name: social-report
version: 2.0.0
description: "Weekly social media manager accountability report across 6 platform collectors. Triggers: /social-report, 'social media report', 'sm report', 'platform report', 'sm manager report'"
user_invocable: true
command: /social-report
arguments: "[--platform <name>] [--collect-only] [--generate-only] [--from YYYY-MM-DD --to YYYY-MM-DD]"
---

# Social Media Report

Weekly accountability report tracking social media manager output across 6 collectors: YouTube Community, LinkedIn, 3 Skool communities, and Reddit.

## Purpose

Track SM manager posting volume, engagement, and growth with week-over-week comparisons. Generate AI-powered operational alerts and creative strategy recommendations.

## Triggers

- `/social-report`
- "social media report", "sm report", "platform report", "sm manager report"
- "check social media", "how did my SM manager do"

## Platforms & Data Sources

All platforms use Apify actors via the configured APIFY_API_TOKEN:

| Platform | Apify Actor | Env Config |
|----------|-------------|------------|
| YouTube Community | `powerai/youtube-channel-community-scraper` | `SOCIAL_REPORT_YOUTUBE_CHANNEL_ID` (default: Jay's channel) |
| LinkedIn | `harvestapi/linkedin-profile-posts` | `SOCIAL_REPORT_LINKEDIN_URL` |
| Skool (x3) | `memo23/skool-posts-with-comments-scraper` | `SOCIAL_REPORT_SKOOL_URL` + `SKOOL_COOKIES` (required) |
| Reddit | `parseforge/reddit-posts-scraper` | `SOCIAL_REPORT_REDDIT_SUBREDDIT` or `SOCIAL_REPORT_REDDIT_AUTHOR` |
| Facebook Group | `whoareyouanas/facebook-group-scraper` | Currently unsupported (private group, see TODO) |

Skool runs 3 collectors: Insiders, Lead Gen, AIA - each with its own label for dedup.

## Required Environment Variables

Set these in `.env.local`:

```env
# Already configured
APIFY_API_TOKEN=your_token

# Platform-specific (set the ones your SM manager uses)
SOCIAL_REPORT_YOUTUBE_CHANNEL_ID=UC5TQ0_ORokxOHLcybp1QlNA
SOCIAL_REPORT_LINKEDIN_URL=https://www.linkedin.com/in/jayfeldman/
SOCIAL_REPORT_SKOOL_URL=https://www.skool.com/ai-automation-insiders
SOCIAL_REPORT_REDDIT_SUBREDDIT=leadgen
SOCIAL_REPORT_FACEBOOK_GROUP_URL=https://www.facebook.com/groups/yourgroup

# Skool requires browser cookies (export via EditThisCookie extension)
SKOOL_COOKIES='[{"name":"__Secure-next-auth.session-token","value":"...","domain":".skool.com"}]'
```

## Execution Steps

### Live Mode (default)

1. **Collect** - Run all 6 Apify actors in parallel via `Promise.allSettled()`
   - Each collector normalizes data to `CollectorResult` interface
   - 30-day collection window for trend data
   - Cost tracked per actor, cumulative limit $4.50 (abort remaining if exceeded)
   - Partial success OK: failed platforms flagged, report generated with available data

2. **Persist posts** - Upsert all collected posts to `social_posts` table via `upsertPosts()`
   - Dedup key: `(user_id, platform, platform_label, platform_post_id)`
   - On conflict: updates engagement counts (likes, comments, shares, views) + `fetched_at`
   - Posts deduplicated within each batch before upserting

3. **Generate** - Build `WeeklyReport` with WoW comparisons
   - All dates UTC. "This week" = last 7 days. "Last week" = 7 days before that
   - Best/worst posts identified by engagement rate per platform
   - 4-week trend charts from the 30-day collection window
   - Posts with missing dates included in counts but excluded from date filtering

4. **Recommend** - AI analysis via Claude API (sonnet model)
   - Operational alerts: posting frequency drops, engagement declines, neglected platforms
   - Creative suggestions: which content types/formats are working, double-down recommendations
   - 3-5 recommendations with priority (high/medium/low)

5. **Persist report** - Save to Supabase via `generateAndPersistReport()`
   - HTML uploaded to Supabase Storage bucket `social-reports`
   - Report metadata + full JSON saved to `social_reports` table
   - Previous report auto-fetched for WoW comparison (no manual input needed)
   - API: `GET /api/social-report` (list), `POST /api/social-report` (trigger), `GET /api/social-report/[id]` (single)

6. **Digest** - Format condensed iMessage summary (when running scheduled)
   - Platform emoji + post count + delta + top performer + trend arrows
   - High-priority alerts
   - Link to full HTML report

### Historic Mode (`--from` / `--to`)

1. **Load from DB** - Query `social_posts` table for the date range via `getHistoricPostsByPlatform()`
   - Groups by `(platform, platform_label)` to reconstruct `CollectorResult[]`
   - Zero Apify cost - all data from prior live runs
2. **Auto-calculate comparison period** - Same-length window before `--from`
3. **Generate + Persist + Digest** - Same as live mode steps 3-6

## Options

| Flag | Description |
|------|-------------|
| `--collect-only` | Only run data collection, skip report generation |
| `--generate-only` | Skip collection, generate from existing DB data |
| `--platform <name>` | Run single platform only (youtube_community, linkedin, skool, reddit, facebook_group) |
| `--from YYYY-MM-DD --to YYYY-MM-DD` | Historic mode: generate from stored `social_posts` data at $0 cost. Requires prior live runs. Comparison period auto-calculated. |

## Output

### In conversation:
```
SM Report: 2026-04-07 to 2026-04-12

YouTube Community: 3 posts (+1) | 74 avg likes/comments
LinkedIn: 5 posts (-2) | 19 avg likes/comments
Skool - Insiders: 8 posts (+3) | 10 avg likes/comments
Skool - Lead Gen: 7 posts (+2) | 27 avg likes/comments
Skool - AIA: 3 posts (0) | 11 avg likes/comments
Reddit: 2 posts (0) | 3 avg upvotes/comments

Total: 28 posts (+4 WoW)

Alerts:
- LinkedIn posting down 29% - follow up with SM manager
- Skool engagement up 45% - community posts are resonating

Full report: https://your-app.com/api/social-report/sr-2026-04-12-abc123
```

### HTML report: stored in Supabase, viewable via `/api/social-report/{id}/html`
### iMessage digest: sent via osascript on Mac Mini scheduled tasks

## Cost

| Mode | Cost per run |
|------|-------------|
| Live (Apify scrape) | ~$1.00-1.40 |
| Historic (DB only) | $0.00 |

Well under the $5 Apify spending limit per run.

## Scheduled Execution

Mac Mini launchd task: `com.claude.social-report.plist`
- Schedule: Monday 7:17 AM
- Command: `claude -p "Run /social-report and send the summary via iMessage"`
- Logs: `/tmp/com.claude.social-report.log`

## Error Handling

- **1-2 platforms fail**: Report generated with available data. Failed platforms show "Data unavailable" section
- **4-5 platforms fail**: Return error instead of generating misleading report
- **Skool cookies expired**: Logged as warning, Skool section skipped. Re-export cookies to fix
- **Apify token missing**: Error before any collection starts
- **Cost limit exceeded**: Remaining collectors skipped, report generated with collected data
- **Duplicate posts in batch**: Auto-deduplicated before upsert (Skool actors sometimes return dupes)

## TODO: Facebook Group (Private)

The Lead Gen Insiders Facebook Group is **private**. No reliable automated scraper exists:
- Meta Graph API removed all Groups access April 22, 2024
- Apify public scrapers return "empty or private data"
- Cookie-auth scrapers (whoareyouanas) authenticate but return empty/broken data

**Future options:**
1. Convert group to public - `apify/facebook-groups-scraper` (25K users, 98.7% success) would work immediately
2. Build Playwright browser automation collector using saved Facebook session (extend `scripts/publish-skool.mjs` pattern)
3. Wait for a better Apify actor with reliable private group support

Currently the collector returns a descriptive error and the report gracefully skips Facebook Group.

## Database Tables

| Table | Purpose |
|-------|---------|
| `social_reports` | Report metadata, full JSON, HTML URL, cost, timing |
| `social_posts` | Individual posts with engagement metrics, dedup by `(user_id, platform, platform_label, platform_post_id)` |

## Key Files

```
lib/social-report/
  types.ts              - TypeScript interfaces (WeeklyReport, StoredReport, PlatformTrend, etc.)
  generator.ts          - Report generation + AI recommendations + generateAndPersistReport() + generateHistoricReport()
  storage.ts            - Supabase persistence (saveReport, getPreviousReport, upsertPosts, getHistoricPostsByPlatform)
  html-template.ts      - HTML report rendering (trend charts, 2-col grid, SVG bars)
  imessage.ts           - iMessage digest formatting with trend arrows
  collectors/
    index.ts            - Shared Apify helper, collectAll() orchestration
    youtube-community.ts
    linkedin.ts
    skool.ts
    reddit.ts
    facebook-group.ts
app/api/social-report/
  route.ts              - GET (list reports) + POST (trigger generation)
  [id]/route.ts         - GET single report by report_id
  [id]/html/route.ts    - Serve HTML report with correct Content-Type
scripts/
  run-social-report.ts  - Standalone runner (live + historic modes)
supabase/migrations/
  20260413_social_reports.sql - social_reports table
  20260413_social_posts.sql   - social_posts table with dedup constraint + RLS
```
