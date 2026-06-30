# Reddit Winning Patterns (from real data)

> These rules are derived from REAL top-performing posts, not best-practices guesses.
> When you draft, follow what actually wins here. Refresh for your own niche anytime (see bottom).

**Source scrape:** 75 top posts (last ~month) from a set of B2B / cold-email / AI-automation / lead-gen
subreddits (r/sales, r/coldEmail, r/Emailmarketing, r/B2Bsales, r/n8n, r/nocode, r/artificial,
r/ClaudeAI, r/leadgeneration, r/SaaS, r/Entrepreneur, r/agency). Ranked by upvotes. The exact channels
live in `config/channels.json` - edit them and re-scrape to derive patterns for a different niche.

---

## What actually wins (ranked archetypes from the data)

### 1. The long-form value dump (highest ceiling)
The single biggest post in the pull: **"I'll give you everything I learned over 30 years in one post. I retired at 51."** - 5,557 upvotes, 471 comments (r/sales). One person, hard-won lessons, zero pitch, generous.
- https://www.reddit.com/r/sales/comments/1tw6tts/ill_give_you_everything_i_learned_over_30_years/
- **How to use it:** give away a real teardown of something you learned the hard way. The whole thing, no gate.

### 2. The build show-and-tell (strongest fit if you actually build things)
In the automation subs, "I built X" with the **exact stack named** wins:
- **"I built an AI Receptionist for coaches and consultants using n8n + GPT-4o + Supabase"** - 257 up, 78 c (r/n8n). https://www.reddit.com/r/n8n/comments/1u33ibs/i_built_an_ai_receptionist_for_coaches_and/
- "Built an n8n workflow that scrapes Google Maps leads and writes personalized email outreach" - 123 up (r/n8n).
- **Pattern:** "I built [specific thing] using [named tools]" + what it does + (often) an offer to share the build. Naming the real stack is the credibility. If you build, this is your highest-trust archetype.

### 3. The honest result / milestone
Short title, real number, no spin:
- "First 6 figure commission check" - 528 up. https://www.reddit.com/r/sales/comments/1tz0c9p/first_6_figure_commission_check/
- "Just closed my biggest deal of my life $60k gross commission" - 423 up.
- **How to use it:** a real result with the number in the title ("Cut a client's stack from $740/mo to $97 and reply rate went up"). No marketing gloss.

### 4. The discussion question (comment magnet)
Questions drive the most comments:
- "What does the richest sales rep you know sell?" - 287 up, **729 comments**. https://www.reddit.com/r/sales/comments/1ueycj6/what_does_the_richest_sales_rep_you_know_sell/
- "Who here has earned a $100k+ commission check" - 209 up, 264 c.
- **How to use it:** open a genuine question to the community ("What's the most underrated lead source you're using right now?"). Best in a community you own or are a regular in.

### 5. The relatable rant / observation
Casual, opinionated, sometimes profane, very human:
- "Looking for true hunters, hunter mentality, must love to hunt... why is this even included?" - 296 up.
- "Base salary. Boomers." - 408 up. "These interviews are getting unhinged" - 170 up.
- **How to use it:** a sharp, true observation about your corner of the industry. Honest, not performative.

---

## Title rules (from the data)

- **Short and plain.** Most winning titles are under ~12 words. No emoji. No ALL CAPS. No clickbait punctuation.
- **First person or a direct question.** "I built...", "Just closed...", "Who here has...", "What does..."
- **Put the real number in the title** when there is one ($60k, $100k, 50M emails, $19/category).
- **No marketing voice.** If it reads like an ad headline, it gets downvoted or removed.

## Body rules (from the data)

- **Substance or a genuine question.** Winners either teach something real or ask something real. Thin posts die.
- **Name the exact tools, numbers, and steps.** Specificity is the upvote currency (especially in r/n8n, r/coldEmail).
- **Zero promo in subs you do not own.** None of the top organic posts pitch. Usefulness and honesty win.
  Save any soft mention for a community you run, and even there keep it at the very end.
- **Light markdown is fine** (Reddit renders it): short paragraphs, one numbered or bulleted list, maybe one bold line.

## Per-subreddit read

| Sub type | What wins there | Your move |
|----------|-----------------|-----------|
| r/sales | Wins, rants, war stories, career questions (it's reps, not buyers) | Honest result stories + sharp observations; not how-to promo |
| r/n8n, r/nocode, r/automation | "I built X with [stack]" show-and-tell + share the build | Real builds, named tools, offer the recipe |
| r/coldEmail, r/Emailmarketing, r/B2Bsales | Deliverability tactics, reply-rate results, tool comparisons | Specific tactical teardowns with real numbers |
| A community you own | You have more latitude | Value first; a soft link only at the very end |

## Engagement benchmark (this niche, this month)

- A solid post lands **100-300 upvotes**; standout build/value posts hit **250-550**; one rare value-dump hit 5,500.
- Comment-heavy posts (250-700 comments) are almost always **questions** or **milestones**.

---

## Refresh this file for your own niche

1. Edit `config/channels.json` -> `reddit` to the subreddits you care about.
2. Add a free Apify key to `.env` (see `.env.example`), then run:
   ```bash
   npx tsx scripts/scrape-top-posts.ts --platform reddit --limit 25 --out ./brief.json
   ```
3. Read the top posts in `brief.json` and update the archetypes + cited examples above, with today's date.
