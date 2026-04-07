# Content Report — Research to Shareable Report

Format `/content-research` output into a branded HTML report with clickable links, upload to Supabase, and return a shareable URL.

## Triggers

"content report", "research report", "format research", "generate report", "share research", "make a report"

## Prerequisites

- Content-research output in the current conversation (from any of the 5 modes)
- Supabase credentials in env (`NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`)

## Workflow

### Step 1 — Identify Mode

Determine which content-research mode produced the output:
- `competitors` — tracked creator list
- `scrape` — scraped video data with engagement metrics
- `analyze` — outlier report, hooks, gap analysis
- `trending` — viral signal intelligence with 4-factor scoring
- `quick` — fast topic research ideas

### Step 2 — Structure JSON

Transform the research output into the JSON schema below. Write to `/tmp/content-report-data.json`.

**Every item MUST include `url` when available** — these become clickable links in the report.

**No em dashes** (`—` or `–`) anywhere in the JSON data — use regular hyphens `-` only.

**Every recommendation MUST include `sourceUrl` and `archetype`** — empty values render broken layout.

**Always include exactly 4 recommendations** in `sections.recommendations` (trending/analyze modes). Pick the top 4 by score. If fewer than 4 MAKE IT signals exist, promote the top WATCH signals to fill.

### Step 3 — Generate Report

```bash
node scripts/generate-content-report.mjs
```

This will:
1. Read `/tmp/content-report-data.json`
2. Fill `templates/content-report.html`
3. Write `/tmp/content-report.html` (local preview)
4. Convert to PDF via Chrome headless (`/tmp/content-report.pdf`)
5. Upload HTML to Supabase `reports` bucket
6. Print the shareable URL

### Step 4 — Deliver

Share the URL with the user. Format:
```
https://www.lgjsocial.com/share/report/{uuid}
```

Open `/tmp/content-report.html` in browser for local preview if needed.

---

## JSON Schema

### Base Structure (all modes)

```json
{
  "mode": "trending",
  "topic": "AI lead generation tools",
  "date": "2026-04-07",
  "platforms": ["YouTube", "X", "Reddit"],
  "summary": {
    "totalSignals": 24,
    "makeIt": 5,
    "watch": 11,
    "skip": 8,
    "cost": "$0.12"
  },
  "items": [],
  "sections": {}
}
```

### Mode: competitors

```json
{
  "items": [
    {
      "creator": "@alexberman",
      "platform": "YouTube",
      "url": "https://youtube.com/@alexberman",
      "metrics": {},
      "details": {
        "lastScraped": "2026-04-07",
        "videoCount": 47,
        "followerCount": 125000
      }
    }
  ]
}
```

### Mode: scrape

```json
{
  "summary": {
    "totalSignals": 30,
    "creatorCount": 5,
    "cost": "$0.08",
    "validation": { "checked": 50, "live": 48, "dead": 2 },
    "costBreakdown": {
      "youtube": { "scrapeCount": 30, "costUSD": 0.03 },
      "instagram": { "scrapeCount": 20, "costUSD": 0.05 }
    }
  },
  "items": [
    {
      "title": "How I Got 100 Clients Using AI",
      "creator": "@handle",
      "platform": "YouTube",
      "url": "https://youtube.com/watch?v=...",
      "metrics": { "views": 45000, "likes": 3200, "comments": 89 },
      "score": null,
      "decision": null,
      "details": {
        "hook": "Stop doing cold email the old way...",
        "structure": "Problem-Solution",
        "contentType": "Tutorial",
        "visualFormat": "Screen Recording"
      }
    }
  ]
}
```

### Mode: analyze

```json
{
  "items": [
    {
      "title": "AI Agents Replace SDRs",
      "creator": "@handle",
      "platform": "YouTube",
      "url": "https://youtube.com/watch?v=...",
      "metrics": { "views": 45000, "likes": 3200, "comments": 89 },
      "score": 18.75,
      "decision": "MAKE_IT",
      "details": {
        "outlierScore": 18.75,
        "avgViews": 2400,
        "engagementRate": 0.087,
        "hook": "The hook text here",
        "hookFramework": "What if [X] could [Y] without [Z]?"
      }
    }
  ],
  "sections": {
    "gapAnalysis": [
      {
        "angle": "AI automation for agencies",
        "competitors": 3,
        "youtubeResults": 12,
        "gap": "Moderate - 4 existing"
      }
    ]
  }
}
```

### Mode: trending

```json
{
  "items": [
    {
      "title": "Claude Code replaces junior devs",
      "creator": "X thread by @user",
      "platform": "X",
      "url": "https://x.com/user/status/...",
      "metrics": { "views": null, "likes": 8500 },
      "score": 17.5,
      "decision": "MAKE_IT",
      "details": {
        "primacy": 5,
        "velocity": 4,
        "authority": 4,
        "contentFit": 5
      }
    }
  ],
  "sections": {
    "youtubeLandscape": [
      {
        "angle": "AI replacing developers",
        "existingVideos": 127,
        "saturation": "High",
        "topVideo": {
          "title": "Will AI Replace Programmers?",
          "url": "https://youtube.com/watch?v=...",
          "views": 500000
        }
      }
    ],
    "recommendations": [
      {
        "angle": "Claude Code for Lead Gen Automation",
        "sourceUrl": "https://x.com/user/status/123",
        "hooks": ["Hook 1", "Hook 2"],
        "formats": ["YouTube Short", "Instagram Reel"],
        "archetype": "Educational",
        "decision": "MAKE_IT",
        "rationale": "High velocity on X, low YouTube saturation"
      }
    ]
  }
}
```

### Mode: quick

```json
{
  "items": [
    {
      "title": "AI Tools That Replace Cold Calling",
      "creator": "WebSearch + Supabase",
      "platform": "YouTube",
      "url": null,
      "metrics": {},
      "score": 8.2,
      "decision": "MAKE_IT",
      "details": {
        "hook": "Stop cold calling. Use this instead.",
        "format": "YouTube Short",
        "whyItWorks": "High search volume, low competition, strong Jay angle"
      }
    }
  ]
}
```

---

## Design

- **Font**: Manrope (Google Fonts)
- **Colors**: `#1A1A1A` dark, `#ED0D51` accent, `#fff8e1`/`#8d6e00` highlights
- **Decisions**: Green (MAKE IT), Yellow (WATCH/MAYBE), Gray (SKIP)
- **Layout**: Compact 2-column card grids, dense tables, ~3 pages when printed
- **Links**: All source URLs are clickable (red accent color)

## Output

| Output | Location |
|--------|----------|
| HTML report | `/tmp/content-report.html` |
| PDF report | `/tmp/content-report.pdf` |
| Shareable URL | `https://www.lgjsocial.com/share/report/{uuid}` |

## Chaining

This skill chains FROM `/content-research` (any mode). Run research first, then `/content-report` to format and share.
