---
name: launch-page
description: "Launch checklist for new landing pages and checkout pages. Ensures tracking codes (PostHog, GA4, Meta Pixel, GTM, all ad pixels), metadata/SEO, admin registration, A/B test middleware, and deployment are properly configured. Use PROACTIVELY when launching any new page to production, deploying a landing page, or setting up tracking on a page. Also use when the user says 'launch', 'go live', 'deploy page', 'add tracking', or 'set up A/B test for a page'."
version: 1.0.0
tags: [launch, tracking, deployment, seo, ab-test, production, checklist]
---

# Launch Page Skill

Production launch checklist for new landing pages, checkout pages, and tool pages. Runs a sequential audit ensuring every piece of production infrastructure is wired up before deploying.

**When to use:** After building a new page (or significantly updating one) and before deploying to production. Triggers on: "launch", "go live", "deploy page", "add tracking", "set up A/B test for [page]".

---

## Launch Checklist (Run Sequentially)

### Step 1: Tracking Verification & Installation

**Goal:** Ensure all tracking pixels fire on the new page.

#### 1a. Global Tracking (Root Layout — Already Handled)

**IMPORTANT:** Global tracking (GTM, PostHog, GA4, Meta Pixel, LinkedIn, TikTok, Reddit, Quora, Microsoft UET, etc.) is handled **automatically** by `<GlobalTracking />` in the root layout (`src/app/layout.tsx:59`). This server component calls `getGlobalTracking()` and renders `<TrackingScripts globalTracking={globalTracking} />` on **every page** site-wide.

**DO NOT add `<TrackingScripts globalTracking={globalTracking} />` to individual landing page `page.tsx` files.** This would cause double-firing of all tracking pixels.

**Audit action:** Confirm `<GlobalTracking />` is still present in `src/app/layout.tsx`. If it is, global tracking is covered — no per-page changes needed for landing pages.

#### 1b. Page-Level Tracking Overrides (Checkout/Tool Pages Only)

Checkout and tool pages can have **page-specific tracking** that overrides or supplements global tracking. Only these pages need per-page `<TrackingScripts>`:

```tsx
import { TrackingScripts } from "@/components/tracking/tracking-scripts"
import { getGlobalTracking, getPageSettings } from "@/lib/settings"

export default async function CheckoutPage({ searchParams }: PageProps) {
  const params = await searchParams
  // ... A/B test params ...

  const globalTracking = await getGlobalTracking()
  const pageSettings = await getPageSettings("checkout", "page-slug")

  return (
    <>
      <TrackingScripts tracking={pageSettings?.tracking} globalTracking={globalTracking} />
      <PageContent variant={variant} visitorId={visitorId} testId={testId} />
    </>
  )
}
```

**When to use this pattern:**
- Checkout pages with page-specific conversion pixels
- Tool pages with custom tracking requirements
- Any page configured in Admin -> Pages -> Settings with page-level tracking

**DO NOT use this for regular landing pages** — they inherit global tracking from root layout.

**Key files:**
- Root layout tracking: `src/app/layout.tsx` → `<GlobalTracking />`
- GlobalTracking component: `src/components/tracking/global-tracking.tsx`
- TrackingScripts component: `src/components/tracking/tracking-scripts.tsx`
- Settings: `src/lib/settings.ts` — `getGlobalTracking()`, `getPageSettings()`
- Types: `src/types/document.ts` — `TrackingConfig`

**Audit action:**
- **Landing pages:** Verify `<GlobalTracking />` is in root layout. Done — no per-page tracking needed.
- **Checkout/tool pages:** Check if page-level `<TrackingScripts>` with both `tracking` and `globalTracking` props is present. Add if missing.

#### 1c. ConversionTracker

Check `content.tsx` (the client component) includes `<ConversionTracker>` for A/B test conversion tracking.

**Required pattern in `content.tsx`:**

```tsx
import { ConversionTracker } from "@/components/ab-test/conversion-tracker"

export function PageContent({ variant, visitorId, testId }: Props) {
  return (
    <main>
      {/* Page sections */}
      <ConversionTracker
        testId={testId}
        variantId={variant}
        visitorId={visitorId}
        selector="a[href*='whop.com']"  // Adjust selector to match the page's primary CTA
      />
    </main>
  )
}
```

**Selector examples by page type:**
- Checkout links: `a[href*='whop.com']`, `a[href*='stripe']`, `a[href*='checkout']`
- Opt-in forms: `button[type='submit']`, `form[action]`
- Calendar booking: `a[href*='calendly']`, `iframe` container clicks
- Brand pink CTAs: `a.bg-\\[\\#ED0D51\\]`
- Explicit marking: Add `data-conversion="true"` to any element

**For programmatic redirects** (`window.location.href`), call `trackConversion()` before redirecting:

```tsx
import { trackConversion } from "@/components/ab-test/conversion-tracker"

async function handleClick() {
  await trackConversion(testId, variantId, visitorId)
  window.location.href = url
}
```

**Key file:** `src/components/ab-test/conversion-tracker.tsx`

---

### Step 2: Metadata & SEO

**Goal:** Every page exports proper Next.js metadata for search engines and social sharing.

**Required in `page.tsx`:**

```tsx
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Page Title | Lead Gen Jay",
  description: "Compelling 150-160 char description with primary keyword and benefit.",
  openGraph: {
    title: "Page Title | Lead Gen Jay",
    description: "Shorter OG description focused on click-through.",
    type: "website",
  },
}
```

**Audit action:** Read `page.tsx` and check for `export const metadata`. If missing or generic:
1. Write a title in format "Benefit/Topic | Lead Gen Jay"
2. Write a description (150-160 chars) using Dan Kennedy principles — lead with benefit, include specificity
3. Add openGraph with slightly different copy optimized for social sharing

---

### Step 3: Admin Registration

**Goal:** New pages appear in the admin dashboard for management.

#### Landing Pages
Landing pages auto-appear in Admin -> Pages -> Landing Pages (fetched from routes). **No action needed.**

#### Checkout Pages
Add to `checkoutPages` array in `src/app/admin/(dashboard)/pages/page.tsx`:

```tsx
const checkoutPages: CheckoutPage[] = [
  // ... existing pages ...
  {
    id: "page-slug",
    title: "Page Title",
    description: "Brief description of the checkout page.",
    url: "/page-slug",
    variants: [
      { param: "", name: "Control" },
      { param: "?v=a", name: "Variant A" },
    ],
    whopUrls: [
      { name: "Pay in Full ($X)", url: "https://whop.com/checkout/plan_XXXXX" },
    ],
  },
]
```

#### Tools / Public Pages
Add to `tools` array in `src/app/admin/(dashboard)/tools/page.tsx`:

```tsx
const tools: Tool[] = [
  // ... existing tools ...
  {
    id: "page-slug",
    title: "Page Title",
    description: "Brief description.",
    url: "/page-slug",
    accessUrl: "https://relevant-external-url.com",
    status: "active",
    icon: IconName, // Lucide icon
  },
]
```

**Audit action:** Determine the page type and add to the correct location. Landing pages need no action.

---

### Step 4: A/B Test Middleware

**Goal:** The page is wired into the A/B test system so middleware can assign variants.

#### 4a. Middleware Matcher

Add the page path to `src/middleware.ts` matcher config:

```tsx
export const config = {
  matcher: [
    "/admin/:path*",
    // A/B test paths
    "/insiders",
    "/insiders-checkout",
    "/aia-v2",
    "/aia-checkout",
    "/lead-machine",
    "/consult",
    "/new-page-here",  // <-- ADD THIS
  ],
}
```

**Critical:** Every page that reads `v`/`vid`/`tid` params MUST be in this matcher. The build-time validator (`scripts/validate-ab-test-sync.ts`) enforces this.

#### 4b. searchParams Reading

Verify `page.tsx` reads A/B test params:

```tsx
interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function Page({ searchParams }: PageProps) {
  const params = await searchParams
  const variant = typeof params.v === "string" ? params.v : "control"
  const visitorId = typeof params.vid === "string" ? params.vid : ""
  const testId = typeof params.tid === "string" ? params.tid : ""
  // ... pass to content component
}
```

#### 4c. Content Component Props

Verify `content.tsx` accepts and uses variant/visitorId/testId:

```tsx
interface Props {
  variant: string
  visitorId: string
  testId: string
}

export function PageContent({ variant, visitorId, testId }: Props) {
  // Use variant for conditional rendering
  // Pass visitorId/testId to ConversionTracker
}
```

---

### Step 5: A/B Test Proposal

**Goal:** Propose initial A/B test hypotheses based on the page content.

After reviewing the page, propose 2-3 A/B test hypotheses using the PIE framework:

```
Hypothesis: [Change] will [improve metric] because [reasoning]
Potential: [1-10] — How much improvement is possible?
Importance: [1-10] — How valuable is this page's traffic?
Ease: [1-10] — How easy is this to implement?
PIE Score: [average]
```

**Common test ideas by page type:**

| Page Type | Test Elements |
|-----------|--------------|
| Sales page | Headline, hero copy, CTA text, price display, testimonial placement |
| Checkout | Payment plan order, urgency copy, guarantee placement, trust badges |
| Opt-in | Form fields, CTA button text, value proposition, social proof |
| Booking | Calendar placement, benefit bullets, authority section |

**Optional:** Create the test in `ab_test_registry` via Supabase if Jay approves:

```sql
INSERT INTO ab_test_registry (page_path, test_name, variants, status)
VALUES (
  '/new-page',
  'new-page-headline-test',
  '[{"id":"control","name":"Control","weight":50},{"id":"a","name":"Variant A","weight":50}]'::jsonb,
  'draft'
);
```

Full A/B test documentation: `docs/ab-testing.md`

---

### Step 6: Production Checklist

**Goal:** Final verification and deployment.

#### 6a. Update CLAUDE.md

Add the new URL to the Production URLs table:

```markdown
| Page Name | https://web.leadgenjay.com/page-slug |
```

#### 6b. Update CHANGELOG.md

Add entry under `## [Unreleased]` -> `### Added`:

```markdown
### Added
- **Page Name** landing page at `/page-slug` — brief description
```

#### 6c. Build Validation

```bash
npm run build
```

This catches:
- TypeScript errors
- Missing middleware matcher entries (via `validate-ab-test-sync.ts`)
- Import errors
- Missing dependencies

**Do not proceed if build fails.** Fix all errors first.

#### 6d. Deploy

```bash
vercel --prod --yes --force
```

#### 6e. Post-Deploy Verification

After deployment, verify in the browser:
1. Open the production URL
2. Open DevTools -> Network tab
3. Confirm these scripts load:
   - `gtm.js` (Google Tag Manager)
   - `gtag/js` (Google Analytics 4, if configured directly)
   - `fbevents.js` (Meta Pixel, if configured)
   - PostHog (loaded via GTM or custom script)
4. Check Console for no tracking errors

---

## Quick Reference: Key Files

| File | Role |
|------|------|
| `src/components/tracking/tracking-scripts.tsx` | TrackingScripts component |
| `src/lib/settings.ts` | `getGlobalTracking()`, `getPageSettings()` |
| `src/components/ab-test/conversion-tracker.tsx` | ConversionTracker + `trackConversion()` |
| `src/middleware.ts` | A/B test matcher config |
| `src/app/admin/(dashboard)/pages/page.tsx` | Checkout page registration |
| `src/app/admin/(dashboard)/tools/page.tsx` | Tool/public page registration |
| `docs/landing-page-guide.md` | Full landing page architecture reference |
| `docs/ab-testing.md` | A/B testing system reference |
| `CLAUDE.md` | Production URLs table, changelog instructions |
| `CHANGELOG.md` | Release changelog |

## Opt-In Webhook (Landing Pages with Forms)

All opt-in forms MUST POST to `LANDER_OPTIN_WEBHOOK_URL`. See `docs/landing-page-guide.md` for webhook payload format and `landingPage` naming convention.

---

## Example: Full Launch of `/webinar`

```
1. READ src/app/webinar/page.tsx
   -> Missing TrackingScripts? ADD IT
   -> Missing metadata? ADD IT
   -> Missing searchParams reading? ADD IT

2. READ src/app/webinar/content.tsx
   -> Missing ConversionTracker? ADD IT with correct selector
   -> Missing variant/visitorId/testId props? ADD THEM

3. CHECK src/middleware.ts matcher
   -> "/webinar" not listed? ADD IT

4. DETERMINE page type
   -> Landing page? No admin registration needed
   -> Checkout? Add to checkoutPages in pages/page.tsx
   -> Tool? Add to tools in tools/page.tsx

5. PROPOSE A/B tests
   -> "Headline test: benefit-first vs curiosity hook"
   -> "CTA test: 'Register Now' vs 'Save My Spot'"

6. UPDATE CLAUDE.md Production URLs
7. UPDATE CHANGELOG.md
8. npm run build (must pass)
9. vercel --prod --yes --force
10. Verify tracking fires in browser DevTools
```
