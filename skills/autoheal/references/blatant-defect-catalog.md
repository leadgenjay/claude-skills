# Blatant Defect Catalog

Expanded checklists for autoheal's Step 1 scan. Each defect includes detection method, common false positives, and severity.

---

## Visual Domain (Graphic Ad, Carousel, Banner, Thumbnail)

| ID | Defect | Detection Method | False Positives to Ignore | Severity |
|----|--------|-----------------|--------------------------|----------|
| V1 | Misspelling / garbled text | AI vision review — read every word in the image and compare against expected text from the brief | Intentional stylized spelling (e.g., "KOLD" for brand name), ALL-CAPS is not garbled | Critical |
| V2 | Element overlap | AI vision review — check if any text blocks overlap other text or if photos cover actionable elements | Intentional layered design (text over a dimmed photo background is OK if legible) | High |
| V3 | Text too small for mobile | AI vision review — estimate if body text would be readable at 375px phone width | Intentionally small legal/disclaimer text, watermarks | Medium |
| V4 | Wrong colors / off-brand | AI vision review — check background, accent, and text colors against brand spec | Slight color shifts from JPEG compression, photos containing non-brand colors (expected) | High |
| V5 | Missing required element | AI vision review — verify headline, CTA, photo (if expected), brand mark are all present | Some formats intentionally omit elements (minimal-text ads skip photos) | Critical |
| V6 | Partially rendered / merged letters | AI vision review — look for characters that blend into each other or are half-drawn | Intentional ligatures in display fonts, stylistic letter connections | Critical |
| V7 | Layout broken | AI vision review — check if content extends beyond frame, sections have collapsed, or large unintended gaps exist | Intentional whitespace as design element, bleed-edge designs | High |
| V8 | Wrong aspect ratio | Programmatic — run `sips -g pixelWidth -g pixelHeight` and compare to target dimensions | Minor rounding (1079px vs 1080px is fine, 800px vs 1080px is not) | Medium |
| V9 | Prompt leakage | AI vision review — scan for meta-instruction words rendered as visible text: CRITICAL, IMPORTANT, DO NOT, NOTE, EXACTLY, MUST, ENSURE | Words that are legitimately part of the ad copy (e.g., "IMPORTANT: Your leads are waiting") | High |
| V10 | Compositing failure | AI vision review — check for sticker-effect photos, visible placeholder shapes, size mismatches between composited layers | Intentional cutout/sticker aesthetic (rare but valid) | High |

### Visual Detection Notes

- Always resize to max 1000px via `sips --resampleHeightWidthMax 1000` before Read tool (prevents Claude crashes with multi-image context)
- For V1 and V6: read EVERY word in the image character by character. Gemini frequently produces near-miss text (INRICIGA instead of INSTANTLY, RUNS instead of RUINS)
- For V4: check the dominant background color, not incidental colors in photos or icons
- For V8: use `sips -g pixelWidth -g pixelHeight "<path>"` for exact dimensions — don't estimate from vision

---

## Text Domain (Email, Script, Copy, Carousel-Copy)

| ID | Defect | Detection Method | False Positives to Ignore | Severity |
|----|--------|-----------------|--------------------------|----------|
| T1 | Banned AI words | Regex scan against banned list: delve, tapestry, realm, landscape, ever-evolving, cutting-edge, robust, transformative, pivotal, vibrant, crucial, compelling, seamless, groundbreaking, leverage, harness, embark, navigate (metaphorical), unveil, facilitate, synergy, game-changer, unlock, unleash, elevate, utilize, endeavour, multifaceted | "Navigate" used literally (navigate to a URL), words in quoted testimonials from third parties | Critical |
| T2 | Missing required section | Check format expectations: email needs subject line + body + CTA; carousel needs hook slide + content slides + CTA slide; ad copy needs headline + body + CTA | Intentionally minimal formats (tweet-length copy has no sections) | High |
| T3 | Wrong format | Compare output structure against expected format — slides should be numbered, beat sheets should have timing, emails should have subject/body separation | Hybrid formats requested by user | High |
| T4 | Placeholder text remaining | Regex scan for: `\[.*?\]` brackets with generic text, `\{\{.*?\}\}` template variables, `TODO`, `INSERT`, `YOUR_NAME`, `PLACEHOLDER`, `EXAMPLE` | Markdown link syntax `[text](url)`, code blocks with bracket syntax | Critical |
| T5 | Gross word count violation | Count words, compare to format range: carousel slide (max 15), email (200-800), ad copy (50-300), beat (max 8 words). Flag if 2x over or under | User explicitly requested longer/shorter format | Medium |
| T6 | Duplicate content | Hash each paragraph/section and check for exact duplicates | Intentional repetition for emphasis (repeating a tagline), chorus-style structures | Medium |
| T7 | Wrong tone | LLM judgment — compare against brand voice: professional yet approachable, educational, peer-to-peer | Quoted testimonials may have different voice (expected) | Medium |
| T8 | Missing personalization | Scan for "you" / "your" — copy addressing a reader should use second person | Brand statements, about-us copy, third-person case studies | Low |
| T9 | Em dashes present | Regex scan for U+2014 (`—`) and U+2013 (`–`) | Code blocks or technical documentation where dashes are syntax | High |
| T10 | Gross structural error | Check: slides numbered sequentially, sections in logical order, all sentences complete, no mid-sentence cutoffs | Intentional fragment sentences for stylistic effect | High |

### Text Detection Notes

- For T1: scan case-insensitively. Check both singular and plural forms
- For T4: be careful not to flag Markdown links `[text](url)` as placeholders
- For T5: word count thresholds are 2x the normal range — this catches gross violations, not marginal ones
- For T9: em dashes are banned in ALL Lead Gen Jay copy, no exceptions

---

## Severity Mapping

| Severity | Impact | Autoheal Priority |
|----------|--------|-------------------|
| Critical | Output is unusable — misspelled headline, garbled text, placeholder visible | Fix first, highest priority |
| High | Output looks unprofessional — wrong colors, broken layout, overlap | Fix second |
| Medium | Output is suboptimal but usable — small text, minor ratio mismatch | Fix if iterations remain |
| Low | Cosmetic — missing personalization, minor tone drift | Fix only if all higher severity defects resolved |

When multiple defects exist, address them in severity order: Critical -> High -> Medium -> Low.
