---
name: cleanup
version: 1.0.0
description: "Audit and clean up any project workspace — temp files, security issues, dead code, unused deps, git hygiene, build caches, and code quality. This skill should be used when the user wants to clean up, tidy, audit, or organize the project. Also use when the user mentions 'cleanup,' 'clean up,' 'tidy up,' 'housekeeping,' 'remove temp files,' 'dead code,' 'unused deps,' 'unused dependencies,' 'git hygiene,' 'project audit,' 'repo cleanup,' 'clear cache,' or 'stale branches.'"
---

# Project Cleanup

Audit and clean the project workspace across 7 categories. Every action follows the same safety protocol: scan first, preview changes, confirm with user, then execute.

## Before Starting

Read these files for context:
- `CLAUDE.md` — Project structure, tech stack, protected patterns
- `.gitignore` — Existing ignore rules
- `references/protected-paths.md` — Common paths that must never be modified or deleted

If the project has a local `.claude/skills/cleanup/references/known-temp-patterns.md`, read that too for project-specific temp file patterns.

---

## Safety Protocol

These rules are non-negotiable and override any user request:

| Rule | Detail |
|------|--------|
| **Dry-run first** | Every category starts with a read-only scan. Show results before any action. |
| **User confirms** | Present a numbered list of proposed actions. Execute ONLY items the user approves. |
| **Protected paths** | NEVER touch files in `references/protected-paths.md`. Tag with `[PROTECTED]` if they appear in scan results. |
| **Baseline before destructive ops** | Before deleting untracked files or removing dead code, offer to create a stash or branch so changes are recoverable. |
| **No silent deletions** | Every file removal must appear in the preview table with its size and reason. |
| **Git safety** | Never force-push. Never delete the current branch. Never delete `main` or `master`. |

---

## Invocation

`/cleanup [category]` or `/cleanup all`

If no category specified, present this menu using AskUserQuestion (multiSelect: true):

| # | Category | What It Does |
|---|----------|-------------|
| 1 | `security` | Find exposed secrets, missing gitignore rules |
| 2 | `temp` | Remove temp files, screenshots, extraction artifacts |
| 3 | `git` | Untracked files, stale branches, uncommitted work |
| 4 | `deps` | Unused or outdated dependencies |
| 5 | `dead-code` | Unused files, exports, types |
| 6 | `build` | Clear build caches |
| 7 | `quality` | Lint issues, TODOs, console.logs |

Run categories in this order (rationale in parentheses):
1. security (highest priority)
2. temp (quick wins, free space)
3. git (committing untracked files affects what appears unused)
4. deps (after git, so committed files are visible)
5. dead-code (after deps, for accurate analysis)
6. build (clear stale caches)
7. quality (last — lint against clean state)

---

## Category: security

Find exposed secrets, credential files outside protected directories, and missing gitignore rules.

### Scan

```bash
# Check common auth/secret directories are gitignored
for dir in .auth .secrets .credentials; do
  [ -d "$dir" ] && git check-ignore -v "$dir" 2>&1
done

# Find credential-like files in project (max depth 3)
find . -maxdepth 3 \( -name "client_secret*" -o -name "credentials.json" -o -name "token.json" -o -name "*.pem" -o -name "*.key" -o -name "service-account*.json" -o -name ".env" \) -not -path "./node_modules/*" 2>/dev/null

# For each found file, check if gitignored
# git check-ignore -v <file>

# Scan for hardcoded secrets in source code (adapt paths to project)
grep -rn "sk-[a-zA-Z0-9]\{20,\}" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.mjs" --include="*.py" . 2>/dev/null | grep -v node_modules
grep -rn "Bearer [a-zA-Z0-9]\{20,\}" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.mjs" . 2>/dev/null | grep -v node_modules
```

### Preview Format

```
## Security Audit

| # | Issue | File | Severity | Action |
|---|-------|------|----------|--------|
| 1 | .auth/ not in .gitignore | .gitignore | HIGH | Append to .gitignore |
| 2 | Credential file in root | client_secret_*.json | MEDIUM | Move to secure dir |
```

### Execute

For gitignore additions — append to `.gitignore` (never replace).
For file relocations — `mv` to a gitignored directory.
NEVER delete credential files — only relocate or gitignore them.

---

## Category: temp

Detect and remove temporary files that accumulated from one-off tasks.

### Scan

Adapt scans to the project. Common patterns:

```bash
# Screenshot artifacts in project root
ls -la *.png *.jpg *.jpeg *.gif 2>/dev/null

# Debug/extraction JSON files in root (exclude config files)
ls -la *.json 2>/dev/null | grep -v -E 'package|tsconfig|eslintrc|\.mcp|composer'

# Temp directories
du -sh .auth/*/ tmp/ temp/ .tmp/ 2>/dev/null

# Log files
ls -la *.log 2>/dev/null

# Core dumps, heap snapshots
ls -la core.* *.heapsnapshot 2>/dev/null
```

Also check for project-specific patterns:
- Build tool temp dirs (`.turbo/`, `.parcel-cache/`, `.vite/`)
- Browser automation caches (`.auth/*/`, `playwright-data/`)
- One-off script outputs in root

### Preview Format

```
## Temp Files Audit

| # | File/Dir | Size | Origin | Action |
|---|----------|------|--------|--------|
| 1 | screenshot.png | 136K | Debug output | Delete |
| 2 | .auth/browser-cache/ | 81M | Playwright cache | Delete |

**Total reclaimable: ~XX MB**
```

### Execute

Only delete user-approved items via `rm -f` (files) or `rm -rf` (directories).

---

## Category: git

Review untracked files, stale branches, and uncommitted work.

### Scan

```bash
# Untracked files
git status --short | grep "^??"

# Modified but unstaged
git status --short | grep "^ M\|^M "

# All branches (local + remote)
git branch -a

# Large untracked items
git status --short | grep "^??" | awk '{print $2}' | xargs -I{} du -sh {} 2>/dev/null

# Check for merge conflict markers
grep -rn "<<<<<<< " --include="*.ts" --include="*.tsx" --include="*.js" --include="*.py" . 2>/dev/null | grep -v node_modules
```

### Preview Format

Split untracked files into two groups:

```
## Git Hygiene Audit

### Untracked — Likely to Commit
| # | Path | Type | Size | Suggestion |
|---|------|------|------|------------|
| 1 | src/new-feature/ | Feature | 8K | Commit |

### Untracked — Likely Temp/Artifacts
| # | Path | Type | Size | Suggestion |
|---|------|------|------|------------|
| 1 | debug-*.png | Screenshot | 900K | Delete (or run `temp` category) |

### Modified but Unstaged
| # | File | Status |
|---|------|--------|
| 1 | README.md | Modified |

### Branches
| # | Branch | Suggestion |
|---|--------|------------|
| 1 | remotes/origin/old-feature | Check if merged → delete |
```

### Execute

For committing — `git add <paths>` then `git commit -m "chore: ..."`.
For branch cleanup — `git branch -d <branch>` (safe delete, only if merged), `git remote prune origin`.

---

## Category: deps

Find unused, outdated, or duplicate dependencies.

### Scan

Detect package manager and run appropriate tool:

```bash
# Preferred: knip (comprehensive — works with npm, yarn, pnpm)
npx knip --dependencies 2>/dev/null

# Fallback: depcheck (npm/yarn projects)
npx depcheck 2>/dev/null

# Outdated packages
npm outdated 2>/dev/null || yarn outdated 2>/dev/null || pnpm outdated 2>/dev/null
```

### Preview Format

```
## Dependency Audit

### Unused Dependencies
| # | Package | Type | Confidence | Action |
|---|---------|------|------------|--------|
| 1 | some-package | production | High | Uninstall |

### Outdated (major versions behind)
| # | Package | Current | Latest | Breaking? |
|---|---------|---------|--------|-----------|
| 1 | some-lib | 2.0.0 | 4.0.0 | Yes — review changelog |
```

### Execute

Uninstall unused packages with the project's package manager.
For outdated — only suggest, do not auto-update without explicit per-package approval.

---

## Category: dead-code

Find unused files, exports, types, and components.

### Scan

```bash
# Preferred: knip (comprehensive — unused files, exports, types)
npx knip 2>/dev/null

# Fallback: manual checks for TypeScript projects
# Unused exports
grep -rn "export type\|export interface\|export function\|export const" --include="*.ts" --include="*.tsx" . 2>/dev/null | grep -v node_modules

# Orphaned components (imported in 0-1 files) — adapt glob to project
# for f in components/**/*.tsx; do ...
```

### Preview Format

```
## Dead Code Audit

### Unused Exports
| # | Export | File | Confidence |
|---|--------|------|------------|
| 1 | SomeType | types/index.ts | High |

### Unused Files
| # | File | Last Modified | Confidence |
|---|------|---------------|------------|
| 1 | src/old-util.ts | 30 days ago | Medium |
```

### Execute

Before removing dead code, ALWAYS offer:
```
Create safety stash before removing dead code? (recommended) [y/n]
```

If yes: `git stash push -m "cleanup: pre-dead-code-removal backup"`

Then remove approved items only.

---

## Category: build

Clear build caches and generated output directories.

### Scan

Detect framework and check common cache locations:

```bash
# Common build caches
du -sh .next/ dist/ build/ output/ .turbo/ .parcel-cache/ .vite/ node_modules/.cache/ __pycache__/ .pytest_cache/ target/ 2>/dev/null
```

### Preview Format

```
## Build Cache Audit

| # | Directory | Size | Gitignored | Action |
|---|-----------|------|------------|--------|
| 1 | .next/ | 331M | Yes | Delete (rebuilds on dev) |
| 2 | node_modules/.cache/ | 50M | Yes | Delete (rebuilt automatically) |

**Total reclaimable: ~XXX MB**
```

### Execute

Delete approved directories. After clearing, remind user how to rebuild (e.g., `npm run dev`, `npm run build`).

---

## Category: quality

Lint issues, TODO/FIXME comments, console.log statements, and type errors.

### Scan

Detect available linting tools and run:

```bash
# Lint (detect tool)
npm run lint 2>&1 || npx eslint . 2>&1 || echo "No linter configured"

# TODO/FIXME comments in source (exclude node_modules, .git, build dirs)
grep -rn "TODO\|FIXME\|HACK\|XXX" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" --include="*.py" . 2>/dev/null | grep -v node_modules | grep -v ".next/"

# console.log in production code
grep -rn "console\.\(log\|debug\|warn\)" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" . 2>/dev/null | grep -v node_modules | grep -v ".next/"

# TypeScript errors (if tsconfig exists)
[ -f tsconfig.json ] && npx tsc --noEmit 2>&1 | head -50
```

### Preview Format

```
## Code Quality Audit

### ESLint Issues
| # | File | Line | Rule | Message |
|---|------|------|------|---------|
| 1 | src/app.tsx | 12 | no-unused-vars | 'x' defined but never used |

### TODO/FIXME Comments
| # | File | Line | Comment |
|---|------|------|---------|
| 1 | src/api/route.ts | 45 | TODO: refactor |

### Console Statements
| # | File | Line | Statement |
|---|------|------|-----------|
| 1 | src/api/route.ts | 23 | console.log(...) |

### TypeScript Errors
[from tsc --noEmit output]
```

### Execute

For ESLint auto-fixable: `npx eslint --fix <file>`.
For console.log removal and TODO resolution — handle manually per item after user approval.

---

## Final Summary

After all selected categories complete, present:

```
## Cleanup Summary

| Category | Found | Fixed | Skipped | Space Freed |
|----------|-------|-------|---------|-------------|
| security | 2 | 2 | 0 | — |
| temp | 5 | 4 | 1 | 84 MB |
| git | 10 | 8 | 2 | — |
| deps | 1 | 1 | 0 | — |
| dead-code | 0 | 0 | 0 | — |
| build | 2 | 2 | 0 | 400 MB |
| quality | 4 | 3 | 1 | — |

**Total space freed: XXX MB**
**Security issues resolved: X**

### Remaining Items (manual follow-up)
1. [ ] Item requiring manual attention
2. [ ] ...
```
