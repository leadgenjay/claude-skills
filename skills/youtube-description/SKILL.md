---
name: youtube-description
version: 1.0.0
description: "Write YouTube video descriptions in Lead Gen Jay's v1.4 format. Use when creating or updating a YouTube description, writing a video description for a handoff, drafting a description for upload, or the user says 'youtube description', 'video description', '/youtube-description', or 'write the description for this video'."
---

# YouTube Description Writer (v1.4 Lead Gen Jay format)

Generate pre-upload YouTube descriptions that match the 177-video library at `docs/youtube-descriptions/`. Descriptions follow a strict v1.4 template: hook → Insiders CTA → Consult CTA → timestamps → expanded body → tools → watch next → free resources → socials → About → hashtags.

## Trigger

- `/youtube-description <path-to-handoff>` or `/youtube-description <video-title>`
- Also triggers on: "youtube description", "video description", "write the description for this video", "draft the YT description"

## Output location

`docs/youtube-descriptions/<video-id>.md` when the video is already published, otherwise `docs/youtube-descriptions/<slug>.md` (rename to `{videoId}.md` post-upload).

## Voice Authority

Chain to `brand-voice/SKILL.md` — use **Mode 2: Authority** blended with **Mode 1: Teaching**. Short sentences, specific stats, no hype adjectives.

## Structure (in strict order)

1. **Opening hook** — 1 to 2 sentences. Lead with a reversal, a big number, or a concrete promise. Do not use a headline or label.
2. **Insiders CTA** (always first CTA). URL: `https://leadgenjay.com/insiders?utm_source=youtube&utm_medium=video&utm_campaign=<slug>` + one description line.
3. **Consult CTA**. URL: `https://leadgenjay.com/consult?utm_source=youtube&utm_medium=video&utm_campaign=<slug>` + one description line.
4. **TIMESTAMPS:** — see Timestamp Rules below.
5. **Expanded body** — 1 to 2 short paragraphs. Include the headline stat from the video as a mini-reveal.
6. **TOOLS & RESOURCES MENTIONED:** — bulleted list of every tool named in the video with link.
7. **WATCH NEXT:** — 1 to 3 related `youtu.be/<id>` links from the existing library.
8. **FREE RESOURCES:** — bulleted list. Apply the standard UTM trio (`utm_source=youtube&utm_medium=video&utm_campaign=<slug>`) to any `skool.com/lead-gen` or other trackable link. Include all free offers actually mentioned in the video.
9. **CONNECT WITH JAY:** — Instagram, Twitter/X, LinkedIn (boilerplate, never edit).
10. **ABOUT LEAD GEN JAY:** — boilerplate paragraph (never edit).
11. **Hashtags** — single line, 12 to 15 hashtags, no line breaks between them.

## Timestamp Rules (HARD RULES)

1. **Max 5 words per chapter label.** Count every space-separated token — including `Step 1:` (2 tokens), numerals (`3`), symbols (`+`), and acronyms (`AI`, `B2B`). If a label is 6+ tokens, cut it. No exceptions.
2. **First chapter must be `0:00`** — YouTube requires this for chapter markers to render.
3. **Timestamps strictly increasing.** Never repeat or go backwards.
4. **Use `M:SS` or `MM:SS` format** (e.g., `0:00`, `1:01`, `23:02`). Never `00:00` or `0:0`.
5. **Separator is ` - ` (space-hyphen-space).** Not em dash, not colon, not pipe.
6. **Title-case the label.** Capitalize each major word. No trailing period.
7. **Chapter count: 7 to 13.** Shorter videos get 7, long-form tutorials get 13. Match beat boundaries from the transcript, not rounded guesses.
8. **Anchor to the transcript, not the handoff.** If the user provides an official timestamped transcript, use those timestamps exactly. Do not round.

### Good examples (≤ 5 words)

```
0:00 - Cold Email Agencies Are Back
3:59 - Step 1: Pick B2B Niche
14:10 - Step 4: Email Bison Deliverability
23:02 - 7-Step Blueprint Recap
```

### Bad examples (too long — rewrite)

```
0:00 - Cold Email Agencies Are Back (and Why I Was Wrong)   # 10 tokens
3:30 - Step 1: Pick a B2B Niche with $10K+ LTV              # 9 tokens
8:00 - Step 3: Smart Targeting (Probe.dev GitHub Case Study) # 7 tokens
```

## Copy Rules

- **No em dashes or en dashes** (`—` `–`) anywhere. Regular hyphens `-` only. Matches Jay's email preference.
- **Banned AI words** (from CLAUDE.md): delve, tapestry, realm, unveil, utilize, unleash, game-changer, cutting-edge, leverage, harness, seamless, robust, transformative, elevate, multifaceted, ever-evolving, vibrant, crucial, compelling, groundbreaking, pivotal, embark, synergy, facilitate.
- **Banned phrases**: "In today's ever-evolving…", "Unlock the power of", "Master the art of", "Let's delve into", "Harness the power of", "Push the boundaries of".
- **UTM pattern**: `utm_source=youtube&utm_medium=video&utm_campaign=<kebab-slug>`. Slug matches the filename. **Do NOT add `utm_content`, `utm_term`, or any other parameter** — the URL path already identifies which CTA was clicked (`/insiders` vs `/consult` vs `/8m-leads` etc.). Extra parameters are noise in analytics, not signal.
- **No YAML frontmatter** in the output description file — the library is plain body text only.
- **Character budget**: under 5,000 chars (YouTube hard cap). Target 2,500 to 4,000 — matches the library.

## Workflow

```
1. Read the handoff doc (if provided) or ask for video details.
2. If user provides an official timestamped transcript, parse chapter beats from it.
   Otherwise, use handoff's Section 2 timing breakdown and round to nearest beat.
3. Draft each section in the order above. Apply timestamp rules strictly.
4. Before saving, run the verification checklist below.
5. Write to docs/youtube-descriptions/<slug-or-id>.md.
6. Offer to copy the file to /tmp/<name>.txt and open in TextEdit for review.
```

## Verification Checklist (run before claiming done)

- [ ] Every timestamp label ≤ 5 words (grep-count space-separated tokens after the `-`).
- [ ] First chapter is `0:00`.
- [ ] Timestamps strictly increasing.
- [ ] Zero em/en dashes: `grep -n "—\|–" <file>` returns nothing.
- [ ] Zero banned words: grep the banned list case-insensitive.
- [ ] Every tracked URL has exactly `utm_source=youtube&utm_medium=video&utm_campaign=<slug>` — no `utm_content`, no `utm_term`, no extras: `grep -nE "utm_content|utm_term" <file>` must return nothing.
- [ ] Character count < 5000: `wc -c <file>`.
- [ ] Section order matches the Structure list above.

## Reference files

- `docs/youtube-descriptions/HANDOFF.md` — v1.4 rollout summary + script pipeline
- `docs/youtube-descriptions/aC-51u3hkbE.md` — strong analog (cold email, ~20 min)
- `docs/youtube-descriptions/Eb2ldKtB66k.md` — course/evergreen format
- `docs/youtube-descriptions/gQEj2UWpZK0.md` — CTA + timestamp structure
- `scripts/tier3-patch.mjs` — shows how CTAs are patched into existing descriptions
