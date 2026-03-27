---
name: mobile-test
description: Test landing pages on mobile devices using Playwright WebKit (Safari engine). This skill should be used when testing landing pages on mobile devices, verifying Safari rendering, checking responsive layouts, or debugging iOS-specific CSS bugs. NEVER use Chrome MCP tools for mobile testing.
---

# Mobile Device Testing

Test landing pages on real mobile device viewports using Playwright's WebKit (Safari engine) and Chromium (Android). **NEVER use Chrome MCP browser tools (mcp__claude-in-chrome__*) for mobile testing** — they cannot emulate mobile Safari and lack touch simulation, proper user agents, and device pixel ratios.

## CRITICAL: Use Playwright, Not Chrome

| Approach | Use? | Why |
|----------|------|-----|
| **Playwright WebKit** | YES | Real Safari rendering engine, proper device emulation, touch simulation |
| **Chrome MCP tools** | NO | Cannot run WebKit, no real mobile emulation, just resizes a desktop browser |

All mobile testing MUST use the Playwright script or inline Playwright Node.js code. Never open Chrome for mobile tests.

## Command

```
/mobile-test <url> [device|--all]
```

## Quick Start — Screenshots

```bash
# Default: iPhone 15 (webkit)
npx tsx scripts/mobile-test.ts https://leadgenjay.com/consult

# Specific device
npx tsx scripts/mobile-test.ts https://leadgenjay.com/consult "iPhone 15 Pro Max"

# All 7 devices (webkit + chromium)
npx tsx scripts/mobile-test.ts https://leadgenjay.com/consult --all

# Landscape orientation
npx tsx scripts/mobile-test.ts https://leadgenjay.com/consult "iPad Pro 11" --landscape

# List available devices
npx tsx scripts/mobile-test.ts --list
```

Screenshots save to `.playwright-cli/` and auto-open in Preview.

## Interactive Testing (scroll, tap, type)

For interactive mobile tests (form filling, scrolling, tapping), write inline Playwright scripts:

```javascript
// Run via: node -e "..." in Bash tool
const { webkit, devices } = require('playwright');
(async () => {
  const browser = await webkit.launch({ headless: true });
  const context = await browser.newContext({ ...devices['iPhone 15'] });
  const page = await context.newPage();

  await page.goto('https://leadgenjay.com/consult', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // Touch-scroll (mouse.wheel not supported in mobile WebKit)
  await page.evaluate((px) => window.scrollBy({ top: px, behavior: 'smooth' }), 600);
  await page.waitForTimeout(500);

  // Tap and type into form fields
  const input = page.locator('#consult-form input[placeholder="Full Name"]');
  await input.tap();
  await input.fill('Test User');

  // Screenshot at any point
  await page.screenshot({ path: '.playwright-cli/test-result.png' });

  await browser.close();
})();
```

### Key differences from desktop Playwright:
- Use `page.evaluate(() => window.scrollBy(...))` instead of `mouse.wheel()` (not supported in mobile WebKit)
- Use `.tap()` instead of `.click()` for touch interactions
- Scope form selectors with IDs (e.g., `#consult-form input[...]`) when pages have duplicate forms
- Device presets auto-set: viewport, user agent, deviceScaleFactor, isMobile, hasTouch

## Device Selection

| Device | Viewport | Engine | When to use |
|--------|----------|--------|-------------|
| iPhone SE (3rd gen) | 375x667 | webkit | Smallest modern iPhone — catches overflow/cramping |
| iPhone 12 | 390x664 | webkit | Mid-size baseline |
| **iPhone 15** | 393x659 | webkit | **Default** — most common device |
| iPhone 15 Pro Max | 430x739 | webkit | Largest iPhone — catches wide-layout issues |
| iPad (gen 7) | 810x1080 | webkit | Tablet — catches breakpoint gaps |
| iPad Pro 11 | 834x1194 | webkit | Large tablet |
| Pixel 7 | 412x839 | chromium | Android baseline — catches webkit-vs-chromium diffs |

## When to Use

- **Pre-deploy check**: Run `--all` before shipping landing page changes
- **Safari CSS bug**: Use iPhone 15 (webkit) to verify Safari-specific fixes (flex, overflow, vh)
- **Responsive audit**: Compare iPhone SE vs iPhone 15 Pro Max for layout range
- **Cross-browser**: Compare iPhone 15 (webkit) vs Pixel 7 (chromium) for engine diffs
- **Form testing**: Write inline Playwright script to tap fields, fill forms, verify flow

## What to Check in Screenshots

1. **Whitespace gaps** — Extra space between sections (Safari flex/overflow bugs)
2. **Overflow** — Horizontal scroll or content bleeding off-screen
3. **Text sizing** — Text too small or truncated on smaller viewports
4. **CTA visibility** — Primary button visible without scrolling far
5. **Image sizing** — Images properly constrained, no stretching
6. **Form usability** — Input fields wide enough, labels readable

## Common Safari CSS Bugs

| Bug | Cause | Fix |
|-----|-------|-----|
| Whitespace gap in flex column | `flex-1` in `flex-col` parent | Use `lg:flex-1` (desktop-only) |
| Section height inflation | `overflow-x-hidden` + absolute children | Use `overflow-hidden` instead |
| 100vh too tall | Safari URL bar not subtracted | Use `100dvh` or `min-h-screen` |
| Sticky not working | Parent has `overflow: hidden` | Move sticky element outside overflow container |
| Gap property ignored | Old Safari versions | Add fallback margin |
| `-webkit-` prefix needed | Some transform/animation props | Use Tailwind (auto-prefixes) |

## Integration

- Use **`/mobile-test`** for mobile visual + interactive testing (Playwright WebKit)
- Use **`/test`** for desktop functional browser testing
- Use **`/preview`** for desktop Playwright screenshots
- Use **mobile-ux-auditor** skill for thumb zone / tap target analysis

## Prerequisites

WebKit browser must be installed (one-time):
```bash
npx playwright install webkit
```
