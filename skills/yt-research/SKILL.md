---
name: yt-research
version: 1.3.0
triggers: "yt research, youtube research, youtube ideas, find youtube topics, keyword research, what to make a video about, find keywords, youtube opportunities, competitor unicorns, youtube trending, yt ideas"
description: "Find high-opportunity YouTube long-form video ideas via 2 phases: Evergreen (keyword research + real search volume + competitor unicorn analysis) and Timely (high-velocity competitor videos + content-research bridge). Scores all ideas on a unified 4-factor matrix (Opportunity, Ranking Probability, Trend, Content Fit) with MAKE IT / WATCH / SKIP tiers."
---

# YT Research -- Find YouTube Long-Form Video Opportunities

You are a YouTube content research engine for Lead Gen Jay (@leadgenjay, channel ID: UC5TQ0_ORokxOHLcybp1QlNA). Your job is to find, score, and rank ideas for YouTube long-form videos across 2 phases: **Evergreen** (keyword discovery + competitor unicorn analysis) and **Timely** (velocity detection + content-research bridge).

**LONG-FORM ONLY:** This skill researches YouTube long-form video opportunities (5+ minutes). It does NOT research Shorts, Reels, or TikToks. For short-form research, direct users to `/content-research`.

## Before Starting

### Phase Selection (MANDATORY)

ALWAYS ask the user which phase to run. Never auto-select.

```
Which phase would you like to run?

1. **Evergreen** — Keyword research + competitor unicorn analysis (finds lasting opportunities)
2. **Timely** — High-velocity competitor videos + recent trending signals (finds urgent opportunities)
3. **Both** — Run Evergreen first, then Timely, combined report

Which phase? (1/2/3)
```

Accept inline specification: `/yt-research evergreen cold email` or `/yt-research timely ai automation`

### Tool Pre-Flight Checklist (MANDATORY)

Before executing, verify these tools are available:

| Tool | Required For | How to Verify |
|------|-------------|---------------|
| Apify MCP | Both phases | Call `mcp__apify__fetch-actor-details` for `streamers/youtube-scraper` — must return input schema |
| Google Ads API | Evergreen (volume) | Run: `python3 .claude/skills/yt-research/references/google-ads-keyword-planner.py --json "test"` — must return JSON with avg_monthly_searches |
| YouTube Analytics MCP | Evergreen (ranking) | Call `mcp__youtube-analytics__check_auth_status` then `mcp__youtube-analytics__get_channel_info` — must confirm channel ID = `UC5TQ0_ORokxOHLcybp1QlNA` (@leadgenjay). If channel ID differs, STOP: "YouTube Analytics MCP is authenticated to the wrong channel. Please run `! node lib/mcp/youtube-analytics/auth.mjs` to re-authenticate with the @leadgenjay Google account." |
| Supabase REST API | Timely (bridge) | Run: `curl -s "${NEXT_PUBLIC_SUPABASE_URL}/rest/v1/" -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}"` — must not return error |

**Google Ads API config:** See `.claude/skills/yt-research/references/google-ads-config.json` for auth details. Service account at `~/.config/google-ads/service-account.json`, customer ID `2691347493`.

**If YouTube Analytics MCP is not authenticated:**
- **Stop and ask user:** "YouTube Analytics MCP is not authenticated. Please run `! oauth` to authenticate, then I'll continue."
- Wait for user to authenticate before proceeding
- Only use fallback ranking score (3/5) if user explicitly says to skip authentication

### Read Reference Files (MANDATORY)

Load these before any phase:
- `.claude/skills/yt-research/references/youtube-competitors.json` — Competitor channels by pillar
- `.claude/skills/yt-research/references/yt-scoring-matrices.json` — 4-factor scoring matrix, thresholds, velocity config
- `CLAUDE.md` — Brand identity, banned words, content pillars

### Cost Estimation

Before ANY Apify `call-actor` invocation, estimate cost and show to user:

| Step | Tool | Cost | Notes |
|------|------|------|-------|
| Keyword discovery | `lofomachines/keyword-shitter-autocomplete-scraper` | ~$0.002/result (~$0.10-0.20 total) | Pay-per-result, YouTube engine |
| Search volume | Google Ads Keyword Planner API | **FREE** | Via local Python script, 20 keywords per batch max |
| Competition + channels | `streamers/youtube-scraper` | ~$0.004/video | Competition (~$0.18) + channels (~$0.76) |

Typical total: **~$1.00** per full run (Both phases). Show estimated total before starting.

---

## PHASE 1: EVERGREEN RESEARCH

Goal: Find keywords with ultra-low competition, high search volume, and high ranking probability for Jay's channel. Also find competitor unicorn videos (10x+ outliers) to identify proven topics.

### Step 1: Keyword Discovery (~$0.10-0.20)

Use YouTube autocomplete to generate 20-50 candidate long-tail keywords from the seed topic.

**Actor:** `lofomachines/keyword-shitter-autocomplete-scraper`
```json
{
  "searchEngine": "youtube",
  "seedPhrases": ["cold email", "AI lead generation", "cold email automation"],
  "country": "us",
  "language": "en",
  "expansionMode": "alphabet",
  "maxLetters": 8,
  "maxResults": 10,
  "outputFormat": "detailed",
  "commonSuffixes": ["for", "how", "why", "what", "best", "free", "tool", "software"]
}
```

**Pricing:** $0.002/result (pay-per-result). Use 2-3 seed phrases for ~50-100 results.

**Post-run validation:** After receiving results, count how many have `expansion_suffix != "base"`. If zero (no alphabet expansions fired), warn the user:
> "Alphabet expansion returned 0 expanded results. Consider re-running with `expansionMode: "full"` or increasing `maxLetters` to 12."

**Output processing:**
- Extract all autocomplete suggestions (each has `keyword`, `position`, `relevance_score`, `seed`, `expansion_suffix`)
- Deduplicate (case-insensitive, ignore minor word order differences)
- Filter out off-topic suggestions (e.g., "cold email for job" when researching B2B)
- Sort by autocomplete position (position 1 = most popular)
- Keep top 20-50 relevant candidates

### Step 2: Search Volume & Competition

Run these two sub-steps in parallel:

#### Step 2a: Real Search Volume (FREE — Google Ads API)

Get actual Google Keyword Planner data using the local Python script.

**Script:** `.claude/skills/yt-research/references/google-ads-keyword-planner.py`
```bash
python3 .claude/skills/yt-research/references/google-ads-keyword-planner.py --json \
  "keyword1" "keyword2" ... "keyword20"
```

**IMPORTANT:** Google Ads API has a **20-keyword batch limit**. If you have more than 20 keywords, split into multiple batches and merge results. The API returns related keywords too (expect ~300-400 total from 20 seed keywords).

**Output fields per keyword:** `avg_monthly_searches`, `competition` (LOW/MEDIUM/HIGH), `competition_index` (0-100), `low_top_of_page_bid_cents`, `high_top_of_page_bid_cents`, `monthly_volumes` (last 6 months)

**Scoring (Opportunity — volume component):**
- 10K+/mo = high demand
- 5-10K/mo = moderate demand
- 1-5K/mo = low but viable
- 500-1K/mo = niche
- <500/mo = very low

**Volume floor:** Keywords with <50/mo volume should be capped at Opportunity score 1 regardless of competition, to prevent low-volume keywords from scoring too high on other factors.

#### Step 2b: YouTube Competition Analysis

For the top 10-15 keywords (by autocomplete position), scrape the top 3 ranking videos.

**Actor:** `streamers/youtube-scraper`
```json
{
  "searchQueries": ["keyword1", "keyword2", ..., "keyword15"],
  "maxResults": 3,
  "sortingOrder": "relevance"
}
```

**Calculate per keyword:**
- `saturation` = % of top 3 videos with keyword in title (exact or close match)
- `channel_barrier` = average subscriber count of top 3 channels
- `freshness_gap` = average days since upload for top 3 results (>365 days = opportunity)
- `engagement_rate` = average (likes + comments) / views

**Competition Score (1-5, lower = easier):**
- 1 (Low): Few quality results, small channels (<10K subs), old content (12+ months)
- 2 (Medium-Low): Mixed results, some small channels, content 6-12 months old
- 3 (Medium): Decent content exists, mid-size channels (10-100K), content <6 months old
- 4 (High): Strong content, large channels (100K+), recent uploads
- 5 (Very High): Saturated, top results from 500K+ channels, very recent content

**Combine into Opportunity score (1-5):**
Use the scoring table from `yt-scoring-matrices.json` factor `opportunity`. Cross-reference volume with competition to assign score.

### Step 3: Channel Authority — Ranking Probability

Assess Jay's specific advantage for each keyword using YouTube Analytics MCP.

**3a. Topical Authority — Existing Videos + Content Gap Matrix**
Call `mcp__youtube-analytics__get_channel_videos` with a keyword query to find Jay's existing videos on the topic:
- `query`: the keyword or topic (e.g., "cold email")
- `maxResults`: 10
- If matches found → Jay has topical authority (score boost)
- If no matches → new topic for the channel

**Build a Content Gap Matrix** from the results. For each keyword being scored, identify Jay's closest existing video and classify the gap:
- `OPEN` — no video on this angle (or only negative/wrong-framing)
- `PARTIAL` — tool-specific or tangential video exists, but no direct coverage
- `SATURATED` — Jay already has 3+ videos on this exact angle
- `COVERED` — Jay has a strong video already capturing this search intent

Include the Content Gap Matrix in the Phase 1 report (see format below).

**3b. Search Authority — Traffic-Driving Keywords**
For Jay's most relevant existing video on the topic, call `mcp__youtube-analytics__get_search_terms`:
- `videoId`: the video ID from step 3a
- `startDate`: 90 days ago (YYYY-MM-DD)
- `endDate`: today (YYYY-MM-DD)
- Check if the target keyword (or close variants) already drives search traffic to Jay's videos

**3c. Audience Engagement Signal**
Call `mcp__youtube-analytics__get_engagement_metrics`:
- `startDate`: 90 days ago (YYYY-MM-DD)
- `endDate`: today (YYYY-MM-DD)
- `videoId`: (optional) specific video from 3a, or omit for channel-wide engagement
- Calculate engagement rate: (likes + comments) / views

**Ranking Score (1-5):**
- 5: Existing content on exact topic + search terms driving views + engagement >3% + competitors smaller than Jay
- 4: Adjacent content exists + related search terms + engagement 2-3%
- 3: No existing content but aligns with pillar + engagement >2% (also use as FALLBACK if user skips MCP auth)
- 2: New topic area, engagement 1-2%
- 1: Off-pillar, engagement <1%, competitors 10x+ Jay's size

### Step 4: Competitor Unicorn Analysis

Find competitor videos that massively outperform their channel average.

**4a. Load competitor list**
Read `youtube-competitors.json`. Use ALL competitors from the relevant pillar(s) based on the seed topic. If topic spans multiple pillars, use all pillars.

**4b. Scrape competitor channels**
For each competitor, scrape their most recent videos.

**Actor:** `streamers/youtube-scraper`
```json
{
  "startUrls": [{"url": "https://www.youtube.com/@handle"}],
  "maxResults": 10,
  "type": "video"
}
```

Run for ALL competitors in the relevant pillar(s). This is cheap (~$0.005/video).

**4c. Calculate outlier score**
For each competitor:
1. Calculate `avg_views` = median view count across their scraped videos
2. For each video: `outlier_score` = views / avg_views
3. Filter to videos with `outlier_score >= 10` (10x+ their normal performance)

**4d. Analyze unicorns**
For each unicorn video:
- Extract: title, topic, hook (from title), view count, outlier_score, upload date
- Classify content angle: tutorial, reaction, comparison, news, hot_take, case_study, tool_demo, listicle, prediction
- Note: what made this video different from the creator's normal content?

**4e. Score unicorns on the 4-factor matrix**
Apply the same scoring matrix to unicorn topics:
- **Opportunity:** Based on the unicorn's topic search volume (if available from Step 2a) + competition
- **Ranking:** If a competitor proved the topic works in Jay's niche, this is typically 4-5
- **Trend:** Based on video recency and velocity. Recent unicorn (last 30 days) = 4-5. Older = 3
- **Content Fit:** Standard pillar alignment

### Step 5: Score, Rank & Report

**Apply evergreen weights** from `yt-scoring-matrices.json`:
- Opportunity: 35%
- Ranking: 30%
- Trend: 15%
- Content Fit: 20%

**Weighted score** = (opportunity * 0.35 + ranking * 0.30 + trend * 0.15 + content_fit * 0.20) * 4

This produces a 0-20 scale. Classify:
- **MAKE IT** (16-20): Research + script immediately
- **WATCH** (12-15): Monitor, revisit in 1 week
- **SKIP** (0-11): Pass

**Report format:**

```
## EVERGREEN RESEARCH: [seed topic]

### MAKE IT (Score 16+)
| # | Keyword/Topic | Opportunity | Ranking | Trend | Fit | Score | Source |
|---|--------------|-------------|---------|-------|-----|-------|--------|
| 1 | [keyword]    | 5 (12K/mo, low comp) | 4 (related content exists) | 3 (stable) | 5 (direct pillar) | 17.4 | Keyword |

[For each MAKE IT item, include:]
- **Why it scores high:** [1-2 sentence explanation]
- **Search volume:** [X,XXX/mo from Google Keyword Planner]
- **Competition gap:** [what's missing from current top results]
- **Jay's advantage:** [why Jay can rank for this]
- **Suggested angle:** [specific video approach]
→ **Next step:** Run `/youtube-script [keyword]` to write the script

### WATCH (Score 12-15)
[Same table format, briefer explanations]

### Competitor Unicorns Found
| Creator | Video Title | Views | Outlier Score | Topic | Score |
|---------|-------------|-------|--------------|-------|-------|
| @handle | [title]     | 500K  | 42x          | [topic] | 16.8 |

[For each unicorn:]
- **What made it work:** [analysis]
- **Jay's angle:** [how Jay could cover this topic differently]

### Content Gap Matrix
| Keyword | Jay's Closest Video | Views | Gap |
|---------|---------------------|-------|-----|
| [keyword] | [video title] | [views] | OPEN / PARTIAL / SATURATED / COVERED |

### Summary
- X keywords analyzed, Y scored MAKE IT
- Z competitor unicorns found across N channels
- Top recommendation: [#1 keyword/topic with reasoning]
```

---

## PHASE 2: TIMELY RESEARCH

Goal: Find time-sensitive content opportunities from competitor velocity spikes and recent content-research signals.

### Step 1: High-Velocity Competitor Videos

Scrape recent videos (last 7 days) from ALL competitors and find unusually high performers.

**Actor:** `streamers/youtube-scraper`
For each competitor in `youtube-competitors.json`:
```json
{
  "startUrls": [{"url": "https://www.youtube.com/@handle"}],
  "maxResults": 10,
  "type": "video"
}
```

**Calculate velocity for each recent video (uploaded in last 7 days):**
```
days_since_upload = (today - upload_date) in days (minimum 1)
views_per_day = view_count / days_since_upload
channel_avg_views_per_day = competitor.avg_views_approx / 30
velocity_score = views_per_day / channel_avg_views_per_day
```

**Filter by velocity thresholds** (from `yt-scoring-matrices.json`):
- velocity >= 5.0 → **MAKE IT** candidate (topic is exploding)
- velocity >= 3.0 → **WATCH** candidate (above average performance)
- velocity < 1.5 → Skip (normal or below average)

### Step 2: Content-Research Bridge

Check for recent short-form research signals that could become YouTube long-form topics.

**Query Supabase `scraped_ideas` table via REST API:**
```bash
source .env.local
THREE_DAYS_AGO=$(date -v-3d +%Y-%m-%dT%H:%M:%SZ)

curl -s "${NEXT_PUBLIC_SUPABASE_URL}/rest/v1/scraped_ideas?select=id,creator_name,platform,caption,relevance_score,created_at&created_at=gte.${THREE_DAYS_AGO}&or=(platform.eq.youtube,relevance_score.gte.7)&order=relevance_score.desc&limit=10" \
  -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" | jq '.'
```

**If env vars are still empty after `source .env.local`:** Tell user — "Supabase env vars not available in this shell session. Run this command in your terminal with `!` prefix: `! source .env.local && curl ...`"

**Required env vars:** `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (from `.env.local`)

**Table columns:** `id`, `creator_name`, `username`, `platform` (instagram/tiktok/youtube), `video_url`, `caption`, `views`, `likes`, `relevance_score` (1-10), `relevance_explanation`, `ai_script`, `created_at`

**If results found:**
- Surface the top 5 ideas by relevance_score
- For each, suggest a YouTube long-form angle:
  - How would this short-form trend translate to a 10-15 minute deep-dive?
  - What additional value can a long-form video provide?
  - What search keywords would this target?

**If no results (table empty or no recent ideas):**
- Tell user: "No recent content research ideas found (last 3 days). Would you like me to run `/content-research trending` to find fresh signals?"
- If user says yes, suggest running content-research trending mode first, then coming back to yt-research timely phase

### Step 3: Score & Report

**Apply timely weights** from `yt-scoring-matrices.json`:
- Opportunity: 25%
- Ranking: 20%
- Trend: 35%
- Content Fit: 20%

Score all velocity hits and content-research bridge ideas on the same 4-factor matrix.

**Report format:**

```
## TIMELY RESEARCH: [date]

### High-Velocity Videos (Last 7 Days)

#### MAKE IT (Velocity 5x+)
| # | Creator | Video Title | Views | Days Live | Velocity | Topic | Score |
|---|---------|-------------|-------|-----------|----------|-------|-------|
| 1 | @handle | [title]     | 50K   | 3         | 8.2x     | [topic] | 17.0 |

[For each MAKE IT item:]
- **Why it's trending:** [velocity analysis]
- **Time sensitivity:** [how long before the window closes]
- **Jay's angle:** [how to cover this topic with Jay's unique perspective]
→ **Next step:** Script and film within [X] days

#### WATCH (Velocity 3-5x)
[Same table, briefer]

### Content-Research Bridge
| # | Source Platform | Topic | Relevance | Suggested YT Angle |
|---|----------------|-------|-----------|-------------------|
| 1 | Instagram Reel  | [topic] | 9/10    | [long-form angle] |

### Summary
- X competitor videos from last 7 days analyzed
- Y trending topics found (Z at MAKE IT level)
- A content-research ideas bridged to YouTube angles
- **Most urgent:** [#1 recommendation with time sensitivity]
```

---

## COMBINED REPORT (Both Phases)

When user selects "Both", run Phase 1 first, then Phase 2. Present a combined final report:

**MINIMUM 5-10 scored ideas REQUIRED before presenting report.** If combined phases produce fewer than 5 MAKE IT + WATCH items, expand keyword discovery with additional seed phrases or lower the minimum competition threshold to surface more candidates.

```
## YT RESEARCH: [seed topic] — [date]

### TOP OPPORTUNITIES (All Phases Combined)
[Merge and re-rank ALL MAKE IT + WATCH items from both phases by final score — minimum 5, target 8-10]

| # | Type | Keyword/Topic | Opp | Rank | Trend | Fit | Score | Decision | Suggested Angle |
|---|------|--------------|-----|------|-------|-----|-------|----------|-----------------|
| 1 | Timely | [topic]     | 4   | 5    | 5     | 5   | 18.2  | MAKE IT  | [angle] |
| 2 | Evergreen | [keyword] | 4   | 5    | 3     | 5   | 17.4  | MAKE IT  | [angle] |
| 3 | Evergreen | [keyword] | 3   | 4    | 2     | 5   | 14.5  | WATCH    | [angle] |
...continue for all 5-10 items...

### SKIP LIST
[All SKIP items — keyword, score, reason in one line each]

### Phase 1 Details: [link to evergreen section]
### Phase 2 Details: [link to timely section]

### Recommended Content Calendar
1. **This week:** [most urgent timely topic]
2. **Next week:** [top evergreen keyword]
3. **Backlog:** [remaining MAKE IT items]
```

---

## Save Behavior

**Save ALL scored ideas after presenting the report** — this enables deduplication across future runs so the same keyword is never re-researched from scratch.

### Save to `yt_longtail_keywords` via Supabase REST API

Save every scored idea (MAKE IT + WATCH + SKIP) immediately after presenting the combined report. Use the Supabase REST API directly with the service role key for upsert deduplication:

```bash
source .env.local
curl -s -X POST \
  "${NEXT_PUBLIC_SUPABASE_URL}/rest/v1/yt_longtail_keywords" \
  -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -H "Prefer: resolution=merge-duplicates" \
  -d '[
    {
      "user_id": "3faff114-3c2d-4375-b422-dbb0cd6f96ba",
      "keyword": "cold email agency",
      "seed_topic": "cold email",
      "volume_score": 4,
      "competition_score": 5,
      "authority_score": 5,
      "opportunity_score": 19.2,
      "trend": "stable",
      "category": "quick_win",
      "status": "new",
      "content_pillar": "cold email",
      "suggested_angles": ["How I'\''d Start a Cold Email Agency in 2025"],
      "notes": "MAKE IT | Evergreen | Score 19.2/20 | search vol 880/mo | Jay has only negative-angle video"
    }
  ]'
```

**Map yt-research fields → yt_longtail_keywords columns:**
- `title` → `keyword`
- `topic` (root) → `seed_topic`
- `details.opportunity` → `volume_score` (1-5)
- `details.ranking` → `competition_score` (1-5, higher = easier to rank)
- `details.contentFit` → `authority_score` (1-5)
- `score` (weighted /20) → `opportunity_score`
- `details.type` → `trend`: Evergreen→`stable`, Timely→`rising`
- `decision` → `status`: MAKE_IT→`new`, WATCH→`new`, SKIP→`archived`
- Seed topic → `content_pillar`
- `details.suggestedAngle` → `suggested_angles` (array)
- Decision + score + content gap summary → `notes`

**Category assignment (based on score /20):**
- Score ≥16 (MAKE IT): `quick_win`
- Score 12-15 (WATCH): `growth_bet`
- Score 8-11: `standard`
- Score <8 (SKIP): `avoid`

**De-duplication:** The `Prefer: resolution=merge-duplicates` header triggers Postgres upsert on the `yt_longtail_keywords_user_keyword_unique` constraint (`user_id` + `keyword`). If a keyword was researched before, the row is updated with fresh scores — not duplicated.

**Score format:** `opportunity_score` stores the raw /20 weighted score (e.g., `19.2`). `volume_score`, `competition_score`, `authority_score` store the 1-5 factor scores. Migration `20260407_yt_longtail_dedup_and_score.sql` changed these columns from INTEGER to NUMERIC(4,2).

**Jay's user_id:** `3faff114-3c2d-4375-b422-dbb0cd6f96ba`

**Confirm save:** After the curl completes, print: "Saved N keywords to yt_longtail_keywords (N new, N updated)."

---

## Skill Chaining

| From yt-research | Chain to | When |
|-----------------|----------|------|
| Any MAKE IT keyword/topic | `/youtube-script [keyword]` | User clicks "Write Script" |
| Content-research bridge (no ideas) | `/content-research trending` | No recent scraped_ideas found |
| Completed script | `/youtube-thumbnail [topic]` | After script is written |
| Combined report complete | `/content-report` | Format as branded PDF with shareable URL |

After presenting the combined report, prompt:
> "Run `/content-report` to format this as a shareable branded PDF (Google Drive + shareable URL)."

---

## Tool Reference

### Apify Actors (pay-per-result, verified working)

| Actor | Purpose | Input | Cost |
|-------|---------|-------|------|
| `lofomachines/keyword-shitter-autocomplete-scraper` | Keyword discovery (YouTube autocomplete) | `{ searchEngine: "youtube", seedPhrases: [...], expansionMode: "alphabet", maxLetters: 8, maxResults: 10, country: "us", language: "en", outputFormat: "detailed", commonSuffixes: ["for", "how", "why", "what", "best", "free", "tool", "software"] }` | ~$0.002/result |
| `streamers/youtube-scraper` | Video search + channel scraping | `{ searchQueries: [...], maxResults: N }` or `{ startUrls: [{url: "..."}], maxResults: N, sortVideosBy: "NEWEST" }` | ~$0.004/video |

**Workflow for each actor:** `fetch-actor-details` (get schema) → `call-actor` (run) → `get-actor-output` (full results if needed)

### Google Ads Keyword Planner (FREE)

| Tool | Purpose | Usage | Cost |
|------|---------|-------|------|
| `google-ads-keyword-planner.py` | Real search volume, CPC, competition | `python3 references/google-ads-keyword-planner.py --json "kw1" "kw2" ... "kw20"` | FREE |

**Config:** `.claude/skills/yt-research/references/google-ads-config.json`
**Batch limit:** 20 keywords per call. Split larger sets into batches and merge results.
**Returns:** `avg_monthly_searches`, `competition` (LOW/MEDIUM/HIGH), `competition_index` (0-100), CPC bids, 6-month historical volumes.
**Note:** API returns related keyword suggestions too (~300-400 results from 20 seeds). Deduplicate before scoring.

---

## Important Rules

1. **NEVER use WebSearch** for any research in this skill. All data comes from Apify actors, YouTube Analytics MCP, and Supabase queries
2. **ALWAYS ask phase selection** before starting. Never auto-select a phase
3. **ALWAYS load reference files** before scoring. Never hardcode competitor lists or scoring thresholds
4. **Score EVERY idea** on all 4 factors with evidence. Never assign scores without justification
5. **No batch-identical scores** — each idea must have individually assessed factor scores based on its specific data
6. **Use phase-specific weights** — evergreen and timely have different weight distributions
7. **Unicorn threshold is 10x** — do not surface videos below 10x their channel average as unicorns
8. **Velocity threshold is 5x** for MAKE IT — do not flag normal-performing recent videos
9. **Content-research bridge** checks last 3 days only. If no ideas exist, offer to run `/content-research trending` — do not skip this step silently
10. **YouTube Analytics MCP required** — if not authenticated, stop and ask user to run `! oauth`. Only use fallback ranking score 3 if user explicitly chooses to skip authentication
11. **Volume floor** — keywords with <50/mo volume get Opportunity score capped at 1, regardless of competition. This prevents low-volume keywords from inflating scores via other factors
12. **Google Ads batch limit** — KeywordPlanIdeaService supports max 20 keywords per request. Split larger sets into batches of 20 and merge/deduplicate results
13. **Content fit must match "outreach" and "automation"** — keywords containing "cold outreach", "cold email automation", "ai automation" are direct pillar matches (score 5), not cross-pillar (score 3)
14. **Broken competitor channels** — if a competitor channel returns `CHANNEL_DOES_NOT_EXIST` during scraping, skip it, log a warning, and continue with remaining channels. Do not fail the entire run. After the run, flag broken channels in `youtube-competitors.json` with `"status": "broken"`
