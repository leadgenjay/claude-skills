---
name: hyper-carousel
version: 3.1.0
description: "Build animated 8-slide Instagram carousels with HyperFrames + GSAP motion. Renders one MP4 per slide plus a phone-mockup HTML previewer. Locked to Lead Gen Jay design system (Big Shoulders + Manrope + #ED0D51 pink + #0D0D0D dark). Built-in Visual Proof Gate (real screenshots, no fake mockups), decorative safe-zone, canvas density rule, post-render autoheal loop. Triggers: 'hyper carousel', 'animated carousel', 'instagram carousel video', 'hyperframes carousel', '8-slide reel', 'carousel for IG'."
---

# Animated Instagram Carousel Builder

## What This Does

Builds an 8-slide animated Instagram carousel using HyperFrames. Each slide is a separate HyperFrames composition rendered as MP4. Output includes a phone-mockup previewer for reviewing the full carousel before posting.

## Prerequisites

- HyperFrames CLI installed: `npm install -g hyperframes`
- The `/hyperframes` skill must be invoked before writing any composition HTML

## How To Use

Paste this entire prompt into a new Claude Code session in any project directory. Replace the `[VARIABLES]` section with your content. Claude will build all 8 slides, render them, and generate a previewer.

---

## PROMPT — Copy everything below this line

---

Build me an 8-slide animated Instagram carousel using HyperFrames. Follow the design system, slide specs, and build process exactly.

### [VARIABLES] — Replace these

```
HANDLE: @doctablademd
DISPLAY_NAME: Emeka Ajufo, M.D.
AVATAR_PATH: [absolute path to avatar image, ideally 200px+ square]
TOP_RIGHT_LABEL: [product/tool name, e.g. "Viktor AI" or "DoctorLeadFlow"]
KEYWORD: [CTA keyword for comments, e.g. "VIKTOR"]
TOTAL_SLIDES: 8
```

**Slide content (fill in all 8):**

```
SLIDE 1 (HOOK — animated MP4, 10s):
  Type: dark background, animated text swap
  Headline: [4-5 word lines filling 40% of slide]
  Swap words: [3 words/phrases that cycle in a pink pill]
  Body: [1-2 sentences, italic]
  CTA: "SWIPE TO LEARN HOW" or similar

SLIDE 2 (PAIN — animated MP4, 10s):
  Type: dark background
  Section label: [e.g. "THE BOTTLENECK"]
  Headline: [pain statement, pink accent on key phrase]
  Visual: [what animated element — timeline, dashboard, chat, etc.]

SLIDE 3 (SOLUTION — static-feel MP4, 5s):
  Type: dark background
  Section label: [e.g. "THE FIX"]
  Headline: [solution statement]
  Body: [supporting detail]
  Visual: [terminal mockup, Slack mockup, screenshot mockup — pink syntax accents]

SLIDE 4 (HOW — static-feel MP4, 5s):
  Type: dark background
  Section label: [e.g. "HOW IT WORKS"]
  Headline: [mechanism statement]
  Visual: [2x2 grid of feature cards — #1A1A1A surface, pink left border]
  Body: [one-liner below cards]

SLIDE 5 (WHY — static-feel MP4, 5s):
  Type: dark background, with a prominent pink hero panel
  Section label: [e.g. "WHY IT WINS"]
  Hero panel: [paradigm shift statement — pink #ED0D51 fill, black text, big bold few words]
  Body: [supporting detail, white on dark]
  Numbered list: [3 benefit statements, white with pink numbers]

SLIDE 6 (SCALE — animated MP4, 10s):
  Type: dark background
  Section label: [e.g. "THE TOOLKIT" or "THE PROOF"]
  Headline: [scale/scope statement with a number in pink]
  Body: [supporting detail]
  Secondary: [additional proof point]

SLIDE 7 (CONTRAST — static-feel MP4, 5s):
  Type: dark background
  Section label: [e.g. "THE CHEAT CODE"]
  Headline: [before/after or cost contrast, pink accent on key number]
  Body: [one-liner]
  Visual: [before/after comparison cards — muted gray (before) vs pink-bordered (after)]
  Closing: [two-line bold statement, second line in pink]

SLIDE 8 (CTA — animated MP4, 10s):
  Type: dark background, CENTER-ALIGNED, pink CTA button
  Headline: [personal CTA question]
  Body: [what they get when they comment/DM]
  Button: COMMENT "[KEYWORD]" (pink fill, black text)
```

### DESIGN SYSTEM — Lead Gen Jay (LGJ)

Colors:
| Role | Hex |
|------|-----|
| Background (every slide) | #0D0D0D |
| Hero-panel background (slide 5) | #ED0D51 |
| Text (primary) | #FFFFFF |
| Text on pink hero panel | #0D0D0D |
| Accent | #ED0D51 |
| Accent deep (hover, dark pink fills) | #6B0A2E |
| Section label color | #ED0D51 |
| Body / supporting text | #A8A8A8 |
| Muted text (footer) | #888888 |
| Danger / "before" tint | #8B2020 |
| Terminal bg | #1A1A1A |
| Card / panel surface | #1A1A1A |
| Hairlines / borders | #2A2A2A |

Typography:
- **Headlines**: `Big Shoulders Display` 900 weight — ALL CAPS, -0.02em tracking, 85-120px depending on word count
- **Body**: `Manrope` italic, 400 weight, 18-20px
- **Section labels**: `Manrope` 700, ALL CAPS, letter-spacing 0.15em, 14-18px
- **Terminal/code**: `JetBrains Mono` 400, 20-24px
- **Footer**: `Manrope` 600, 14-18px

Layout (720x900):
- Padding: 50px sides, 60px top, 50px bottom
- Content width: 620px
- Gaps: label→headline 16px, headline→body 24px, body→visual 32px

Footer (EVERY slide):
- Left: @HANDLE (Manrope 600, 14px, ALL CAPS, letter-spacing 0.1em)
- Center: progress bar (3px, pink fill width = slideNum/totalSlides * 100%)
- Right: N/totalSlides (Manrope 600, 18px)
- Text color: #888888 on dark; #0D0D0D on the pink hero panel of slide 5

What NOT to do:
- **No light backgrounds** — every slide is dark (#0D0D0D)
- **No gradients** — flat fills only (LGJ brand rule)
- **No pink as a full background** EXCEPT the slide-5 hero panel and the slide-8 CTA button surface
- No drop shadows on text
- No serif fonts
- No centered text except slide 8 (CTA)
- **Banned AI words**: delve, tapestry, realm, landscape, ever-evolving, cutting-edge, robust, transformative, pivotal, vibrant, crucial, compelling, seamless, groundbreaking, leverage, harness, embark, navigate (metaphorical), unveil, facilitate, synergy, game-changer, unlock, unleash, elevate, utilize, endeavour, multifaceted

### Decorative element safe-zone rule (MANDATORY)

Decorative elements (stars, dots, badges, ghost text, rotating shapes) MUST NOT overlap text or visual content. For a 720x900 slide with 50px content padding:

- **DECORATIVE-OK ZONES (corners only, narrow strips):**
  - Top-right corner: `x ≥ 580px AND y ≤ 90px`
  - Top-left corner: `x ≤ 140px AND y ≤ 60px` (above avatar lockup only — avatar takes the rest)
- **FORBIDDEN ZONES** (never place decorative elements here):
  - Anywhere in the headline block (typically y=100-450px center)
  - Anywhere in the body copy + swap pill zone (typically y=450-700px)
  - Behind or overlapping the footer (y > 820px)
- **Default: ZERO decorative stars/asterisks.** The pink swap pill + accent word + Jay avatar already carry the visual energy. Only add decoration if the slide reads visually thin AFTER all required content is placed, and only into the corner safe-zones above.
- **Continuous rotation animations on decorative elements**: if used, the bounding box at every keyframe must stay within the safe zone. Rotate around a corner-anchor `transform-origin`, not a center-anchor — center-anchored rotation expands the visual footprint and risks overlap.
- **Verification**: when previewing a rendered frame, check whether any decorative pixel lands on top of a text glyph. If yes, the slide fails this rule — re-position or remove the decoration.

### Canvas density rule (MANDATORY)

Substantive content (headline + body + visual + footer) must consume **≥50%** of the 720×900 canvas vertical space — i.e. the lowest visible content element (excluding footer) sits at `y ≥ 500px`. Empty bottom halves read as broken/unfinished. The slide-6 v2 defect (`5.4` number at top, body line at y=370, then ~530px of empty dark canvas to the footer) is exactly the failure mode this rule blocks.

**Build-time check:** after laying out the slide, look at the rendered preview. If content stops at `y ≤ 400px`, you MUST either:

1. Add a real proof visual (screenshot, dashboard, comparison card, before/after) below the existing content, OR
2. Restructure to span the canvas — convert single statement to numbered list, add a 2-column data table, add a side-by-side comparison, embed a 2x2 feature grid.

Don't pad with whitespace. Add substance. If the brief has no substance to add at the bottom, the brief is wrong — push back to the user.

### NARRATIVE ARC

The 8 slides follow Problem-Agitation-Solution-CTA. **All backgrounds are dark (#0D0D0D)**; visual variation comes from per-slide texture (mockups, cards, hero panel, CTA button), not from changing the background.

| Slide | Role | Visual texture (LGJ) |
|-------|------|----------------------|
| 1 | Hook — bold claim + text swap animation | Dark bg, **real hero image** (founder photo / product screenshot / dashboard hero, ≥280×280px), headline, pink swap pill (no decorative stars). Tiny corner avatar is NOT sufficient — see hero image rule below. |
| 2 | Pain — what's broken | Dark bg, white headline with one pink accent word |
| 3 | Solution — what fixes it | Dark bg, terminal/screenshot mockup with pink syntax accents |
| 4 | How — the mechanism/features | Dark bg, 2x2 card grid (cards #1A1A1A surface, pink left border) |
| 5 | Why — the paradigm shift | Dark bg with a **prominent pink #ED0D51 hero panel** card containing the paradigm-shift statement (black text on pink) |
| 6 | Scale — proof/scope | Dark bg, oversized stat number in pink, secondary stat in white |
| 7 | Contrast — before/after | Dark bg, before card (muted gray, #8B2020 hairline) vs after card (pink #ED0D51 hairline) |
| 8 | CTA — comment keyword | Dark bg, centered, pink CTA button (#ED0D51 fill, black text), Jay avatar with pink ring |

Backgrounds DO NOT alternate — they stay dark on every slide. The pink hero panel on slide 5 and the pink CTA button on slide 8 are the only places where pink (#ED0D51) acts as a fill rather than an accent.

### COPYWRITING RULES

- Headlines are ALL CAPS sentence fragments, never complete sentences
- Every headline uses contrast (big vs small, old vs new, many vs one)
- One phrase per slide gets the accent color treatment
- Body copy is always italic, max 2-3 lines
- Section labels are always present: THE [NOUN] format
- Periods between short phrases = emphasis: "VIDEO. IS. CODE."

### ANIMATION PATTERNS

**Slide 1 (Hook):**
- Avatar + name lockup top-left, product label top-right
- **Hero image is non-negotiable.** The hook needs something to look at — a real photo or screenshot that immediately conveys the topic. Position the hero either right-half of canvas (text left, photo right), full-width below the headline (text top, image bottom), or behind the headline (image as backdrop with `#0F172A` overlay at 60-80% opacity). Headline + hero together must occupy ≥60% of vertical space. Minimum hero render size 280×280px. Default sources (in priority order): `output/photos/jay-database/` for founder/face hooks, `~/Nextcloud/Visual Assets/Demos/<product>/` for product-led hooks, `~/Nextcloud/Visual Assets/Logos/Tool Logos/` for tool-named hooks. The slide-1 v2 defect (text-only with just a tiny corner Consulti icon and ~600px empty canvas) is what this rule prevents.
- **Hero card sizing (CRITICAL — v3.1):** the `.hero-card` (or whatever container holds the hero image) MUST use `height: 100%` with `min-height` as a safety floor, NEVER a fixed pixel height. Fixed-pixel hero cards (e.g. `height: 380px`) cap at that size and leave empty canvas below — failing the canvas density rule. Correct pattern:
  ```css
  .hero-card { width: 100%; height: 100%; min-height: 380px; }
  .hero-card img { width: 100%; height: 100%; object-fit: contain; }
  ```
  Parent chain must propagate `flex: 1` from `.scene-content` → `.main-container` → `.hero-column` → `.hero-card` for `height: 100%` to expand. The v3 autoheal Consulti slide-1 was rebuilt with `height: 380px` and rendered with ~460px of empty canvas at the bottom; the fix changed it to `height: 100%; min-height: 380px` and the hero filled the lower half.
- Headline slides from left (expo.out)
- Swap pill scales in (back.out), text cycles every 1.7s with color change
- Body + CTA pill fade up
- **No decorative stars** — they break the safe-zone rule above. Visual energy comes from the hero image, the swap pill cycling, the pink accent word, and the founder/product visual.

**Slides 2, 6 (Animated, 10s):**
- Section label fades in first (0.15s)
- Headline slides from left
- Visual element has continuous animation (playhead scrub, counter, pulse)
- **Counter / scrub / cycling timing rule:** all non-looping reveal animations (number counters, % counters, progress fills, typewriter text) MUST complete by t=2.5s so the post-render audit frame extracted at t=3s captures the final value. For the back half of the clip (t=2.5-10s), the value stays held at its final state, optionally with a subtle ambient pulse on the held value. This is a hard rule — the user reviews the rendered slide as a static image first, then animation. If the static read at t=3s shows mid-tween state, the slide reads as broken.

**Slides 3, 4, 5, 7 (Static-feel, 5s):**
- Section label → headline → body → visual element (staggered entrances)
- Visual elements: terminal mockups, card grids, code snippets, comparison cards
- No continuous animation needed — entrance choreography is the engagement

**Slide 8 (CTA):**
- Center-aligned, everything fades/scales in
- CTA button has continuous scale pulse (1→1.03→1, yoyo, 2s cycle)

### VISUAL ELEMENTS TOOLKIT

Pick from these for each slide's visual:

- **Terminal mockup**: #1A1A1A card, traffic-light dots, JetBrains Mono text, pink #ED0D51 syntax accents
- **Slack mockup**: #1A1A1A card, channel name, message bubbles, timestamps
- **2x2 feature grid**: #1A1A1A cards with pink left border + emoji + step label + description
- **Before/after comparison**: Muted-gray card with #8B2020 hairline (before) vs #1A1A1A card with pink #ED0D51 hairline (after)
- **Code snippet**: #1A1A1A card with JetBrains Mono syntax-highlighted code, pink keywords
- **Numbered list**: Large Big Shoulders pink numbers + Manrope white descriptions, thin pink left border
- **NLE timeline**: Fake video editor timeline with pink-tinted tracks + playhead
- **Data callout**: Large pink stat number + supporting white text
- **Chat/message mockup**: Message bubbles (#1A1A1A surface) showing AI conversation, user bubbles pink-tinted
- **Pink hero panel (slide 5 only)**: Full-width pink #ED0D51 card with black headline text, sits centered in the dark frame

### VISUAL PROOF GATE — Mandatory per-slide check

Before writing each slide's HTML, run this check:

**Asset discovery is filesystem-first, MANDATORY.** Before deciding the visual, run real `ls`/`glob` commands on the asset directories — do NOT skip to writing HTML with imagined paths.

**Canonical asset roots (use these for ANY brand/product — not just cold-email defaults):**
- **Logos**: `~/Nextcloud/Visual Assets/Logos/` (top-level — includes `Tool Logos/` subdir with 270+ SaaS/AI tool logos, plus brand logos like `LGJ logo.jpeg`, `LGJ profile pic.png`)
- **Demos / dashboards / examples**: `~/Nextcloud/Visual Assets/Demos/` (top-level — organized into product subdirs: `consulti/`, `instantly/`, `apollo/`, `clay/`, `claude-code/`, `gohighlevel/`, `inbox-insiders/`, `lgj-website/`, `n8n/`, `obsidian/`, `supabase/`, `zeus/`, etc.)

Discovery commands (run in shell, capture exact filenames returned):

```bash
# Logos (any tool, brand, or company)
ls ~/Nextcloud/Visual\ Assets/Logos/Tool\ Logos/ | grep -i <tool_name>
ls ~/Nextcloud/Visual\ Assets/Logos/ | grep -i <keyword>   # LGJ logo, Jay profile pic, etc.

# Demos / dashboards / screenshots (any product the user has documented)
ls ~/Nextcloud/Visual\ Assets/Demos/                       # see the full product index
ls ~/Nextcloud/Visual\ Assets/Demos/<product_name>/        # e.g. consulti/, instantly/, gohighlevel/, n8n/

# Project-local fallback (older curated demo set, used by the cold-email default arc)
ls public/ads/assets/lead\ gen/demo/                       # instantly_2024-11-29 (1).png, Stripe Annual proof.jpg
ls public/ads/assets/lead\ gen/logos/                      # Email spam.webp
```

**HARD BAN — never substitute any of these for a real asset path:**
- ANY `data:` URI in an `<img src>` of a proof element. This covers `data:image/png;base64,...`, `data:image/jpeg;base64,...`, `data:image/svg+xml,...`, `data:image/svg+xml;utf8,...`, `data:image/webp;base64,...`. Data URIs are NOT real proof — they fail the gate.
- Inline `<svg>` (whether in `<img src>` or as a child `<svg>` element) that draws a fake dashboard / fake terminal / fake email-client UI by stacking `<rect>` + `<text>` elements to simulate a tool screenshot. Real proof is a real image file on disk. If you find yourself hand-drawing UI in SVG inside a `.proof-card`, STOP — use the fallback in step 5 instead.
- `https://placehold.it`, `https://via.placeholder.com`, `unsplash.com/random`-style URLs.
- Made-up filenames (e.g. `instantly-dashboard.png` when the actual file on disk is `instantly_2024-11-29 (1).png` — only the literal `ls` output is allowed).

**Allowed img src patterns** (only literal `ls` output is permitted):
- `<img src="/Users/jayfeldman/Nextcloud/Visual Assets/Logos/Tool Logos/<exact-filename>">`
- `<img src="/Users/jayfeldman/Nextcloud/Visual Assets/Demos/<product>/<exact-filename>">`
- `<img src="public/ads/assets/lead gen/demo/<exact-filename>">` (project-local cold-email defaults)
- `<img src="output/photos/jay-database/<exact-filename>">` (Jay avatar photos)

If the file isn't on disk at one of these roots, you do not have proof — use the fallback (placeholder div with "SCREENSHOT NEEDED: <what>").

**Render-engine path constraint (CRITICAL):** HyperFrames renders compositions in a Chromium-based browser context. `file:///` URLs and absolute `/Users/.../Nextcloud/...` paths in `<img src>` are silently REJECTED by the renderer — no error, the image just shows as a broken-image icon in the final MP4. They only work if the file is served from a co-located web root.

**Required workflow for any asset on `~/Nextcloud/...`:**
1. Discover the asset under `~/Nextcloud/Visual Assets/Logos/` or `~/Nextcloud/Visual Assets/Demos/<product>/`.
2. **Copy it** into a workspace-local `public/assets/<bucket>/` dir (e.g. `public/assets/tool-logos/`, `public/assets/consulti-screenshots/`). Use `cp` — don't symlink.
3. Reference it in HTML via relative path from the slide dir: `<img src="../public/assets/<bucket>/<filename>" />`.

`<img src="file:///...">` and `<img src="/Users/...">` are forbidden. No exceptions.

**Low-contrast logo rule (MANDATORY when embedding tool logos on dark slides):**

Many SaaS logos use dark wordmarks (e.g. `instantly_logo.webp`, `apollo.webp`) that disappear on `#0F172A` or `#0D0D0D`. Before embedding, decide if the logo needs a plate.

**Test:** if the logo's dominant ink is black, dark grey, or any color with luminance < 40% (visual check; `sips -g all <path>` for size; open it via `sips --resampleHeightWidthMax 1000` and Read for the ink color), it MUST be wrapped:

```html
<div class="logo-plate"><img src="../public/assets/tool-logos/instantly_logo.webp" alt="Instantly" /></div>
```

```css
.logo-plate {
  background: #F9FAFB;
  border-radius: 8px;
  /* IMPORTANT: when multiple plates sit in a grid/row, use FIXED dimensions, not padding.
     Padding-based plates take the natural width of each logo and break grid alignment
     (one plate fat for wide wordmark, one plate narrow for square icon). v3.1 autoheal
     on the Consulti slide-7 surfaced this — Apollo plate dwarfed Lemlist plate. */
  width: 110px;
  height: 56px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}
.logo-plate img {
  display: block;
  height: 36px;
  max-width: 86px;
  width: auto;
  object-fit: contain;
  opacity: 1;
  filter: none;
}
```

**Plate uniformity (MANDATORY in grid/row layouts):** every `.logo-plate` in the same grid or row MUST have identical width × height. Use the `110×56` baseline above unless the slide design calls for a different uniform pair (e.g. `90×48` for a denser grid). Padding-based plates that size to natural logo width are forbidden in multi-plate layouts.

Logos that are already white/light or that have white variants in the Tool Logos dir (`smartlead-logo-white.png`, `consulti-logo-white.svg`) skip the plate. **Always prefer a `-white` variant when one exists** — check with `ls ~/Nextcloud/Visual\ Assets/Logos/Tool\ Logos/ | grep -i <tool>` and look for `-white`, `-w`, or `_white` in the filename.

If both globs return zero hits for the tool/metric, skip to step 5's fallback (placeholder div with "SCREENSHOT NEEDED:") — do NOT fabricate.

1. **Read the slide brief.** What is the central claim?
2. **Can a real logo or real screenshot prove this claim better than text alone?**
3. **Check the asset libraries (in priority order):**
   - Tool/SaaS logos: `~/Nextcloud/Visual Assets/Logos/Tool Logos/` (270+ files — search by tool name). Examples: `instantly_logo.webp`, `smartlead-logo.png`, `lemlist-icon.png`, `apollo.webp`, `stripe.svg`, `listkit.webp`, `listkit-icon.png`.
   - Per-product demo libraries (canonical for any product the user owns): `~/Nextcloud/Visual Assets/Demos/<product>/` — has subdirs for `consulti/`, `instantly/`, `apollo/`, `clay/`, `claude-code/`, `gohighlevel/`, `inbox-insiders/`, `lgj-website/`, `n8n/`, `obsidian/`, `supabase/`, `zeus/` and more. Browse these FIRST for any product-specific dashboards, walkthroughs, or screenshots.
   - Project-local cold-email proof screenshots: `public/ads/assets/lead gen/demo/`
     - `Stripe Annual proof.jpg` — Stripe revenue dashboard (portrait)
     - `instantly_2024-11-29 (1).png` — Instantly campaign dashboard (landscape)
   - Spam-folder screenshot: `public/ads/assets/lead gen/logos/Email spam.webp` (landscape)
   - LGJ brand: `~/Nextcloud/Visual Assets/Logos/LGJ logo.jpeg`, `LGJ profile pic.png`
   - Jay photos (avatars on slides 1 + 8 only): `output/photos/jay-database/` (28 files)
4. **Decision tree:**
   - Slide claim names a SaaS tool (Instantly, Smartlead, Stripe, etc.) → embed the logo at 64-96px next to the headline OR inside a 2x2 card grid (slide-4 style).
   - Slide claim cites a metric the user has a screenshot of (e.g. "500K emails", "12% reply rate", "$50K MRR", "spam folder") → embed the real screenshot in a `<div class="proof-card">` (`#1A1A1A` surface, pink hairline, rounded 12px), at 50-65% of the slide height.
   - Slide is abstract / paradigm / contrast statement (e.g. slide-5 "PROCESS > PERSUASION.") → pure typography is correct; no screenshot.

**Hard rule for stat-led slides (MANDATORY):** If a slide's headline IS the stat (e.g. "5.4% REPLY RATES.", "11% BOUNCE RATE.", "$50M PIPELINE."), the slide MUST embed a real dashboard/screenshot that visibly shows that number. A giant typographic number alone is insufficient — the audience needs to see it in context (the actual reply-rate dashboard, the Instantly campaign view, the Stripe revenue page). If no real screenshot exists for the cited metric, either:

1. Switch the slide's headline to a comparative claim that doesn't require visual proof (e.g. "OUTBOUND THAT ACTUALLY REPLIES." instead of "5.4% REPLY RATES."), OR
2. Render the fallback `<div class="proof-needed">SCREENSHOT NEEDED: <description of dashboard wanted></div>` so the user can supply the asset.

NEVER ship a stat-headline slide with empty canvas below the number. The slide-6 v2 defect — "5.4" as a giant pink number with no dashboard below and bottom half empty — is exactly the pattern this rule exists to prevent.
5. **Hard rule — `[[feedback_never_fake_screenshots]]`:** NEVER fabricate a fake terminal/dashboard mockup when a real one is available. If the slide's central claim has a real screenshot, you MUST use it. Resize any embedded image to ≤1000px max dimension first via `sips --resampleHeightWidthMax 1000 input.png --out output.png` per the project image-handling rule. If no real asset fits, render a `<div>` placeholder reading `"SCREENSHOT NEEDED: <what>"` and surface that to the user — do NOT invent UI.

### Default per-slide visual recommendations (cold-email-style narrative arc)

| # | Default visual | Reuse asset | Falls back to |
|---|---|---|---|
| 1 Hook | **Real hero image (mandatory, ≥280×280px)** — founder photo, product hero shot, dashboard hero, or stylized topical visual. Tiny corner avatar is NOT sufficient. | `output/photos/jay-database/jay-black-tee-studio-warm.png` OR `~/Nextcloud/Visual Assets/Demos/<product>/<hero>` | – |
| 2 Pain | Status pill row + inset of the real spam-folder screenshot | `public/ads/assets/lead gen/logos/Email spam.webp` | text-only pill row |
| 3 Solution | Real Instantly dashboard screenshot inside a proof-card | `public/ads/assets/lead gen/demo/instantly_2024-11-29 (1).png` | terminal mockup |
| 4 How (2x2) | 4 real tool logos in the cards | `~/Nextcloud/Visual Assets/Logos/Tool Logos/instantly_logo.webp`, `smartlead-logo.png`, `lemlist-icon.png`, `apollo.webp` | text-only labels |
| 5 Why | Pink hero panel (typography) | — | — (intentionally text-only) |
| 6 Scale | Real Stripe revenue screenshot inside a proof-card | `public/ads/assets/lead gen/demo/Stripe Annual proof.jpg` | big pink stat number |
| 7 Contrast | "Before" card embeds Email spam screenshot; "After" card embeds Instantly result | both above | text-only comparison cards |
| 8 CTA | Jay avatar + pink button (typography) | Jay photo from `jay-database` | — |

### BUILD PROCESS

1. **Init project**: `mkdir carousel-project && cd carousel-project && hyperframes init --width 720 --height 900 --fps 30`

2. **Copy avatar** to `assets/avatar.png`

3. **Build each slide** as its own HyperFrames project:
   ```
   mkdir slide-N && cd slide-N && hyperframes init --width 720 --height 900 --fps 30
   ```

4. **For each slide's index.html:**
   - Invoke `/hyperframes` skill before writing
   - Set viewport to `width=720, height=900`
   - Set html/body to 720x900
   - Root div: `data-composition-id="main"`, `data-width="720"`, `data-height="900"`
   - Every visible element: `class="clip"` + `data-start` + `data-duration` + `data-track-index`
   - Timeline: `gsap.timeline({ paused: true })` registered on `window.__timelines["main"]`
   - Import fonts via `@import url('https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@700;900&family=Manrope:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400;1,500&family=JetBrains+Mono:wght@400;700&display=swap')`

5. **Lint**: `npx hyperframes lint` — fix all errors

6. **Render**: `npx hyperframes render --format mp4 -o ../output/slide-N.mp4`

   **Render verification (MANDATORY after every render — non-skippable):**
   ```bash
   ls -la ../output/slide-N.mp4 && file ../output/slide-N.mp4
   ```
   Confirm all three: (a) the file exists, (b) `file` reports `ISO Media, MP4` (NOT `data` — `data` means corrupt MP4 with missing `moov` atom), (c) byte size > 50 KB. If any check fails, the render did NOT succeed.

   **Corrupt-MP4 retry pattern (REQUIRED — v3.1 autoheal lesson):** occasionally `npm run render` returns exit code 0 but produces a corrupt MP4 (`file` reports `data`, ffprobe reports `moov atom not found`). The v3 autoheal slide-7 hit this exact case — exit 0 with a 206KB corrupt file. When the verification step fails:
   ```bash
   rm ../output/slide-N.mp4  # remove the corrupt artifact
   npm run render -- --format mp4 -o ../output/slide-N.mp4  # retry
   ls -la ../output/slide-N.mp4 && file ../output/slide-N.mp4  # re-verify
   ```
   Retry up to 3 times. If still corrupt after 3 retries, surface the failure to the user — do not ship a corrupt MP4 into the carousel. Do not pretend the render succeeded.

   The default render output without the `-o` flag is `slide-N/renders/slide-N_<timestamp>.mp4`, NOT `../output/slide-N.mp4` — without the explicit `-o`, the MP4 lands in the wrong place and the next step fails silently. Two agents in the v2 Consulti build fabricated success reports without doing this check. That pattern is what this rule exists to prevent.

7. **Build slides in parallel** using 4 agents:
   - Agent 1: Slides 2-3
   - Agent 2: Slides 4-5
   - Agent 3: Slides 6-7
   - Agent 4: Slide 8
   - Build slide 1 yourself (it's the hero, needs direct oversight)

8. **Generate previewer** at `output/preview.html` via the shared previewer helper (see PREVIEWER TEMPLATE section below) — invokes `scripts/skills/render-preview.mjs --template ig-carousel`. Do NOT hand-roll the previewer HTML.

9. **Final delivery — copy to Nextcloud (MANDATORY before declaring done):** the canonical home for finished carousels is `~/Nextcloud/Carousels/<descriptive-name-and-date>/` (Nextcloud fileid 2998, https://cloud.nextwave.io/f/2998). After the post-render autoheal check passes:

   ```bash
   DEST="$HOME/Nextcloud/Carousels/<Topic Name> <YYYY-MM-DD>"  # e.g. "Consulti Free Trial 2026-05-13"
   mkdir -p "$DEST"
   cp output/*.mp4 output/*-preview.png output/preview.html output/avatar.png "$DEST/" 2>/dev/null
   cp BRIEF.md "$DEST/" 2>/dev/null  # optional but useful for revisits
   ls -la "$DEST"  # verify all 8 MP4s + previews + preview.html landed
   ```

   Folder-name convention: `<Topic Name in Title Case> <YYYY-MM-DD>` (matches existing carousels like `Anthropic Recent Launch (Rahul)`, `POV Reverse Lead Magnet`, `Claude + SpaceX`). The dated suffix lets multiple iterations on the same topic coexist.

   Bundle contents (per Consulti precedent, 2026-05-13): `slide-1.mp4 … slide-8.mp4` + `slide-1-preview.png … slide-8-preview.png` (t=3s static frames) + `preview.html` (phone-mockup viewer) + `avatar.png` + `BRIEF.md`. Total bundle ~3-5 MB.

   Skip the per-slide HTML sources and the `public/assets/` working dir — those stay in the local scratch/project workspace, not Nextcloud.

### HYPERFRAMES RULES (NON-NEGOTIABLE)

- No `repeat: -1` — calculate exact repeats from duration
- No exit animations except final slide — entrance only
- Offset first animation 0.1-0.3s (not t=0)
- Use at least 3 different eases per slide
- No `Math.random()`, `Date.now()`, or async timeline construction
- `gsap.from()` for entrances, `gsap.to()` only for continuous ambient motion
- Don't animate `visibility` or `display` — only visual properties

### PREVIEWER TEMPLATE

The previewer is provided by the shared template `ig-carousel` at `.claude/skills/_shared/preview-templates/ig-carousel.html`. Do NOT hand-roll the previewer HTML — invoke the shared helper instead. This keeps every visual skill's review experience consistent and centralizes the IG phone-mockup CSS.

**Step 1**: Place the brand's profile avatar (Instagram profile photo for the handle) at `output/avatar.png`. The user typically supplies this when invoking the skill — copy it from wherever they pointed (Nextcloud, a downloaded source, etc.). If no avatar is provided, the template renders a hot-pink gradient placeholder.

**Step 2**: Write the preview config to `output/preview.json` then render:
```bash
cat > output/preview.json <<'EOF'
{
  "handle": "leadgenjay",
  "avatar": "avatar.png",
  "caption": "First line of the carousel caption…",
  "metrics": { "likes": "2,847" },
  "slides": [
    { "src": "slide-1.mp4", "duration": 10 },
    { "src": "slide-2.mp4", "duration": 10 },
    { "src": "slide-3.mp4", "duration": 5 },
    { "src": "slide-4.mp4", "duration": 5 },
    { "src": "slide-5.mp4", "duration": 5 },
    { "src": "slide-6.mp4", "duration": 10 },
    { "src": "slide-7.mp4", "duration": 5 },
    { "src": "slide-8.mp4", "duration": 10 }
  ]
}
EOF

node scripts/skills/render-preview.mjs \
  --template ig-carousel \
  --out output/preview.html \
  --config @output/preview.json
```

Replace `handle`, `caption`, `metrics.likes`, and the slide durations to match the actual carousel. The shared template renders the same 390×844 iPhone frame, 390×487 IG carousel viewport, keyboard ←/→ navigation, touch swipe, and dot indicators that hyper-carousel pioneered. The template lives in version control — see `.claude/skills/_shared/preview-templates/README.md` for the full config schema and `ig-carousel.html` for the rendered output structure.

Do NOT invoke `--open` here — opening for user review happens AFTER the post-render quality gate passes (see below).

### REFERENCE SLIDE (Slide 1 — full working example)

Use this as the structural template. Every other slide follows the same HTML skeleton (viewport meta, body dimensions, clip class, data attributes, font imports, timeline registration) with different content and styles.

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=720, height=900" />
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@700;900&family=Manrope:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400;1,500&family=JetBrains+Mono:wght@400;700&display=swap');
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { margin: 0; width: 720px; height: 900px; overflow: hidden; background: #0D0D0D; }

      .scene-content {
        display: flex; flex-direction: column; width: 100%; height: 100%;
        padding: 50px 50px 45px 50px; position: relative; overflow: hidden;
      }

      /* Section label */
      .section-label {
        font-family: 'Manrope', sans-serif; font-weight: 700; font-size: 18px;
        letter-spacing: 0.15em; text-transform: uppercase;
        color: #ED0D51;
      }

      /* Headline */
      .headline {
        font-family: 'Big Shoulders Display', sans-serif; font-weight: 900;
        font-size: 100px; line-height: 0.92; letter-spacing: -0.02em;
        color: #FFFFFF;
        text-transform: uppercase; margin-top: 16px;
      }

      /* Body */
      .body-copy {
        font-family: 'Manrope', sans-serif; font-weight: 400; font-style: italic;
        font-size: 20px; line-height: 1.5; color: #A8A8A8; margin-top: 24px;
      }

      /* Footer — include on EVERY slide */
      .footer {
        display: flex; align-items: center; width: 100%;
        margin-top: auto; padding-top: 12px;
      }
      .footer-handle {
        font-family: 'Manrope', sans-serif; font-weight: 600; font-size: 14px;
        letter-spacing: 0.1em; text-transform: uppercase; color: #888;
      }
      .footer-progress { display: flex; align-items: center; gap: 12px; flex: 1; margin-left: 16px; }
      .progress-bar { flex: 1; height: 3px; background: #2A2A2A; border-radius: 2px; overflow: hidden; position: relative; }
      .progress-fill { position: absolute; left: 0; top: 0; height: 100%; width: 12.5%; background: #ED0D51; border-radius: 2px; }
      .page-num { font-family: 'Manrope', sans-serif; font-weight: 600; font-size: 18px; color: #888; }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="5" data-width="720" data-height="900">
      <div id="slide" class="clip" data-start="0" data-duration="5" data-track-index="1">
        <div class="scene-content">
          <div class="section-label" id="label">THE FIX</div>
          <div class="headline" id="headline">YOUR HEADLINE HERE.</div>
          <div class="body-copy" id="body">Your supporting copy here.</div>
          <!-- visual element goes here -->
          <div class="footer" id="footer">
            <span class="footer-handle">@DOCTABLADEMD</span>
            <div class="footer-progress">
              <div class="progress-bar"><div class="progress-fill" style="width: 37.5%"></div></div>
              <span class="page-num">3/8</span>
            </div>
          </div>
        </div>
      </div>
    </div>
    <script>
      window.__timelines = window.__timelines || {};
      const tl = gsap.timeline({ paused: true });
      tl.from("#label", { opacity: 0, y: -15, duration: 0.4, ease: "power3.out" }, 0.15);
      tl.from("#headline", { opacity: 0, x: -40, duration: 0.6, ease: "expo.out" }, 0.3);
      tl.from("#body", { opacity: 0, y: 25, duration: 0.45, ease: "power2.out" }, 0.7);
      tl.from("#footer", { opacity: 0, duration: 0.4, ease: "sine.out" }, 1.0);
      window.__timelines["main"] = tl;
    </script>
  </body>
</html>
```

### Pre-render layout sanity check (MANDATORY)

Before running `npm run check` / `npm run render`, do the math for any card, grid, or stack that holds multiple items:

**Container height ≥ N × item-height + (N-1) × gap + top-padding + bottom-padding + label-row-height**

If your CSS makes the container too small to hold its declared children, the render will silently overflow — children spill outside the bounds, and in the MP4 they get clipped or render at the wrong position (typically: 2 items visible, 2+ items hanging below the card overlapping the next element).

**Fix options when the math doesn't work:**
- Increase container height.
- Decrease per-item size.
- Switch from `flex column` to `grid 2×2` (halves the required height).
- Reduce the item count.

**Worked example (slide-7 v2 before-card with 4 tool logos):** 4 items × 56px height + 3 × 8px gap + 16px label = 264px content. Card height must be ≥ 280px (with padding). The v2 failure shipped `.card { height: 160px }` → 3 of 4 logos overflowed the card boundary and one (Apollo) collided with the closing-statement text below the card. v3 fix: card 220×240 + `.before-card .card-content { display: grid; grid-template-columns: 1fr 1fr }` → 2×2 grid fits cleanly.

### POST-RENDER AUTOHEAL CHECK — Mandatory before declaring done

After all 8 slides render successfully, BEFORE declaring the carousel complete:

1. **Run the shared quality gate** — extracts a frame at t=3s from each MP4, verifies each is real ISO Media + >50KB, and prints the deterministic checklist:
   ```bash
   node scripts/skills/preview-quality-gate.mjs \
     --dir output/ \
     --type video \
     --pattern '^slide-\d+\.mp4$'
   ```
   The gate writes `output/slide-N-preview.png` for each of the 8 slides. If any MP4 is corrupt (e.g. 0 bytes, not real ISO Media), the gate exits non-zero with a `defects` array — `/autoheal` the affected slides and re-run.

2. **Read each `output/slide-N-preview.png` with the Read tool** (720x900 is safe for in-context viewing — single image, well under the multi-image dimension limit).

3. **Self-audit checklist** — combine the generic checklist printed by the gate with these **hyper-carousel-specific** extras:
   - [ ] No decorative element overlaps text or visual content (per the safe-zone rule above)
   - [ ] All comparison glyphs (`>`, `<`, `&`, `→`, em-dash) render literally — per `[[feedback-special-glyphs-in-html-text]]`, use `&gt;`/`&lt;`/`&amp;` in HTML when the brief contains the raw character
   - [ ] If the slide's central claim references a SaaS tool or a metric the user has a screenshot of, the real asset is embedded (per VISUAL PROOF GATE)
   - [ ] No fake/fabricated UI mockups when a real asset exists in `public/ads/assets/lead gen/` or `Tool Logos/`
   - [ ] Brand fidelity: dark `#0D0D0D` bg, pink `#ED0D51` accents, Big Shoulders Display headlines, Manrope body, footer with progress bar
   - [ ] Counter / scrub / cycling animations end on their final visible value at the back half of the clip (e.g. a 0→12% counter must be holding at 12% by t = 6-10s, not still mid-tween)
   - [ ] Banned AI words absent (delve, leverage, unleash, unlock, harness, etc.)

4. **If ANY check fails**, invoke `/autoheal` on the failing slides:
   ```
   /autoheal output/slide-N.mp4 — defect: <describe what failed>
   ```
   Autoheal will trace the defect to a SKILL.md gap, mutate this skill, regenerate the slide, and re-review until clean (max 5 iterations).

5. **Only after all checks pass** for all 8 slides, open the previewer for user review:
   ```bash
   open output/preview.html
   ```

This check is non-optional. The slide-5 missing-`>` defect and the slide-1 star-overlap defect both shipped to the user in v1 because there was no post-render self-audit. v2 adds this gate. v3.2 wraps it into the shared `scripts/skills/preview-quality-gate.mjs` so every visual skill in the repo uses the same gate.
