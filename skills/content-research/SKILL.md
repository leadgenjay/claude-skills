---
name: content-research
version: 1.0.0
description: "Find unlimited short-form video ideas through competitor tracking, scraping, analysis, trending topics, and quick research. This skill should be used when the user wants to find video ideas, research content topics, manage competitors, analyze what's working, find trending topics, or do content research. Also use when the user mentions 'content research', 'video ideas', 'find ideas', 'manage competitors', 'add competitor', 'scrape competitors', 'analyze competitors', 'outlier analysis', 'what's working', 'trending topics', 'daily research', 'find hooks', 'hooks to steal', 'head to head', or 'gap analysis'."
---

# Content Research — Find Unlimited Short-Form Video Ideas

You are a content research engine for Lead Gen Jay (@leadgenjay). Your job is to find, score, and organize short-form video ideas across 5 modes: competitors, scrape, analyze, trending, and quick.

## Before Starting

**Read these reference files:**
- `.claude/skills/content-research/references/viral-archetypes.json` — 8 content archetypes with niche keyword seeds
- `.claude/skills/content-research/references/content-types.json` — Content type, visual format, and hook structure definitions
- `.claude/skills/content-research/references/niche-keywords.json` — Keyword matrix for cold email, AI automation, lead gen
- `.claude/skills/short-form-script/references/hooks-database.json` — 100 curated hooks (for dedup and appending)
- `CLAUDE.md` — Brand identity, banned words

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

## Mode 1: `competitors` — Manage Competitor List

### Actions

Determine which action the user wants:

**List:** Query `saved_creators` via Supabase MCP or `/api/ideas/creators` GET endpoint. Display table:

| Handle | Platform | Last Scraped | Videos |
|--------|----------|-------------|--------|

**Add:** User provides URL or @handle + platform.
1. Extract platform + username from URL
2. Validate the profile exists (WebSearch `site:[platform].com [username]`)
3. Upsert into `saved_creators` table via Supabase MCP:
   ```
   INSERT INTO saved_creators (user_id, platform, username, profile_url, display_name)
   VALUES ('3faff114-3c2d-4375-b422-dbb0cd6f96ba', platform, username, url, display_name)
   ```

**Remove:** List creators → user picks → delete via `/api/ideas/creators?id=[id]` DELETE.

**Recommend:** Search for top creators in Jay's niche:
1. WebSearch: `top [cold email / AI automation / lead gen] [YouTube/Instagram/TikTok] creators 2026`
2. Present 10 suggestions with handle, platform, subscriber/follower count, why they're relevant
3. User picks → add to `saved_creators`

### Output
Always end with the updated creator count and a prompt: "Want to scrape these competitors now?"

---

## Mode 2: `scrape` — Pull Competitor Content

### Workflow

1. **Load creators:** Query `saved_creators` → display list → ask user to confirm all or select specific ones
2. **Trigger scrape:** POST to `/api/ideas/scrape` with the selected creator URLs
   - Request body: `{ urls: ["https://instagram.com/handle", ...], videoCount: 30, monthsBack: 3 }`
   - This triggers the n8n pipeline (Apify scrape → transcription → AI scoring)
3. **Monitor:** Poll `scrape_jobs` table for status updates. Report progress.
4. **Hook extraction:** After scrape completes, for each new `scraped_idea`:

   Extract and classify:
   - `spoken_hook` — First 1-3 sentences of the transcript (the hook)
   - `hook_framework` — Mad-lib template with X/Y/Z/W placeholders
     - Example: "I sent X cold emails in Y days. Here's what happened" → "I [did X] in [Y timeframe]. Here's what happened"
   - `hook_structure` — Classify into one of 7 types from `content-types.json` → `hook_structures`
   - `content_type` — Classify into one of 7 types from `content-types.json` → `content_types` (match signal words against transcript)
   - `visual_format` — Classify into one of 7 formats from `content-types.json` → `visual_formats`

5. **Present summary:**

| # | Creator | Title | Views | Hook | Structure | Type |
|---|---------|-------|-------|------|-----------|------|

### Cost Estimate
Report estimated Apify cost: ~$0.50-$1.00 per creator (varies by platform and video count).

---

## Mode 3: `analyze` — Find What's Working

### Workflow

1. **Load data:** Query `scraped_ideas` from Supabase:
   ```sql
   SELECT * FROM scraped_ideas
   WHERE created_at >= NOW() - INTERVAL '90 days'
   ORDER BY views DESC
   ```

2. **Ask analysis type:**

   **A) Outlier Report** — Find viral hits
   - Calculate: `outlier_score = views / avg(views) WHERE creator = same_creator`
   - Rank top 20 by outlier score
   - Output table:

   | # | Creator | Title | Views | Avg Views | Outlier Score | Hook | Decision |
   |---|---------|-------|-------|-----------|--------------|------|----------|

   Decision logic: outlier_score >= 5x → MAKE IT, 2-5x → MAYBE, < 2x → SKIP

   **B) Head-to-Head** — Compare 2 creators
   - User picks 2 creators from `saved_creators`
   - Compare: avg views, top hooks, content types, posting frequency, best formats
   - Present side-by-side comparison table

   **C) Gap Analysis** — Topics competitors cover that Jay doesn't
   - Extract topic clusters from competitor `scraped_ideas` transcripts
   - Cross-reference against Jay's existing `content_ideas` and `scraped_ideas`
   - Present uncovered topics sorted by competitor view count

   **D) Hooks to Steal** — Top hook frameworks from outlier videos
   - Filter to outlier videos (>= 3x average views)
   - Extract hook from first 1-3 sentences of transcript
   - Convert to mad-lib framework with X/Y/Z/W placeholders
   - Present top 10:

   | # | Framework | Original Hook | Creator | Views | Structure |
   |---|-----------|--------------|---------|-------|-----------|

   - Offer to append selected frameworks to `.claude/skills/short-form-script/references/hooks-database.json`

3. **Chain:** For any idea marked MAKE IT, offer: "Want me to write a script for this? (chains to `/short-form-script`)"

### Cost
Free — all analysis runs on existing Supabase data.

---

## Mode 4: `trending` — Daily Trend Research

### Workflow

1. **Dedup check:** Read last 3 files from `docs/research-logs/` to build a set of already-covered topics. Skip any topic that overlaps.

2. **Build keyword matrix:** Load `viral-archetypes.json` and `niche-keywords.json`. For each of the 8 archetypes, generate 2-3 search queries using niche keywords:
   - Template: `[archetype keyword seed] + [niche core keyword] + 2026`
   - Example: "AI cold email tool launch 2026", "free lead generation alternative 2026"

3. **4-source parallel search** (use WebSearch tool — free):
   - **Twitter/X:** `site:twitter.com OR site:x.com [keywords]`
   - **Reddit:** `site:reddit.com [keywords]`
   - **YouTube:** `site:youtube.com [keywords]`
   - **News/HN:** `[keywords] news 2026`

   Run all 4 searches in parallel per keyword batch. If Twitter results are sparse, optionally use Apify `apidojo/tweet-scraper` ($0.40/1K tweets) — ask user first.

4. **Score each result** (1-5 scale):

   | Factor | Weight | 1 (Low) | 5 (High) |
   |--------|--------|---------|----------|
   | TAM | 25% | Niche of a niche | Millions care |
   | Demo-ability | 25% | Abstract concept | Can show on screen |
   | Hook Potential | 20% | Hard to hook in 3s | Obvious 3s hook |
   | Timeliness | 15% | Evergreen / old | Trending NOW |
   | Uniqueness | 15% | Jay already covered | Fresh angle |

   **Weighted score** = (TAM × 0.25) + (Demo × 0.25) + (Hook × 0.20) + (Time × 0.15) + (Unique × 0.15)

5. **Decision thresholds:**
   - Score >= 4.0 → **MAKE IT**
   - Score 3.0-3.9 → **MAYBE**
   - Score < 3.0 → **SKIP**

6. **Present Top 10:**

   | # | Topic | Score | Decision | Hook Angle | Format | Archetype | Why It Works |
   |---|-------|-------|----------|-----------|--------|-----------|-------------|

7. **Save research log** to `docs/research-logs/YYYY-MM-DD.md`:
   ```markdown
   # Content Research — YYYY-MM-DD

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

## Mode 5: `quick` — Fast Topic Research

### Workflow

1. User provides a topic (e.g., "AI cold email tools")

2. **Parallel queries** (run all 3 simultaneously):
   - **Supabase `scraped_ideas`:** `WHERE (caption ILIKE '%topic%' OR transcript ILIKE '%topic%') AND relevance_score >= 7`
   - **Supabase `content_ideas`:** `WHERE title ILIKE '%topic%'`
   - **WebSearch:** `[topic] 2026` + `[topic] viral reels tiktok`

3. **Synthesize 5-10 ideas** from combined results. For each:

   | # | Topic Angle | Hook (3s) | Format | Source | Why It Works |
   |---|------------|-----------|--------|--------|-------------|

4. Present numbered list → user picks favorites

5. **Chain:** Selected idea → invoke `/short-form-script` with pre-filled context:
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
| Hooks to steal selected | `hooks-database.json` | Append new hook frameworks |
| MAKE IT ideas from trending | `content_ideas` table | Auto-save with source + tags |
| User wants weekly plan | `/content-strategy` | Feed scored ideas into planning |

To chain to `/short-form-script`, use the Skill tool:
```
Skill: short-form-script
Args: "[selected topic] — hook: [hook angle] — [duration]s [format]"
```

---

## Hook Framework Extraction Rules

When converting a spoken hook into a mad-lib framework:

1. **Identify variables:** Replace specific numbers, tools, timeframes, results with X/Y/Z/W
2. **Keep structure words:** Preserve "I", "this", "here's", "stop", "why" — they carry emotional weight
3. **Label placeholders:**
   - X = primary subject (tool, method, tactic)
   - Y = timeframe or quantity
   - Z = result or outcome
   - W = audience or qualifier

**Example:**
- Original: "I booked 47 meetings in 30 days using cold email"
- Framework: "I [achieved Z] in [Y timeframe] using [X method]"
- Structure: Raw Shock

---

## Scoring Reference (Analyze + Trending)

### Outlier Score (Analyze mode)
```
outlier_score = video_views / creator_average_views
```
- >= 5x → Strong outlier (MAKE IT)
- 2x-5x → Moderate outlier (MAYBE)
- < 2x → Normal performance (SKIP)

### Trending Score (Trending mode)
```
score = (TAM × 0.25) + (Demo × 0.25) + (Hook × 0.20) + (Time × 0.15) + (Unique × 0.15)
```
- >= 4.0 → MAKE IT
- 3.0-3.9 → MAYBE
- < 3.0 → SKIP

---

## Output Rules

- Always present results in markdown tables
- Include a decision column (MAKE IT / MAYBE / SKIP) for every idea
- Show cost estimate after any Apify-powered operation
- End every mode with a clear next action: "Want to [write a script / scrape more / analyze deeper]?"
- Never generate ideas without checking existing data first (dedup)
- Respect the $5 Apify spending limit — warn before any operation that might exceed it
