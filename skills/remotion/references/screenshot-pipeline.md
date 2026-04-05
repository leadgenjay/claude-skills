# Screenshot B-Roll Pipeline

Recipe for capturing web page screenshots as deterministic, text-legible B-roll for Remotion video overlays. Screenshots replace AI-generated B-roll which cannot render text reliably.

---

## Why Screenshots

| Concern | AI-Generated B-Roll | Screenshot B-Roll |
|---------|--------------------|--------------------|
| Text legibility | Garbled, hallucinated | Pixel-perfect |
| Cost | $0.05-0.50/image | Free |
| Determinism | Stochastic | Identical every run |
| Brand accuracy | Approximate | Exact (real product) |
| Speed | 5-30s per image | 1-2s per page |

**Rule:** If the B-roll needs readable text (dashboards, code editors, product UIs, pricing pages), always use screenshots.

---

## Viewport Setup

```
Width: 540px (mobile)
Height: 960px (mobile)
Device pixel ratio: 2x
Output: 1080x1920px (matches 9:16 vertical video)
```

The 2x DPR ensures crisp text at video resolution. The mobile viewport captures a mobile-optimized layout that fills the vertical frame naturally.

---

## Capture Workflow

### 1. Launch Browser

Headless Chromium via Playwright. One browser instance, separate context per URL batch.

```
Launch: headless Chromium
Context: fresh per batch (isolates cookies/state)
```

### 2. Set Viewport + Dark Mode

```
Viewport: 540x960 at 2x DPR
Color scheme: dark (preferred for video overlays on dark backgrounds)
```

Dark mode screenshots integrate better with the warm linen (`#EEEAE4`) or dark video backgrounds. Override with light mode if the target site only has a light theme.

### 3. Navigate

```
URL: target page
Wait: 'networkidle' (all requests settled)
Extra wait: 2 seconds (for lazy-loaded content, animations, font loading)
```

### 4. Remove Overlays

Fixed/sticky elements (navbars, cookie banners, chat widgets) obscure content. Remove them before capture:

**Strategy:** Query all elements with `position: fixed` or `position: sticky` that are taller than 50px, then set `display: none`.

**Common selectors to target:**
- `[class*="cookie"]`, `[class*="consent"]`, `[class*="banner"]`
- `[class*="popup"]`, `[class*="modal"]`, `[class*="overlay"]`
- `[class*="chat"]`, `[class*="widget"]`, `[class*="intercom"]`
- `[id*="cookie"]`, `[id*="consent"]`, `[id*="banner"]`

### 5. Screenshot

```
Type: viewport screenshot (not full page)
Format: PNG (lossless, best for text)
Output: public/ directory (accessible via staticFile())
```

### 6. Filename Convention

Sanitize the URL into a filename:

```
https://stripe.com/pricing → stripe-com-pricing.png
https://github.com/features → github-com-features.png
```

---

## Integration with Remotion

### File Placement

Save screenshots to the Remotion project's `public/` directory:

```
public/screenshots/stripe-com-pricing.png
public/screenshots/github-com-features.png
```

### Reference in Components

```tsx
import { Img, staticFile } from 'remotion';

<Img
  src={staticFile('screenshots/stripe-com-pricing.png')}
  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
/>
```

### Presentation via BrollOverlay or GraphicsPanel

Screenshots render in the split-mode panel (top 720px) or as full-content overlays. The `GraphicsPanel` component handles display mode switching automatically when a segment has a `screenshotPlaceholder` field.

For the screenshare composition, use `BRollOverlay` with fade-in/fade-out.

---

## Batch Pattern

For capturing multiple pages:

```
1. Launch single browser instance
2. Create fresh context
3. For each URL:
   a. Create new page
   b. Set viewport + dark mode
   c. Navigate (networkidle + 2s wait)
   d. Remove overlays
   e. Screenshot to public/screenshots/{sanitized-name}.png
   f. Close page
4. Close context + browser
```

Use a separate browser context per batch to avoid cookie/state leakage between sites.

---

## Troubleshooting

### SPA Rendering Delays
Some SPAs render content after `networkidle`. Increase the extra wait to 3-5 seconds, or wait for a specific selector to appear before screenshotting.

### Headless Detection
Some sites block headless browsers. Use a realistic user-agent string and `--disable-blink-features=AutomationControlled` launch flag.

### Consent Walls
GDPR consent walls may block content. The overlay removal step handles most banners. For stubborn walls, inject a click on the "Accept" button before screenshotting.

### Auth-Required Pages
For logged-in content (dashboards, admin panels), save cookies/localStorage to a file and load them into the browser context before navigation. Never hardcode credentials in scripts.

### Dark Mode Not Available
If a site doesn't support `prefers-color-scheme: dark`, the screenshot will be light-themed. This is fine — the `BrollOverlay` handles presentation styling. Light screenshots on dark video backgrounds create a natural "device screen" look.
