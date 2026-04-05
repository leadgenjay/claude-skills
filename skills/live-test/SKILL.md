---
name: live-test
description: >
  Live browser testing for web applications using Playwright CLI.
  Covers visual review, functional testing, console/network debugging,
  auto-fix UI issues, and responsive testing at 3 breakpoints.
triggers:
  - "test this page"
  - "check the UI"
  - "test responsive"
  - "run a live test"
  - "test localhost"
  - "browser test"
  - "visual review"
  - "test my app"
  - "functional test"
  - "live test"
  - "test the page"
  - "test the site"
  - "check responsive"
  - "visual test"
tags:
  - testing
  - browser
  - playwright
  - responsive
  - visual
  - ui
  - live
matching: fuzzy
---

# Live Test - Web Application Testing

## How It Works
Playwright CLI runs via Bash commands. Snapshots save to .playwright-cli/ as
compact YAML files. Screenshots save as PNG. The agent reads only what it
needs — no bloated accessibility trees in context.

## IMPORTANT: Command Sequence
You MUST call `playwright-cli open` before any other command. All commands
operate on the browser opened by `open`. If you get "browser is not open",
run `open` first.

## Cleanup Rule (CRITICAL)
All screenshots and snapshots are temporary artifacts for analysis only.
After the test run completes (end of Phase 8), delete ALL generated files:
```bash
rm -f /tmp/playwright-test-*.png
rm -rf .playwright-cli/
```
Never leave test artifacts on disk. The final report captures all findings
in text — the image files are only needed during analysis.

## Quick Reference
```
# Browser lifecycle
playwright-cli open [url]             launch browser (optionally navigate to url)
playwright-cli open [url] --headed    launch in headed mode (visible window)
playwright-cli close                  close browser

# Navigation
playwright-cli goto <url>             navigate to a url
playwright-cli go-back                go back
playwright-cli go-forward             go forward
playwright-cli reload                 reload page

# Interaction
playwright-cli snapshot               get element refs as YAML
playwright-cli screenshot [ref]       capture current state (or specific element)
playwright-cli click <ref>            click element by ref
playwright-cli fill <ref> <text>      fill input field
playwright-cli type <text>            type text into focused element
playwright-cli select <ref> <val>     select dropdown option
playwright-cli hover <ref>            hover over element
playwright-cli press <key>            press keyboard key
playwright-cli check <ref>            check checkbox/radio
playwright-cli uncheck <ref>          uncheck checkbox/radio

# Viewport
playwright-cli resize <w> <h>         resize browser window

# DevTools
playwright-cli console [min-level]    read console messages (levels: log, warning, error)
playwright-cli network                list network requests

# Tabs
playwright-cli tab-list               list all tabs
playwright-cli tab-new [url]          open new tab
playwright-cli tab-select <index>     switch to tab
playwright-cli tab-close [index]      close tab

# Storage / Auth
playwright-cli state-save [filename]  save cookies + localStorage + sessionStorage
playwright-cli state-load <filename>  load saved state
playwright-cli cookie-list            list cookies
playwright-cli localstorage-list      list localStorage
playwright-cli sessionstorage-list    list sessionStorage

# Save
playwright-cli pdf                    save page as PDF
```

## Workflow (8 Phases)

### Phase 1: Target Detection
- If URL provided: use it directly
- If no URL: run `git diff --name-only HEAD~3`
- Filter for page files: `src/app/**/page.tsx`, `app/**/page.tsx`
- Map file paths to URLs:
  - Strip route groups like `(dashboard)`, `(auth)`
  - Default base: http://localhost:3000
- If multiple pages changed, test each sequentially

### Phase 2: Browser Setup & Authentication

**Step 1 — Derive project name and session path:**
```bash
PROJECT=$(basename $(git rev-parse --show-toplevel 2>/dev/null || pwd))
SESSION_FILE="$HOME/.claude/playwright-sessions/${PROJECT}.json"
```

**Step 2 — Open browser with or without saved session:**

If session file exists:
```bash
playwright-cli open --headed
playwright-cli state-load "$SESSION_FILE"
playwright-cli goto <url>
```

If no session file:
```bash
playwright-cli open <url> --headed
```

**Step 3 — Check if auth is needed:**
```bash
playwright-cli snapshot
```
- Look for: login forms, "Sign in" buttons, `/login` or `/auth` in URL
- If page loads normally (dashboard, app content) → auth is valid, continue

**Step 4 — If login is needed (no session or expired):**
- Tell the user: "This page requires login. Please log in manually in the browser window. Tell me when you're done."
- Wait for user confirmation
- After user confirms, save the session:
  ```bash
  mkdir -p "$HOME/.claude/playwright-sessions"
  playwright-cli state-save "$SESSION_FILE"
  ```
- Confirm: "Session saved for ${PROJECT}. Future tests will auto-login."

**Step 5 — Take initial snapshot** to understand page structure:
```bash
playwright-cli snapshot
```

**Session file location:** `~/.claude/playwright-sessions/<project-name>.json`
- One file per project, reused across test runs
- Contains cookies + localStorage + sessionStorage
- Never committed to git (lives in ~/.claude/)
- To force re-login: delete the file or pass `--reauth` argument

### Phase 3: Visual Review
```bash
playwright-cli screenshot --filename=/tmp/playwright-test-visual-review.png
```
- Read screenshot and analyze for:
  - Layout problems (misaligned elements, broken grids)
  - Spacing inconsistencies
  - Color/contrast issues
  - Typography problems
  - Missing states (loading, error, empty)

### Phase 4: Functional Testing
```bash
playwright-cli snapshot
```
- Read YAML snapshot to identify interactive elements
- Test buttons, links, forms using refs:
  ```bash
  playwright-cli click <ref>
  playwright-cli fill <ref> "test input"
  ```
- Check console errors:
  ```bash
  playwright-cli console error
  ```
- Check network failures:
  ```bash
  playwright-cli network
  ```

### Phase 5: Debug Issues
- Console errors → diagnose and fix:
  - React hydration → fix server/client mismatch
  - API failures → verify endpoints
  - Missing env vars → check .env.local
- Network failures:
  - 404 → check route exists
  - 500 → fix API code
  - CORS → check Next.js config

### Phase 6: UI Improvements (Auto-Apply)
- Auto-fix issues found in Phase 3:
  - Spacing adjustments
  - Color consistency
  - Button styling
  - Typography fixes
- After each fix, reload and re-screenshot to verify:
  ```bash
  playwright-cli reload
  playwright-cli screenshot --filename=/tmp/playwright-test-after-fix.png
  ```

### Phase 7: Responsive Testing
Test at three breakpoints:
```bash
# Mobile
playwright-cli resize 393 852
playwright-cli screenshot --filename=/tmp/playwright-test-mobile.png

# Tablet
playwright-cli resize 768 1024
playwright-cli screenshot --filename=/tmp/playwright-test-tablet.png

# Desktop
playwright-cli resize 1440 900
playwright-cli screenshot --filename=/tmp/playwright-test-desktop.png
```
- Check: touch targets, text readability, no horizontal scroll,
  layout adapts, no awkward breakpoints

### Phase 8: Final Report & Cleanup
Structured summary of all findings:
- Pages tested
- Issues found & fixed
- UI improvements applied
- Console/network errors
- Responsive status (mobile/tablet/desktop pass/fail)

**Cleanup (mandatory):** Delete all temporary test artifacts:
```bash
rm -f /tmp/playwright-test-*.png
rm -rf .playwright-cli/
```

Leave browser open for manual review.

## Session Management

Session files are stored at `~/.claude/playwright-sessions/<project-name>.json`.
They capture cookies, localStorage, and sessionStorage — covering both
cookie-based auth (traditional sessions) and token-based auth (JWTs in localStorage).

### Commands
```bash
# Save current browser state (after manual login)
playwright-cli state-save ~/.claude/playwright-sessions/my-project.json

# Load saved state into browser (browser must be open first)
playwright-cli state-load ~/.claude/playwright-sessions/my-project.json

# Inspect what's stored
playwright-cli cookie-list
playwright-cli localstorage-list
playwright-cli sessionstorage-list
```

### Force Re-login
If auth is stale or user wants to switch accounts:
```bash
rm ~/.claude/playwright-sessions/<project-name>.json
```
Then run `/test` again — it will prompt for manual login.

### Multiple Environments
For projects with staging vs production:
```bash
playwright-cli state-save ~/.claude/playwright-sessions/my-project-staging.json
playwright-cli state-save ~/.claude/playwright-sessions/my-project-prod.json
```

## Fallback
If Playwright CLI is not installed, do NOT fall back to Chrome MCP tools.
Instead, tell the user: "Playwright CLI is not installed. Install it with:
`npm install -g @playwright/cli@latest`" and stop.
