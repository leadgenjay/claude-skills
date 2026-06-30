# LinkedIn Winning Patterns (from real data)

> These rules are derived from REAL top-performing posts, not best-practices guesses.
> When you draft, follow what actually wins here. Refresh for your own niche anytime (see bottom).

**Source scrape:** 75 top posts (last ~month) from a set of B2B / cold-email / AI-automation / lead-gen
LinkedIn creators (outboundphd, nils-schneider-instantly, patrickdang, michel-lieben, benjamin-douablin,
underdogsales, liamottley, nateherk, jordanplatten, and others). Ranked by likes+comments+shares. The
exact profiles live in `config/channels.json` - edit them and re-scrape to derive patterns for a different niche.

---

## Length: winners are substantial, not tiny
Median winning post in the pull was **~1,100 characters** (roughly 180-250 words). The ultra-short one-liners that scored high were **mega-account aphorisms** (e.g. "Focus beats intelligence. Consistency beats intensity." - 1,223 likes). That voice does not transfer to a regular practitioner. **The model that works for most people is the 180-250 word teardown, not the one-liner.**

## What actually wins (ranked hook archetypes from the data)

### 1. Big-number credibility hook + numbered teardown
The dominant winning shape in this niche:
- **"Building cold email campaigns used to take hours. Claude Code builds them in minutes:"** then a numbered build - Michel Lieben, 758 L / 247 C. https://www.linkedin.com/posts/michel-lieben_building-cold-email-campaigns-used-to-take-activity-7450495769498947584-080p
- **"POV: Everyone in my $7M business uses Claude Code"** then the per-role breakdown - Michel Lieben, 208 L / 244 C.
- "i've sent 50M+ cold emails over the last 2 years. claude code rebuilt my ENTIRE stack..." then OLD STACK vs NEW - OutboundPhd, 246 comments.
- **How to use it:** lead with a real number (revenue, emails sent, dollars saved), then a numbered teardown. Strongest if you actually built or ran the thing.

### 2. Contrarian role/system critique (one sharp claim, short lines)
- **"SDRs are paid to book meetings. Not to source revenue."** then the system critique - Benjamin Douablin, 684 L / 107 C. https://www.linkedin.com/posts/benjamin-douablin_sdrs-are-paid-to-book-meetings-not-to-source-activity-7477341379900362753-s26k
- **How to use it:** a true, slightly spicy claim about your industry, then the reasoning in one-line beats.

### 3. "How the top 1% actually do X in 2026" insider framing
- "How the top 1% actually run cold email in 2026: (After analyzing 1,000,000+ emails)" then the patterns - Michel Lieben, 215 L / 142 C.
- **How to use it:** insider framing + a year + a big dataset number, then the list. Only if you have the data to back it.

### 4. Objection / "translation" listicle
- "Objection: 'We're good'. Translated from prospect-speak: ..." - Underdog Sales, 267 L. https://www.linkedin.com/posts/underdogsales_activity-7475525709621501953-vBe0
- **How to use it:** map a common objection or myth to what it really means, in a tight list.

### 5. The weird-specific number hook
- "I scrape the entire United States off Google Maps for $19 a category." - OutboundPhD, 127 L.
- **How to use it:** an oddly specific, true number stops the scroll ($19, $97, 11 calls/day).

### 6. The human / build-in-public beat (use sparingly)
- "Took a break for 5 days. 0 work. Got engaged. MRR up. Churn down." - Arnaud Belinga, 127 L / 92 C.
- **How to use it:** an occasional personal milestone tied to a business lesson. Do not overuse.

---

## Hook rules (the first 1-2 lines, before "...see more")

- **Open with a number or a sharp claim**, never throat-clearing. The fold cuts around ~210 chars, so the hook must land in the first line or two.
- Winning openers were concrete: "50M+ cold emails", "$7M business", "1,000,000+ emails", "$19 a category", "SDRs are paid to book meetings. Not to source revenue."

## Structure rules (from the data)

- **One thought per line** (broetry). Blank line between beats. This was near-universal.
- **Numbered teardown** is the workhorse body (1, 2, 3 or numbered emoji, or `->`). Lists out-performed prose.
- **End with a takeaway or a question.** Many close with a soft question to drive comments.
- **Link goes in the first comment**, not the body ("link in the comments").

## Formatting reality

- LinkedIn renders **no markdown.** Creators use `->` arrows and numbers for emphasis. Skip the unicode-bold gimmick, cap emoji at 1-2, keep the arrows/numbers. No `**bold**`.
- No em dashes, no AI-tell words (see `references/voice-guide.md`).

## Topic winners in this niche right now

AI rebuilding the cold-email stack · tool-stack teardowns ($740/mo stack vs one platform) · "how the top 1% run cold email" · objection handling · build-in-public with real revenue numbers · Google-Maps / local + creator lead sources. Your edge over these creators is whatever you have actually done that they have not - real builds and real numbers carry proof.

## Engagement benchmark (this niche, this month)

Practitioner winners landed **~120-760 likes / 90-250 comments**. Comment-heavy posts were teardowns and contrarian takes that invited replies. Mega-account aphorisms (1,200+ likes) are an outlier of reach, not a template.

---

## Refresh this file for your own niche

1. Edit `config/channels.json` -> `linkedin` to the profile URLs you want to learn from.
2. Add a free Apify key to `.env` (see `.env.example`), then run:
   ```bash
   npx tsx scripts/scrape-top-posts.ts --platform linkedin --per-profile 5 --out ./brief.json
   ```
3. Read the top posts in `brief.json` and update the archetypes + cited examples above, with today's date.
