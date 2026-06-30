---
name: youtube-pro-pack
description: >
  Bundle: run your YouTube channel end-to-end from Claude Code. Installs six chained skills —
  `yt-research` (viral ideas + 10x competitor outliers), `yt-longtail` (low-competition keyword
  research), `youtube-script` (retention scripts with comment-gap mining + teleprompter output),
  `youtube-thumbnail` (competitor thumbnail research + fal.ai GPT-Image-2 generation),
  `youtube-tester` (thumbnail A/B Test & Compare), and `youtube-description` (SEO descriptions).
  Use when you want the whole pipeline — idea to published video — not just one piece.
---

# YouTube Pro System (YouTube Pack)

Six skills that chain into one operator-run YouTube growth engine: **idea → keywords → script → thumbnail → test → describe.** One person runs the whole thing from Claude Code — no editor, no $300/mo research SaaS, no thumbnail designer, no agency.

| # | Skill | What it does | When |
|---|---|---|---|
| 1 | **`yt-research`** | Find + score long-form video ideas across two phases — **Evergreen** (keyword discovery + real search volume + competitor *unicorn* / 10x-outlier analysis) and **Timely** (high-velocity competitor videos). Ranks every idea on a 4-factor matrix (Opportunity, Ranking, Trend, Content Fit) into MAKE IT / WATCH / SKIP. | **First** — decide what to make from data, not guesswork. |
| 2 | **`yt-longtail`** | Drill into one topic: autocomplete-scrape long-tail keywords, estimate volume, score competition, and surface the low-competition / high-opportunity winners with suggested angles. | **Then** — lock the exact keyword + title angle for the idea you picked. |
| 3 | **`youtube-script`** | Research the topic (scrape top competitors), **mine their video comments for unanswered questions + content gaps**, then write a retention-optimized hook/body/CTA script. Emits a **teleprompter-ready** reading file (spoken words only) plus a separate run-of-show. | **Then** — turn the topic into a script you can read on camera. |
| 4 | **`youtube-thumbnail`** | Research proven competitor thumbnails, differentiate them, swap your face in, and add bold headlines — all remix generation via the **fal.ai GPT-Image-2 Edit** API. Never generates from scratch; it remixes what already works. | **Then** — produce 5-6 click-tested thumbnail candidates. |
| 5 | **`youtube-tester`** | Take your top candidates, design hypothesis-driven variants, generate them, and upload to YouTube's native **Test & Compare** for a real CTR split test. | **Then** — let YouTube pick the winner on live traffic. |
| 6 | **`youtube-description`** | Write the SEO description — timestamps/chapters, lead-magnet CTA, and UTM-tracked links — under the 5,000-char limit with above-the-fold optimization. | **Last** — finish the upload metadata. |

**Recommended order:** `yt-research` (pick the idea) → `yt-longtail` (lock the keyword) → `youtube-script` (write it, comment-gaps included) → `youtube-thumbnail` (make the thumbnails) → `youtube-tester` (A/B them) → `youtube-description` (metadata).

Installing this pack installs all six skills; each also works standalone. See each skill's own `SKILL.md` for its tool checklist and cost notes (most steps that hit Apify or fal.ai print an estimated cost before they run).

---

## Step 0 — Prerequisites

Before running any part of the pipeline, verify these are present. If any are missing, STOP and set it up (the **Getting started from zero** section below walks you to where you mint each one) — do NOT generate placeholder commands or fake keys.

| Requirement | Check | Where to get it |
|---|---|---|
| The 6 bundled skills installed | `ls ~/.claude/skills/yt-research ~/.claude/skills/youtube-script ~/.claude/skills/youtube-thumbnail` — all three resolve | Installing this pack installs all six |
| **YouTube Data API v3 key** (`YOUTUBE_API_KEY`) | `echo $YOUTUBE_API_KEY` (or `grep YOUTUBE_API_KEY .env.local`) is non-empty | console.cloud.google.com → enable "YouTube Data API v3" → create an API key |
| **fal.ai key** (`FAL_KEY`) — thumbnails | `echo $FAL_KEY` (or `grep FAL_KEY .env.local`) is non-empty | fal.ai → Dashboard → Keys |
| **Apify token** (`APIFY_API_TOKEN`) + Apify MCP — competitor + comment scraping | `echo $APIFY_API_TOKEN` is non-empty AND the Apify MCP is connected | apify.com → Settings → Integrations → API token |
| **YouTube Analytics OAuth** (your channel) — optional, for ranking scores | the YouTube Analytics MCP auth check confirms *your* channel id | connect your Google/YouTube account via the MCP `auth` flow |

If anything required is missing, STOP. Do NOT proceed with broken state or invent placeholder values.

> **These skills ship tuned to Lead Gen Jay's channel as the worked example** — channel handle, competitor list, brand voice, and credibility anchors are Jay's. Point them at *your* channel: tell Claude your handle/channel id, swap the competitor list in `yt-research/references/youtube-competitors.json`, and give it your own brand context when it asks. The pipeline and scoring are channel-agnostic; only the examples are Jay's.

---

## Getting started from zero

New to this? You need a handful of free/cheap accounts + API keys before the skills can run. Claude **never writes a secret key for you** — it walks you to where you mint each one, and you paste it into your own `.env.local` (or shell env). Set these up once:

| # | What | Why the pack needs it | Where to get it |
|---|---|---|---|
| 1 | **YouTube Data API v3 key** | Search competitor videos + read public channel/video stats (thumbnail research, channel analysis). | console.cloud.google.com → create a project → **APIs & Services → Library → enable "YouTube Data API v3"** → **Credentials → Create credentials → API key**. Free tier = 10,000 units/day. |
| 2 | **Apify account + API token** | Scrape competitor videos, view velocity, and **video comments** (the gap-finder) at scale — beyond the Data API's quotas. | apify.com → sign up → **Settings → Integrations → API token**. Pay-per-result; the skills estimate cost before each run. Add the **Apify MCP** to Claude Code so the skills can call the YouTube scraper. |
| 3 | **YouTube Analytics OAuth (your channel)** | Channel analysis + ranking-probability scoring use *your* channel's real analytics. | Connect your own Google/YouTube account via the YouTube Analytics MCP (run its `auth` once). This authorizes read-only access to **your** channel — confirm it shows *your* channel id, not the example one. |
| 4 | **fal.ai API key (`FAL_KEY`)** | Thumbnail generation + body-swap (GPT-Image-2 Edit) and the A/B variants run on fal.ai. | fal.ai → **Dashboard → Keys**. Export as `FAL_KEY` in your env. Thumbnails cost ~$2.50-3.30 per session. |
| 5 | **Google Ads Keyword Planner (optional, free)** | Real monthly search volume for the Evergreen phase of `yt-research`. Skipped gracefully if absent (uses estimates). | A free Google Ads account → API access; `yt-research` reads its own `references/google-ads-config.json`. Optional — the pack still runs without it. |

**Then point the skills at your channel:** when you first run `yt-research` or `youtube-script`, give Claude your channel handle + the 3-5 competitor channels you want to track. That seeds the competitor list and brand context the rest of the pipeline reuses.

**Don't have all five yet?** Start with **#1 (YouTube Data API)** + **#4 (fal.ai)** — that unlocks research, scripts, and thumbnails. Add Apify (#2) when you want deep competitor + comment scraping, and the YouTube Analytics OAuth (#3) when you want ranking scores tuned to your own channel.
