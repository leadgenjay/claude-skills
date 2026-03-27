# Live Test Skill - Notes & Gotchas

## Setup (2026-03-09)

- Installed via `npm install -g @playwright/cli@latest`
- Version: 1.59.0-alpha
- Ran `playwright-cli install-browser` to install bundled Chromium
- Sessions directory: `~/.claude/playwright-sessions/`
- Replaced all Playwright MCP servers across 4+ projects

## Common Errors & Fixes

### "Extension connection timeout"
**Cause:** Using `--extension` flag or the CLI defaulting to extension mode.
**Fix:** Don't use `--extension`. The default mode uses its own bundled browser.
Run `playwright-cli install-browser` once to set it up.

### "Unknown command: navigate"
**Cause:** Wrong command name.
**Fix:** The correct command is `goto <url>`, not `navigate`.

### "The browser 'default' is not open"
**Cause:** Running commands before opening a browser.
**Fix:** Always call `playwright-cli open` (or `playwright-cli open <url>`) before
any other command. All commands operate on the browser session started by `open`.

## Command Name Mapping (vs Playwright MCP)

| Wrong (MCP-style)     | Correct (CLI)          |
|-----------------------|------------------------|
| `navigate <url>`     | `goto <url>`           |
| `browser_navigate`   | `goto <url>`           |
| `browser_snapshot`    | `snapshot`             |
| `browser_click`       | `click <ref>`          |
| `browser_type`        | `type <text>` or `fill <ref> <text>` |
| `browser_take_screenshot` | `screenshot [ref]` |
| `browser_tabs`        | `tab-list`             |
| `browser_close`       | `close`                |

## Key Behavioral Differences from MCP

1. **Sequential, not stateless** — CLI maintains a session. `open` starts it, `close` ends it.
   Every command in between operates on that session.
2. **`open` is required first** — Unlike MCP tools which auto-launch, CLI needs explicit `open`.
3. **`--headed` flag** — Only valid on the `open` command. Shows the browser window.
4. **`snapshot` output** — Saves to `.playwright-cli/` as YAML, not returned inline.
   Read the YAML file after running `snapshot`.
5. **`console` takes min-level** — `console error` shows only errors and above.
   `console warning` shows warnings+errors. `console` (no arg) shows everything.
6. **`screenshot` output** — Saves to `.playwright-cli/` by default. Use `--filename`
   to specify a path like `/tmp/playwright-test-visual.png`.

## Auth / Session Persistence

- `state-save [filename]` captures cookies + localStorage + sessionStorage
- `state-load <filename>` restores all three into the current browser
- More complete than Playwright's `storageState()` API (which skips sessionStorage)
- Session files stored at `~/.claude/playwright-sessions/<project>.json`
- Browser must be `open` before calling `state-load`
- Flow: `open` → `state-load` → `goto <url>` (not all in one command)

## Files Changed During Setup

### Created
- `~/.claude/skills/live-test/SKILL.md` — skill definition
- `~/.claude/commands/test.md` — global `/test` command
- `~/.claude/playwright-sessions/` — session storage directory

### Deleted
- `~/.claude/commands/test/` (old directory-based command)
- `INBOX INSIDERS/.claude/commands/test.md`
- `Billing Portl/.claude/commands/test.md`
- `Consulti/.claude/commands/test.md`

### Modified (Playwright MCP removed)
- `social-media-tool/.mcp.json` — removed `executeautomation-playwright-server`
- `social-media-tool/.claude/settings.local.json` — removed from enabledMcpjsonServers
- `N8N-MCP/.mcp.json` — removed `playwright`
- `N8N-MCP/.claude/settings.local.json` — removed from enabledMcpjsonServers
- `marketing-director/.mcp.json` — removed `executeautomation-playwright-server`
- `Email Verifier/.mcp.json` — removed `executeautomation-playwright-server`
- `INBOX INSIDERS/.claude/settings.local.json` — removed 7 `mcp__playwright__*` permissions
- `~/.claude.json` — removed playwright from AIA Templates + disabledMcpServers

### CLAUDE.md Updates
- `social-media-tool/CLAUDE.md` — "Playwright MCP" → "Playwright CLI"
- `INBOX INSIDERS/.claude/CLAUDE.md` — "Playwright" → "Playwright CLI"
- `Web-Designer/CLAUDE.md` — "Playwright" → "Playwright CLI"
