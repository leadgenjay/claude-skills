# Meta Ads — project preferences

These preferences apply to every chat in this project. Respect them by default.

## Copy rules

- **No filler words or throat-clearing phrases.** Remove them rather than use them. Examples of what NOT to write: "a quick sketch —", "a question for you —", "a reminder:", "a gentle reminder:", "let me ask you something", "here's the thing", "the truth is", "be honest", "imagine this", "picture this".
- Every word must earn its place. If a line does not advance the hook, pain, proof, offer, or CTA, cut it.
- Follow the Lead Gen Jay voice: direct, confident, results-focused. Dan Kennedy PAS. Always "you", never "we."
- Use the exact headlines Jay provides verbatim. Do not paraphrase his hooks.
- Banned words (inherited from brand system): delve, tapestry, realm, landscape, ever-evolving, cutting-edge, robust, transformative, pivotal, vibrant, crucial, compelling, seamless, groundbreaking, leverage, harness, embark, navigate (metaphorical), unveil, facilitate, synergy, game-changer, unlock, unleash, elevate, utilize, endeavour, multifaceted.

## Visual rules

- **Never use red circles to highlight words.** Use a highlighter (marker swipe behind text) effect instead.
- **Never use arrows.** No SVG arrows, no hand-drawn arrows, no ASCII arrows (↓ ↑ → ←), no margin-note arrows pointing at keywords. If something needs emphasis, use the highlighter or weight/scale contrast.
- Keep designs minimalist — one strong headline, one focal point. Hard-to-mess-up compositions.
- Make sure words never overlap other words or graphic elements.
- Make sure arrows actually point to the thing they reference.
- Mix dark/light backgrounds and bold/light font weights across variations.
- Hand-drawn styles should look like digital documents: Apple Notes or Google Docs. Not paper notebooks.
- Use the LGJ brand system: Razzmatazz pink (#ED0D51), brand blue (#0144F8), navy (#162551), slate neutrals. Big Shoulders for heavy heads, Manrope for body, hand-drawn fonts (Kalam, Shadows Into Light, Caveat) for marker work.
- No gradients. No emoji in UI (Lucide or placeholders only).

## Workflow rules

- **Build one ad at a time** until a design system is locked in. Do not generate batches of ad concepts speculatively.
- Pull headlines directly from `uploads/LGJ Ad Ideas.md`.
- All ads default to 600 × 600 (feed square) unless otherwise specified.
- Present ad variations inside a design canvas so they can be compared side-by-side.
- Expose meaningful controls (keyword, colors, variant) via the Tweaks panel.
- **No platform chrome on the creative.** Do not include fake Instagram/Facebook header bars, follow buttons, "Ad" labels, CTA bars, or "Learn more ›" footers inside the ad artboard. The ad is the creative itself — the feed chrome is rendered by Meta at delivery. Keep the frame clean.
- **Pull copy verbatim from `uploads/LGJ Ad Ideas.md`.** When adapting a reference image into a new ad, keep the visual style but swap the text for a headline from Jay's ideas list. Do not re-use copy from the reference image itself.

## Locked design templates

These templates have been approved. Reuse them for new ads in the same family; do not redesign from scratch unless asked.

### Tool logo system (shared by all logo ads)

- Logos live in `assets/tool-logos/`. Name them lowercase, no spaces.
- Tag every logo with `kind: 'icon'` (square/roundish, e.g. apollo, claude, instantly icon) or `kind: 'wordmark'` (wide, e.g. google, clay, consulti, emailbison, gohighlevel).
- **Icon sizing:** image renders at 70% × 70% of chip, `object-fit: contain`.
- **Wordmark sizing:** image renders at 88% width × 52% height, `object-fit: contain`.
- Never mix icon and wordmark into the same square chip without per-logo sizing — wordmarks look tiny otherwise.
- Strip JPEG backgrounds to transparent PNG before using. White/light backgrounds behind transparent logos only — logos are rarely designed to sit on dark chips, so keep chip color `#fff` for light variants and `#f5f2ea` (warm cream) for dark variants. Never put a color-on-color clash directly behind a logo.

### Template A — "Strike row" (Ad 04 family)

Use when the headline calls out a list of tools the prospect should stop using.

- Layout: centered headline above, stacked column of wide chips below (all logos are wordmarks in this family).
- Chip size: 260 × 86, border-radius 18, soft shadow, `#fff` (light) or `#f5f2ea` (dark).
- Logo rendering: grayscale + 60% opacity, 82% width × 62% height.
- Strikethrough: single diagonal `<line>` bottom-left → top-right, stroke width 5, round caps, color = accent (`#ED0D51`).
- Headline: Big Shoulders 44px, weight 600, letter-spacing -0.8px, last phrase in accent color.
- Variants: cream (`#efece4` bg, `#14120c` fg) + deep navy (`#0e1a1f` bg, `#efece4` fg).
- Reference: `ads/ad04_05.jsx` → `Ad04_Strike`.

### Template B — "Face-off" (Ad 05 family)

Use when the headline is a direct comparison between two tool stacks.

- Layout: two equal columns separated by a vertical hairline divider with a "VS" label at its midpoint.
- Per column: eyebrow label (Manrope 11px, weight 700, tracking 2px, uppercase), big headline (Big Shoulders 40px weight 700, 0.98 line-height), 2-column grid of logo chips below.
- Chip size: 110 × 110, border-radius 18, soft shadow.
- Losing side: chips at 55% opacity + grayscale, eyebrow color = muted slate, headline color = muted slate.
- Winning side: full color chips, accent-colored eyebrow (`#ED0D51`), full-strength headline.
- Variants: cream + deep navy (same bg/fg as Template A).
- Reference: `ads/ad04_05.jsx` → `Ad05_FaceOff`.

### Template C — "Face-off with VS stamp" (Ad 05b family)

Variant of Template B where the center divider is replaced with a big rubber-stamp VS.

- Same column structure as Template B, but:
  - Logo grid collapses to a **single stacked column per side** (not 2×2) so the stamp lands in an empty vertical channel between columns.
  - Chip size drops to 82 × 82, gap 10, border-radius 14.
  - Column eyebrow 10px, headline Big Shoulders 36px weight 700.
- VS stamp: absolutely centered, `translate(-50%,-50%) rotate(-7deg)`.
  - Frame: 5px solid border + 2px outline (outline-offset 3), border-radius 8, padding `2px 22px 8px`, background = ad bg (so stamp cuts cleanly out of canvas).
  - Type: Big Shoulders 900, 124px, line-height .85, letter-spacing -3, color = accent (`#ED0D51`).
  - Drop-shadow filter `0 6px 18px rgba(0,0,0,.22)` on the outer wrapper for lift.
- Variants: cream + deep navy (same as A/B).
- Reference: `ads/ad05b.jsx` → `Ad05b_FaceOffStamp`.

### Template D — "Duel" (1-on-1 hero)

Use for direct one-tool-vs-one-tool comparisons where each side is a single hero logo, not a list. Do NOT use this for 2+ tools per side — reach for Template B or C instead.

- Layout: two equal columns + rotated rubber-stamp VS (50% scale) between them.
- Per column: eyebrow (Manrope 12px, weight 700, tracking 2.2px, uppercase), optional tagline for a big stat (Big Shoulders 68px weight 700, above the logo), hero logo chip.
- Chip: 190 × 190 rounded 26, soft shadow. Icon 70% × 70% or wordmark 88% × 52% (same sizing rule as other templates).
- Losing side: chip at 55% opacity + grayscale, eyebrow/tagline in muted slate.
- Winning side: full-color chip, accent-colored eyebrow (`#ED0D51`).
- VS stamp: same primitive as Template C but rendered at `scale={0.5}` so it floats instead of dominating.
- Variants: cream + deep navy.
- Reference: `ads/templates/DuelAd.jsx` → `DuelAd`. Data lives in `ads/ad-data.js` (e.g. `AD_13_MAPS_VS_CONSULTI`).

### Template E — "Terminal" (headline + Claude Code screenshot)

Use when the idea frames the product as "AI does it in one command." Pairs a Big Shoulders headline on top with a dark TerminalWindow screenshot below showing a Claude Code session (tool uses + output). Never use this for ideas where a static headline alone would suffice — reach for Template A (Editorial) instead.

- Layout: variant-colored ad bg; eyebrow + big headline (Big Shoulders 46px, weight 600, letter-spacing -0.8) in the top ~40%; embedded `<TerminalWindow />` below with rounded 10px corners, subtle border, and soft shadow.
- Headline block supports an optional `eyebrow` (Manrope 12px, 700, tracking 2.2px, uppercase, accent color) and optional `accentPhrase` (colored portion of the headline).
- Embedded terminal always uses `variant="dark"` for maximum visual contrast against cream/navy ad bg.
- Project name/branch/tab/dir should match the offer being promoted (Consulti ads → Consulti folder, AIA ads → AIA folder, LG ads → cold-email folder).
- Variants: cream + deep navy (outer ad bg).
- Reference: `ads/templates/TerminalAd.jsx` → `TerminalAd`. Terminal content lives in a separate `TW_{id}` data object (e.g. `TW_15_CONSULTI_MCP`) that `TerminalAd` references via its `terminal` prop.

### Template E-primitive — "TerminalWindow" (Claude Code editor screenshot)

Primitive (not an ad by itself — use inside Template E). Renders the full Claude Code UI as it appears inside a Zed/Cursor-style editor.

- Window chrome: macOS traffic lights (red/yellow/green) + centered project name + `main` branch + right-side Jay avatar circle.
- Tab bar: tab with file icon + project-name-dash-bash-path + close button + `+` button + 3 right-side window controls.
- Content: permissions bar (`▸▸ bypass permissions on (shift+tab to cycle)` + `◉ xhigh · /effort`) + large CC mascot (pixel-art terracotta sticker from `assets/tool-logos/claude-code-mascot.png`) + identity block ("Claude Code v2.1.117" / "Opus 4.7 (1M context) · Claude Max" / working dir path) + `✳` task label + stream of tool-use blocks (bullet `●` + bold tool name + muted args in parens + indented `└` output lines + optional "…+N lines (ctrl+o to expand)") + completion bullet + optional empty `>` input box at bottom.
- Status footer: `[OMC#4.9.3] | 5h:71%(0h13m) · wk:34%(1d2h) · ctx:22%` session stats + `▸▸ bypass permissions on` persistent permission line.
- All type is monospace (SF Mono / Menlo / Consolas).
- Variants: `dark` (black bg, near-black terminal, light text) + `light` (white bg, white terminal, dark text). Dark is the default when embedded in TerminalAd.
- Reference: `ads/templates/TerminalWindow.jsx` → `TerminalWindow`.

### Template F — "Step List" (bubble-card workflow)

Use for 2–5 step workflow / install / N-step ads. Each step is a rounded card with a logo or icon chip on the left and a short title on the right. No numbers — the icon IS the visual anchor.

- Layout: eyebrow + big Big Shoulders headline (40px default) in the top ~30%; flex-centered list of 2–5 bubble cards below.
- Bubble: rounded 18px card with subtle border and soft shadow. Padding 14/18px. Contains:
  - Chip: 52 × 52, rounded 13, cream-tinted background (`#f5f2ea` on light, `#efece4` on dark), holds either a brand logo (from `LOGO_CATALOG`) or a built-in SVG icon (see library below). Logo sizing follows the locked rule: icons 68% × 68%, wordmarks 84% × 54%.
  - Title: Manrope 19px, weight 600, line-height 1.25, letter-spacing -0.2. Optional detail line in muted 14px.
- Chip strongly prefers `kind: 'icon'` logos for the small square. Wordmarks look squished — if the brand only has a wordmark, source an icon version (see Consulti / Instantly for examples).
- Built-in SVG icons (pink accent): `check`, `shield-check`, `message`, `calendar`, `bolt`, `download`, `users`, `search`, `rocket`.
- Variants: cream (white bubbles on cream bg) + navy (darker bubbles on deep navy bg).
- Reference: `ads/templates/StepListAd.jsx` → `StepListAd`. Data: `AD_16_CONSULTI_LEADS_WORKFLOW`.

### Template G — "Screenshot" (headline + real product screenshot)

Use for ideas that call out a specific software feature worth showing off. **Template renders a "SCREENSHOT NEEDED" placeholder with capture instructions when `screenshotSrc` is missing — never a fake mock UI.** Real screenshots only.

- Layout: eyebrow + Big Shoulders headline (36px default) in the top ~38%; hero screenshot frame below with rounded 10px corners, subtle border, soft drop shadow.
- Headline supports `accentPhrase` (colors a sub-phrase in `#ED0D51`) and an optional `caption` body line in muted fg.
- Screenshot: `screenshotSrc` path (relative to `design/meta-ads/`), rendered at `object-fit: cover`. Target directory: `design/meta-ads/assets/screenshots/`. Drop real PNGs there, then set `screenshotSrc: 'assets/screenshots/your-capture.png'`.
- Placeholder (when `screenshotSrc` missing): "SCREENSHOT NEEDED" eyebrow in pink, big "Drop real product screenshot here." label, plus a `screenshotNote` body line describing what to capture.
- Variants: cream + deep navy (outer ad bg).
- Reference: `ads/templates/ScreenshotAd.jsx` → `ScreenshotAd`. Data: `AD_17_CONSULTI_VERIFIED_DATE`.

### Fake-UI rule

**NEVER render fake dashboards, mock tables, or fabricated product UIs in ad creatives.** When an ad concept needs a product screenshot:
1. Use a real screenshot captured from our actual software (Consulti, Instantly.AI, Highlevel, etc.), OR
2. Surface the gap to Jay with: target file path, what the screenshot should show, what to highlight.

Fake UI in ads mislead prospects and weaken trust in the brand. This rule applies to every platform (Meta, carousels, thumbnails, etc.) — anywhere a product UI would appear must be real.
