---
name: ab-testing-suite
description: Full-lifecycle A/B testing for Next.js + Supabase projects. Setup database schema and edge middleware for zero-flicker variant assignment, create hypothesis-driven tests with PIE scoring, track conversions, run statistical analysis (z-test confidence calculations), declare winners, and generate new test ideas. Use this skill proactively when setting up A/B testing infrastructure, creating split tests, analyzing test results, checking statistical confidence, declaring test winners, generating test hypotheses, or optimizing conversion rates. Also use when the user mentions variants, conversion optimization, split testing, or multivariate testing.
---

# A/B Testing Suite

Full-lifecycle A/B testing for Next.js + Supabase projects. Covers infrastructure setup, hypothesis-driven test creation, statistical analysis, winner declaration, and iteration planning.

## Prerequisites

| Requirement | Purpose |
|-------------|---------|
| Next.js 14+ (App Router) | Edge middleware, server components |
| Supabase project | Database, auth, REST API |
| Tailwind CSS | Component styling |
| PostHog MCP (optional) | Data-driven test ideas via heatmaps |

## Commands

| Command | Purpose |
|---------|---------|
| `/ab setup` | Set up A/B testing infrastructure from scratch |
| `/ab create [path]` | Create a new test with hypothesis-first workflow |
| `/ab status` | Review all active tests with stats and recommendations |
| `/ab analyze [test_id]` | Deep statistical analysis of a specific test |
| `/ab conclude [test_id] [variant_id]` | Declare winner, apply changes, document results |
| `/ab stop [test_id]` | End test without winner, document learnings |
| `/ab ideas [page-url]` | Generate PIE-scored test hypotheses from page analysis |
| `/ab iterate [test_id]` | Design next test building on winner insights |
| `/ab validate` | Verify all infrastructure components are in place |

---

## `/ab setup` — Infrastructure Setup

Read `references/setup-guide.md` for the full step-by-step guide.

**Quick overview:**

1. **Database** — Run `scripts/setup-supabase.sql` against the Supabase project. Creates `ab_test_registry`, `ab_test_events`, indexes, RLS policies, and triggers. Safe to run multiple times (fully idempotent).

2. **Middleware** — Copy `assets/middleware-handler.ts` to `src/lib/ab-test/middleware.ts`. Integrate into the project's `src/middleware.ts` by calling `handleABTest(request)` before other route handling.

3. **Tracking Component** — Copy `assets/conversion-tracker.tsx` to `src/components/ab-test/conversion-tracker.tsx`. This auto-detects conversion elements (checkout links, forms, submit buttons, `[data-conversion="true"]`).

4. **API Routes** — Create these routes (skeletons in `references/setup-guide.md`):
   - `POST /api/ab-test/track` — Public event tracking (views + conversions)
   - `GET /api/ab-test/registry` — List all tests with computed stats
   - `POST /api/ab-test/toggle` — Start/stop/pause tests
   - `GET|PATCH /api/ab-test/[testId]` — Single test CRUD
   - `PATCH /api/ab-test/[testId]/variants/[variantId]` — Enable/disable variants

5. **Environment** — Ensure `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set.

6. **Validate** — Run `scripts/validate-setup.sh` to verify everything is in place.

---

## `/ab create [path]` — Create a Test

Every test starts with a hypothesis, not a random idea. Read `references/hypothesis-library.md` for 24 ready-to-use test patterns.

**Workflow:**

1. **Identify the page path** — e.g., `/pricing`, `/signup`, `/landing`

2. **Choose what to test** — Ask the user:
   - Headline (highest impact)
   - CTA text or placement
   - Form fields or layout
   - Social proof placement
   - Page structure or length
   - Pricing presentation

3. **Write the hypothesis** using this template:
   ```bash
   Based on [observation/data],
   we believe that [change]
   will result in [expected outcome]
   because [rationale].
   We'll measure this by [metric]
   and consider it successful if [success criteria].
   ```

4. **Calculate PIE score** — Score the test on three factors (1-10):
   - **P**otential: How much improvement could this make?
   - **I**mportance: How valuable is the traffic on this page?
   - **E**ase: How easy is this to implement?
   - **PIE Score** = (P + I + E) / 3

5. **Insert into database** — Create a row in `ab_test_registry`:
   ```sql
   INSERT INTO ab_test_registry (test_id, name, description, path_pattern, variants, status)
   VALUES (
     'pricing-headline-v1',
     'Pricing Page Headline Test',
     'Hypothesis: [from step 3]',
     '/pricing',
     '[{"id":"control","name":"Control","weight":50,"enabled":true},{"id":"a","name":"Benefit-Focused","weight":50,"enabled":true}]',
     'draft'
   );
   ```

6. **Create variant rendering** — In the page component, read the `v` search param and render the appropriate variant content.

7. **Add ConversionTracker** — Include the tracking component with testId, variantId, and visitorId from URL params.

8. **Add path to middleware matcher** — Ensure the page path is included in `src/middleware.ts` matcher config.

9. **Activate** — Toggle the test to `active` via the toggle API endpoint.

---

## `/ab status` — Review All Active Tests

Pull all active tests and present stats with recommendations.

**Workflow:**

1. **Fetch tests** — `GET /api/ab-test/registry` returns all tests with computed stats.

2. **For each active test**, present:
   ```text
   ### [test_id] — [name]
   Duration: X days | Total views: X | Total conversions: X

   | Variant | Views | Conv | Rate | vs Control | Status |
   |---------|-------|------|------|------------|--------|
   | control | 400 | 100 | 25.0% | — | baseline |
   | a | 200 | 64 | 32.0% | +28.0% | winning |

   Confidence: 87.3% (medium)
   Recommendation: [Apply decision framework]
   ```

3. **Apply decision framework** — Read `references/decision-framework.md` for the full tree. Quick reference:
   - **95%+ confidence** → "Ready — declare winner"
   - **90-95% + 500+ views** → "Likely winner — recommend concluding"
   - **30%+ lead + 200+ views** → "Early leader — strong signal"
   - **<90% after 1000+ views** → "Inconclusive — present options"
   - **<14 days or <200 views** → "Too early — keep running"
   - **60+ days** → "Max runtime — recommend concluding"
   - **0 events after 7+ days** → "Broken — investigate tracking"

---

## `/ab analyze [test_id]` — Deep Analysis

Detailed statistical analysis of a specific test. Read `references/statistical-methods.md` for the math.

**Workflow:**

1. **Pull stats** — Query `ab_test_events` for views and conversions per variant.

2. **Calculate z-test confidence** — For each pair of variants:
   - Pooled proportion: `p = (cA + cB) / (nA + nB)`
   - Standard error: `SE = sqrt(p * (1-p) * (1/nA + 1/nB))`
   - Z-score: `z = (pB - pA) / SE`
   - Convert z-score to confidence via CDF

3. **Assess sample adequacy:**
   - Need minimum 10 conversions per variant for any signal
   - Recommend 100+ conversions per variant for reliable results
   - At least 2 full business cycles (14 days minimum)

4. **Check for data quality issues:**
   - 0 events = broken tracking
   - Extreme imbalance between variants = middleware issue
   - Very low conversion rate across all variants = tracking misconfigured

5. **Present analysis** with confidence intervals, improvement percentages, and sample size recommendations.

---

## `/ab conclude [test_id] [variant_id]` — Declare Winner

Read `references/decision-framework.md` for the full conclusion workflow.

**Workflow:**

1. **Pull final stats** — Present the complete results table with confidence.

2. **Confirm with user** — Never auto-conclude. Show recommendation and ask for confirmation.

3. **Update registry:**
   ```text
   POST /api/ab-test/toggle
   { "testId": "[test_id]", "action": "stop", "winnerId": "[variant_id]" }
   ```

4. **Apply winner to code** — Remove variant conditionals from page components. Keep the winning variant's content as the single default.

5. **Document results** — Update the test's `description` field with:
   ```text
   ## Results: [test_id]
   Duration: X days | Total Views: X | Confidence: X%
   Winner: [variant] — [description] (+X% lift vs control)
   Learning: [what we learned about the audience]
   Next: [follow-up test or "none needed"]
   ```

6. **Update CHANGELOG** — Add entry under `## [Unreleased]` → `### Changed`.

7. **Visual verification (layout tests only)** — If the test changed placement, layout, or visual design (not just copy), verify each variant renders correctly on desktop (1440px) and mobile (390px) before concluding.

---

## `/ab stop [test_id]` — End Without Winner

**Workflow:**

1. Pull final stats and present them.
2. Note the leading variant as "most likely winner" for reference.
3. Confirm with user.
4. Toggle test to completed (no winner_variant_id).
5. Document learnings in the test description.

---

## `/ab ideas [page-url]` — Generate Test Hypotheses

Read `references/hypothesis-library.md` for 24 ready-to-use test patterns.

**Workflow:**

1. **Analyze the page** — Read the page component to understand current copy, structure, CTAs, forms, and social proof.

2. **Cross-reference with test library** — Match page elements against the hypothesis library to find applicable tests.

3. **If PostHog MCP is available** (optional enhancement):
   - Pull scroll depth data — identify where visitors drop off
   - Pull click heatmap — find rage clicks and dead zones
   - Pull device breakdown — mobile vs desktop behavior
   - Use data to prioritize hypotheses

4. **Generate 3-5 PIE-scored hypotheses:**
   ```text
   | # | Element | PIE | Expected Lift | Hypothesis |
   |---|---------|-----|---------------|------------|
   | 1 | headline | 8.3 | +15-25% | Benefit-focused vs curiosity |
   | 2 | cta-text | 7.7 | +10-20% | "Get Started" vs "Claim Your Spot" |
   | 3 | form | 7.0 | +20-30% | 5 fields vs 2 fields |
   ```

5. **Present with full hypothesis templates** for the top 3, ready for `/ab create`.

---

## `/ab iterate [test_id]` — Design Next Test

**Workflow:**

1. Fetch completed test results.
2. Analyze what won and why (copy angle, layout, CTA style).
3. Winner becomes the new control.
4. Never test the same hypothesis twice.
5. Use PIE framework to score 2-3 follow-up hypotheses.
6. Output a test plan ready for `/ab create`.

---

## `/ab validate` — Verify Setup

Run `scripts/validate-setup.sh` to check:
- Supabase environment variables are set
- Database tables exist and are accessible
- Middleware file exists and imports the AB test handler
- ConversionTracker component exists
- API routes exist (track, toggle, registry)
- Reports pass/fail per check with fix instructions

---

## Architecture Overview

Read `references/architecture.md` for the full system design.

```text
Database (ab_test_registry)
    ↓ cached (5 min)
Edge Middleware (variant assignment)
    ↓ sets cookie + URL params
Page Component (renders variant)
    ↓ tracks via
ConversionTracker → ab_test_events table
```

**Key patterns:**
- **Zero-flicker**: Variant assignment happens server-side at the edge, before the page renders
- **Cookie persistence**: `{prefix}_{testId}` = `variantId:visitorId` (30-day expiry)
- **Preview mode**: Add `?v=variantId` to URL to preview any variant without affecting data
- **Path collision**: Multiple test rounds on the same path are handled automatically via STATUS_PRIORITY (active > paused > completed)
- **Fallback chain**: In-memory cache → Supabase REST → empty Map (no static config required)

---

## Integration

### PostHog (Optional)
Install PostHog MCP for data-driven test ideas: `npx @posthog/wizard@latest mcp add`. Enables scroll depth, click heatmap, rage click, and device breakdown analysis in `/ab ideas`.

### Webhooks
Configure a global webhook URL to receive notifications when winners are auto-selected. Payload includes test details, winner stats, and confidence level.

### Auto-Winner
Set `auto_select_winner = true` and a `confidence_threshold` (90 or 95) on tests to automatically conclude when the threshold is reached. Always verify auto-selected winners manually.

### Multiple Test Rounds
Run sequential tests on the same path (v1 → v2 → v3). Each shares the same `path_pattern`. The middleware uses STATUS_PRIORITY to ensure only the active test gets traffic. Old completed tests stay in the database — no cleanup needed.

---

## Key Files

| File | Purpose |
|------|---------|
| `src/lib/ab-test/middleware.ts` | Edge middleware for variant assignment |
| `src/components/ab-test/conversion-tracker.tsx` | Client-side view + conversion tracking |
| `src/middleware.ts` | Next.js middleware (imports AB test handler) |
| `src/app/api/ab-test/track/route.ts` | Event tracking endpoint |
| `src/app/api/ab-test/registry/route.ts` | List all tests with stats |
| `src/app/api/ab-test/toggle/route.ts` | Start/stop/pause tests |
| `src/app/api/ab-test/[testId]/route.ts` | Single test CRUD |

## Reference Files

| File | When to Read |
|------|-------------|
| `references/setup-guide.md` | Setting up infrastructure from scratch |
| `references/architecture.md` | Understanding system design and data flow |
| `references/statistical-methods.md` | Running statistical analysis |
| `references/hypothesis-library.md` | Generating test ideas and PIE scoring |
| `references/decision-framework.md` | Deciding when to call winners |
