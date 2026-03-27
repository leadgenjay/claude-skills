---
name: test-improve
description: >-
  Iterative visual design review and improvement tool using Playwright screenshots.
  This skill should be used when reviewing a page's visual quality, auditing against
  design guidelines, making improvements, and re-checking until the design meets
  quality standards. Works with any web project — auto-detects brand rules from
  CLAUDE.md and project context.
---

# Test-Improve — Visual Design Review & Auto-Fix Loop

## When to Use

- `/test-improve [url]` — explicit invocation
- "review and improve the design"
- "audit the page design"
- "check design quality and fix issues"
- "test and fix [page-name]"
- After building or modifying a page, before shipping

## Prerequisites

- Playwright installed (`npx playwright install chromium`)
- Dev server running (for local URLs)

---

## Phase 0: Detect Project Context (always runs first)

Before auditing, gather project-specific design rules:

1. **Read CLAUDE.md** — extract brand colors, fonts, icon library, design preferences
2. **Read tailwind.config** (if exists) — extract theme colors, fonts, spacing
3. **Read layout/globals** — detect font imports, CSS variables, base styles
4. **Build a Brand Profile** from what you find:
   ```
   BRAND PROFILE (auto-detected):
   ├─ Heading Font: [detected or "not specified"]
   ├─ Body Font: [detected or "not specified"]
   ├─ Primary Color: [hex]
   ├─ Accent Color(s): [hex values]
   ├─ CTA Color: [hex]
   ├─ Icon Library: [lucide/heroicons/etc.]
   ├─ Design Rules: [from CLAUDE.md — e.g., "no gradients", "no emojis"]
   └─ Component Library: [shadcn/mui/chakra/custom]
   ```

If no brand rules are found, use the generic defaults in the checklist.

---

## Workflow: 4 Phases, Max 3 Iterations

### Phase 1: Capture & Identify (always runs)

1. **Determine target URL** — user-provided or auto-detect from recent work
   - If no URL given, check recently modified files for page routes
   - Support both `localhost` and production URLs

2. **Identify page source files** — find all files to audit:
   - Page entry point (e.g., `page.tsx`, `index.tsx`, `+page.svelte`)
   - Client component (e.g., `content.tsx`, `client.tsx`)
   - Section/component directory

3. **Run multi-viewport screenshots** using Playwright:
   - Check for project screenshot script first (e.g., `scripts/screenshot-viewports.ts`)
   - Fallback: use Playwright CLI directly for 3 viewports:
     ```bash
     # Desktop (1440px)
     npx playwright screenshot --viewport-size="1440,900" --full-page <url> /tmp/test-improve-desktop.png
     # Tablet (768px)
     npx playwright screenshot --viewport-size="768,1024" --full-page <url> /tmp/test-improve-tablet.png
     # Mobile (393px)
     npx playwright screenshot --viewport-size="393,852" --full-page <url> /tmp/test-improve-mobile.png
     ```

4. **Read all screenshots visually** — use the Read tool on each PNG file

5. **Read all component source files** — understand current implementation

### Phase 2: Audit (runs each iteration)

Load `references/design-checklist.md` and evaluate the page against every applicable check. **Adapt checks to the Brand Profile** detected in Phase 0 — substitute project-specific fonts, colors, and rules for the generic defaults.

#### Audit Categories & Weights

| Category | Weight | Focus |
|----------|--------|-------|
| **Brand Compliance** | 20% | Fonts, colors, design rules from CLAUDE.md, icon library, logo |
| **Anti-Slop** | 20% | AI cliches, equal-width grids, generic shadows, symmetric padding |
| **Motion Quality** | 15% | Tap feedback, spring transitions, stagger timing, scroll reveals |
| **Layout & Spacing** | 15% | Section padding rhythm, responsive breakpoints, whitespace |
| **Conversion** | 15% | CTA above fold, value prop, social proof, objection handling |
| **Visual Quality** | 15% | Tinted shadows, card hover lifts, border radius, text hierarchy |

#### Audit Output Format

For each issue found, record:

```
[SEVERITY] Category — Issue Title
  File: path/to/component.tsx:42
  What: Description of what's wrong
  Fix: Specific code change to resolve
```

Severity levels:
- **Critical** — Brand violation, broken layout, missing CTA, accessibility failure
- **Important** — Anti-slop pattern, missing motion, weak conversion element
- **Minor** — Spacing inconsistency, optimization opportunity, polish detail

### Phase 3: Fix (runs each iteration)

1. **Present findings to user** — grouped by severity:
   ```
   ══════════════════════════════════════
     AUDIT FINDINGS — Iteration N
   ══════════════════════════════════════

   CRITICAL (X issues)
   ├─ [issue description + file]
   └─ [issue description + file]

   IMPORTANT (X issues)
   ├─ [issue description + file]
   └─ [issue description + file]

   MINOR (X issues)
   ├─ [issue description + file]
   └─ [issue description + file]
   ```

2. **Apply fixes** — make all approved changes to source files

3. **Re-capture screenshots** using the same method from Phase 1

4. **Read new screenshots** to visually verify fixes resolved the issues

### Phase 4: Re-audit & Loop (max 3 iterations)

1. Re-run Phase 2 checklist on updated code + new screenshots
2. If new Critical or Important issues found → back to Phase 3
3. If clean (no Critical or Important remaining) → Phase 5
4. If max iterations (3) reached → Phase 5 with remaining issues noted

### Phase 5: Final Report

```
═══════════════════════════════════════════
  TEST-IMPROVE REPORT: /page-name
═══════════════════════════════════════════

  Iterations: N
  Issues Found: X
  Issues Fixed: Y
  Remaining: Z (severity breakdown)

  CHANGES MADE:
  ├─ brand-compliance: N fixes
  ├─ anti-slop: N fixes
  ├─ motion-quality: N fixes
  ├─ layout-spacing: N fixes
  ├─ conversion: N fixes
  └─ visual-quality: N fixes

  FILES MODIFIED:
  ├─ path/to/component-a.tsx
  ├─ path/to/component-b.tsx
  └─ path/to/page.tsx

  SCREENSHOTS: [screenshot directory]
═══════════════════════════════════════════
```

---

## Reference Files

| File | Load When |
|------|-----------|
| `references/design-checklist.md` | Every audit run — the master checklist |

Load the checklist at the start of Phase 2. It contains all checks organized by category with pass/fail criteria and specific fix instructions. **Substitute project brand values** from the Brand Profile for any generic defaults.

---

## Integration with Other Skills

If these skills are available in the project, test-improve draws criteria from them:

| Skill | What test-improve borrows |
|-------|--------------------------|
| `taste` | Anti-slop patterns, brand lock rules, tinted shadows, spring physics |
| `design-motion-principles` | whileTap checks, stagger timing, scroll reveal consistency |
| `landing-page-auditor` | Above-fold checks, CTA placement, social proof visibility |
| `frontend-design` | Typography hierarchy, distinctive layout, background variety |

If deeper analysis is needed in any category, invoke the specialized skill directly (if available).

---

## Constraints

- Works with any local or production URL
- Screenshots use Playwright (not Chrome MCP tools)
- Max 3 iterations prevents infinite loops on subjective preferences
- Phase 3 fixes require user approval before applying
- Don't audit files you haven't read — always read source before reporting issues
- Don't report issues below 80% confidence
- Adapt all brand checks to the detected project context — never assume a specific brand
