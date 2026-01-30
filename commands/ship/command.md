# /ship Command

Ship changes to production with full documentation. Commits, pushes, deploys to Vercel (no cache), updates docs, and adds changelog entry.

## Workflow

Analyze changes → Build → Commit → Push → Deploy (no cache) → Update docs → Update changelog

## Steps

### 1. Analyze Changes

Run in parallel:
```bash
git status
git diff --stat
git diff
```

Understand what changed: files modified/added/deleted, nature of changes (feature, fix, refactor, etc.).

### 2. Build and Verify

```bash
npm run build
```

If build fails, stop and fix errors.

### 3. Commit with Auto-Generated Message

Generate commit message following conventional commits:
- `feat:` new features
- `fix:` bug fixes
- `refactor:` code refactoring
- `style:` styling/UI changes
- `docs:` documentation
- `chore:` maintenance

```bash
git add -A
git commit -m "<type>: <description>"
```

### 4. Push to GitHub

```bash
git push origin main
```

### 5. Deploy to Vercel (Force, No Cache)

```bash
vercel --prod --yes --force
```

The `--force` flag bypasses cached artifacts for a fresh build.

### 6. Verify Deployment

- Wait for deployment URL to be live
- Navigate to production URL
- Take screenshot to verify changes
- Confirm site loads correctly

### 7. Update Project Documentation

Update relevant docs based on changes:
- New features → Update README.md
- API changes → Update API docs
- Config changes → Update setup instructions

Only update docs directly affected by changes.

### 8. Update Changelog

Append entry to `CHANGELOG.md` in Keep a Changelog format:

```markdown
## [Unreleased]

### Added
- New features

### Changed
- Modified functionality

### Fixed
- Bug fixes

### Removed
- Removed features
```

## Output

Provides:
1. Commit hash and message
2. Deployment URL
3. Screenshot of live site
4. Summary of changelog additions
5. Documentation updates made
