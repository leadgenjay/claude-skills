---
name: meta-ads
description: Generate Instagram/Meta feed ad creatives (600x600 and 1080x1350 PNGs) in the locked Lead Gen Jay Meta Ads design style. Uses the vendored design bundle at design/meta-ads/ + scripts/render-meta-ad.mjs. Template library: hand-drawn digital-document (Apple Notes/Google Docs), editorial minimalist, strike-row logo comparison, tool face-off, face-off with rubber-stamp VS, 1-on-1 duel, repetition hook, Claude Code terminal screenshot + terminal-screenshot ad, bubble step-list, and screenshot-with-headline. New ads are a one-line `<TemplateAd data={...} variant="..." />` call — no new component file per ad. Use this skill when the user says "meta ad", "new meta ad", "new ad concept", "ad for headline", "add a meta ad", "render a meta ad", "face-off ad", "strike row ad", "apple notes ad", "terminal ad", "step list ad", "screenshot ad", "cold email ad creative", "ad design in meta ads style", or pulls a headline from LGJ Ad Ideas.
---

## Source of truth

- **Design rules:** `design/meta-ads/CLAUDE.md` — read this first, every time, before adding an ad. It supersedes anything below if they conflict.
- **Headlines:** `design/meta-ads/uploads/LGJ Ad Ideas.md` — 200+ numbered entries. Pull verbatim, never paraphrase. Mirrored to Obsidian KB at `Content/lgj-ad-ideas-corpus.md` (query via `kb-get` with tags `#ad-copy #lgj-voice #meta-ads #ideas-corpus`).
- **Template library:** `design/meta-ads/ads/templates/*.jsx` + `_primitives.jsx` + `_tokens.js` + `_logos.js`. Data lives in `design/meta-ads/ads/ad-data.js`. Treat `design-canvas.jsx` as vendored — do not edit.

## Trigger

Any of: "meta ad", "new meta ad concept", "render a meta ad", "ad for headline N", "cold email ad", "face-off ad", "strike row ad", "apple notes ad", "add a meta ad", "make a new ad in Meta Ads style".

## Locked templates (reuse, do not redesign)

| Template | Use when the headline shape is | Variants |
|---|---|---|
| **`HandDrawnAd`** (Apple Notes / Google Docs) | A single punchy question/hook with one emphasis word that deserves a highlighter swipe. 600×600. | `style`: `notes` \| `docs` |
| **`RepetitionAd`** (IG 4:5 portrait) | "The playbook for X / for Y / for Z / for W" — lines repeat with one variable. 1080×1350 only. | `variant`: `dark` \| `light` |
| **`EditorialAd`** | Short question hook, heavy whitespace. One sentence, two lines max. 600×600. | `variant`: `cream` \| `navy` |
| **`StrikeAd`** (diagonal strikethrough on wordmark chips) | "If you are still using X, Y, Z…" — calls out tools to stop using. 600×600. | `variant`: `cream` \| `navy` |
| **`FaceOffAd`** (VS hairline divider) | "Old stack vs new stack" comparison, subtle. 600×600. | `variant`: `cream` \| `navy` |
| **`FaceOffStampAd`** (big rotated rubber-stamp VS) | Same comparison, louder. More dramatic headlines. 600×600. | `variant`: `cream` \| `navy` |
| **`DuelAd`** (1-on-1 hero face-off with smaller rotated VS stamp) | Direct one-tool-vs-one-tool comparison where each side should be a single hero logo, not a list. 600×600. | `variant`: `cream` \| `navy` |
| **`TerminalAd`** (big headline + embedded Claude Code screenshot) | Any idea where "AI does the work in one command" is the hook. Pairs a Big Shoulders headline with a dark TerminalWindow screenshot. 600×600. | `variant`: `cream` \| `navy` |
| **`TerminalWindow`** (primitive — Claude Code editor screenshot) | Standalone use only. Renders the full Claude Code UI (window chrome + tab bar + CC identity + tool-use stream + status footer). Embedded inside `TerminalAd`. 600×600 or any size. | `variant`: `dark` \| `light` |
| **`StepListAd`** (bubble-card numbered steps with logo/icon chips) | 2–5 step workflow or install guide. Each step is a rounded card with a brand logo OR built-in icon chip (shield-check, message, calendar, rocket, etc.) + title. No numerals — the icon IS the anchor. 600×600. | `variant`: `cream` \| `navy` |
| **`ScreenshotAd`** (big headline + hero screenshot) | Idea that calls out a specific software feature — needs a REAL screenshot of our software (no mocks). Template renders a "SCREENSHOT NEEDED" placeholder with capture instructions if `screenshotSrc` missing. 600×600. | `variant`: `cream` \| `navy` |

**NEVER render fake dashboards / mock UIs** in ad creatives. Real product screenshots only, or surface the asset gap (capture spec + target file path) to Jay. This rule applies to `ScreenshotAd` and anywhere else a product UI would appear.

**One ad at a time.** No speculative batches across concepts. For a single concept that's the same template in multiple colors (cream + navy, dark + light), render BOTH variants in one pass and present them together — Jay reviews the pair side-by-side. For HandDrawnAd (different chromes per style), keep variants strict — render one, stop, approve, render next.

## Workflow — add a new ad

### 1. Pick the headline

Open `design/meta-ads/uploads/LGJ Ad Ideas.md`, copy the exact line (with line number). Do not paraphrase. Banned words (no gradients, no "delve / leverage / unlock / game-changer / unleash / harness / elevate / utilize / seamless / vibrant / ever-evolving / cutting-edge / robust / transformative / pivotal / compelling / groundbreaking / embark / navigate / facilitate / synergy") apply to anything Claude invents around the headline — eyebrows, footers, CTA stripes.

### 2. Pick the template

Match headline shape to the table above. If ambiguous, ask Jay which of two candidates fits. Never invent a new template unless Jay says the locked six aren't a fit.

### 3. Write a data object

Each template takes a `data` prop. Add a named export to `design/meta-ads/ads/ad-data.js` (preferred) or write it inline in the HTML. Data shapes:

```js
// StrikeAd
{ headline: 'Multi-line\nheadline.',
  accentPhrase: 'final phrase.',   // optional — colors in variant accent
  logos: ['instantly', 'apollo', 'gohighlevel'] }

// FaceOffAd / FaceOffStampAd
{ left:  { eyebrow: 'COLD EMAIL 1.0', title: 'The old\nstack.', tools: ['instantly','apollo','clay','google'] },
  right: { eyebrow: 'COLD EMAIL 2.0', title: 'The new\nstack.', tools: ['emailbison','consulti','claude'] } }

// DuelAd — 1-on-1 hero (single tool per side). Optional `tagline` renders a big stat above the logo.
{ left:  { eyebrow: 'Old way', tool: 'google',   tagline: '18%' },
  right: { eyebrow: 'New way', tool: 'consulti', tagline: '92%' } }

// EditorialAd
{ headline: 'Is your reply rate\nstill under 2%?', size: 54 }

// RepetitionAd (IG portrait only)
{ lines: [ { a: 'First part', b: 'IT & Cybersecurity.' }, { a: 'First part', b: 'Marketing & PR.' }, ... ],
  tail: 'We wrote all of them.' }

// HandDrawnAd
{ lead: 'Is no one', keyword: 'replying', trail: 'to your cold emails?', hlColor: '#ffe66b' }
// docs style also accepts { docTitle, docsList } — top-bar title + 3 numbered reasons.

// TerminalAd (ad concept — headline + embedded terminal screenshot)
{ eyebrow: 'CONSULTI MCP',
  headline: '100 verified leads.\nOne command.',
  accentPhrase: 'One command.',
  terminal: TW_15_CONSULTI_MCP }   // TerminalWindow data object

// TerminalWindow (primitive — raw Claude Code editor screenshot)
{ project: 'Consulti', branch: 'main',
  tab: 'Consulti — bash /Users/jayfeldman/.c...',
  dir: '~/…/Studio Apps/Consulti',
  section: 'Claude use Consulti MCP and scrape 100 new leads',
  items: [
    { kind: 'tool', tool: 'Bash',
      args: 'consulti mcp scrape --niche local --count 100',
      output: ['Connected to Consulti MCP server', 'Scraping 100/100 · done.'] },
    { kind: 'bullet', text: 'Done — 100 verified leads. Ready to launch.' },
  ],
  stats: '5h:71%(0h13m) · wk:34%(1d2h) · ctx:22%',
  permission: 'bypass permissions on' }

// StepListAd (bubble cards with logo/icon chips, no numbers)
{ eyebrow: 'CONSULTI MCP',
  headline: 'Manage your entire\nlead list from your\nAI terminal.',
  steps: [
    { title: 'Scrape 100 leads from Consulti MCP',     logo: 'consulti-icon' },
    { title: 'Verify emails with catch-all detection',  icon: 'shield-check' },
    { title: 'Push to Instantly.AI campaign',           logo: 'instantly-icon' },
    { title: 'Track replies and book qualified calls',  icon: 'message' },
  ] }
// Built-in icons: check, shield-check, message, calendar, bolt, download, users, search, rocket.
// Prefer icon-form logos (key suffix "-icon") for the small square chip — wordmarks look squished.

// ScreenshotAd (real screenshot required — never mock UIs)
{ eyebrow: 'CONSULTI',
  headline: 'A lead database\nthat shows the last date\nan email was verified.',
  accentPhrase: 'last date\nan email was verified.',
  screenshotSrc: 'assets/screenshots/consulti-leads-verified.png',  // REQUIRED real screenshot
  screenshotNote: 'Capture Consulti leads page with Owner/Email/Last Verified columns visible.' }
// If screenshotSrc missing, template renders a "SCREENSHOT NEEDED" placeholder
// with the note text. NEVER fall back to a fake mock UI.
```

**Logo catalog** — data objects reference logos by key. Available keys in `design/meta-ads/ads/templates/_logos.js`:

```
apify · apollo · clay · claude · consulti · consulti-icon · emailbison ·
gohighlevel · google · gsuite · instantly · instantly-icon · n8n · smartlead
```

To add a new logo: drop the file into `assets/tool-logos/` then add an entry to `LOGO_CATALOG` with `kind: 'icon'` or `kind: 'wordmark'`. `icon` renders 70%×70% of chip; `wordmark` renders 88%×52%. For templates with small square chips (StepListAd bubbles, TerminalAd avatar area), always use the `-icon` variant of a logo — wordmarks don't fit in tight squares.

### 4. Register a `<DCSection>`

Append to `design/meta-ads/Meta Ads.html` inside the root `<DesignCanvas>`. Give the section a stable `id` (`concept-6`, `concept-7`, …) and each artboard a stable slot `id`. **2 variants** for every template: cream + navy for the non-hand-drawn ones, notes + docs for HandDrawnAd.

New ads are a one-liner — no new component file:

```jsx
<DCSection id="concept-6" title="Editorial · Google Maps" subtitle='Headline verbatim from ideas · 600 × 600'>
  <DCArtboard id="cream" label="V1 · Cream" width={600} height={600}>
    <EditorialAd data={{ headline: 'Unlimited leads from\nGoogle Maps for free.' }} variant="cream" />
  </DCArtboard>
  <DCArtboard id="navy" label="V2 · Deep navy" width={600} height={600}>
    <EditorialAd data={{ headline: 'Unlimited leads from\nGoogle Maps for free.' }} variant="navy" />
  </DCArtboard>
</DCSection>
```

Prefer named data objects in `ads/ad-data.js` when the same data will be used across variants (e.g. `AD_05_COLD_EMAIL_VS` is consumed by both the hairline face-off and the stamp face-off). Inline data is fine for one-off demos.

### 5. Render & review

```bash
node scripts/render-meta-ad.mjs --id concept-6/cream --open --sync
```

- `--id <sectionId>/<slotId>` renders one artboard
- `--all` renders every artboard in the canvas (use after multiple additions)
- `--open` opens the written PNGs in Preview.app (arrow-key navigation)
- `--sync` mirrors `output/meta-ads/` → `~/Nextcloud/Meta Ads/` via rsync (iPad/phone review)

Output lands at `output/meta-ads/<sectionId>-<slotId>.png` at exact Meta Ads Manager size (1200×1200 for 600×600 artboards, 1080×1350 for RepetitionAd). No cropping needed.

### 6. Verify the creative

After each render, check:
- **No arrows** anywhere (SVG, hand-drawn, ASCII ↓↑→← — any of them). Highlighter only.
- **No red circles** for emphasis. Highlighter or weight/scale contrast only.
- **No platform chrome** (no fake IG header, "Ad" label, "Learn more ›" footer, follow button).
- **Headline verbatim** from ideas list.
- **Words don't overlap** graphic elements.
- **Dark + light + bold + light variants** covered across the family.
- **Logos:** icons render at 70% × 70% of chip, wordmarks at 88% × 52%. Chip bg `#fff` for cream variants, `#f5f2ea` for navy variants. Never color-clash a logo against its chip.
- **Hand-drawn = digital documents** (Apple Notes, Google Docs). Not paper notebooks.

If any fail, edit the template or data (prefer data), re-render just that id, re-check. Iterate until Jay approves.

## Primitives (for editing templates themselves — not for new ads)

All primitives live in `design/meta-ads/ads/templates/_primitives.jsx`. Reuse them if you're adding a new template or touching an existing one:

| Primitive | Takes |
|---|---|
| `Highlight` — marker swipe behind text | `{ children, color, opacity, angle }` |
| `HandHead` — hand-drawn headline block | `{ children, size, color, weight, font }` |
| `EditorialCard` — cream/navy minimalist card | `{ bg, fg, headline, size }` |
| `CrossedLogo` — wordmark chip with strikethrough | `{ src, alt, strikeColor, bg, width, height }` |
| `FaceOffLogo` — icon/wordmark chip for face-off grid | `{ src, alt, kind: 'icon'|'wordmark', chipBg, chipFg, dim }` |
| `FaceOffLogoB` — smaller chip for face-off-stamp | `{ src, alt, kind, chipBg, chipFg, dim, size }` |
| `VSStamp` — big rotated rubber-stamp VS | `{ color, bg }` |
| `RepetitionBlock` — 4-line repetition with tail | `{ accent, muted, lines, tail }` |

Register new top-level components via `Object.assign(window, { MyComponent })` — the HTML entry relies on globals.

## Brand tokens

Defined in `design/meta-ads/ads/templates/_tokens.js` as `VARIANTS`:

```
cream:  bg #efece4  fg #14120c  chipBg #fff     leftAccent #9b9689  rightAccent #ED0D51
navy:   bg #0e1a1f  fg #efece4  chipBg #f5f2ea  leftAccent #6f7a80  rightAccent #ED0D51
dark:   bg #000     fg #fff     muted #BDBDBD   accent #ED0D51          (RepetitionAd, TerminalWindow dark)
light:  bg #fff     fg #1a1a1a  muted #1a1a1a   accent #ED0D51          (RepetitionAd, TerminalWindow light)
```

Accent is locked at LGJ Razzmatazz pink `#ED0D51` across every variant. The previous `#E8142B` red was superseded in April 2026 — any lingering reference is stale.

From `design/meta-ads/assets/colors_and_type.css`:
```
--lgj-pink:  #ED0D51   (primary CTA, hand-drawn highlighter accent)
--lgj-blue:  #0144F8
--lgj-navy:  #162551
```

Big Shoulders (heads, 600/700/900) + Manrope (body, 400-800) + hand-drawn stack (Kalam, Shadows Into Light, Caveat) loaded on first paint by `_primitives.jsx`.

## Critical files (do NOT modify)

- `design/meta-ads/design-canvas.jsx` — canvas engine
- `design/meta-ads/CLAUDE.md` — design rules (source of truth)
- `design/meta-ads/Meta Ads.html` script-tag block — order is load-sensitive (tokens → logos → primitives → templates → data → wrappers). Append new `<DCSection>` blocks inside `<DesignCanvas>`; do not reorder script tags.

## Feedback loop

Jay reviews PNGs in Preview.app (auto-opened by `--open`) or on his phone/iPad via Nextcloud (synced by `--sync`). He refers to ads by filename: e.g. "`concept-4-strike-dark` — headline too low", "`concept-5b-faceoff-stamp-light` — stamp too close to right column". To fix, edit the data object in `ad-data.js` (or the template in `ads/templates/` if the layout itself needs changing), re-render just that one id (`--id concept-4/strike-dark`), the Nextcloud mirror updates automatically on the next `--sync`.
