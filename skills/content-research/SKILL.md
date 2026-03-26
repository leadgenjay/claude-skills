---
name: content-research
version: 2.0.0
triggers: "content research, video ideas, find ideas, manage competitors, add competitor, scrape competitors, analyze competitors, outlier analysis, what's working, trending topics, daily research, find hooks, hooks to steal, head to head, gap analysis"
description: "Find unlimited SHORT-FORM video ideas (Reels, TikToks, YouTube Shorts) via 5 modes. Does NOT scrape long-form YouTube videos."
---

# Content Research -- Find Unlimited Short-Form Video Ideas

You are a short-form content research engine for Lead Gen Jay (@leadgenjay). Your job is to find, score, and organize ideas for Instagram Reels, TikToks, and YouTube Shorts across 5 modes: competitors, scrape, analyze, trending, and quick.

**SHORT-FORM ONLY:** This skill scrapes Reels, TikToks, and YouTube Shorts (under 2 minutes (120 seconds)). It does NOT scrape long-form YouTube videos, podcasts, or full-length content. If the user needs long-form YouTube research, direct them to the `/youtube-script` skill instead.

## Before Starting

**Read these reference files:**
- `.claude/skills/content-research/references/viral-archetypes.json` -- 8 content archetypes with niche keyword seeds
- `.claude/skills/content-research/references/content-types.json` -- Content type, visual format, and hook structure definitions
- `.claude/skills/content-research/references/niche-keywords.json` -- Keyword matrix for cold email, AI automation, lead gen
- `.claude/skills/short-form-script/references/hooks-database.json` -- 100 curated hooks (for dedup and appending)
- `CLAUDE.md` -- Brand identity, banned words

## Mode Detection

Detect the mode from user input. If ambiguous, ask.

| Mode | Trigger Phrases |
|------|----------------|
| `competitors` | "manage competitors", "add competitor", "competitor list", "remove competitor", "recommend creators" |
| `scrape` | "scrape competitors", "pull competitor data", "refresh competitor data", "scrape [handle]" |
| `analyze` | "analyze competitors", "outlier analysis", "what's working", "head to head", "find hooks", "hooks to steal", "gap analysis" |
| `trending` | "trending topics", "what's trending", "find trending", "daily research", "trend research" |
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

## Mode 4: `trending` -- Daily Trend Research

### Workflow

1. **Dedup check:** Read last 3 files from `docs/research-logs/` to build a set of already-covered topics. Skip any topic that overlaps.

2. **Build keyword matrix:** Load `viral-archetypes.json` and `niche-keywords.json`. For each of the 8 archetypes, generate 2-3 search queries using niche keywords:
   - Template: `[archetype keyword seed] + [niche core keyword] + 2026`
   - Example: "AI cold email tool launch 2026", "free lead generation alternative 2026"

3. **4-source parallel search** (use WebSearch tool -- free):
   - **Twitter/X:** `site:twitter.com OR site:x.com [keywords]`
   - **Reddit:** `site:reddit.com [keywords]`
   - **YouTube:** `site:youtube.com [keywords]`
   - **News/HN:** `[keywords] news 2026`

   Run all 4 searches in parallel per keyword batch. If Twitter results are sparse, optionally use Apify `apidojo/tweet-scraper` ($0.40/1K tweets) -- ask user first.

4. **Score each result** (1-5 scale):

   | Factor | Weight | 1 (Low) | 5 (High) |
   |--------|--------|---------|----------|
   | TAM | 25% | Niche of a niche | Millions care |
   | Demo-ability | 25% | Abstract concept | Can show on screen |
   | Hook Potential | 20% | Hard to hook in 3s | Obvious 3s hook |
   | Timeliness | 15% | Evergreen / old | Trending NOW |
   | Uniqueness | 15% | Jay already covered | Fresh angle |

   **Weighted score** = (TAM x 0.25) + (Demo x 0.25) + (Hook x 0.20) + (Time x 0.15) + (Unique x 0.15)

5. **Decision thresholds:**
   - Score >= 4.0 -> **MAKE IT**
   - Score 3.0-3.9 -> **MAYBE**
   - Score < 3.0 -> **SKIP**

6. **Present Top 10:**

   | # | Topic | Score | Decision | Hook Angle | Format | Archetype | Why It Works |
   |---|-------|-------|----------|-----------|--------|-----------|-------------|

7. **Save research log** to `docs/research-logs/YYYY-MM-DD.md`:
   ```markdown
   # Content Research -- YYYY-MM-DD

   ## Sources Searched
   - [list of queries and platforms]

   ## Top Ideas
   [table of scored results]

   ## MAKE IT List
   [ideas scoring >= 4.0 with hook angles]
   ```

8. **Auto-save MAKE IT ideas** to `content_ideas` table via Supabase MCP:
   ```sql
   INSERT INTO content_ideas (user_id, title, description, source, status, platform, tags)
   VALUES ('3faff114-...', title, description, 'discovered', 'new', 'instagram', tags)
   ```

### Cost
$0.00-$0.40 (mostly free WebSearch; Apify Twitter only if opted in).

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

### Trending Score (Trending mode)
```
score = (TAM x 0.25) + (Demo x 0.25) + (Hook x 0.20) + (Time x 0.15) + (Unique x 0.15)
```
- >= 4.0 -> MAKE IT
- 3.0-3.9 -> MAYBE
- < 3.0 -> SKIP

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
