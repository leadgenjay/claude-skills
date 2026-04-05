---
name: yt-longtail
version: 1.0.0
description: "Discover high-opportunity, low-competition YouTube keywords. Triggers on '/yt-longtail [topic]', 'long-tail keywords', 'keyword research', 'what to make a video about', 'find keywords about [topic]'."
---

# YT Long Tail Keyword Research

Alias for the youtube-script skill's **Keyword Research Pipeline (Phase 0)**.

## Invocation

`/yt-longtail [seed topic]`

## What This Does

1. Delegates to the youtube-script skill's Keyword Research Pipeline (Steps 1-5)
2. Discovers 20-50 candidate keywords via YouTube autocomplete + WebSearch
3. Estimates volume, competition, and channel authority
4. Scores and ranks keywords by composite opportunity score
5. **Saves winners (score 60+) to the database** via `POST /api/ideas/yt-longtail`
6. Generates a formatted report with top keywords and suggested angles

## Save Behavior

After the report is generated, keywords scoring 60+ are automatically saved:
- Viewable in **Ideas → YT Long Tail** dashboard tab
- Each keyword includes: scores, trend, category, suggested angles, top videos
- Category auto-assigned: `quick_win`, `growth_bet`, `standard`, or `avoid`

## Cost

~$0.20 per research session (YouTube autocomplete scrape + video data)

## Next Steps

- Browse saved keywords in the dashboard
- Click "Write Script" on any keyword to trigger `/youtube-script [keyword]`
- Manually add keywords via the dashboard
