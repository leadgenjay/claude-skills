# Known Temp File Patterns

Common temporary file patterns across project types. Use these for detection in the `temp` cleanup category.

## Universal Patterns

| Pattern | Origin | Safe to Delete |
|---------|--------|----------------|
| `*.log` | Various tools | Yes |
| `core.*` | Core dumps | Yes |
| `*.heapsnapshot` | Node.js heap profiling | Yes |
| `.DS_Store` | macOS Finder | Yes |
| `Thumbs.db` | Windows Explorer | Yes |

## Browser Automation Caches

| Pattern | Origin | Safe to Delete |
|---------|--------|----------------|
| `.auth/*/` | Playwright persistent contexts | Yes (browser session caches) |
| `playwright-data/` | Playwright test artifacts | Yes |
| `test-results/` | Playwright test results | Yes |
| `cypress/screenshots/` | Cypress test screenshots | Yes |
| `cypress/videos/` | Cypress test recordings | Yes |

## Build Tool Caches

| Pattern | Origin | Safe to Delete |
|---------|--------|----------------|
| `.next/` | Next.js build cache | Yes (rebuilds on dev) |
| `dist/` | Build output | Yes (rebuilds on build) |
| `.turbo/` | Turborepo cache | Yes |
| `.parcel-cache/` | Parcel cache | Yes |
| `.vite/` | Vite cache | Yes |
| `node_modules/.cache/` | Various tools | Yes |
| `__pycache__/` | Python bytecode cache | Yes |
| `.pytest_cache/` | Pytest cache | Yes |
| `target/` | Rust/Java build output | Yes |

## Script Output Artifacts

| Pattern | Origin | Safe to Delete |
|---------|--------|----------------|
| `output/` | Script-generated files | Check if gitignored first |
| Root `*.png` / `*.jpg` | Debug screenshots | Verify not a needed asset |
| Root `*.json` (non-config) | Extraction/debug data | Verify not project config |

## Project-Specific Patterns

If the project has a local `.claude/skills/cleanup/references/known-temp-patterns.md`, defer to that file for project-specific patterns that supplement these universal ones.
