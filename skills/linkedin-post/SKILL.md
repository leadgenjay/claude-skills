---
name: linkedin-post
version: 1.0.0
description: "Draft LinkedIn posts with a scroll-stopping hook and your authentic voice. Learns from a bundled, data-derived playbook of real top-performing posts in the B2B / cold-email / AI-automation / lead-gen niche, then writes ready-to-paste posts with broetry spacing and a first-comment link. A short interview picks the topic; a built-in review gate catches AI-tell words, em dashes, markdown, weak hooks, and links-in-body before anything reaches you. Optional Apify key refreshes the playbook for your own niche. Draft only - you review and post manually. Use when the user says 'linkedin post', 'draft a linkedin post', 'write a linkedin post', 'li post', or 'linkedin content'."
user_invocable: true
command: /linkedin-post
arguments: "[topic] [--count 3]"
---

# LinkedIn Post - Profile Drafts

You draft LinkedIn posts a person can review and post by hand. The job is two halves: first **learn what wins** on LinkedIn (from the bundled, data-derived playbook), then **draft posts** with a hook that survives the "...see more" fold and a real peer-to-peer voice.

This skill is **draft only**. It never posts to LinkedIn. Output is a clean file plus an in-chat preview you copy into LinkedIn manually.

---

## Step 0 - Prerequisites

Before anything else, verify these. If a REQUIRED item is missing, STOP and tell the user where to get it. Do not generate placeholder commands.

| Requirement | Check | Where to get it |
|-------------|-------|-----------------|
| Node.js 18+ (REQUIRED, for the bundled scripts) | `node -v` (expect v18 or higher) | https://nodejs.org |
| `APIFY_API_TOKEN` (OPTIONAL, only for fresh scraping) | `echo $APIFY_API_TOKEN`, or a `.env` file in this folder | Free key at https://apify.com. Skip it and the skill uses the bundled `references/winning-patterns.md`. |

The skill is fully usable with no Apify key. The key only unlocks an optional fresh scrape of creator posts. If it is missing, do NOT STOP - just use the bundled playbook.

---

## Before drafting

Read these bundled files so the drafts follow what actually wins and sound human:

- `references/winning-patterns.md` - **what actually wins on LinkedIn in this niche, derived from real scraped top posts.** This is the rule source, not generic platform advice. Read it first.
- `references/voice-guide.md` - voice and tone rules (apply silently): no em dashes, no AI-tell words, specific real numbers, first-person peer voice.

---

## What's winning on LinkedIn (the short version)

These come from a real scrape of top posts (see `references/winning-patterns.md`). Follow what wins, not generic advice.

**The hook archetypes that score (pick one per draft):**
1. **Big-number credibility hook + numbered teardown:** open with a real number, then a numbered build.
2. **Contrarian role/system critique:** one sharp claim, then short-line reasoning.
3. **"How the top 1% actually do X in 2026":** insider framing + a big dataset number, then the list.
4. **Objection / translation listicle:** map an objection or myth to what it really means.
5. **Weird-specific number hook:** "$19 a category", "$97/mo", "11 calls/day".

**Non-negotiables (confirmed by the data):**
- **Length: 180-250 words / ~1,000-1,500 chars.** Winners are substantial teardowns, NOT one-liners. (The viral one-liners belong to mega-accounts; that voice does not transfer.)
- **The hook lives in the first 1-2 lines** (under ~210 chars, before "...see more"). Open with a number or a sharp claim. No throat-clearing.
- **Broetry spacing:** one thought per line, blank line between beats. Numbered teardown is the workhorse body.
- **No links in the body.** Any link goes in a first comment ("link in the comments").
- **Plain text only - no markdown.** Use `->` and numbers for lists. Cap emoji at 1-2.
- **End with a takeaway or a soft question** to drive comments. **3-5 hashtags**, niche + broad.
- **Peer to peer, operator voice** - not guru lecturing.

---

## Workflow

```
Step 1: Interview (ask 2-3 quick questions)
  |
Step 2: (optional) Gather fresh patterns (only if the user wants a live scrape AND a key is set)
  |
Step 3: Pick the archetype + angles
  |
Step 4: Draft N posts in the user's voice (hook before the fold, broetry spacing)
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
2. **How many?** "How many drafts - 3 is the default?"
3. **Fresh creator scrape?** (Only ask if it might help.) "I already have the winning patterns analyzed. Want me to pull a fresh scrape of current top posts (needs a free Apify key, costs a few cents), or use the saved analysis (free)?" Default: **use the saved analysis.**

State the plan back in one line, e.g.: `Topic: how AI rebuilt my cold-email stack. Using the saved playbook. Cost: $0. Drafting 3.`

---

## Step 2: Gather fresh patterns (optional)

Skip this entirely unless the user asked for a fresh scrape AND `APIFY_API_TOKEN` is set. The bundled `references/winning-patterns.md` is enough for almost every draft.

If they did ask and a key is set:

```bash
# Scrapes the profiles in config/channels.json (edit that file to your niche). Honors --max-cost.
npx tsx scripts/scrape-top-posts.ts --platform linkedin --per-profile 5 --max-cost 0.50 --out ./brief.json
```

If no key is set, the script prints a friendly note and exits cleanly - just continue with the bundled playbook. If a scrape runs, skim `brief.json` to confirm the patterns still hold and grab a current example.

---

## Step 3: Pick the archetype + angles

Choose `--count` topics (default 3). For each, pick the hook archetype from `references/winning-patterns.md` that fits the topic, and decide the hook line.

---

## Step 4: Draft the posts

For each angle, write a LinkedIn post in the user's voice (apply `references/voice-guide.md` silently). Sharpen the hook so it lands before the fold and tighten the broetry spacing.

Each draft has:
- **Hook** (the first 1-2 lines, under ~210 chars - this is what shows before "...see more")
- **Body** (broetry: short paragraphs, blank line between each, story -> lesson)
- **CTA** (one clear ask: comment, follow, or "link in the comments")
- **Hashtags** (3-5, niche + broad)
- **First comment** (only when there is a link to share - the link plus one line; otherwise "n/a")

Hard formatting rules:
- Plain text only. No markdown. No `**bold**`, no `#`, no markdown bullets.
- No links anywhere in the post body. Links go in the first comment.
- Under 3000 chars (aim for 180-250 words).

---

## Step 5: Critical Review Loop (fix before finishing)

Never present drafts straight from Step 4. Save them, grade them, and fix until clean. This is a real review pass, not a rubber stamp.

**1. Save the drafts** to `./social-drafts/linkedin/<YYYY-MM-DD>-<slug>.md` with this header:
```markdown
---
title: <topic> - LinkedIn Drafts
created: <YYYY-MM-DD>
source: linkedin-post skill
status: draft
---
```

**2. Run the deterministic gate:**
```bash
npx tsx scripts/check-post-drafts.ts --platform linkedin --file ./social-drafts/linkedin/<YYYY-MM-DD>-<slug>.md --count 3
```
Exit 0 = clean. Exit 1 = it printed FAILs you MUST fix (em dashes, AI-tell words, placeholders, a hook over 210 chars, markdown in the body, a link in the body instead of the first comment, hashtag count outside 3-5, wrong draft count). Fix every FAIL in the file, look at each WARN (word count), then re-run.

**3. Qualitative critique** (the grader cannot judge these - you must):
- Does each draft match a proven archetype from `references/winning-patterns.md` (big-number hook + numbered teardown, contrarian critique, "how the top 1% do X", objection listicle, weird-specific number)? If a draft is generic, rewrite it to a proven shape.
- Does the first line actually stop the scroll and land before the fold? Is the body broetry-spaced (one thought per line)?
- Voice: operator, specific real numbers, peer-to-peer, not guru lecturing, max 1-2 emoji?

**4. Loop:** re-run the grader after each round of fixes. Repeat up to 3 passes. Move on only when the grader exits PASS (0) and the critique is satisfied. If something still cannot pass after 3 passes, do NOT hide it: present what you have and flag the unresolved item.

---

## Step 6: Present

Present all drafts in chat so the user can copy/paste. State the review result plainly, for example: "All 3 drafts passed the review gate (0 fails). These are drafts - review, then post manually. The link (if any) goes in the first comment."

---

## Output Format

```markdown
## LINKEDIN DRAFTS - <topic>

Source: saved playbook | Cost: $0

---

### Draft 1
<hook line - this is what shows before "...see more">

<body in broetry spacing - short paragraphs, blank lines between>

<one clear CTA>

#hashtag1 #hashtag2 #hashtag3

**First comment:** <link + one line, or n/a>

---

### Draft 2
...

---

### Draft 3
...
```

(The blank lines between paragraphs are part of the post - keep them when pasting.)

---

## Quality Checklist (Step 5 review loop)

The first set is enforced automatically by `scripts/check-post-drafts.ts`; the rest are judgment calls in the qualitative critique.

- [ ] **Hook before the fold** - the first 1-2 lines stop the scroll and fit under ~210 chars
- [ ] **Broetry spacing** - short paragraphs, blank line between each, no wall of text
- [ ] **No links in the body** - any link is in the first comment, referenced as "link in the comments"
- [ ] **Plain text only** - zero markdown (no `**bold**`, no headings, no markdown bullets)
- [ ] **One clear CTA** - comment, follow, or link in comments
- [ ] **3-5 hashtags**, niche + broad
- [ ] **Under 3000 chars** (ideally 180-250 words)
- [ ] **Peer to peer**, operator voice - not guru lecturing
- [ ] **No AI-tell words** (see `references/voice-guide.md`)
- [ ] **No em dashes or en dashes** anywhere
- [ ] **No placeholders** - no `[topic]`, `[link]`, `[result]`. Everything is paste-ready. If a value is unknown, rewrite the line to not need it
- [ ] **No jargon without a same-sentence definition**
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
