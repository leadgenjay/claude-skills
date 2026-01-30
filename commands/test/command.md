# /test Command

Live browser testing with auto-detection, comprehensive testing, and automatic UI improvements.

## Usage

```
/test                    # Auto-detect changed pages from git
/test /skills           # Test specific URL
/test https://example.com/page
```

## Workflow

1. **Target Detection** → Auto-detect or use provided URL
2. **Browser Setup** → Open browser, navigate to page
3. **Visual Review** → Screenshot, analyze layout/spacing/colors
4. **Functional Testing** → Test buttons, forms, links
5. **Debug Issues** → Fix console errors, network failures
6. **UI Improvements** → Auto-apply spacing, color, typography fixes
7. **Responsive Testing** → Test mobile, tablet, desktop
8. **Final Report** → Summary of tests and fixes

## Phase 1: Target Detection

**Auto-detect from git:**
1. Run `git diff --name-only HEAD~3` to find recently changed files
2. Filter for page files: `src/app/**/page.tsx`, `src/app/**/content.tsx`
3. Map file paths to URLs (strip route groups like `(dashboard)`)
4. If multiple pages changed, test each sequentially

## Phase 2: Browser Setup

1. Open browser tab
2. Navigate to target URL
3. Wait for page to fully load
4. Handle login screens if encountered

## Phase 3: Visual Review

Take full-page screenshot and analyze for:
- Layout problems (misaligned elements, broken grids)
- Spacing inconsistencies (uneven margins/padding)
- Color/contrast issues (readability, brand compliance)
- Typography problems (font sizes, hierarchy)
- Missing states (loading, error, empty)

## Phase 4: Functional Testing

1. Find interactive elements (buttons, links, forms, dropdowns)
2. Test each element (click, fill, verify state changes)
3. Check for console errors
4. Check network requests for failures

## Phase 5: Debug Issues

**Console errors:**
- React hydration → Fix client/server mismatch
- API failures → Verify endpoints
- Missing env vars → Check `.env.local`

**Network failures:**
- 404s → Check route exists
- 500s → Fix API code
- CORS → Check Next.js config

## Phase 6: UI Improvements (Auto-Apply)

Automatically fix:
- Spacing adjustments
- Color consistency (brand colors)
- Button styling
- Typography
- Animation enhancements

## Phase 7: Responsive Testing

Test at three breakpoints:
- **Mobile (393x852)**: Touch targets, text readability, no horizontal scroll
- **Tablet (768x1024)**: Layout adapts, no awkward breakpoints
- **Desktop (1440x900)**: Full layout

## Phase 8: Final Report

```
## Test Results for [URL]

### Pages Tested
- [List of pages]

### Issues Found & Fixed
- [Issue]: [How fixed]

### UI Improvements Applied
- [Improvements]

### Console Errors
- [None / List]

### Responsive Status
- Mobile: [Pass/Issues]
- Tablet: [Pass/Issues]
- Desktop: [Pass/Issues]
```

Leaves browser open for manual review.
