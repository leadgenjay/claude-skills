---
name: carousel-post
description: Generate Instagram carousel posts as AI images via fal.ai (Nano Banana 2 + Flux LoRA). Creates polished, viral-style carousels with Jay photos, light backgrounds, real screenshots, and brand-consistent typography. This skill should be used when the user asks to create an Instagram carousel, carousel post, slide deck for Instagram, or multi-slide social post.
---

## Brand System (source of truth)

All visual output must match the canonical LGJ design system: `.claude/skills/lead-gen-jay-design/` (invocable as `/lead-gen-jay-design`). That skill defines tokens, typography, color rules (Razzmatazz `#ED0D51`, Blue `#0144F8`, Navy `#162551`, slate scale), "no gradients ever" rule, banned words, and the uppercase Big Shoulders / Manrope pairing. When headline wording, color choice, background treatment, or iconography is ambiguous, defer to that skill's README + `colors_and_type.css`.

---

## Trigger Conditions

Use this skill when the user mentions:
- "carousel", "Instagram carousel", "carousel post"
- "slides for Instagram", "slide deck", "multi-slide"
- "create slides", "make a carousel"
- "swipe post", "Instagram swipe"

---

## Workflow

### Step 1: Gather Context

Ask the user for:
- **Topic/angle** for the carousel
- **Target audience** (cold emailers, agency owners, B2B founders, etc.)
- **Number of slides** (8-10 default — highest engagement)
- **Format**: Organic (3:4, 1080x1440) or Boosted/paid (4:5, 1080x1350)
- **Carousel type**: listicle, how-to, comparison, myth-busting, case-study, framework
- **Cover photo style**: Choose from JAY_PRESETS (pointing, headshot, cinematic, etc.) or custom
- **CTA**: Ask what the call-to-action should be. Prefer comment trigger word (e.g., "Comment LEADS to get the playbook"). Fall back to "Follow @leadgen..." if no trigger fits.

If the user provides a topic directly, infer reasonable defaults and confirm before generating.

**IMPORTANT:** Always ask about the CTA if not provided in the brief.

### Step 2: Write Slide Copy

Write all slide copy BEFORE generating any images.

**Carousel Framework (ENFORCED — every carousel MUST follow this structure):**

Every carousel must map slides to these 5 phases. This is not optional. If a draft doesn't follow this structure, rewrite it before generating.

| Phase | Slides | Purpose | What goes here |
|-------|--------|---------|----------------|
| **HOOK** | 1 | Stop the scroll | Bold hook headline (max 8 words) + creator photo + "SWIPE →". The headline must create a curiosity gap or make a bold claim. |
| **BUILD INTEREST** | 2-3 | Make them care | Story, context, problem statement, or "why this matters." Set up the payload. Slide 2 must hook hard — if they don't swipe to slide 3, the carousel is dead. |
| **RETAIN ATTENTION** | 4-6 | Deliver the content | The core teaching: numbered items, visuals, screenshots, diagrams, practical info. This is where value lives. Use real screenshots and tool logos. |
| **DELIVER VALUE** | 7-8 | Actionable takeaway | Frameworks, verdicts, decision matrices, step-by-step actions. The viewer should be able to ACT on this. |
| **CTA** | 9-10 | Convert | Comment trigger word CTA + lead magnet. Simple and direct — one clear action. |

**Mapping carousel types to the framework:**
- **Listicle** ("5 things..."): Hook → context slide → items 1-3 (retain) → items 4-5 + verdict (value) → CTA
- **How-to**: Hook → problem/context → steps 1-3 (retain) → steps 4-5 + result (value) → CTA
- **Myth-busting**: Hook → "here's what everyone is saying" → myth/truth pairs (retain) → the real story + verdict (value) → CTA
- **Framework**: Hook → why you need this → framework components (retain) → how to apply it (value) → CTA
- **Case study**: Hook → the situation → data/proof (retain) → lessons + results (value) → CTA
- **Comparison**: Hook → the two options → pros/cons with visuals (retain) → verdict (value) → CTA

**Rules:**
- Cover: Bold hook headline (max 8 words), sub-hook, "SWIPE -->"
- Inner slides: One key point per slide, max 15 words per slide
- **Be specific about tactics** — mention exact prompts, tool names, specific steps. Not "use AI" but "use this exact prompt in Claude"
- **Give real value** — each slide should teach something actionable, not just state a concept
- CTA slide: Comment trigger word CTA (preferred) + text overlay. Never just a photo.
- No slide counters (no "2/10", "3/10") — only swipe arrows/indicators if needed
- Check against banned words list (delve, tapestry, realm, landscape, ever-evolving, cutting-edge, robust, transformative, pivotal, vibrant, crucial, compelling, seamless, groundbreaking, leverage, harness, embark, navigate, unveil, facilitate, synergy, game-changer, unlock, unleash, elevate, utilize, endeavour, multifaceted)
- No banned phrases ("In today's ever-evolving...", "Unlock the power of", "Master the art of", etc.)

Present all slide copy to the user for approval before generating images.

### Step 2.5: Image-Slide Fit Review (MANDATORY GATE)

**Before gathering or generating ANY images, you MUST complete this step.** This is a hard gate — do not proceed to Step 3 until every slide passes.

Build a fit-scoring table mapping each slide's copy to its proposed reference image:

| Slide | Headline | Proposed Image | Fit Score | Reasoning |
|-------|----------|----------------|-----------|-----------|
| 01 | [headline] | [image description] | [0-100%] | [why this image demonstrates the headline] |
| ... | ... | ... | ... | ... |

**Scoring rules:**
- **80%+ required** — the image must directly demonstrate or visualize the specific claim in the headline
- **"Topically related" is NOT enough** — a generic pricing page does NOT fit "IT'S NOT FREE" (that needs a billing/usage page showing metered costs). A general dashboard does NOT fit "ZERO BUILT-IN SCHEDULER" (that needs the scheduler UI or a 404 response).
- **ZERO duplicate images allowed** — if any image appears on more than one slide, the table FAILS. Every slide must have a unique, visually distinct reference. If two slides need images from the same tool/platform, capture two DIFFERENT views (e.g., pricing page vs. API console, dashboard overview vs. specific report).
- **Flag and fix** any slide below 80% or any duplicates BEFORE proceeding

**If a slide scores below 80%:**
1. Identify what screenshot WOULD score 80%+ (be specific — which page, which view, which state)
2. Either capture a new screenshot via Playwright, find an existing one in `output/carousel/references/`, or ask the user to provide one
3. Re-score until all slides pass

**ALWAYS ask the user for screenshots.** After building the fit-scoring table, present it and ask the user to provide or confirm screenshots for EVERY slide. Do not assume existing screenshots are correct — the user knows what visuals best represent their content. Format the ask as:

> "Here's what I think each slide needs. Can you provide or confirm these screenshots?"
> - Slide 01: [description of ideal screenshot]
> - Slide 02: [description of ideal screenshot]
> - ...

Wait for the user to provide, confirm, or redirect before proceeding to Step 3.

### Step 3: Gather Reference Screenshots

Before generating slides, capture real screenshots for any tools, dashboards, or UIs mentioned in the content.

**Screenshot capture methods (in priority order):**
1. Check `output/carousel/references/` for existing screenshots
2. Capture via Playwright (`npx playwright screenshot <url>`)
3. Check `public/ads/assets/` for existing product screenshots
4. Ask the user to provide

**What needs screenshots:**
- Any named tool (bolt.new, Instantly, Claude, ChatGPT, etc.)
- Any dashboard or analytics view
- Any email copy or campaign
- Any results/proof (calendars, inboxes, Stripe, etc.)

Save all reference screenshots to `output/carousel/references/` resized to max 1000px (`sips --resampleHeightWidthMax 1000`).

### Step 4: Generate Cover Slide

Two fal.ai calls:

**A) Generate Jay photo (Flux LoRA):**
```typescript
import { generateImage, JAY_PRESETS } from '@/lib/fal'

const jayImages = await generateImage({
  prompt: JAY_PRESETS.pointing.prompt,  // or user-chosen preset
  image_size: "square_hd",
  num_images: 1,
})
```

**B) Composite cover slide (Nano Banana 2 Edit):**
```typescript
import { editWithNanoBanana, uploadToFalStorage } from '@/lib/fal'

const cover = await editWithNanoBanana({
  image_urls: [jayImages[0].url],
  prompt: `[COVER PROMPT — see Prompt Templates below]`,
  num_images: 2,
  aspect_ratio: "3:4",   // or "4:5" for boosted
  resolution: "1K",
})
```

### Step 5: Generate Inner Slides

Each inner slide via `editWithNanoBanana()` with reference screenshots:

```typescript
import { editWithNanoBanana, uploadToFalStorage } from '@/lib/fal'

// Upload reference screenshot to fal storage
const refUrl = await uploadToFalStorage('output/carousel/references/screenshot.png')

const slide = await editWithNanoBanana({
  image_urls: [refUrl],
  prompt: `[INNER SLIDE PROMPT — see Prompt Templates below]`,
  num_images: 2,
  aspect_ratio: "3:4",
  resolution: "1K",
})
```

For slides without specific reference screenshots, use `generateWithNanoBanana()`:
```typescript
import { generateWithNanoBanana } from '@/lib/fal'

const slide = await generateWithNanoBanana({
  prompt: `[INNER SLIDE PROMPT]`,
  num_images: 2,
  aspect_ratio: "3:4",
  resolution: "1K",
})
```

**Visual consistency:** After generating slide 2, pass the chosen slide 2 URL as `image_urls` reference for slide 3 and beyond.

### Step 6: Generate CTA/Final Slide

```typescript
const ctaSlide = await editWithNanoBanana({
  image_urls: [jayPhotoUrl],
  prompt: `[CTA PROMPT — see Prompt Templates below]`,
  num_images: 2,
  aspect_ratio: "3:4",
  resolution: "1K",
})
```

### Step 7: Download & Review

```typescript
import { downloadImage } from '@/lib/fal'
import { writeFile, mkdir } from 'fs/promises'

await mkdir('output/carousel', { recursive: true })

for (const [i, slide] of slides.entries()) {
  const buffer = await downloadImage(slide.url)
  await writeFile(`output/carousel/slide-${String(i + 1).padStart(2, '0')}.png`, buffer)
}
```

Then:
1. Open all slides in Preview.app (`open -a Preview output/carousel/`)
2. Check against Quality Checklist below
3. Regenerate any slides that fail checks

---

## Prompt Templates

### CRITICAL PROMPT RULES

These rules apply to ALL prompts:

1. **NEVER include pixel values as visible text** — no "180px", "50px", "120px" rendered on the slide. Safe zones are invisible layout constraints only. Describe spacing as "generous margins" or "comfortable padding" in prompts.
2. **NEVER include icons** — no flat icons, no emoji-style graphics, no abstract symbols, no lightning bolts, no envelope icons, no chart icons. Every visual must be a realistic screenshot or photo.
3. **NEVER include slide counters** — no "2/10", "3/10", "7/10". No numbering of total slides.
4. **Light backgrounds ALWAYS** — white (#FFFFFF), off-white (#F8F8F8), or light gray (#F5F5F5). Never dark #0D0D0D.
5. **Single consistent background** — no two-tone backgrounds, no card-on-background layering.
6. **All images must be realistic screenshots** — real tool UIs, real dashboards, real spreadsheets, real email clients. No illustrations, no diagrams, no flat graphics.
7. **Images must be LARGE** — fill 40-60% of the slide area, legible on small mobile screens.
8. **Images must match content exactly** — if the slide says "micro-app", show a real micro-app screenshot, not a generic dashboard.

### Cover Slide Prompt
```
Professional Instagram carousel cover slide.
Clean white background (#FFFFFF).
Typography: headline in Big Shoulders Black (bold condensed uppercase), body in Manrope.
Large bold headline '[HEADLINE]' in black uppercase text filling the top third of the frame. The word '[ACCENT_WORD]' is in hot pink #ED0D51.
Sub-hook '[SUB_HOOK]' below headline in dark gray Manrope, smaller size.
[VISUAL_DESCRIPTION — must be a real screenshot or photo, filling 40-50% of the slide. E.g., "A large realistic screenshot of a Google Sheets spreadsheet packed with lead data, showing on a laptop screen"]
This reference image of a person is composited at the bottom, filling the lower 40% of the frame, centered.
Small brand text '@leadgen' bottom-left in medium gray Manrope.
Hot pink 'SWIPE -->' text bottom-right.
Clean editorial design, no gradients, no decorative filler, no icons, no numbered badges.
Generous margins on all sides. No pixel values visible.
```

### Inner Slide Prompt (Screenshot-Based)
```
Professional Instagram carousel slide, inner content slide.
Clean white background (#FFFFFF).
Typography: headline in Big Shoulders Black (bold condensed uppercase), body in Manrope.
Step number '[NUMBER]' in a hot pink (#ED0D51) circle, top-left, bold.
Bold headline '[SLIDE_TITLE]' in black uppercase Big Shoulders Black, filling top 20% of the frame.
Below, [CONTENT_DESCRIPTION — keep to 1-2 short lines max].
[SCREENSHOT_DESCRIPTION — "This reference screenshot is displayed large, filling 40-60% of the slide. It shows [exact description of what the screenshot contains]." Must be a real tool UI, dashboard, or product screenshot. Never an icon or illustration.]
Body text in dark gray Manrope, high contrast against white background.
Small brand text '@leadgen' bottom-left in medium gray.
Clean editorial design. No icons. No slide counters. No pixel values visible. All text legible at mobile size.
Generous margins on all sides.
```

### Inner Slide Prompt (Text-Heavy — no visual)
```
Professional Instagram carousel slide, inner content slide.
Clean white background (#FFFFFF).
Typography: headline in Big Shoulders Black (bold condensed uppercase), body in Manrope.
Step number '[NUMBER]' in a hot pink (#ED0D51) circle, top-left, bold.
Bold headline '[SLIDE_TITLE]' in black uppercase Big Shoulders Black, filling top 25% of the frame.
Below, [CONTENT — e.g., "3 bullet points with hot pink dash markers: item1, item2, item3"].
Body text in dark gray Manrope, large readable size, high contrast.
Small brand text '@leadgen' bottom-left in medium gray.
Clean editorial design. No icons. No illustrations. No slide counters. No pixel values visible.
Generous margins on all sides.
```

### Inner Slide Prompt (Comparison / Old Way vs New Way)

**Important:** Comparison slides follow the same visual artifact rules as ad-creative-graphic. Wrap checklist items in real visual artifacts (notepad, whiteboard, clipboard) — NOT plain styled text columns.

**Anti-repetition rule:** The headline must be a distinct statement or hook — NEVER repeat or restate the column labels. If columns are "OLD WAY" / "NEW WAY", the headline should be something like "STILL DOING IT THE HARD WAY?" or "PICK YOUR FIGHTER" — NOT "OLD WAY VS NEW WAY".

```
Professional Instagram carousel slide, inner content slide.
Clean white background (#FFFFFF).
Typography: headline in Big Shoulders Black (bold condensed uppercase), body in Manrope.
Bold headline '[DISTINCT_HOOK — not the column labels]' in black uppercase Big Shoulders Black, filling top 15-20% of the frame. The word '[ACCENT_WORD]' is in hot pink #ED0D51.
Below, a two-column comparison layout:
Left column header '[LEFT_LABEL]' in red with a red X mark icon next to each item.
Left column items presented as a [ARTIFACT — e.g., torn notepad page, whiteboard section, clipboard] with realistic paper texture, slight rotation, and drop shadow: [ITEM1], [ITEM2], [ITEM3]. Each item has a red X mark.
Right column header '[RIGHT_LABEL]' in green with a green checkmark icon next to each item.
Right column items presented as a matching [ARTIFACT] with the same visual treatment: [ITEM1], [ITEM2], [ITEM3]. Each item has a green checkmark.
The two columns are separated by a thin vertical divider line.
Small brand text '@leadgen' bottom-left in medium gray Manrope.
Clean editorial design. No plain text columns. No slide counters. No pixel values visible. All text legible at mobile size.
Generous margins on all sides.
```

When real screenshots or photos are available for comparison items, use them instead of text-only artifacts. Pass as `-r` reference images.

### CTA/Final Slide Prompt
```
Professional Instagram carousel final slide, call-to-action.
Clean white background (#FFFFFF), slightly warm off-white tone.
Circular photo of the creator (reference image) centered in the upper portion, large, with hot pink (#ED0D51) border ring.
Below the photo: '[CTA_TEXT]' in large black Big Shoulders Black uppercase. One keyword in hot pink #ED0D51.
[E.g., "COMMENT 'LEADS' BELOW" with LEADS in hot pink, or "FOLLOW @LEADGEN FOR MORE" with FOLLOW in hot pink]
Subtext: '[CTA_SUBTEXT]' in small gray Manrope below.
Optional: hot pink pill-shaped button '[BUTTON_TEXT]' below subtext.
Clean, centered layout. No clutter. No icons. Generous margins.
```

---

## Carousel Types

| Type | Best For | Cover Style | Inner Slide Style |
|------|----------|-------------|-------------------|
| `listicle` | "X things you need to know" | Giant number + headline + Jay photo | Numbered steps with screenshots |
| `how-to` | Step-by-step guides | Question headline + Jay photo | Sequential steps with real tool screenshots |
| `comparison` | Old way vs new way | Split comparison headline | Visual artifacts (notepad/whiteboard) with red X / green checkmarks — see Comparison/Split Slide Prompt |
| `myth-busting` | Controversial takes | Bold statement + Jay photo | Myth -> Truth with proof screenshots |
| `case-study` | Social proof / results | Metric headline + Jay photo | Real dashboard/analytics screenshots |
| `framework` | Teaching a system | Framework name + Jay photo | Screenshots showing each step in practice |

---

## Official Design Style (V3 - Locked April 2026)

All carousel slides MUST use this design style unless Jay explicitly requests otherwise:

**Background:** Light warm color with subtle dot grid pattern (#F8F6F1), like premium notebook paper. NEVER plain white (#FFFFFF).

**Keyword Highlights:** Bright yellow (#FFE033) rounded highlighter marker effect behind key words. Like someone used a real highlighter pen. Apply to the most important 1-2 words per slide.

**Hand-drawn Elements:**
- Hand-drawn arrows pointing to key areas or screenshots
- Handwritten text in marker pen style for sub-headlines and annotations
- Natural pen texture with slight imperfections (not perfectly smooth)
- Casual and authentic, not polished or corporate

**Apply to ALL prompt templates by adding these elements:**
- Background: "Light warm background with a very subtle dot grid pattern (#F8F6F1), like premium notebook paper"
- Keywords: "The word [KEY_WORD] has a bright yellow (#FFE033) rounded highlight marker effect behind it, like someone used a highlighter pen"
- Handwritten: "Below, a hand-drawn arrow and handwritten text in a marker pen style that says [TEXT] with natural pen texture"

**Reference image:** V3 dot-grid design test from April 4, 2026

---

## Visual Rules (Enforced)

| Rule | Value |
|------|-------|
| **Background** | Light warm `#F8F6F1` with subtle dot grid pattern, like premium notebook paper. NEVER plain white `#FFFFFF` or dark `#0D0D0D` |
| **Background consistency** | Single color per slide. No two-tone, no card-on-background layering |
| **Accent** | `#ED0D51` (hot pink) — accent only, never full background |
| **Headline font** | Big Shoulders Black, uppercase, 50pt+ |
| **Body font** | Manrope, 14pt+ |
| **Text color** | Black or dark gray on light background |
| **Max words/slide** | 15 |
| **Cover photo** | Always Flux LoRA Jay photo |
| **Aspect ratio** | 3:4 organic (default) / 4:5 boosted |
| **Resolution** | 1K (default). Only use 2K if explicitly requested |
| **Slide count** | 8-10 optimal |
| **Accent restraint** | Hot pink on 1-2 words max per slide |
| **Brand handle** | @leadgen bottom-left on every slide |

### BANNED Elements

| Element | Why |
|---------|-----|
| **Icons** | No flat icons, emoji-style graphics, or abstract symbols. Ever. |
| **Illustrations/diagrams** | No flowcharts, no conceptual graphics. Real screenshots only. |
| **Slide counters** | No "2/10", "3/10". Only swipe arrows if needed. |
| **Dimension markers** | No "180px", "50px" visible on slides. Safe zones are invisible. |
| **Dark backgrounds** | No #0D0D0D. Light backgrounds always for carousels. |
| **Two-tone backgrounds** | No card-on-background layering. Single bg color. |
| **Generic dashboards** | If slide says "micro-app", show a micro-app, not a random dashboard |
| **Styled text bars for stats** | Use real dashboard screenshots for metrics |

### Image Rules

1. **ALL visuals must be realistic screenshots** — real tool UIs, real dashboards, real spreadsheets, real email clients
2. **Images must match slide content exactly** — if saying "micro-app", show a real micro-app (e.g., ROI calculator)
3. **NEVER reuse the same reference image on more than one slide** — every slide must have a unique, visually distinct screenshot. If two slides reference the same tool/platform, capture two DIFFERENT views (e.g., pricing page vs. API console, dashboard overview vs. specific report). This is enforced in Step 2.5.
4. **Images must be LARGE** — fill 40-60% of the slide, legible on small mobile screens
4. **Stats/metrics must use real dashboard screenshots** — Instantly dashboard, Google Sheets, email analytics
5. **Results slides need real-looking screenshots** — packed Google Calendar, full inbox, Stripe dashboard
6. **Use real screenshots for mentioned tools** — bolt.new, Claude Code, Instantly. Capture via Playwright if not available.
7. **When showing email copy** — screenshot the actual email, don't describe it with icons

### Logo Rules (CRITICAL)

1. **AI CANNOT render real logos accurately** — Nano Banana/Gemini will hallucinate wrong logos. NEVER ask AI to generate a company logo.
2. **Use real logo files ONLY** — check `~/Nextcloud/Visual assets/Logos/Tool Logos/` FIRST for any named tool or software (204 logos: SVG, PNG, WebP), then `~/Nextcloud/Visual assets/Logos/AI logos/` for AI tools, then `public/brand/`, `public/ads/assets/`, `output/carousel/references/`. If not found in any directory, download via Playwright or ask the user.
3. **If no real logo file exists, use TEXT ONLY** — just write the company name in bold text. No logo placeholder. No generated icon.
4. **Never duplicate the name** — if using a logo that contains the company name (e.g., "bolt." logo), do NOT also write the company name as separate text next to it. One or the other.
5. **No generic icon substitutes** — no clock icons for "time", no lightning bolts for "bolt.new", no envelope for "email". If you can't show the real thing, use text only.
6. **Before generating any slide with company names:** Check `~/Nextcloud/Visual assets/Logos/Tool Logos/` first, then the references folder for real logos. If missing, capture them via Playwright first or use plain text.

### Content Rules

1. **Be specific about tactics** — mention exact prompts, tool names, specific steps
2. **Give real value** — each slide should teach something actionable, not just state a concept
3. **No filler slides** — every slide earns its spot with concrete information

### Numbered List Visual Rule

Numbered lists MUST look like a screenshot or hand-drawn artifact — NEVER plain typed text. Use one of these visual treatments:
- **Notebook page** — torn-out lined paper with handwritten ink, taped or pinned
- **Whiteboard** — dry-erase marker writing with realistic board texture
- **Yellow legal pad** — ruled yellow paper with ballpoint pen handwriting
- **Sticky note** — yellow post-it with handwritten notes
- **Google Doc screenshot** — realistic Google Docs UI with the list content

**Consistency rule:** Pick ONE list format per carousel and use it for ALL inner slides. Every slide should look like a screenshot from the same document/surface. Do not mix notebook, whiteboard, and sticky notes across slides in the same carousel.

### Famous Person Image Rule

If any famous person is mentioned by name in the carousel content:
1. **Search the web for a real photo** of that person (Wikipedia Commons, press photos)
2. **Download the real photo** and save to `output/carousel/references/`
3. **Use Nano Banana 2 Edit** to composite the real photo into the slide — pass the photo as a reference image
4. **NEVER use AI text-to-image to generate a famous person** — Nano Banana/Flux will hallucinate an incorrect face. Always start from a real photograph.
5. **Only 1 person per slide** unless explicitly requested — do not combine the famous person with Jay on the same slide

### Single Person Per Slide Rule

Each slide should feature at most ONE person unless explicitly requested otherwise. The cover shows the subject (famous person or Jay), and the CTA shows Jay. Do not combine multiple people on a single slide.

### CTA Rules

1. **CTA slide must always have text overlay** — never just a photo
2. **Prefer comment trigger word CTA** — e.g., "Comment LEADS to get the playbook"
3. **Fall back to "Follow @leadgen..."** if no comment trigger fits the topic
4. **Always ask about CTA** if not provided in the brief

### POV Cover Rule

When the headline starts with "POV:", do NOT show the creator's face on the cover. POV means the viewer IS the subject. Show what the viewer would see (laptop screen, dashboard, inbox, spreadsheet) instead. The cover visual should reinforce the first-person perspective — e.g., a MacBook showing Google Sheets full of leads, not a photo of Jay.

### Identity Preservation Rule

NEVER pass a Flux LoRA photo to Nano Banana expecting identity preservation. Nano Banana treats reference images as style/composition guides only — it WILL generate a different person. For CTA slides needing the creator's face:
1. Generate a dedicated Flux LoRA headshot specifically for the CTA
2. Either use the Flux LoRA output directly, or composite it programmatically via Sharp
3. If Nano Banana must be used (for text overlay), accept that the face may not match — prefer option 1 or 2

**Sharp compositing guardrails:**
- Generate the CTA background with NO placeholder circle — leave the area blank/white where the headshot will go
- Composite the headshot at the FULL intended circle size (not smaller)
- The headshot must fill the entire circle edge-to-edge with zero gap
- After compositing, visually verify via `open -a Preview` that the headshot fills its circle

### Post-Compositing Verification Rule

After any programmatic compositing (Sharp/Canvas/ImageMagick), immediately verify the result by viewing the output image. Check that:
1. The composited photo fills its intended area (no tiny photo in large frame)
2. No placeholder shapes (gray circles, colored boxes) are visible behind the photo
3. Border rings align tightly with the photo edges
4. The overall composition looks intentional, not accidental

If ANY of these fail, fix the compositing parameters and re-run before presenting to the user.

### SVG Rendering Rule

When using Sharp to composite SVG elements (circular masks, border rings, overlays), ALWAYS render the SVG buffer to PNG before passing to `.composite()`:

```js
// WRONG — Sharp cannot decode raw SVG text buffers
const mask = Buffer.from(`<svg>...</svg>`);
sharp(image).composite([{ input: mask, blend: "dest-in" }]);

// CORRECT — Render SVG to PNG first
const maskPng = await sharp(Buffer.from(`<svg>...</svg>`)).png().toBuffer();
sharp(image).composite([{ input: maskPng, blend: "dest-in" }]);
```

This prevents blank/white output from silently corrupted composites. Always include `xmlns="http://www.w3.org/2000/svg"` on SVG strings.

### Pre-Delivery Slide Verification Rule

Before presenting ANY carousel to the user, verify EVERY slide:
1. Open each slide in Preview.app and visually inspect
2. Check file size — slides with real screenshots/photos should be 400KB+. A slide under 200KB likely has missing visual content (blank areas, failed composites)
3. Verify no blank white rectangles where images should be
4. Verify comparison slides have visual artifacts (not plain text columns)
5. If ANY slide fails verification, regenerate it before presenting

Generation scripts should include automated size checks:
```js
const stats = fs.statSync(slidePath);
if (stats.size < 200000) {
  log("warn", `${filename} is only ${Math.round(stats.size/1024)}KB — likely missing visual content`);
}
```

### Dashboard Number Consistency Rule

When a slide headline claims a specific metric (e.g., "1,000 EMAILS"), the dashboard screenshot on that slide MUST show consistent numbers. Add explicit number targets to the Nano Banana prompt (e.g., "showing 1,000+ total sent, 4.1% reply rate"). Never let AI hallucinate random numbers that contradict the headline.

### Output Cleanup Rule

Scripts must clean old slide files from `output/carousel/` before generating a new set. Delete previous `slide-*.png` and `jay-*.png` files at the start of generation (except when using `--slide N` to regenerate a single slide). This prevents stale slides from a previous run (e.g., slide-09/10 from a 10-slide run) cluttering the output when a shorter carousel is generated.

---

## fal.ai Functions Reference

| Function | Model | Use Case |
|----------|-------|----------|
| `generateImage()` | Flux LoRA | Jay photos (character-consistent via LoRA) |
| `generateWithNanoBanana()` | Nano Banana 2 | Text-to-image slides (no references needed) |
| `editWithNanoBanana()` | Nano Banana 2 Edit | Composite slides (with reference images/screenshots) |
| `uploadToFalStorage()` | Storage API | Upload local assets as fal.ai URLs |
| `downloadImage()` | -- | Download generated images to local disk |

All functions imported from `@/lib/fal` (or `../lib/fal.ts` for scripts).

---

## Quality Checklist

Before presenting the carousel as complete, verify ALL of these:

- [ ] **TEXT VERIFICATION (MANDATORY)**: Read every slide at full resolution. Check every visible word for spelling and coherence. AI generators hallucinate text.
- [ ] **If text is garbled**: Use Nano Banana 2 Edit to fix the specific text. Pass the slide as reference image with prompt targeting only the text fix.
- [ ] **Phone mockups/screenshots**: Zoom into any small text areas to verify. Thumbnail checks are NOT sufficient.
- [ ] **Image hosting**: Upload slides to fal.ai CDN for Instagram posting (Google Drive URLs fail on Instagram)
- [ ] **Light background** on every slide (white/off-white, never dark)
- [ ] **Single background color** per slide (no two-tone layering)
- [ ] Cover slide has bold hook headline + Jay Flux LoRA photo + "SWIPE -->"
- [ ] All text uses 50pt+ headlines, 14pt+ body
- [ ] Hot pink accent on 1-2 words max per slide (never full background)
- [ ] Max 15 words per slide
- [ ] **No icons visible** — zero flat icons, emoji graphics, or abstract symbols
- [ ] **No dimension markers** — no "180px", "50px" text visible anywhere
- [ ] **No slide counters** — no "2/10", "3/10" on any slide
- [ ] **All images are real screenshots** — actual tool UIs, dashboards, products
- [ ] **Images are LARGE** — fill 40-60% of slide, legible at mobile size
- [ ] **Images match content** — slide about X shows a screenshot of X
- [ ] **No duplicate images** — every slide has a unique, visually distinct reference image
- [ ] **Image fit scores 80%+** — each image directly demonstrates the headline claim (verified in Step 2.5)
- [ ] **Jay avatar on every non-photo slide** — V8 cartoon avatar present on all inner slides without a real Jay/person photo
- [ ] **CTA slide has text overlay** with comment trigger or follow CTA
- [ ] No banned AI words from CLAUDE.md
- [ ] Readable when squinting on small dim screen
- [ ] Consistent visual style across all slides
- [ ] Resolution is 1K (not 2K unless explicitly requested)
- [ ] All slides saved to `output/carousel/` as `slide-01.png`, `slide-02.png`, etc.
- [ ] Opened in Preview.app and visually confirmed

---

## Output

Save all generated slides to:
```
output/carousel/slide-01.png   (cover)
output/carousel/slide-02.png   (first content slide)
...
output/carousel/slide-NN.png   (CTA slide)
```

Reference screenshots saved to:
```
output/carousel/references/    (Playwright captures, resized to max 1000px)
```

Open in Preview.app for review: `open -a Preview output/carousel/`

## Google Drive Delivery

After generating and reviewing slides, upload them to Google Drive for Jay to access:

1. Create a carousel folder (if it doesn't already exist) in the shared parent folder:
```bash
export GOG_KEYRING_PASSWORD='bobclawd2026'
gog drive mkdir "<Carousel Name>" --parent 1mZhMS35V2stGHtid3B1ujNTJ-naIfBuA --account bob@leadgenjay.com
```

2. Create a version subfolder inside the carousel folder for each generation round:
```bash
gog drive mkdir "v<N>-<short-description>" --parent <carousel-folder-id> --account bob@leadgenjay.com
```
   - Naming pattern: `v1-8-slides-whiteboard`, `v2-4-slides-gdoc`, `v3-10-slides-final`
   - Each regeneration gets its own version subfolder — never overwrite previous versions
   - Keep all versions for comparison and iteration history

3. Upload all slides to the version subfolder:
```bash
for f in output/carousel/slide-*.png; do
  gog drive upload "$f" --parent <version-folder-id> --account bob@leadgenjay.com &
done
wait
```

4. When delivering via iMessage, share only the **latest version subfolder** link (not the parent carousel folder or individual files).

**Shared parent folder:** "Bob Content Drops"
- **Folder ID:** 1mZhMS35V2stGHtid3B1ujNTJ-naIfBuA
- **Link:** https://drive.google.com/drive/folders/1mZhMS35V2stGHtid3B1ujNTJ-naIfBuA
- **Shared with:** jay@leadgenjay.com (writer), jayfeldman11@gmail.com (writer)

All carousel subfolders inherit sharing permissions from the parent — no need to re-share each time.

**Cost estimate:** ~$0.07/slide x 10 slides = ~$0.70 per carousel

---

## Cartoon Avatar Integration (ENFORCED)

**Every inner slide that does not feature a real Jay photo (Flux LoRA) or a real person's photo MUST include Jay's V8 cartoon avatar.** This is not optional — it is a required element for brand presence on every slide.

**Where to place (REQUIRED on non-photo slides):**
- Inner/teaching slides: bottom-left or bottom-right corner, small size
- CTA slides without real photo: cartoon pointing at CTA button
- Comparison slides: cartoon reacting to content
- Text-heavy cover slides: lower portion for visual interest

**Where NOT to place:**
- Slides with real Jay photo (Flux LoRA or actual) — avatar would duplicate Jay
- Cover slides with Jay photo as hero element

**How to generate:** Use the /cartoon skill to generate a pose matching the slide context, then composite onto the slide using Nano Banana 2 Edit.

**Style:** V8 modern flat illustration. Always smiling. See /cartoon skill for full details.

**Enforcement:** If a slide has no real photo AND no Jay avatar, it fails the quality checklist. Regenerate with avatar before presenting.

---

### Step 8: Publish (Optional)

After delivering slides to Google Drive, ask Jay:
"Want me to post this carousel to Instagram now?"

If yes:
1. Chain to the `/post` skill with the carousel slides from `output/carousel/`
2. The post skill handles caption writing, hashtags, platform formatting, and Blotato publishing
3. NEVER auto-post — always wait for explicit Jay approval

If no or no response: end workflow after Drive delivery.
