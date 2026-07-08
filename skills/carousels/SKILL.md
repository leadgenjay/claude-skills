---
name: carousels
description: Full Instagram carousel pipeline — guided setup interview, viral-style AI slide generation with YOUR real face preserved from two reference photos (fal.ai GPT-Image-2), hard quality gates, phone-mockup preview, caption + hashtags, and one-command publishing via Blotato (or a clean manual handoff). Use when the user asks to create an Instagram carousel, carousel post, slide deck for Instagram, swipe post, or multi-slide social post.
---

# Carousels — create, verify, and publish Instagram carousels

This skill runs a complete carousel pipeline on YOUR machine, for YOUR brand:

```
setup interview (first run) → slide copy → image-fit gate → generate slides
→ quality gate → phone-mockup preview → caption + hashtags → host on CDN
→ publish (Blotato) OR manual handoff
```

Everything is driven by a per-client config written by the setup interview — brand colors, fonts, handle, reference photos, keys. Nothing about the author's setup is assumed.

## Step 0 — Prerequisites

Before any other operation, verify these are present. If any are missing, stop and tell the user where to get each — do NOT proceed with broken state.

| Requirement | Check | Where to get it |
|---|---|---|
| Node.js 18+ | `node --version` | https://nodejs.org |
| Script deps installed | `test -d ~/.claude/skills/carousels/scripts/node_modules` | auto-installed at skill install; else `cd ~/.claude/skills/carousels/scripts && npm install` |
| Setup complete | `test -f ~/.claude/skills/carousels/config/config.json` | **not an error** — run the Step 1 interview now |
| `FAL_KEY` (generation) | `grep -q '^FAL_KEY=' ~/.claude/skills/carousels/config/.env \|\| test -n "$FAL_KEY"` | https://fal.ai dashboard → Keys — the interview walks through this |
| Reference photos | `ls ~/.claude/skills/carousels/config/photos/` | provided by the user during the interview |
| `BLOTATO_API_KEY` (OPTIONAL, auto-publish only) | `grep -q '^BLOTATO_API_KEY=' ~/.claude/skills/carousels/config/.env` | https://blotato.com — skill works without it (manual handoff) |

A missing config, key, or photo is NOT a dead end: it routes into the setup interview. Only a missing Node/npm install blocks.

If anything is missing that the interview can't fix, STOP. Do NOT generate placeholder bash.

## Step 1 — Setup interview (first run, or `--reconfigure`)

If `config/config.json` does not exist (or the user asks to reconfigure), run the full interview in `references/setup-interview.md`. It establishes, in order:

1. Name, handle, niche, audience
2. **Two reference photos** (cover: waist-up expressive; CTA: headshot) → `config/photos/` — these are what keep the client's real face on the slides
3. Brand tokens (accent color, highlight color, fonts) — defaults to the proven V3 system
4. **Fal.ai key** — guided signup if they don't have one (~$1.50–2 per 8-slide carousel)
5. **Blotato** — optional; `publish: "manual"` is a first-class mode
6. CTA keyword + which DM tool answers it (ManyChat / GHL / none)

Write `config/config.json` + `config/.env` exactly per the schema in that reference. Config survives skill updates (it is not part of the published files).

On every LATER run: read `config/config.json` first and use its values everywhere `[ACCENT]`, `[HIGHLIGHT]`, `[BG]`, `[DISPLAY_FONT]`, `[BODY_FONT]`, `[HANDLE]` appear below.

## Step 2 — Gather context

Ask the user for (infer defaults and confirm if they gave a topic directly):

- **Topic/angle**, **target audience** (default: config audience)
- **Slide count** (8–10 default — highest engagement)
- **Carousel type**: listicle, how-to, comparison, myth-busting, case-study, framework, announcement
- **CTA** — ALWAYS ask if not provided. Prefer a comment trigger word (e.g. "Comment GUIDE"); fall back to "Follow @[HANDLE]" if no trigger fits or `dmTool` is `none`.

## Step 3 — Write slide copy (before any images)

**Carousel framework (ENFORCED — every carousel maps to these 5 phases):**

| Phase | Slides | Purpose |
|-------|--------|---------|
| **HOOK** | 1 | Bold hook headline (max 8 words) + creator photo + "SWIPE →". Curiosity gap or bold claim. |
| **BUILD INTEREST** | 2–3 | Story, problem, stakes. Slide 2 must hook hard — if they don't swipe to 3, the carousel is dead. |
| **RETAIN ATTENTION** | 4–6 | The core teaching: numbered items, real screenshots, practical info. |
| **DELIVER VALUE** | 7–8 | Frameworks, verdicts, step-by-step actions the viewer can ACT on. |
| **CTA** | 9–10 | Comment trigger word + one clear action. |

Rules:
- One key point per slide, **max 15 words per slide**
- Be specific about tactics — exact prompts, tool names, steps. Not "use AI" but "use this exact prompt"
- No filler slides; no slide counters ("2/10")
- **No em or en dashes anywhere** (legitimate hyphens inside words are fine)
- Check against the banned-words list: delve, tapestry, realm, landscape, ever-evolving, cutting-edge, robust, transformative, pivotal, vibrant, crucial, compelling, seamless, groundbreaking, leverage, harness, embark, navigate, unveil, facilitate, synergy, game-changer, unlock, unleash, elevate, utilize, endeavour, multifaceted — plus any `brand.bannedWords` from config
- No banned phrases ("In today's ever-evolving…", "Unlock the power of", "Master the art of")

Present all slide copy to the user for approval before generating images.

## Step 3.5 — Image-slide fit review (MANDATORY GATE)

Before gathering or generating ANY images, build a fit-scoring table:

| Slide | Headline | Proposed Image | Fit Score | Reasoning |
|-------|----------|----------------|-----------|-----------|

- **80%+ required** — the image must directly demonstrate the headline's specific claim. "Topically related" is NOT enough.
- **Zero duplicate images** — every slide gets a unique, visually distinct reference. Same tool on two slides → two DIFFERENT views.
- **Always ask the user for screenshots.** Present the table and ask them to provide or confirm a screenshot for every slide that needs one. Wait before proceeding.
- Below 80%? Name the screenshot that WOULD pass, capture it (Playwright: `npx playwright screenshot <url> <out.png>`) or ask the user, re-score.

## Step 4 — Gather reference screenshots

- Any named tool, dashboard, email, or results proof needs a REAL screenshot.
- Sources in order: user-provided → capture via Playwright → ask again. Never fabricate a UI.
- Save to `<outDir>/references/`, resized to max ~1000px on the long edge.

**Logo rule (CRITICAL):** AI cannot render real logos — never ask it to. Use a real logo file the user provides or a screenshot containing it; otherwise write the company name as plain text. No generic icon substitutes.

**Famous person rule:** never text-to-image a real person. Download a real photo (Wikipedia Commons / press), pass it as the reference. One person per slide.

## Step 5 — Write the plan and generate

Write `<outDir>/slides.json` (see `scripts/generate-carousel.mjs` header for the shape), one entry per slide with the FULL prompt built from the templates below, then:

```bash
node ~/.claude/skills/carousels/scripts/generate-carousel.mjs --plan <outDir>/slides.json
# regenerate only slides 4 and 7:
node ~/.claude/skills/carousels/scripts/generate-carousel.mjs --plan <outDir>/slides.json 4 7
```

`ref` per slide: `PHOTO_COVER` (cover), `PHOTO_CTA` (CTA), `PREV` (inner slides — style consistency chain), a screenshot path/URL, or `NONE`.

**Identity preservation (verified technique):** the client's FULL reference photo (not a face crop) is passed as the sole reference — GPT-Image-2 Edit keeps the real face. After generating, READ the source photo and the slide together; if the face drifted, regenerate that slide.

**Model policy:** GPT-Image-2 only. The script retries transient errors and surfaces content-policy refusals — it never silently swaps models. Cost ≈ $0.18/slide, ~60s/slide.

### Prompt templates

Apply to every prompt:
1. Never render pixel values as visible text. 2. No icons, no emoji graphics. 3. No slide counters. 4. Light background always — never dark. 5. Single background color per slide. 6. All visuals are realistic screenshots or photos. 7. Images fill 40–60% of the slide. 8. Images match the headline exactly.

Shared blocks (substitute config values):
- `[BG]` = `Warm off-white background #F8F6F1 with a subtle dot grid pattern like premium notebook paper` (or config `backgroundStyle`)
- `[TYPE]` = `Typography: headline in [DISPLAY_FONT] bold condensed uppercase, body in [BODY_FONT] or a natural handwritten marker style`
- `[HIGHLIGHT]` = `a rounded bright [highlightColor] highlighter marker effect behind the accent word, like a real felt-tip highlighter pen swipe`
- `[HAND]` = `a hand-drawn curved arrow and short handwritten annotation in charcoal ink with natural pen texture and slight imperfections. Do NOT render the literal words 'marker' or 'pen' on the slide.`
- `[FOOTER]` = `Small brand text '@[HANDLE]' bottom-left in medium gray [BODY_FONT]`
- `[RULES]` = `Clean editorial design. No emoji. No flat icons. No slide counters. No pixel values visible. No dark full-bleed background. Single warm off-white background. All text legible at mobile size. Generous margins on all sides. No em dashes anywhere.`

**Cover slide** (`ref: PHOTO_COVER`):
```
Professional Instagram carousel COVER slide. 4:5 portrait.
[BG]. [TYPE].
Large bold headline '[HEADLINE]' in black uppercase [DISPLAY_FONT], filling the upper third. The word '[ACCENT_WORD]' has [HIGHLIGHT].
Below the headline, in a handwritten marker script: "[SUB_HOOK]".
This reference photo of the person is composited at the bottom of the frame, filling the lower 40%, centered, natural and photographic. Preserve their exact face and identity from the reference image.
Hot [accentColor] 'SWIPE ->' text at the bottom-right.
[FOOTER]. [RULES]
```
For announcement carousels, add a bold red pill banner ("BREAKING NEWS" style) above the headline.

**Inner slide, screenshot-based** (`ref: <screenshot>` or `PREV`):
```
Professional Instagram carousel inner slide. 4:5 portrait. Match the visual style, colors and typography of the reference image.
[BG]. [TYPE].
Bold headline '[SLIDE_TITLE]' in black uppercase [DISPLAY_FONT], filling the top 22%. The word '[ACCENT_WORD]' has [HIGHLIGHT].
[SCREENSHOT_DESCRIPTION — "This reference screenshot is displayed large, filling 40-60% of the slide, showing <exact contents>." Real tool UI only.]
[HAND]: a curved arrow pointing at [DETAIL] with the handwritten note '[NOTE]'.
[FOOTER]. [RULES]
No person or face on this slide.
```

**Inner slide, text/artifact** (`ref: PREV`): same skeleton; the visual is a realistic artifact — hand-drawn sketch, notebook page, whiteboard, Google Doc screenshot recreation. Numbered lists MUST look like a real artifact, never plain typed text, and the artifact style stays consistent across the whole carousel.

**Comparison slide:** two-column artifact layout (torn notepad / whiteboard) with red X and green check marks. Headline must be a distinct hook, never a restatement of the column labels.

**CTA slide** (`ref: PHOTO_CTA`):
```
Professional Instagram carousel FINAL slide, call-to-action. 4:5 portrait.
[BG]. [TYPE].
A circular headshot of the person (reference image) centered in the upper portion, large, with a [accentColor] border ring. Preserve their exact face and identity from the reference image, do not generate a different person.
Below the photo, a large bold headline 'COMMENT "[KEYWORD]"' in black uppercase [DISPLAY_FONT]. The word '[KEYWORD]' has [HIGHLIGHT].
Below that, in [BODY_FONT]: "[CTA_SUBTEXT]".
Below that, a [accentColor] pill-shaped button containing the text '[BUTTON_TEXT]' in white.
[FOOTER]. [RULES]
```

**Embedded UI text rule:** if a slide embeds a screenshot artifact with a title/label (Google Doc title bar, app tooltip, dashboard header), PIN the text explicitly — e.g. `The document title bar reads exactly "Build List" (two words, no dash, no colon)` — and forbid dashes inside it. The model hallucinates chrome text if left unspecified.

**Dashboard number rule:** if the headline claims a metric, the screenshot prompt must pin consistent numbers.

**POV rule:** headlines starting with "POV:" get NO face on the cover — show what the viewer sees.

## Step 6 — Quality gate + preview

```bash
node ~/.claude/skills/carousels/scripts/preview-quality-gate.mjs --dir <outDir> --min-width 1080 --min-height 1350
```

The gate globs all PNGs in the dir — alternates auto-land in `alts/`, keep avatars/photos out. Then follow its checklist EXACTLY: read every slide at full resolution, verify spelling (including embedded chrome text), face identity vs the reference photo, colors, no icons/counters/dashes.

Render the phone mockup and open it:

```bash
node ~/.claude/skills/carousels/scripts/render-preview.mjs --out <outDir>/preview.html --config '{"handle":"[HANDLE]","avatar":"avatar.png","slides":[{"src":"slide-01.png"},...],"caption":"[CAPTION]","aspectRatio":"4:5","chrome":{"showStatusBar":true,"showBottomNav":true}}' --open
```

(Copy `config/photos/avatar.png` into `<outDir>/` for the mockup if present.) Regenerate any failing slide (`generate-carousel.mjs --plan ... <num>`), re-gate, re-preview. Only a fully passing set goes to the user.

## Step 7 — Caption + hashtags

Write in the client's voice (their niche/audience from config):

- **Caption**: plain text only (pastes clean into Instagram). Hook line → 2–4 value lines → CTA line repeating the trigger word. No banned words, no em dashes, no markdown.
- **Hashtags**: 3 tiers — 5 broad, 5 niche, 5 micro — as a separate block. Instagram convention: publish the caption clean and paste hashtags as the FIRST COMMENT.
- **DM-trigger check (BLOCKING when CTA is a comment keyword):** ask the user to confirm the keyword is configured in their DM tool (config `dmTool`) and the auto-reply contains the right link. If `dmTool` is `none`, switch the CTA to "Follow @[HANDLE]" or have them set up automation first. A comment CTA with no auto-DM loses every lead.

Save `<outDir>/caption.txt` and `<outDir>/hashtags.txt`.

## Step 8 — Host + publish

**8a. Host** (Instagram rejects Drive links):
```bash
node ~/.claude/skills/carousels/scripts/upload-slides.mjs --dir <outDir>
```
Prints comma-joined public CDN URLs in slide order.

**8b. Publish.** Never auto-post — publish only when the user says go.

- **Blotato configured** (`publish: "blotato"`):
  ```bash
  node ~/.claude/skills/carousels/scripts/publish-blotato.mjs --caption-file <outDir>/caption.txt --media "<urls>" [--schedule <ISO8601>]
  ```
  Verify at https://app.blotato.com/scheduled, then hand the user the hashtag block for the first comment.
- **Manual** (`publish: "manual"` or no key): the same command prints a clean handoff — ordered slide URLs + caption + first-comment hashtags — for posting via the IG app or Meta Business Suite.

**8c. Archive:** copy slides + caption + preview.html to `<outDir>/../archive/<topic> <YYYY-MM-DD>/` so finished carousels never get clobbered by the next run.

## Quality checklist (before presenting as complete)

- [ ] Gate passed: all slides ≥1080x1350, valid PNG, no `warn-small-filesize` left uninspected
- [ ] Every visible word read and spelled correctly (including embedded chrome text)
- [ ] Face on cover + CTA matches the reference photos
- [ ] Max 15 words/slide; accent color on 1–2 words max; light background everywhere
- [ ] No icons, counters, pixel markers, em/en dashes, banned words
- [ ] Every image unique, large, and matching its headline (fit table passed)
- [ ] CTA slide has text overlay + trigger word; DM keyword confirmed in the user's tool
- [ ] Preview reviewed in the phone mockup at mobile size
- [ ] Caption + hashtags saved; publish mode honored (Blotato or manual handoff)
