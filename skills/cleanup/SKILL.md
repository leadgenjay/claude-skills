---
name: cleanup
version: 1.0.0
description: "Audit and clean up the project workspace — temp files, security issues, dead code, unused deps, git hygiene, build caches, and code quality. This skill should be used when the user wants to clean up, tidy, audit, or organize the project. Also use when the user mentions 'cleanup,' 'clean up,' 'tidy up,' 'housekeeping,' 'remove temp files,' 'dead code,' 'unused deps,' 'unused dependencies,' 'git hygiene,' 'project audit,' 'repo cleanup,' 'clear cache,' or 'stale branches.'"
---

# Project Cleanup

Audit and clean the project workspace across 7 categories. Every action follows the same safety protocol: scan first, preview changes, confirm with user, then execute.

## Before Starting

Read these files for context:
- `CLAUDE.md` — Project structure, tech stack, protected patterns
- `.gitignore` — Existing ignore rules
- `references/known-temp-patterns.md` — Project-specific temp file patterns
- `references/protected-paths.md` — Paths that must never be modified or deleted

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
| **Git safety** | Never force-push. Never delete the current branch. Never delete `main` or `development`. |

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
| 6 | `build` | Clear build caches (.next/, output/) |
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
# Check if .auth/ is gitignored
git check-ignore -v .auth/ 2>&1

# Find credential-like files in project (max depth 3)
find . -maxdepth 3 \( -name "client_secret*" -o -name "credentials.json" -o -name "token.json" -o -name "*.pem" -o -name "*.key" -o -name "service-account*.json" \) -not -path "./node_modules/*" 2>/dev/null

# For each found file, check if gitignored
# git check-ignore -v <file>

# Scan for hardcoded secrets in source code
grep -rn "sk-[a-zA-Z0-9]\{20,\}" app/ lib/ scripts/ 2>/dev/null
grep -rn "Bearer [a-zA-Z0-9]\{20,\}" app/ lib/ scripts/ 2>/dev/null
```

### Preview Format

```
## Security Audit

| # | Issue | File | Severity | Action |
|---|-------|------|----------|--------|
| 1 | .auth/ not in .gitignore | .gitignore | HIGH | Append `.auth/` to .gitignore |
| 2 | OAuth secret in root | client_secret_*.json | MEDIUM | Move to .auth/ |
```

### Execute

For gitignore additions — append to `.gitignore` (never replace).
For file relocations — `mv` to `.auth/` directory.
NEVER delete credential files — only relocate or gitignore them.

---

## Category: temp

Detect and remove temporary files that accumulated from one-off tasks.

### Scan

Consult `references/known-temp-patterns.md` for project-specific patterns, then:

```bash
# GHL screenshots and extraction files in root
ls -la ghl-*.png ghl-*.json 2>/dev/null
ls -la ghl-screenshots-*/ 2>/dev/null

# Other screenshot artifacts in root (not in public/)
ls -la *.png *.jpg *.jpeg 2>/dev/null

# Browser caches
du -sh .auth/*/ 2>/dev/null

# Extraction/debug JSON in root (exclude config files)
ls -la *.json 2>/dev/null | grep -v -E 'package|tsconfig|eslintrc|\.mcp'
```

### Preview Format

```
## Temp Files Audit

| # | File/Dir | Size | Origin | Action |
|---|----------|------|--------|--------|
| 1 | ghl-dashboard-check.png | 136K | GHL extraction | Delete |
| 2 | ghl-screenshots-wf0/ | 1.9M | GHL scroll capture | Delete |
| 3 | .auth/ghl-playwright/ | 81M | Playwright cache | Delete |

**Total reclaimable: ~84 MB**
```

### Execute

Only delete user-approved items via `rm -f` (files) or `rm -rf` (directories).

---

## Category: git

Review untracked files, stale branches, and uncommitted work.

### Scan

```bash
# Untracked files with sizes
git status --short | grep "^??"

# Modified but unstaged
git status --short | grep "^ M\|^M "

# All branches (local + remote)
git branch -a

# Large untracked items
git status --short | grep "^??" | awk '{print $2}' | xargs -I{} du -sh {} 2>/dev/null

# Check for merge conflict markers
grep -rn "<<<<<<< " app/ components/ lib/ types/ --include="*.ts" --include="*.tsx" 2>/dev/null
```

### Preview Format

Split untracked files into two groups:

```
## Git Hygiene Audit

### Untracked — Likely to Commit
| # | Path | Type | Size | Suggestion |
|---|------|------|------|------------|
| 1 | .claude/skills/kinetic-text-ad/ | Skill | 12K | Commit |
| 2 | app/api/ideas/yt-longtail/ | Feature | 8K | Commit |

### Untracked — Likely Temp/Artifacts
| # | Path | Type | Size | Suggestion |
|---|------|------|------|------------|
| 1 | ghl-*.png | Screenshot | 900K | Delete (or run `temp` category) |

### Modified but Unstaged
| # | File | Status |
|---|------|--------|
| 1 | CLAUDE.md | Modified |

### Branches
| # | Branch | Suggestion |
|---|--------|------------|
| 1 | remotes/origin/development | Check if merged → delete |
```

### Execute

For committing — `git add <paths>` then `git commit -m "chore: ..."`.
For branch cleanup — `git branch -d <branch>` (safe delete, only if merged), `git remote prune origin`.

---

## Category: deps

Find unused, outdated, or duplicate dependencies.

### Scan

```bash
# Preferred: knip (comprehensive)
npx knip --dependencies 2>/dev/null

# Fallback: depcheck
npx depcheck --ignores="@tailwindcss/*,postcss,tw-animate-css,eslint-config-next" 2>/dev/null

# Outdated packages
npm outdated 2>/dev/null
```

### Preview Format

```
## Dependency Audit

### Unused Dependencies
| # | Package | Type | Confidence | Action |
|---|---------|------|------------|--------|
| 1 | some-package | production | High | npm uninstall |

### Outdated (major versions behind)
| # | Package | Current | Latest | Breaking? |
|---|---------|---------|--------|-----------|
| 1 | lucide-react | 0.300 | 0.400 | Yes — review changelog |
```

### Execute

`npm uninstall <approved-packages>` for unused.
For outdated — only suggest, do not auto-update without explicit per-package approval.

---

## Category: dead-code

Find unused files, exports, types, and components.

### Scan

```bash
# Preferred: knip (comprehensive — unused files, exports, types)
npx knip 2>/dev/null

# Fallback: manual checks
# Unused exports
grep -rn "export type\|export interface" types/ --include="*.ts" 2>/dev/null

# Orphaned components (imported in 0-1 files)
for f in components/**/*.tsx; do
  basename=$(basename "$f" .tsx)
  count=$(grep -rn "$basename" app/ components/ --include="*.tsx" --include="*.ts" -l 2>/dev/null | wc -l)
  [ "$count" -le 1 ] && echo "Possibly unused: $f ($count refs)"
done
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
| 1 | components/old.tsx | 30 days ago | Medium |
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

```bash
du -sh .next/ output/ node_modules/.cache/ 2>/dev/null
```

### Preview Format

```
## Build Cache Audit

| # | Directory | Size | Gitignored | Action |
|---|-----------|------|------------|--------|
| 1 | .next/ | 331M | Yes | Delete (rebuilds on dev) |
| 2 | output/ | 101M | Yes | Delete (regenerated by scripts) |
| 3 | node_modules/.cache/ | [size] | Yes | Delete (rebuilt automatically) |

**Total reclaimable: ~432 MB**
```

### Execute

```bash
rm -rf .next/
rm -rf output/
rm -rf node_modules/.cache/
```

After clearing: "Caches cleared. Run `npm run dev` to rebuild when needed."

---

## Category: quality

Lint issues, TODO/FIXME comments, console.log statements, and TypeScript errors.

### Scan

```bash
# ESLint
npm run lint 2>&1

# TODO/FIXME comments in source
grep -rn "TODO\|FIXME\|HACK\|XXX" app/ components/ lib/ types/ --include="*.ts" --include="*.tsx" 2>/dev/null

# console.log in production code
grep -rn "console\.\(log\|debug\|warn\)" app/ components/ lib/ --include="*.ts" --include="*.tsx" 2>/dev/null

# TypeScript errors
npx tsc --noEmit 2>&1 | head -50
```

### Preview Format

```
## Code Quality Audit

### ESLint Issues
| # | File | Line | Rule | Message |
|---|------|------|------|---------|
| 1 | app/page.tsx | 12 | no-unused-vars | 'x' defined but never used |

### TODO/FIXME Comments
| # | File | Line | Comment |
|---|------|------|---------|
| 1 | app/api/route.ts | 45 | TODO: wire up n8n |

### Console Statements
| # | File | Line | Statement |
|---|------|------|-----------|
| 1 | app/api/route.ts | 23 | console.log(...) |

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
| temp | 16 | 14 | 2 | 84 MB |
| git | 35 | 20 | 15 | — |
| deps | 1 | 1 | 0 | — |
| dead-code | 0 | 0 | 0 | — |
| build | 3 | 2 | 1 | 432 MB |
| quality | 4 | 3 | 1 | — |

**Total space freed: 516 MB**
**Security issues resolved: 2**

### Remaining Items (manual follow-up)
1. [ ] Item requiring manual attention
2. [ ] ...
```
