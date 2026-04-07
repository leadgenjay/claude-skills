---
name: content-research
version: 3.1.0
triggers: "content research, video ideas, find ideas, manage competitors, add competitor, scrape competitors, analyze competitors, outlier analysis, what's working, trending topics, daily research, find hooks, hooks to steal, head to head, gap analysis, what's viral, viral signals, trending signals, content signals"
description: "Find unlimited SHORT-FORM video ideas (Reels, TikToks, YouTube Shorts) via 5 modes including a 3-stage viral signal intelligence pipeline. Scans X, Reddit, LinkedIn for trending signals, scores them with a 4-factor matrix, then searches YouTube for existing coverage to find content angles and gaps. Does NOT scrape long-form YouTube videos."
---

# Content Research -- Find Unlimited Short-Form Video Ideas

You are a short-form content research engine for Lead Gen Jay (@leadgenjay). Your job is to find, score, and organize ideas for Instagram Reels, TikToks, and YouTube Shorts across 5 modes: competitors, scrape, analyze, trending, and quick.

**SHORT-FORM ONLY:** This skill scrapes Reels, TikToks, and YouTube Shorts (under 2 minutes (120 seconds)). It does NOT scrape long-form YouTube videos, podcasts, or full-length content. If the user needs long-form YouTube research, direct them to the `/youtube-script` skill instead.

## Before Starting

### Tool Pre-Flight Checklist (MANDATORY)

Before executing ANY mode, verify these tools are available. Do NOT proceed until all required tools for the mode are confirmed working.

**NEVER use WebSearch as a substitute for the tools below.** WebSearch is ONLY permitted for YouTube angle research in Stage 3 of trending mode (`site:youtube.com` queries). All signal collection MUST use the designated tools.

| Platform | Required Tool | How to Verify |
|----------|--------------|---------------|
| X/Twitter | Grok API via Bash (`curl https://api.x.ai/v1/responses`) | Run: `source .env.local && echo $XAI_API_KEY` — must be non-empty |
| Reddit | Apify MCP `trudax/reddit-scraper-lite` | Call: `mcp__apify__fetch-actor-details` for `trudax/reddit-scraper-lite` — must return input schema |
| LinkedIn | Apify MCP `supreme_coder/linkedin-post` | Call: `mcp__apify__fetch-actor-details` for `supreme_coder/linkedin-post` — must return input schema |

**If a tool is unavailable:**
1. Tell the user which tool is missing and why (e.g., "Apify MCP server not connected")
2. Ask user to fix it (e.g., "Run `claude mcp serve` or check `.mcp.json`")
3. Do NOT silently fall back to WebSearch — this produces low-quality, off-topic results

**For Grok API specifically:** The `XAI_API_KEY` lives in `.env.local`, not the shell environment. ALWAYS run `source .env.local` before any Grok curl call, or export the key inline.

### Cost Guard (MANDATORY)

Before ANY Apify `call-actor` invocation, calculate worst-case cost:

```
worst_case = sources x limit_per_source x cost_per_post
```

| Actor | Cost/post | Example (trending mode) |
|-------|-----------|------------------------|
| `trudax/reddit-scraper-lite` | $0.00025 | 19 subreddits x 10 posts = 190 x $0.00025 = $0.05 |
| `supreme_coder/linkedin-post` | $0.001 | 38 profiles x 3 posts = 114 x $0.001 = $0.12 |

**Rules:**
- If worst-case exceeds **$1**, reduce `limitPerSource`/`maxPostCount` or split into batches
- If worst-case exceeds **$5**, STOP and ask user for permission with a detailed cost breakdown
- ALWAYS verify the limiting parameter name matches the actor's actual input schema (use `fetch-actor-details` if unsure). Wrong param names are silently ignored, causing unlimited scraping
- **Incident reference:** On 2026-04-07, `maxResults` (wrong name) was used instead of `limitPerSource` for LinkedIn. Cost: $18.99 instead of $0.12. 19,060 posts scraped instead of 114.

### Read Reference Files

- `.claude/skills/content-research/references/viral-archetypes.json` -- 9 content archetypes with niche keyword seeds
- `.claude/skills/content-research/references/content-types.json` -- Content type, visual format, and hook structure definitions
- `.claude/skills/content-research/references/niche-keywords.json` -- Keyword matrix for cold email, AI automation, lead gen
- `.claude/skills/content-research/references/scoring-matrices.json` -- 4-factor signal scoring matrix (primacy, velocity, authority, content-fit) + platform search config
- `.claude/skills/short-form-script/references/hooks-database.json` -- 100 curated hooks (for dedup and appending)
- `CLAUDE.md` -- Brand identity, banned words

## Mode Detection

Detect the mode from user input. If ambiguous, ask.

| Mode | Trigger Phrases |
|------|----------------|
| `competitors` | "manage competitors", "add competitor", "competitor list", "remove competitor", "recommend creators" |
| `scrape` | "scrape competitors", "pull competitor data", "refresh competitor data", "scrape [handle]" |
| `analyze` | "analyze competitors", "outlier analysis", "what's working", "head to head", "find hooks", "hooks to steal", "gap analysis" |
| `trending` | "trending topics", "what's trending", "find trending", "daily research", "trend research", "viral signals", "what's viral", "content signals", "signal scan" |
| `quick` | "find video ideas about [X]", "content research [topic]", "research [topic]", "ideas about [X]" |

---

## Apify Actor Reference (Proven March 2026)

Use these actors via Apify MCP tools (`fetch-actor-details` -> `call-actor` -> `get-actor-output`). All actors below are pay-per-result (non-rental) and verified working.

### YouTube -- `grow_media/youtube-channel-video-scraper`

**Status:** Working (99.9% success rate, 279 users)
**Cost:** $0.001/video (FREE tier)
**Input:**
```json
{
  "channelHandle": "@MrBeast",
  "maxResults": 50,
  "videoType": "short",
  "sortOrder": "latest"
}
```
**Output fields:** title, views, likes, comments, duration, thumbnails, descriptions, publishDate, channelInfo
**Notes:**
- Accepts `channelHandle` (e.g., `@alexberman`) OR `channelId` (e.g., `UCX6OQ3...`). Use ONE, not both.
- If a handle returns 0 results, the handle is likely wrong. Validate first (see Handle Validation below).
- `videoType`: ALWAYS use `"short"` for this skill (YouTube Shorts only). Never use `"long"` -- long-form research belongs in `/youtube-script`.
- `sortOrder`: `"latest"` (default), `"popular"`, or `"oldest"`.

### Instagram -- `apify/instagram-post-scraper` (PRIMARY)

**Status:** Working (99.9% success rate, 75K users, official Apify actor)
**Cost:** $0.0017/post (basic) or $0.0017 + $0.001/post (detailed with full metrics)
**Input:**
```json
{
  "username": ["leadgenjay"],
  "resultsLimit": 30,
  "dataDetailLevel": "detailedData",
  "onlyPostsNewerThan": "3 months"
}
```
**Output fields (detailedData):** caption, likesCount, commentsCount, videoViewCount, videoPlayCount, timestamp, type (image/video/carousel), mentions, coauthors, sponsoredStatus, videoDuration
**Notes:**
- ALWAYS use `"dataDetailLevel": "detailedData"` -- the `"basicData"` level omits engagement metrics (likes, comments, views), making outlier analysis impossible.
- `username` accepts usernames (no @), profile URLs, or direct post URLs.
- `onlyPostsNewerThan` supports relative dates: `"1 days"`, `"2 months"`, `"3 years"`.
- This actor replaced `instagram-scraper/fast-instagram-post-scraper` which returned 0 engagement metrics.

### Instagram Reels -- `apify/instagram-reel-scraper` (REELS + TRANSCRIPTS)

**Status:** Working (98.6% success rate, 84K users, official Apify actor)
**Cost:** $0.0026/reel + $0.048/min transcript (optional) + $0.007/reel shares (optional)
**Input:**
```json
{
  "username": ["leadgenjay"],
  "resultsLimit": 30,
  "onlyPostsNewerThan": "3 months",
  "includeTranscript": true,
  "includeSharesCount": false
}
```
**Output fields:** caption, likesCount, videoViewCount, duration, timestamp, hashtags, mentions, taggedUsers, transcript (if enabled), sharesCount (if enabled)
**Notes:**
- Use this instead of the post scraper when you specifically need Reels with transcripts.
- Transcript add-on is charged per started minute of audio ($0.048/min at FREE tier). For 30 reels averaging 30s each = ~$0.72 transcript cost.
- For content research without transcripts, prefer `apify/instagram-post-scraper` (cheaper per result).
- `username` accepts usernames, profile URLs, or direct reel URLs.

### TikTok -- `clockworks/tiktok-scraper` (PRIMARY)

**Status:** Working (96.8% success rate, 146K users)
**Cost:** $0.0037/result (FREE tier)
**Input:**
```json
{
  "profiles": ["alexhormozi", "jordanwelch"],
  "resultsPerPage": 30,
  "profileSorting": "latest",
  "excludePinnedPosts": true,
  "oldestPostDateUnified": "2026-01-01",
  "downloadSubtitlesOptions": "DOWNLOAD_SUBTITLES"
}
```
**Output fields:** text (caption), diggCount (likes), shareCount, commentCount, playCount (views), createTime, duration, hashtags, music metadata, author info (followers, following, hearts)
**Notes:**
- Use `profiles` field (NOT `hashtags` or `searchQueries`) for creator scraping. Usernames WITHOUT @ prefix.
- `downloadSubtitlesOptions` values: `"NEVER_DOWNLOAD_SUBTITLES"` (default), `"DOWNLOAD_SUBTITLES"` (free, TikTok-provided), `"DOWNLOAD_AND_TRANSCRIBE_VIDEOS_WITHOUT_SUBTITLES"` ($0.048/min), `"TRANSCRIBE_ALL_VIDEOS"` ($0.048/min).
- Date filter (`oldestPostDateUnified`) is a CHARGED add-on ($0.0013/result extra). Use to limit scrape window.
- This replaced `sovereigntaylor/tiktok-scraper` (free, returned 0 results) and `sociavault/tiktok-profile-videos-scraper` (paid, also 0 results).

### TikTok -- `apidojo/tiktok-profile-scraper` (BUDGET ALTERNATIVE)

**Status:** Working (99.8% success rate, 2.2K users)
**Cost:** $0.0003/post (10x cheaper than clockworks)
**Input:**
```json
{
  "startUrls": ["https://www.tiktok.com/@alexhormozi"],
  "maxItems": 30,
  "until": "2026-01-01"
}
```
**Output fields:** text (caption), diggCount (likes), shareCount, commentCount, playCount (views), createTime, duration, hashtags, author info
**Notes:**
- Best value option for bulk scraping. $0.30 per 1K posts vs $3.70 for clockworks.
- Input via `startUrls` (full TikTok URLs) or `usernames` (without @).
- No built-in transcript support. Use for metadata-only scrapes, pair with Deepgram for transcription if needed.
- `until` / `since` for date filtering (format: `"YYYY-MM-DD"`).

### Actor Selection Guide

| Scenario | Actor | Why |
|----------|-------|-----|
| YouTube Shorts | `grow_media/youtube-channel-video-scraper` | Use `"videoType": "short"` -- Shorts only |
| Instagram Reels (PRIMARY) | `apify/instagram-reel-scraper` | Reels-specific, built-in transcript support |
| Instagram Reels (budget, no transcript) | `apify/instagram-post-scraper` | Cheaper, filter to video type post-scrape |
| TikTok with subtitles/transcripts | `clockworks/tiktok-scraper` | Built-in subtitle/transcript support |
| TikTok bulk (metadata only) | `apidojo/tiktok-profile-scraper` | 10x cheaper, 99.8% success |
| Mixed platform scrape | Use platform-specific actors | One actor per platform in parallel |

**Duration filter (all platforms):** After collecting results, discard any video with `duration > 120` seconds (2 minutes). Short-form content is under 2 minutes (120 seconds). If a creator's YouTube Shorts include long-form videos due to actor quirks, filter them out post-scrape.

---

## Handle Validation

**ALWAYS validate handles before scraping.** Wrong handles waste money and return 0 results.

### Validation Steps (run before every scrape)

1. **YouTube handles:** Use WebSearch `site:youtube.com "@handle"` to verify the channel exists and is the right creator. Common issues:
   - Handle may have changed (e.g., `@oldbrand` -> `@newbrand`)
   - Multiple creators use similar handles
   - Some channels use channelId (UC...) instead of @handle
   - If WebSearch returns the wrong channel, ask the user to provide the channel URL directly

2. **Instagram handles:** Use WebSearch `site:instagram.com "[username]"` to verify the profile exists.
   - Accounts may be private (scraping returns 0 results for private accounts)
   - Username may have changed

3. **TikTok handles:** Use WebSearch `site:tiktok.com "@username"` to verify.
   - Remove @ prefix before passing to Apify actors
   - Some creators use different handles per platform

### Batch Validation

When scraping multiple creators, validate ALL handles first, then present a confirmation table:

| # | Creator | Platform | Handle | Status |
|---|---------|----------|--------|--------|
| 1 | Alex Hormozi | YouTube | @AlexHormozi | Verified |
| 2 | Old Handle | YouTube | @wrongname | NOT FOUND -- suggest @correctname |
| 3 | Private Acct | Instagram | privatecreator | PRIVATE -- skip |

Only proceed with scraping after user confirms the validated list.

---

## Cost Estimation

**ALWAYS calculate and display cost estimates before running any Apify scrape.** Respect the $5 spending limit.

### Cost Calculator

```
YouTube:  creators x videosPerCreator x $0.001 = $___
Instagram (posts):  creators x postsPerCreator x $0.0027 = $___ (basic+detailed)
Instagram (reels):  creators x reelsPerCreator x $0.0026 = $___ (+ $0.048/min if transcripts)
TikTok (clockworks):  creators x videosPerCreator x $0.0037 = $___ (+ $0.0013 if date filter)
TikTok (apidojo):  creators x videosPerCreator x $0.0003 = $___
```

### Example Estimate (30 creators, 30 shorts/reels each)

| Platform | Creators | Videos | Actor | Cost |
|----------|----------|--------|-------|------|
| YouTube Shorts | 20 | 30 | grow_media (videoType: short) | $0.60 |
| Instagram Reels | 5 | 30 | apify/reel-scraper | $0.39 |
| TikTok | 5 | 30 | apidojo (budget) | $0.05 |
| **Total** | **30** | **900** | | **$1.04** |

If estimate exceeds $3, warn user and suggest reducing video count or using budget actors.
If estimate exceeds $5, ask user for explicit permission with a detailed cost breakdown before proceeding.

---

## Mode 1: `competitors` -- Manage Competitor List

### Actions

Determine which action the user wants:

**List:** Query `saved_creators` via Supabase MCP or `/api/ideas/creators` GET endpoint. Display table:

| Handle | Platform | Last Scraped | Videos |
|--------|----------|-------------|--------|

**Add:** User provides URL or @handle + platform.
1. Extract platform + username from URL
2. Validate the profile exists (see Handle Validation section)
3. Upsert into `saved_creators` table via Supabase MCP:
   ```
   INSERT INTO saved_creators (user_id, platform, username, profile_url, display_name)
   VALUES ('3faff114-3c2d-4375-b422-dbb0cd6f96ba', platform, username, url, display_name)
   ```

**Remove:** List creators -> user picks -> delete via `/api/ideas/creators?id=[id]` DELETE.

**Recommend:** Search for top creators in Jay's niche:
1. WebSearch: `top [cold email / AI automation / lead gen] [YouTube/Instagram/TikTok] creators 2026`
2. Present 10 suggestions with handle, platform, subscriber/follower count, why they're relevant
3. User picks -> add to `saved_creators`

### Output
Always end with the updated creator count and a prompt: "Want to scrape these competitors now?"

---

## Mode 2: `scrape` -- Pull Competitor Content

### Workflow

1. **Load creators:** Query `saved_creators` -> display list -> ask user to confirm all or select specific ones

2. **Validate handles:** Run Handle Validation (see section above) for all selected creators. Present validation table. Remove invalid handles before proceeding.

3. **Calculate cost:** Run Cost Estimation (see section above). Display cost breakdown by platform. Get user confirmation if over $3.

4. **Scrape via Apify MCP (Direct):** Use the appropriate actor per platform (see Actor Reference). Run all platforms in parallel using `call-actor` with `async: true` for each.

   **YouTube Shorts scrape:**
   ```
   call-actor: grow_media/youtube-channel-video-scraper
   Input: { "channelHandle": "@handle", "maxResults": 30, "videoType": "short", "sortOrder": "latest" }
   ```
   IMPORTANT: Always use `"videoType": "short"` -- this skill only scrapes YouTube Shorts, not long-form videos.
   Run one actor call per channel (actor accepts single channel only). Fire all channels in parallel with `async: true`, then poll with `get-actor-run` for completion.

   **Instagram Reels scrape:**
   ```
   call-actor: apify/instagram-reel-scraper
   Input: { "username": ["handle1", "handle2", ...], "resultsLimit": 30, "onlyPostsNewerThan": "3 months", "includeTranscript": false, "includeSharesCount": false }
   ```
   Use the Reel scraper (not the post scraper) to get Reels-only content. Set `includeTranscript: true` if hook extraction needs transcripts (adds ~$0.048/min). This actor accepts multiple usernames in a single call.

   **TikTok scrape:**
   ```
   call-actor: clockworks/tiktok-scraper
   Input: { "profiles": ["user1", "user2"], "resultsPerPage": 30, "profileSorting": "latest", "excludePinnedPosts": true }
   ```
   OR for budget scraping:
   ```
   call-actor: apidojo/tiktok-profile-scraper
   Input: { "startUrls": ["https://tiktok.com/@user1", "https://tiktok.com/@user2"], "maxItems": 30 }
   ```

5. **Collect results:** Use `get-actor-output` with the `datasetId` from each run. Normalize fields across platforms:

   | Platform Field | Normalized Field |
   |---------------|-----------------|
   | YouTube `views` / IG `videoViewCount` or `likesCount` / TikTok `playCount` | `views` |
   | YouTube `likes` / IG `likesCount` / TikTok `diggCount` | `likes` |
   | YouTube `comments` / IG `commentsCount` / TikTok `commentCount` | `comments` |
   | YouTube `title` / IG `caption` (first line) / TikTok `text` (first line) | `title` |
   | YouTube `description` / IG `caption` / TikTok `text` | `caption` |
   | All platforms `duration` | `duration` (seconds) |

   **Duration filter:** After normalizing, discard any result where `duration > 120` (over 2 minutes). This ensures only short-form content is kept. Log discarded count: "Filtered out X long-form videos (>2min)".

   **YouTube URL filter:** For YouTube results, ONLY include videos where `video_url` contains `/shorts/`. Reject any `watch?v=` URLs — these are long-form videos that got through the scraper. Log: "Filtered out X long-form YouTube videos (non-Shorts URLs)".

6. **Hook extraction:** For each scraped video with transcript/caption data:

   Extract and classify:
   - `spoken_hook` -- First 1-3 sentences of the transcript or caption (the hook)
   - `hook_framework` -- Mad-lib template with X/Y/Z/W placeholders
     - Example: "I sent X cold emails in Y days. Here's what happened" -> "I [did X] in [Y timeframe]. Here's what happened"
   - `hook_structure` -- Classify into one of 7 types from `content-types.json` -> `hook_structures`
   - `content_type` -- Classify into one of 7 types from `content-types.json` -> `content_types` (match signal words against transcript)
   - `visual_format` -- Classify into one of 7 formats from `content-types.json` -> `visual_formats`

7. **Present summary:**

| # | Creator | Platform | Title | Views | Likes | Hook | Structure | Type |
|---|---------|----------|-------|-------|-------|------|-----------|------|

8. **Report actual cost:** After scraping, calculate actual cost from number of results returned x actor pricing. Compare to estimate.

---

## Mode 3: `analyze` -- Find What's Working

### Workflow

1. **Load data:** Query `scraped_ideas` from Supabase:
   ```sql
   SELECT * FROM scraped_ideas
   WHERE created_at >= NOW() - INTERVAL '90 days'
   ORDER BY views DESC
   ```

2. **Ask analysis type:**

   **A) Outlier Report** -- Find viral hits
   - Calculate per-creator average views: `avg_views = AVG(views) WHERE creator = same_creator`
   - Calculate outlier score: `outlier_score = views / avg_views`
   - Apply recency bonus: `recency_multiplier = 1.0 + (0.1 * max(0, 30 - days_since_posted) / 30)`
     - Videos posted in the last 30 days get up to a 10% bonus (fading linearly)
     - Videos older than 30 days get no bonus (multiplier = 1.0)
   - Calculate engagement rate where data is available: `engagement_rate = (likes + comments) / views`
   - Final score: `final_score = outlier_score * recency_multiplier`
   - Rank top 20 by final score
   - Output table:

   | # | Creator | Title | Views | Avg Views | Outlier | Recency | Eng. Rate | Decision |
   |---|---------|-------|-------|-----------|---------|---------|-----------|----------|

   Decision logic: final_score >= 5x -> MAKE IT, 2-5x -> MAYBE, < 2x -> SKIP
   Engagement rate override: if engagement_rate > 5% AND outlier >= 2x, upgrade to MAKE IT (high engagement signals genuine interest even without extreme view count)

   **B) Head-to-Head** -- Compare 2 creators
   - User picks 2 creators from `saved_creators`
   - Compare: avg views, median views, top hooks, content types, posting frequency, best formats, engagement rate
   - Present side-by-side comparison table

   **C) Gap Analysis** -- Topics competitors cover that Jay doesn't
   - Extract topic clusters from competitor `scraped_ideas` transcripts
   - Cross-reference against Jay's existing `content_ideas` and `scraped_ideas`
   - Present uncovered topics sorted by competitor view count

   **D) Hooks to Steal** -- Top hook frameworks from outlier videos
   - Filter to outlier videos (>= 3x average views)
   - Extract hook from first 1-3 sentences of transcript
   - Convert to mad-lib framework with X/Y/Z/W placeholders
   - Present top 10:

   | # | Framework | Original Hook | Creator | Views | Eng. Rate | Structure |
   |---|-----------|--------------|---------|-------|-----------|-----------|

   - Offer to append selected frameworks to `.claude/skills/short-form-script/references/hooks-database.json`

3. **Classify category:** For each video, classify into a topic category by keyword-matching against title + caption + transcript (case-insensitive). First match wins:

   | Category | Signal Words |
   |----------|-------------|
   | cold email | cold email, outreach, inbox, deliverability, email warmup, instantly, smartlead, lemlist |
   | lead generation | lead gen, leads, prospecting, list building, apollo, clay, findymail |
   | n8n / automation | n8n, automation, workflow, zapier, make.com, no-code |
   | claude code / AI dev | claude code, cursor, AI coding, copilot, vscode, developer tools |
   | AI tools | AI tool, chatgpt, deepseek, gemini, AI agent, prompt |
   | marketing | marketing, funnel, landing page, conversion, ads, copy |
   | sales | sales, closing, objections, cold call, pipeline, discovery call |
   | motivation | motivation, mindset, discipline, grind, hustle, success |

   If no signal words match, set category to "other".

4. **Save to database:** After presenting the outlier report, save results to the Outlier Ideas tab:

   **Step 1:** Create a research run:
   ```
   POST /api/ideas/outlier/runs
   Body: {
     "run_type": "outlier",
     "creators_count": <number of unique creators analyzed>,
     "videos_analyzed": <total videos in analysis>,
     "platforms": ["youtube", "instagram", "tiktok"],  // whichever were included
     "notes": "Outlier analysis — <date>"
   }
   ```
   Save the returned `id` as `research_run_id`.

   **Step 2:** Batch insert all scored items:
   ```
   POST /api/ideas/outlier
   Body: [
     {
       "research_run_id": "<run_id from step 1>",
       "creator_name": "Creator Name",
       "username": "@handle",
       "platform": "youtube",
       "video_url": "https://...",
       "title": "Video title",
       "caption": "Full caption/description",
       "date_posted": "2026-03-15T00:00:00Z",
       "duration": "45",
       "views": 150000,
       "likes": 9000,
       "comments": 400,
       "shares": 0,
       "outlier_score": 6.0,
       "creator_avg_views": 25000,
       "engagement_rate": 0.0627,
       "recency_multiplier": 1.067,
       "final_score": 6.4,
       "decision": "make_it",
       "spoken_hook": "I sent 10,000 cold emails in 30 days...",
       "hook_framework": "I [did X] in [Y timeframe]...",
       "hook_structure": "Raw Shock",
       "category": "cold email",
       "transcript": "Full transcript from scraped_ideas.original_transcript (pass through as-is, or null if unavailable)",
       "status": "new"
     },
     // ... all scored items
   ]
   ```

   **Step 3:** Report to user:
   > Saved X outlier ideas to the database. View at /dashboard/ideas/outlier

5. **Chain:** For any idea marked MAKE IT, offer: "Want me to write a script for this? (chains to `/short-form-script`)"

### Cost
Free -- all analysis runs on existing Supabase data.

---

## Mode 4: `trending` -- Viral Signal Intelligence (3-Stage Pipeline)

This mode scans X, Reddit, and LinkedIn for viral signals in Jay's niche, scores them with a 4-factor matrix, then searches YouTube for existing coverage to find content angles and gaps. The insight: X is where news breaks, YouTube follows days later. First-mover advantage = more views.

Read `references/scoring-matrices.json` for the full scoring config and platform search parameters.

### Stage 0: Dedup Check

Before collecting signals, query Supabase for recent content to build an exclusion set. This prevents resurfacing topics already saved or acted on.

**Query 1 — Recent scraped ideas (last 30 days):**
```bash
curl -s "${NEXT_PUBLIC_SUPABASE_URL}/rest/v1/content_ideas?select=title,topic,tags,source_url&user_id=eq.3faff114-3c2d-4375-b422-dbb0cd6f96ba&source=eq.scraped&created_at=gte.$(date -v-30d +%Y-%m-%d)" \
  -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}"
```

**Query 2 — Recent content items (approved/published/scheduled):**
```bash
curl -s "${NEXT_PUBLIC_SUPABASE_URL}/rest/v1/content_items?select=title&user_id=eq.3faff114-3c2d-4375-b422-dbb0cd6f96ba&status=in.(approved,scheduled,published)&created_at=gte.$(date -v-30d +%Y-%m-%d)" \
  -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}"
```

**Build exclusion set:**
1. Extract topic keywords from each result's `title` and `topic` fields (lowercase, split on spaces, remove stop words)
2. Collect all `source_url` values into a URL exclusion set (for exact-match dedup in Stage 4)
3. Pass both sets forward to Stage 2 scoring

If Supabase is unreachable, log a warning and continue without dedup (don't block the pipeline).

### Stage 1: Signal Collection (Parallel)

Scan 3 platforms simultaneously. Run all searches in parallel for speed.

**Step 1a: Build dynamic keywords**

Before searching, generate fresh keywords:
1. Load `niche-keywords.json` for:
   - `x_search_queries` -- 5 pre-built Grok query clusters (use directly for Step 1b)
   - `reddit_search_queries` -- 5 pre-built Reddit search terms (use directly for Step 1c)
   - `linkedin_influencers` -- 38 profile URLs grouped by pillar (use directly for Step 1d)
   - `all_subreddits` -- 19 target subreddits
   - Static pillar keywords and `cross_pillar_keywords`
2. Load `viral-archetypes.json` for archetype seed keywords
3. Optionally scan Jay's last 5-10 published videos/posts (via YouTube Analytics MCP or `scraped_ideas` table) to extract current focus topics
4. Enhance the pre-built queries with timely additions:
   - Add any breaking news topics from step 3
   - Append `[tool name] + [event word]` for any tool that just launched/updated
   - Use `trending_search_templates` from niche-keywords.json for additional queries if needed

**Step 1b: X/Twitter signal collection (Grok x_search)**

X is the primary signal source -- where news breaks first. Use the xAI Grok API with the `x_search` tool for native X search. This is agent-to-agent: Claude constructs the prompt, Grok searches X natively, returns structured results.

- **Primary method:** Grok API `x_search` via Bash curl call:
  ```bash
  curl -s https://api.x.ai/v1/responses \
    -H "Authorization: Bearer $XAI_API_KEY" \
    -H "Content-Type: application/json" \
    -d '{
      "model": "grok-4-1-fast",
      "input": [
        {"role": "system", "content": "You are a trending signal researcher for the AI automation and cold email niche. Search X for the most viral, high-engagement posts from the last 7 days matching the keywords provided. Return ONLY posts with 10+ likes or 5+ retweets. For each post, return a JSON array of objects with these fields: tweet_text, likes, retweets, reply_count, author_handle, author_followers, post_date, tweet_url. If fewer than 3 quality results, say so explicitly."},
        {"role": "user", "content": "[DYNAMIC KEYWORD QUERIES - build from Step 1a]"}
      ],
      "tools": [{"type": "x_search", "from_date": "[7 days ago YYYY-MM-DD]", "to_date": "[today YYYY-MM-DD]"}]
    }'
  ```
- **Batching:** Run all 5 `x_search_queries` from `niche-keywords.json` in parallel. Each query targets a different niche cluster: cold email tools, AI automation, lead gen tools, cross-pillar AI+outreach, and industry debates.
- **Follow-up (MANDATORY):** If Grok returns fewer than 3 quality results for ANY query cluster, you MUST send a follow-up query with broader terms. Do NOT accept thin results — rephrase the query (drop boolean operators, use simpler keywords, expand date range) and re-query until you have at least 3 signals per cluster or have exhausted 3 retry attempts per cluster. This is critical for pipeline quality.
- **Filter:** Discard anything with < 10 likes AND < 5 retweets. Discard posts older than 7 days.
- **Extract per signal:** tweet text (the signal content), likes, retweets, reply count, author handle, author follower count, post date, tweet URL
- **Fallback:** If `XAI_API_KEY` is not set, check `.env.local` and source it. If API errors persist, STOP and tell the user: "Grok API key invalid or expired. Check XAI_API_KEY in `.env.local`." Do NOT fall back to WebSearch.
- **Cost:** ~$0.01-0.05 per query (Grok API is per-token, x_search tool usage is included)

**Step 1c: Reddit signal collection (Apify)**

Reddit shows what practitioners actually care about -- unfiltered community signal.

- **Primary method:** Apify `trudax/reddit-scraper-lite` ($0.25/1K posts) via Apify MCP tools.
  **IMPORTANT:** Use `mcp__apify__call-actor` (MCP tool), NOT curl. NEVER use WebSearch for Reddit signals.

  **Strategy:** Use `startUrls` with subreddit URLs (NOT `searches` with keywords). The `searches` field does global Reddit search and returns off-topic noise. Subreddit URLs give targeted, high-quality posts from our 19 monitored communities.

  ```
  mcp__apify__call-actor with actor: "trudax/reddit-scraper-lite"
  ```
  ```json
  {
    "startUrls": [
      {"url": "https://www.reddit.com/r/coldEmail/"},
      {"url": "https://www.reddit.com/r/sales/"},
      {"url": "https://www.reddit.com/r/Entrepreneur/"},
      {"url": "https://www.reddit.com/r/artificial/"},
      {"url": "https://www.reddit.com/r/ClaudeAI/"},
      {"url": "https://www.reddit.com/r/ChatGPT/"},
      {"url": "https://www.reddit.com/r/n8n/"},
      {"url": "https://www.reddit.com/r/nocode/"},
      {"url": "https://www.reddit.com/r/Emailmarketing/"},
      {"url": "https://www.reddit.com/r/B2Bsales/"},
      {"url": "https://www.reddit.com/r/leadgeneration/"},
      {"url": "https://www.reddit.com/r/SaaS/"},
      {"url": "https://www.reddit.com/r/agency/"},
      {"url": "https://www.reddit.com/r/startups/"},
      {"url": "https://www.reddit.com/r/smallbusiness/"},
      {"url": "https://www.reddit.com/r/marketing/"},
      {"url": "https://www.reddit.com/r/growthhacking/"},
      {"url": "https://www.reddit.com/r/LocalLLaMA/"},
      {"url": "https://www.reddit.com/r/indiehackers/"}
    ],
    "maxPostCount": 10,
    "maxComments": 0,
    "maxItems": 1000,
    "skipComments": false,
    "skipCommunity": true,
    "sort": "new",
    "time": "week",
    "searchPosts": true,
    "includeNSFW": false,
    "proxy": {"useApifyProxy": true, "apifyProxyGroups": ["RESIDENTIAL"]}
  }
  ```
  ```
  Then: mcp__apify__get-actor-output with datasetId from run
  ```
- **Target subreddits** (19 total, loaded from `all_subreddits` in `niche-keywords.json`):
  `r/coldEmail`, `r/sales`, `r/Entrepreneur`, `r/artificial`, `r/ClaudeAI`, `r/ChatGPT`, `r/n8n`, `r/nocode`, `r/Emailmarketing`, `r/B2Bsales`, `r/leadgeneration`, `r/SaaS`, `r/agency`, `r/startups`, `r/smallbusiness`, `r/marketing`, `r/growthhacking`, `r/LocalLLaMA`, `r/indiehackers`
- **Filter:** Last 7 days, minimum 20 upvotes.
- **Extract per signal:** post title (the signal), upvotes, comment count, top 2-3 comments (for context), post date, subreddit, author, post URL
- **Fallback:** If Apify MCP unavailable, STOP and tell the user: "Apify MCP tools not connected. Please check `.mcp.json` configuration." Do NOT fall back to WebSearch.
- **Cost:** ~10 posts x 19 subreddits = 190 posts = ~$0.05

**Step 1d: LinkedIn signal collection (Apify)**

LinkedIn shows what B2B decision-makers discuss.

- **Primary method:** Apify `supreme_coder/linkedin-post` ($0.001/post, no cookies needed) via Apify MCP tools.
  **IMPORTANT:** Use `mcp__apify__call-actor` (MCP tool). NEVER use WebSearch for LinkedIn signals.

  **CRITICAL: Use `limitPerSource` (NOT `maxResults`).** The field `maxResults` does NOT exist in this actor's schema. Using it causes unlimited scraping and cost overruns ($19+ instead of $0.12). This was learned from a real incident on 2026-04-07.

  ```
  mcp__apify__call-actor with actor: "supreme_coder/linkedin-post"
  ```
  ```json
  {
    "urls": ["[ALL 38 LinkedIn influencer URLs from niche-keywords.json linkedin_influencers section]"],
    "limitPerSource": 3,
    "scrapeUntil": "[7 days ago in YYYY-MM-DD format]",
    "deepScrape": true
  }
  ```
  ```
  Then: mcp__apify__get-actor-output with datasetId from run
  ```

  **Parameter reference (from actual actor schema):**
  - `urls` (required): array of LinkedIn profile URLs
  - `limitPerSource` (integer): max posts per profile URL. Use 3 for trending (3 x 38 = 114 posts max)
  - `scrapeUntil` (string): ISO date cutoff. ALWAYS set to 7 days ago to prevent historical scraping
  - `deepScrape` (boolean): true to get engagement metrics (likes, comments). Always true for signal scoring

- **Influencer targets:** Load all 38 profile URLs from `niche-keywords.json` -> `linkedin_influencers` section (13 cold email, 10 AI automation, 15 lead gen). These are B2B thought leaders who post regularly about cold email, AI automation, and lead gen on LinkedIn. Use base profile URLs (not `/recent-activity/all/` suffixed URLs).
- **Filter:** Last 7 days, focus on posts with 50+ reactions.
- **Extract per signal:** post text/summary, reactions count, comments count, author name, author headline, post date, post URL
- **Fallback:** If Apify MCP unavailable, STOP and tell the user: "Apify MCP tools not connected. Please check `.mcp.json` configuration." Do NOT fall back to WebSearch.
- **Cost:** ~3 posts x 38 profiles = 114 posts x $0.001 = ~$0.12
- **Timeout protocol:** LinkedIn scraping 38 profiles takes 5-10 minutes with limitPerSource=3. After calling `mcp__apify__call-actor`:
  1. Proceed immediately with X and Reddit signal processing (do NOT block on LinkedIn)
  2. Check LinkedIn run status with `mcp__apify__get-actor-run` after completing Reddit processing
  3. If still RUNNING after 15 minutes, proceed to scoring with X + Reddit signals and note "LinkedIn: pending" in the research log
  4. Check again before saving the final research log. If SUCCEEDED, fetch results with `mcp__apify__get-actor-output` and merge into signals
  5. If FAILED or TIMED-OUT after 20 minutes, log the failure and continue without LinkedIn data
- **Cost:** ~$0.02 for 20 posts

**Step 1e: Filter Out Noise**

Before scoring, discard these signal types — they're not content ideas, they're self-promotion:

| Filter Out | Why | Example |
|-----------|-----|---------|
| **Personal success stories** | Someone else's results aren't Jay's content angle | "I made $50K in 30 days with cold email" |
| **Lead magnet promos** | These are ads, not signals | "Download my free cold email template" |
| **Course/coaching promos** | Self-promotion, not trending topics | "Join my masterclass on lead gen" |
| **Revenue screenshots** | Stripe/bank flexing isn't a topic | Tweet with Stripe dashboard screenshot |
| **Engagement bait** | Broad platitudes with no specific topic | "The future of AI will change everything" |

**DO include:** Tool launches, feature updates, industry news, technique breakdowns, data/research findings, strategy discussions, regulation changes, comparison debates.

The test: "Could Jay make a video about this TOPIC (not this PERSON)?" If the signal is about someone's personal journey, skip it. If it's about a tool, technique, trend, or industry event, keep it.

**Step 1f: Dedup & Normalize**

After collecting and filtering signals from all 3 platforms:
1. Check against last 3 files in `docs/research-logs/` -- skip any topic already covered
2. Merge signals about the same topic from different platforms (e.g., an X thread and a Reddit post about the same tool launch = 1 signal with 2 sources)
3. Normalize into a unified signal list:

| # | Signal Topic | Source(s) | Raw Engagement | Post Date | URL(s) |
|---|-------------|-----------|----------------|-----------|--------|

### Stage 2: Score & Rank (4-Factor Matrix)

Score each signal 1-5 on 4 factors. Read `scoring-matrices.json` for detailed scoring rubrics.

| Factor | Weight | What It Measures |
|--------|--------|-----------------|
| **Primacy** | 25% | How recent? Last 24h = 5, 2-3 days = 4, 4-7 days = 3, 8-14 days = 2, 15+ days = 1 |
| **Velocity** | 30% | How fast is engagement growing? Engagement-per-hour rate vs. normal for that platform/author |
| **Authority** | 20% | Source credibility -- 100K+ followers = 5, 10-100K = 4, 1-10K = 3, <1K = 2, anonymous = 1 |
| **Content-Fit** | 25% | Relevance to Jay's niche pillars -- direct hit = 5, adjacent = 4, tangential = 3, stretch = 2, off-topic = 1 |

**Weighted score** = ((P x 0.25) + (V x 0.30) + (A x 0.20) + (CF x 0.25)) x 4 = total out of 20

**Decision thresholds:**
- Score >= 16/20 -> **MAKE IT** (create content immediately -- this signal is hot)
- Score 12-15/20 -> **WATCH** (monitor for 24h, re-score if engagement grows)
- Score < 12/20 -> **SKIP** (not worth pursuing)

**Scoring rules (MANDATORY):**
1. **Velocity evidence required:** Log the actual engagement numbers AND the post age. V score = engagement_rate / platform_baseline. Examples: "342 likes in 6h on acct avg 20/post = V5", "45 upvotes in 3 days = V2". Bare numbers without rate context = V2 default.
2. **Authority evidence required:** Log follower count or account description. "Ollama official (150K followers) = A5", "Reddit user with no history = A1". Unknown follower count = A2 default.
3. **No identical batch scores:** If 3+ signals share the same V AND A scores, re-examine each individually. Different posts have different engagement patterns.
4. **SKIP enforcement:** Any signal where V <= 1 AND A <= 1 MUST be scored SKIP regardless of P and CF. Low-velocity posts from anonymous sources are noise, not signals.
5. **Dedup enforcement (from Stage 0):** Before scoring, check each signal against the exclusion set from Stage 0:
   - **URL match:** If signal's source URL is already in the URL exclusion set, mark as **DEDUP** and skip entirely (don't score).
   - **Topic overlap:** Extract topic keywords from the signal title/topic. If >60% overlap with any existing idea's keywords, mark as **DEDUP** and skip.
   - Log deduped signals at the bottom of the scored table: `| DEDUP | [topic] | -- | -- | -- | -- | -- | Already in content_ideas (source_url match) |`

**Present scored signals:**

| # | Signal Topic | P | V (evidence) | A (evidence) | CF | Score | Decision | Sources |
|---|-------------|---|--------------|--------------|-----|-------|----------|---------|

### Stage 3: YouTube Angle Research

For each **MAKE IT** signal (score >= 16), search YouTube to find what content already exists and identify the angle Jay should take.

**Step 3a: Search YouTube for existing coverage**

For each MAKE IT topic:
- WebSearch: `site:youtube.com "[topic keywords]"` (filter to last 30 days)
- Also try: `[topic] tutorial`, `[topic] review`, `[topic] explained`
- Collect top 5-10 results

**Step 3b: Extract video data**

For each YouTube result found:

| # | Title | Channel | Views | Published | Angle Used |
|---|-------|---------|-------|-----------|-----------|

Classify each video's angle into one of these categories:
- `tutorial` -- step-by-step teaching
- `reaction` -- reacting to news/announcement
- `comparison` -- X vs Y
- `news_breakdown` -- explaining what happened
- `hot_take` -- controversial opinion
- `case_study` -- showing results/experience
- `tool_demo` -- walkthrough of a product
- `listicle` -- "top 5/10 things..."
- `prediction` -- what's coming next

**Step 3c: Identify content gaps**

For each MAKE IT signal, analyze the YouTube landscape:
1. **Saturated angles:** Which angles have 3+ videos already? (avoid these)
2. **Underserved angles:** Which angles have 0-1 videos? (opportunity)
3. **Jay's unique angle:** Given Jay's niche (cold email + AI automation + lead gen), what twist can he add that nobody else is doing?
4. **Recommended format:** Based on the topic + angle, suggest the best visual format from `content-types.json` (talking head, screen recording, split screen, etc.)

**Step 3d: Present final recommendations**

For each MAKE IT signal, present:

```
SIGNAL: [Topic]
Score: [X]/20 (MAKE IT)
Sources: [X thread] [Reddit post] [LinkedIn post]
─────────────────────────────────
YouTube Landscape: X videos found in last 30 days
  Saturated: tutorial (4 videos), news_breakdown (3 videos)
  Underserved: comparison (0), case_study (1), hot_take (0)

RECOMMENDED ANGLE: [specific angle]
WHY: [1-2 sentences on why this angle + Jay's unique perspective]
HOOK SUGGESTION: [3-second hook for this angle]
FORMAT: [talking head / screen recording / etc.]
ARCHETYPE: [from viral-archetypes.json — must match the signal's nature]
```

**Archetype validation (MANDATORY):**
- The archetype MUST be selected from `viral-archetypes.json` by matching the signal's core action, not just its topic
- `company-dropped-x` = a company released/updated/launched something (positive: new feature, speed boost, price cut)
- `company-dropped-x` does NOT fit: company restricting access, raising prices, shutting down features, or removing capabilities. For those, use a descriptive label like "access-restriction" or "pricing-change" and note it's not in the standard taxonomy
- If no archetype fits cleanly, state "No standard archetype — [custom label]" instead of forcing a bad fit

### Stage 4: Save & Schedule

1. **Save research log** to `docs/research-logs/YYYY-MM-DD.md`:
   ```markdown
   # Viral Signal Intelligence -- YYYY-MM-DD

   ## Signal Sources
   - X/Twitter: [N] signals collected
   - Reddit: [N] signals collected
   - LinkedIn: [N] signals collected

   ## Scored Signals
   [full scored table from Stage 2]

   ## MAKE IT Signals + YouTube Angle Research
   [recommendations from Stage 3]

   ## WATCH List
   [signals scoring 12-15 to re-check tomorrow]
   ```

2. **Save all MAKE IT + WATCH signals** to `content_ideas` table via Supabase REST API.

   **Step 2a: Source URL dedup** — check which signal URLs already exist:
   ```bash
   curl -s "${NEXT_PUBLIC_SUPABASE_URL}/rest/v1/content_ideas?select=source_url&user_id=eq.3faff114-3c2d-4375-b422-dbb0cd6f96ba&source_url=in.(URL1,URL2,...)" \
     -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
     -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}"
   ```
   Filter out any signals whose `source_url` already exists. Log: "Skipped N signals (already in database)."

   **Step 2b: Batch insert** — insert all non-SKIP, non-deduped signals in one request:
   ```bash
   curl -s -X POST "${NEXT_PUBLIC_SUPABASE_URL}/rest/v1/content_ideas" \
     -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
     -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
     -H "Content-Type: application/json" \
     -H "Prefer: return=representation" \
     -d '[...rows...]'
   ```

   **Row format** for each signal (MAKE IT or WATCH):
   ```json
   {
     "user_id": "3faff114-3c2d-4375-b422-dbb0cd6f96ba",
     "title": "Signal topic title",
     "topic": "AI & Automation | Lead Gen | Business Growth",
     "notes": "{\"score\":17.0,\"factors\":{\"P\":5,\"V\":4,\"A\":4,\"CF\":4},\"decision\":\"MAKE IT\",\"archetype\":\"access-restriction\",\"recommended_angle\":\"Hot take -- Anthropic just made Claude 50x more expensive\",\"hook\":\"Anthropic just cut off 135,000 AI developers. Here's why.\",\"format\":\"Talking head (30-60s)\",\"youtube_landscape\":{\"saturated\":[\"news_breakdown\"],\"underserved\":[\"tutorial\",\"comparison\",\"hot_take\"]},\"cross_platform\":\"Reinforces Signal 10 (Claude Code ad automation)\",\"recheck_trigger\":null}",
     "source": "scraped",
     "source_url": "https://x.com/_LuoFuli/status/2040825059342721520",
     "tags": ["signal:make_it", "platform:x", "score:17.0", "archetype:access-restriction"],
     "status": "new"
   }
   ```

   **Field mapping rules:**
   - `title` = signal topic (e.g. "Anthropic Cuts Off 3rd-Party Harnesses")
   - `topic` = closest pillar: "AI & Automation", "Lead Gen", or "Business Growth"
   - `notes` = JSON.stringify of structured data (score, factors, decision, archetype, angle, hook, format, YouTube landscape, cross-platform notes, recheck trigger)
   - `source` = `"scraped"` (valid CHECK constraint value)
   - `source_url` = original signal URL (X tweet, Reddit post, LinkedIn post)
   - `tags` = array of structured tags: `signal:<decision>`, `platform:<source>`, `score:<value>`, `archetype:<name>`
   - `status` = `"new"`

   **Error handling:** If Supabase insert fails, save the rows as JSON to `docs/research-logs/YYYY-MM-DD-signals.json` as a fallback. Log the error but don't block the pipeline.

   **After insert, log:** "Saved N signals to content_ideas (M MAKE IT, K WATCH). Skipped J duplicates."

3. **Offer scheduling:** "Want to run this every morning? I can set up a daily 9am signal scan."
   If user says yes, use CronCreate to schedule:
   ```
   CronCreate: cron "57 8 * * *", prompt "Run content research trending mode -- scan X, Reddit, LinkedIn for viral signals in AI automation / cold email / lead gen niche. Score with 4-factor matrix, research YouTube angles for MAKE IT signals. Save results to research log and content_ideas table."
   ```

4. **Skill chain menu:** After presenting all results, offer the user action options for any MAKE IT or WATCH signal:

   ```
   Ready to act on any of these signals? Pick an option:

   1. /short-form-script — Write a talking-head script for a signal
   2. /carousel-post — Turn a signal into an Instagram carousel
   3. /skool-post — Share a signal breakdown with the Skool community
   4. /content-report — Generate a formatted report from these results
   5. Skip — Just save the research for now
   ```

   Use AskUserQuestion to present these options. If user picks 1-3, ask which signal number, then chain:

   **For /short-form-script:** Invoke the `short-form-script` skill with:
   - Topic: the signal's recommended angle
   - Hook: the hook suggestion from Stage 3
   - Format: the recommended format (talking head, screen recording, etc.)
   - Context: signal summary + why it matters to Jay's audience

   **For /carousel-post:** Invoke the `carousel-post` skill with:
   - Topic: the signal topic reframed as a carousel headline
   - Key points: extract 5-8 slide-worthy facts from the signal context
   - CTA: "Follow @leadgenjay for daily AI automation tips"
   - Style: use the signal's hook as the cover slide headline

   **For /skool-post:** Invoke the `skool-writing` skill with:
   - Topic: the signal topic as a community discussion starter
   - Angle: "Here's what this means for your business" (teaching, not news)
   - Include: the signal context, why it matters, and a question to drive comments
   - Then chain output to `skool-post` skill for publishing

   **For /content-report:** Invoke the `content-report` skill with the full research output from this session. The content-report skill will auto-detect `trending` mode and format all scored signals, MAKE IT deep-dives, WATCH list, and cost summary into a branded HTML report with clickable source links.

### Cost
~$0.10-$0.15 per run (Grok x_search ~$0.05, Apify Reddit ~$0.03, Apify LinkedIn ~$0.02, WebSearch for YouTube angle research is free).

---

## Mode 5: `quick` -- Fast Topic Research

### Workflow

1. User provides a topic (e.g., "AI cold email tools")

2. **Parallel queries** (run all 3 simultaneously):
   - **Supabase `scraped_ideas`:** `WHERE (caption ILIKE '%topic%' OR transcript ILIKE '%topic%') AND relevance_score >= 7`
   - **Supabase `content_ideas`:** `WHERE title ILIKE '%topic%'`
   - **WebSearch:** `[topic] 2026` + `[topic] viral reels tiktok`

3. **Synthesize 5-10 ideas** from combined results. For each:

   | # | Topic Angle | Hook (3s) | Format | Source | Why It Works |
   |---|------------|-----------|--------|--------|-------------|

4. Present numbered list -> user picks favorites

5. **Chain:** Selected idea -> invoke `/short-form-script` with pre-filled context:
   - Topic: the selected angle
   - Hook suggestion: the hook from the table
   - Duration suggestion: based on format (talking head = 30-60s, screen recording = 45-90s)

### Cost
Free (Supabase queries + WebSearch).

---

## Skill Chaining

After any mode produces actionable ideas:

| Trigger | Chain To | Pre-fill |
|---------|----------|----------|
| User picks an idea | `/short-form-script` | Topic + hook angle + suggested duration |
| Outlier analysis completes | `/api/ideas/outlier` | Auto-save all scored items to Outlier Ideas tab |
| Hooks to steal selected | `hooks-database.json` | Append new hook frameworks |
| MAKE IT ideas from trending | `content_ideas` table | Auto-save with source + tags |
| User wants weekly plan | `/content-strategy` | Feed scored ideas into planning |

To chain to `/short-form-script`, use the Skill tool:
```
Skill: short-form-script
Args: "[selected topic] -- hook: [hook angle] -- [duration]s [format]"
```

---

## Hook Framework Extraction Rules

When converting a spoken hook into a mad-lib framework:

1. **Identify variables:** Replace specific numbers, tools, timeframes, results with X/Y/Z/W
2. **Keep structure words:** Preserve "I", "this", "here's", "stop", "why" -- they carry emotional weight
3. **Label placeholders:**
   - X = primary subject (tool, method, tactic)
   - Y = timeframe or quantity
   - Z = result or outcome
   - W = audience or qualifier

**Good example:**
- Original: "I booked 47 meetings in 30 days using cold email"
- Framework: "I [achieved Z] in [Y timeframe] using [X method]"
- Structure: Raw Shock
- Why good: Preserves "I" (emotional weight), replaces specifics with labeled placeholders, classifies structure

**Bad example:**
- Original: "I booked 47 meetings in 30 days using cold email"
- Framework: "Someone achieved results in some time using a method"
- Why bad: Replaced structure words ("I" -> "Someone"), used vague labels instead of X/Y/Z placeholders, no structure classification

---

## Scoring Reference (Analyze + Trending)

### Outlier Score (Analyze mode)
```
outlier_score = video_views / creator_average_views
recency_multiplier = 1.0 + (0.1 * max(0, 30 - days_since_posted) / 30)
engagement_rate = (likes + comments) / views
final_score = outlier_score * recency_multiplier
```
- final_score >= 5x -> Strong outlier (MAKE IT)
- final_score 2x-5x -> Moderate outlier (MAYBE)
- final_score < 2x -> Normal performance (SKIP)
- Engagement override: engagement_rate > 5% AND outlier >= 2x -> upgrade to MAKE IT

**Good scoring example:**
- Video: 150K views, creator avg: 25K views, posted 10 days ago, 9K likes, 400 comments
- outlier_score = 150000 / 25000 = 6.0x
- recency_multiplier = 1.0 + (0.1 * max(0, 30-10) / 30) = 1.067
- engagement_rate = (9000 + 400) / 150000 = 6.3%
- final_score = 6.0 * 1.067 = 6.4x -> MAKE IT (both score and engagement qualify)

**Bad scoring example (common mistakes):**
- Using total views instead of per-creator average (comparing across creators with different audience sizes)
- Forgetting recency multiplier (penalizes recent hits that haven't peaked yet)
- Ignoring engagement override (a 2.5x outlier with 8% engagement rate is a MAKE IT, not MAYBE)

### Viral Signal Score (Trending mode -- 4-Factor Matrix)
```
signal_score = (Primacy x 5) + (Velocity x 6) + (Authority x 4) + (Content-Fit x 5) = total /20
```
Each factor scored 1-5. Weights reflect importance: velocity (30%) > primacy (25%) = content-fit (25%) > authority (20%).
- >= 16/20 -> MAKE IT (create content immediately)
- 12-15/20 -> WATCH (monitor 24h, re-score)
- < 12/20 -> SKIP

**Good scoring example:**
- Signal: "Instantly just launched AI email writer" on X
- Primacy: 5 (posted 6 hours ago)
- Velocity: 4 (200 likes in 6h, 10x normal for this account)
- Authority: 4 (@instantlyai, 50K followers)
- Content-Fit: 5 (direct hit -- cold email + AI tool)
- Score: (5x5) + (4x6) + (4x4) + (5x5) = 25+24+16+25 = 90... wait, that's wrong.
- Correct: (5x0.25) + (4x0.30) + (4x0.20) + (5x0.25) = 1.25+1.20+0.80+1.25 = 4.50 x 4 = 18/20 -> MAKE IT

**Simplified calculation:** Multiply each factor score by its weight, sum, then multiply by 4 to get /20 scale.
`score_20 = ((P x 0.25) + (V x 0.30) + (A x 0.20) + (CF x 0.25)) x 4`

---

## Output Rules

- Always present results in markdown tables
- Include a decision column (MAKE IT / MAYBE / SKIP) for every idea
- Show cost estimate BEFORE any Apify-powered operation and actual cost AFTER
- End every mode with a clear next action: "Want to [write a script / scrape more / analyze deeper]?"
- Never generate ideas without checking existing data first (dedup)
- SHORT-FORM ONLY: Never scrape or include content over 2 minutes. YouTube must use `"videoType": "short"`. Instagram must use the Reel scraper. Filter out any result with `duration > 120s`. If user asks for long-form YouTube research, redirect to `/youtube-script`
- Respect the $5 Apify spending limit -- warn before any operation that might exceed it
- When scraping fails for a creator, report the failure with the actor name and error -- do not silently skip
- When some creators succeed and others fail, present results in two separate sections: (1) **Successful Results** table with all scraped data, (2) **Failed Creators** table with creator name, platform, actor used, and error message. Always present successful data even if some creators fail

---

## Pipeline Handoff

After presenting the MAKE IT ideas table (from analyze outlier report, trending, or quick mode), offer to chain into content creation:

> "Want to create content from any of these? Pick a number."

When the user picks an idea:

1. **Ask format & platforms:**
   - Content format: carousel, short-form video, or video ad
   - Target platforms: instagram, linkedin, threads (multi-select)
   - Angle/twist (optional — default to the hook angle from the table)

2. **Write manifest** to `output/carousel/manifest.json`:
   ```json
   {
     "version": "1.0",
     "pipeline_stage": "research",
     "research": {
       "idea_title": "<title from table>",
       "creator": "<original creator>",
       "hook": "<spoken hook>",
       "hook_framework": "<mad-lib framework>",
       "category": "<category>",
       "relevance_score": 8.5,
       "source_url": "<video URL if available>"
     },
     "creative": {
       "content_type": "<carousel | short-form | video-ad>",
       "topic": "<topic angle>",
       "angle": "<user's chosen angle or hook angle>",
       "platforms": ["instagram", "linkedin"]
     }
   }
   ```

3. **Chain to next skill** based on format:
   - **Carousel:** Invoke via Skill tool: `Skill: carousel-post, Args: "from-manifest"`
   - **Short-form:** Invoke via Skill tool: `Skill: short-form-script, Args: "<topic> -- hook: <hook> -- <duration>s"`
   - **Video ad:** Invoke via Skill tool: `Skill: video-ad, Args: "<topic>"`

4. **Confirm before chaining:** "Manifest saved to `output/carousel/manifest.json`. Ready to create [format]?"

The manifest is optional — this skill works standalone without it. The handoff only happens when the user explicitly picks an idea and confirms the format.

---

## Troubleshooting

### Common Scrape Failures

| Problem | Cause | Fix |
|---------|-------|-----|
| YouTube returns 0 results | Wrong @handle | Validate handle via WebSearch, try channel URL instead |
| Instagram returns 0 engagement metrics | Used basicData level | Switch to `"dataDetailLevel": "detailedData"` |
| Instagram returns 0 results | Account is private | Skip -- cannot scrape private accounts |
| TikTok returns 0 results | Used wrong actor | Switch from free/community actors to `clockworks/tiktok-scraper` or `apidojo/tiktok-profile-scraper` |
| TikTok profile not found | @ prefix in username | Remove @ before passing to actor |
| High cost warning | Too many creators x videos | Reduce videosPerCreator to 15-20, use budget TikTok actor |
| Actor run timeout | Too many profiles in one call | Split into batches of 5-10 profiles per run |
