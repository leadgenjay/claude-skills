---
name: reddit-post
version: 1.0.0
description: "Draft community-native Reddit posts that earn upvotes instead of getting flagged as spam. Learns from a bundled, data-derived playbook of real top-performing posts in the B2B / cold-email / AI-automation / lead-gen niche, then writes ready-to-paste drafts in your voice. A short interview picks the topic and target subreddit; a built-in review gate catches AI-tell words, em dashes, placeholders, and salesy promo before anything reaches you. Optional Apify key refreshes the playbook for your own niche. Draft only - you review and post manually. Use when the user says 'reddit post', 'draft a reddit post', 'write a reddit post', 'subreddit post', or 'reddit content'."
user_invocable: true
command: /reddit-post
arguments: "[topic] [--subreddit <name>] [--count 3]"
---

# Reddit Post - Community-Native Drafts

You draft Reddit posts a person can review and post by hand. The job is two halves: first **learn what wins** on Reddit (from the bundled, data-derived playbook), then **draft community-native posts** that earn upvotes instead of getting flagged as spam.

This skill is **draft only**. It never posts to Reddit. Output is a clean file plus an in-chat preview you copy into Reddit manually.

---

## Step 0 - Prerequisites

Before anything else, verify these. If a REQUIRED item is missing, STOP and tell the user where to get it. Do not generate placeholder commands.

| Requirement | Check | Where to get it |
|-------------|-------|-----------------|
| Node.js 18+ (REQUIRED, for the bundled scripts) | `node -v` (expect v18 or higher) | https://nodejs.org |
| `APIFY_API_TOKEN` (OPTIONAL, only for fresh scraping) | `echo $APIFY_API_TOKEN`, or a `.env` file in this folder | Free key at https://apify.com. Skip it and the skill uses the bundled `references/winning-patterns.md`. |

The skill is fully usable with no Apify key. The key only unlocks an optional fresh scrape of competitor posts. If it is missing, do NOT STOP - just use the bundled playbook.

---

## Before drafting

Read these bundled files so the drafts follow what actually wins and sound human:

- `references/winning-patterns.md` - **what actually wins on Reddit in this niche, derived from real scraped top posts.** This is the rule source, not generic platform advice. Read it first.
- `references/voice-guide.md` - voice and tone rules (apply silently): no em dashes, no AI-tell words, specific real numbers, first-person peer voice.

---

## What's winning on Reddit (the short version)

These come from a real scrape of top posts (see `references/winning-patterns.md`). Follow what wins, not generic advice.

**The archetypes that score (pick one per draft):**
1. **Build show-and-tell:** "I built [specific thing] using [named stack]" + what it does + an offer to share. Naming real tools is the credibility.
2. **Honest result / milestone:** a short title with the real number ("Cut a client's stack from $740 to $97, reply rate went up"). No spin.
3. **Long-form value dump:** give away a hard-won teardown in full, no gate.
4. **Discussion question:** a genuine question to the community drives the most comments (best in a sub you own or frequent).
5. **Relatable rant / sharp observation:** a true, slightly spicy take on your corner of the industry.

**Non-negotiables (confirmed by the data):**
- **Value or story first, pitch last or never.** Subs you do not own = zero promo. A sub you own = a soft mention at the very end only.
- **No link-dropping in the body.** Any link goes in a first comment, and only if the sub allows it.
- **Titles are short, plain, first-person, no emoji, no ALL CAPS, no clickbait.** Put the real number in the title when there is one.
- **Name the exact tools, numbers, and steps.** Specificity is the upvote currency.
- **150-400 words of real substance.** Light markdown only (short paragraphs, maybe one list, maybe one bold line).
- **First person, peer to peer.** Practitioner sharing, not brand broadcasting.

---

## Workflow

```
Step 1: Interview (ask 2-3 quick questions)
  |
Step 2: (optional) Gather fresh patterns (only if the user wants a live scrape AND a key is set)
  |
Step 3: Pick the archetype + angles
  |
Step 4: Draft N posts in the user's voice (Reddit-native, anti-promo)
  |
Step 5: Critical review loop (save -> grade with check-post-drafts.ts -> fix -> re-grade, up to 3 passes)
  |
Step 6: Present (only after the drafts pass review)
```

Run autonomously after Step 1. Do not pause between steps 2-6.

---

## Step 1: Interview (keep it simple)

Ask these plain questions. Accept short answers; use the defaults if they skip.

1. **Topic?** "What should the posts be about?" Take a topic or a rough idea. If they have none, suggest 2-3 from the archetypes above and let them pick.
2. **Which subreddit, and does it allow self-promotion?** Default assumption: **no promo** unless they say they own/run the sub. If unsure, write zero-promo (it is always safe).
3. **Fresh competitor scrape?** (Only ask if it might help.) "I already have the winning patterns analyzed. Want me to pull a fresh scrape of current top posts (needs a free Apify key, costs a few cents), or use the saved analysis (free)?" Default: **use the saved analysis.**

State the plan back in one line, e.g.: `Topic: cutting your cold-email stack cost. Target: r/coldEmail (no promo). Using the saved playbook. Cost: $0.`

---

## Step 2: Gather fresh patterns (optional)

Skip this entirely unless the user asked for a fresh scrape AND `APIFY_API_TOKEN` is set. The bundled `references/winning-patterns.md` is enough for almost every draft.

If they did ask and a key is set:

```bash
# Scrapes the subreddits in config/channels.json (edit that file to your niche). Honors --max-cost.
npx tsx scripts/scrape-top-posts.ts --platform reddit --limit 20 --max-cost 0.50 --out ./brief.json
```

If no key is set, the script prints a friendly note and exits cleanly - just continue with the bundled playbook. If a scrape runs, skim `brief.json` to confirm the patterns still hold and grab a current example.

---

## Step 3: Pick the archetype + angles

Choose `--count` topics (default 3). For each, pick the archetype from `references/winning-patterns.md` that fits the topic and the target sub. If posting to a sub you do not own, drop anything that needs a pitch.

---

## Step 4: Draft the posts

For each angle, write a Reddit post in the user's voice (apply `references/voice-guide.md` silently). Make the body a real story or teardown, tighten the title, and strip any promo the target sub does not allow.

Each draft has:
- **Title** (specific, honest, no emoji, no ALL CAPS)
- **Body** (150-400 words, light markdown, first person, value first)
- **Suggested flair** (if the sub uses flairs - otherwise "n/a")
- **Optional first comment** (only if a link is allowed and useful - otherwise omit entirely)

Promo rule by target:
- A sub you own: a soft mention/link is fine, placed at the very end or in the first comment. Never the lead.
- Any other sub: **zero pitch.** Pure value. No brand name unless it is genuinely part of the story.

---

## Step 5: Critical Review Loop (fix before finishing)

Never present drafts straight from Step 4. Save them, grade them, and fix until clean. This is a real review pass, not a rubber stamp.

**1. Save the drafts** to `./social-drafts/reddit/<YYYY-MM-DD>-<slug>.md` with this header:
```markdown
---
title: <topic> - Reddit Drafts
created: <YYYY-MM-DD>
subreddit: <name>
source: reddit-post skill
status: draft
---
```

**2. Run the deterministic gate:**
```bash
npx tsx scripts/check-post-drafts.ts --platform reddit --file ./social-drafts/reddit/<YYYY-MM-DD>-<slug>.md --count 3
```
Exit 0 = clean. Exit 1 = it printed FAILs you MUST fix (em dashes, AI-tell words, placeholders, emoji or ALL-CAPS titles, wrong draft count). Fix every FAIL in the file, look at each WARN (word count, link in body), then re-run.

**3. Qualitative critique** (the grader cannot judge these - you must):
- Does each draft match a proven archetype from `references/winning-patterns.md` (build show-and-tell, honest result, value dump, question, rant)? If a draft is generic, rewrite it to a proven shape.
- Anti-promo: value-first with no pitch? (Zero pitch for subs you do not own; soft mention only at the very end for a sub you own.)
- Voice: sounds like a real person (first person, specific real numbers, peer-to-peer, jargon defined)?

**4. Loop:** re-run the grader after each round of fixes. Repeat up to 3 passes. Move on only when the grader exits PASS (0) and the critique is satisfied. If something still cannot pass after 3 passes, do NOT hide it: present what you have and flag the unresolved item.

---

## Step 6: Present

Present all drafts in chat so the user can copy/paste. State the review result plainly, for example: "All 3 drafts passed the review gate (0 fails). These are drafts - review, then post manually to the subreddit."

---

## Output Format

```markdown
## REDDIT DRAFTS - <topic>

Target: <subreddit> | Promo allowed: <yes (soft) | no>
Source: saved playbook | Cost: $0

---

### Draft 1
**Title:** <title>
**Flair:** <flair or n/a>

<body - light markdown, value first>

**First comment (optional):** <only if a link is allowed; otherwise omit>

---

### Draft 2
...

---

### Draft 3
...
```

---

## Quality Checklist (Step 5 review loop)

The first set is enforced automatically by `scripts/check-post-drafts.ts`; the rest are judgment calls in the qualitative critique.

- [ ] **Value first** - the post helps the reader even if they never click anything
- [ ] **No link-dropping in the body** - any link is in a first comment, and only if the sub allows it
- [ ] **Promo matches the sub's rule** - zero pitch for subs you do not own; soft only for a sub you own
- [ ] **Title is honest and specific** - no emoji, no ALL CAPS, no clickbait
- [ ] **First person, peer to peer** - practitioner sharing, not brand broadcasting
- [ ] **150-400 words** of real substance
- [ ] **No AI-tell words** (see `references/voice-guide.md`)
- [ ] **No em dashes or en dashes** anywhere
- [ ] **No placeholders** - no `[topic]`, `[link]`, `[your result]`. Everything is paste-ready. If a value is unknown, rewrite the line to not need it
- [ ] **No jargon without a same-sentence definition**
- [ ] Light markdown only (short paragraphs, maybe one list, maybe one bold line)
- [ ] `--count` drafts produced (default 3)

---

## Cost & Safety

- The default path costs **$0** - no scraping, just the bundled playbook.
- A fresh scrape uses Apify and is metered. The helper honors `--max-cost` (default $1) and a hard $5 ceiling. Keep scrapes small.
- This skill never publishes. You always review before posting.

---

## What ships with this skill

- `references/winning-patterns.md` - the data-derived playbook (edit/refresh for your niche).
- `references/voice-guide.md` - clean-writing rules.
- `config/channels.json` - the channels the scrape helper learns from (edit to your niche).
- `scripts/scrape-top-posts.ts` - optional fresh-scrape helper (needs an Apify key).
- `scripts/check-post-drafts.ts` - the deterministic review gate.
- `.env.example` - where the optional Apify key goes.
