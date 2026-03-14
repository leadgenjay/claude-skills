---
name: google-tracking
description: Configure Google tracking (GTM, GA4, tag scanning) and the full tracking infrastructure for Lead Gen Jay pages. Use this skill when setting up Google Tag Manager, configuring GA4, debugging tracking issues, auditing tag coverage, or querying analytics data. Also use when the user mentions GTM, GA4, Google Analytics, tag scanning, or tracking configuration.
---

# Google Tracking

Configure and manage the full Google tracking stack — GTM container management, GA4 analytics, live tag scanning, and custom script injection. This skill captures the exact architecture and patterns used across Lead Gen Jay.

## Architecture Overview

Three layers handle Google tracking, each serving a distinct purpose:

1. **GTM (primary)** — Google Tag Manager container loaded globally via admin settings. Manages all Google tags (GA4, Google Ads, etc.) from a single container. This is the recommended approach.

2. **GA4 standalone (fallback)** — Direct gtag.js injection. Auto-skipped when GTM is configured to prevent double-counting. Only used when GTM is not set up.

3. **GA4 Data API (server-side)** — Service account authenticated API for querying analytics data. Powers the admin analytics dashboard. No client-side involvement.

## Configuration Flow

```
Admin Settings UI (/admin/settings)
  → app_settings table (Supabase, key: "global_tracking")
    → GlobalTracking server component (fetches config)
      → TrackingScripts client component (renders scripts)
        → Next.js <Script> elements (afterInteractive strategy)
```

## Key Files

| File | Purpose |
|------|---------|
| `src/components/tracking/tracking-scripts.tsx` | Client component: renders GTM, GA4, FB Pixel, custom scripts as Next.js `<Script>` elements |
| `src/components/tracking/global-tracking.tsx` | Server component: fetches config from Supabase via `getGlobalTracking()`, passes to TrackingScripts |
| `src/lib/settings.ts` | Settings API with 5-min in-memory cache (`getGlobalTracking`, `updateGlobalTracking`) |
| `src/lib/analytics/ga4-client.ts` | GA4 Data API client using `@google-analytics/data` — runs 6 parallel report queries |
| `src/lib/analytics/cache.ts` | 10-min in-memory cache for analytics API responses |
| `src/lib/website/tag-scanner.ts` | Live HTML scanner: fetches page HTML and detects GA4, GTM, Meta Pixel, PostHog via regex |
| `src/types/document.ts` | `TrackingConfig` interface definition |
| `src/app/api/admin/settings/global-tracking/route.ts` | GET/PATCH API for global tracking config (admin-authenticated) |
| `src/app/api/admin/analytics/route.ts` | GA4 analytics data endpoint for admin dashboard |
| `src/app/api/admin/website/tracking/route.ts` | Tracking coverage audit endpoint — checks all pages against configured tags |

## TrackingConfig Interface

The core type used everywhere tracking is configured:

```typescript
interface TrackingConfig {
  googleAnalyticsId?: string;      // G-XXXXXXX
  facebookPixelId?: string;        // Numeric pixel ID
  googleTagManagerId?: string;     // GTM-XXXXXX
  customHeadScripts?: string;      // Raw HTML <script> tags or pure JS
  customBodyScripts?: string;      // Raw HTML <script> tags or pure JS
}
```

Defined in `src/types/document.ts`. Used by both global settings and per-page settings (`page_settings` table).

## Environment Variables

| Variable | Purpose | Required For |
|----------|---------|-------------|
| `GA4_SERVICE_ACCOUNT_EMAIL` | Google service account email | GA4 Data API (analytics dashboard) |
| `GA4_PRIVATE_KEY` | Service account private key (replace `\\n` with real newlines) | GA4 Data API |
| `GA4_PROPERTY_ID` | GA4 property ID for report queries | GA4 Data API |
| `GOOGLE_PSI_API_KEY` | PageSpeed Insights API key | Performance tab (optional) |

The GA4 Data API variables are only needed for the admin analytics dashboard. Client-side tracking (GTM/GA4 scripts) is configured entirely through the admin UI.

## GTM-First Strategy

The codebase enforces a GTM-first approach to prevent double-counting:

```typescript
// In tracking-scripts.tsx
const shouldLoadGA4 = googleAnalyticsId && !googleTagManagerId;
```

**Rules:**
- When `googleTagManagerId` is set, the standalone GA4 `gtag.js` script is **never loaded**
- GA4 should be configured as a tag **inside** GTM instead
- A dev console warning fires if both GTM and standalone GA4 IDs are configured
- Custom third-party scripts (Hyros, LinkedIn, TikTok, etc.) go in `customHeadScripts`

**Script loading strategies:**
- Head scripts (GTM, GA4, FB Pixel, custom head): `afterInteractive` — loads after page hydration
- Body scripts (custom body): `lazyOnload` — loads when browser is idle
- GTM noscript iframe: rendered directly in body as `<noscript>` fallback

## Setting Up GTM

### Via Admin UI (recommended)
1. Go to `/admin/settings`
2. Enter GTM container ID (e.g., `GTM-XXXXXXX`) in the Google Tag Manager field
3. Leave Google Analytics ID empty (configure GA4 inside GTM instead)
4. Save — changes take effect within 5 minutes (cache TTL)

### Via API
```bash
curl -X PATCH /api/admin/settings/global-tracking \
  -H "Content-Type: application/json" \
  -d '{"tracking": {"googleTagManagerId": "GTM-XXXXXXX"}}'
```

Requires admin authentication via Supabase session cookie.

### Database
Config is stored in the `app_settings` table:
```sql
-- key: 'global_tracking', value: JSONB TrackingConfig
SELECT value FROM app_settings WHERE key = 'global_tracking';
```

## Adding Custom Tracking Scripts

Third-party scripts (Hyros universal, LinkedIn Insight, TikTok Pixel, etc.) go in the Custom Head Scripts field.

### Via Admin UI
1. Go to `/admin/settings`
2. Paste script tags into the "Custom Head Scripts" field
3. Supports both raw `<script>` HTML and pure JavaScript

### How parseScriptTags works

The `parseScriptTags()` function in `tracking-scripts.tsx` handles three input formats:

1. **External scripts:** `<script src="https://example.com/script.js"></script>` → renders as `<Script src="..." strategy="afterInteractive" />`
2. **Inline scripts:** `<script>console.log("hello")</script>` → renders as `<Script dangerouslySetInnerHTML={{__html: '...'}} />`
3. **Raw JS (legacy):** `console.log("hello")` → treated as inline script (backward compatible)

Multiple `<script>` tags in a single field are supported — each becomes its own Next.js `<Script>` element.

## GA4 Data API Usage

The analytics dashboard uses `fetchAnalyticsData(dateRange)` from `src/lib/analytics/ga4-client.ts`. It runs 6 parallel report queries via `Promise.all`:

| Query | Returns |
|-------|---------|
| Summary metrics | Total pageviews, users, sessions, avg session duration |
| Top pages | Top 20 pages by pageviews with titles |
| Traffic over time | Daily pageviews and users |
| Traffic sources | Top 10 source/medium pairs by sessions |
| Device breakdown | Desktop/mobile/tablet split with percentages |
| App pages | Top 100 pages categorized as landing/checkout/tool/resource |

### Page categorization

Pages are auto-categorized based on path prefixes:
- **Landing:** `/insiders`, `/97-new`, `/aia`, `/cheatsheet`
- **Checkout:** `/insiders-checkout`, `/aia-checkout`
- **Tool:** `/tools/*`, `/skills`
- **Resource:** `/r/*`, `/doc/*`, `/downloads`

### Caching
- Analytics responses cached for 10 minutes in-memory (`src/lib/analytics/cache.ts`)
- Global tracking config cached for 5 minutes (`src/lib/settings.ts`)
- Pass `bustCache: true` to `fetchAnalyticsData()` to force a fresh fetch

### Authentication
Uses `BetaAnalyticsDataClient` from `@google-analytics/data` with service account credentials:

```typescript
new BetaAnalyticsDataClient({
  credentials: {
    client_email: process.env.GA4_SERVICE_ACCOUNT_EMAIL,
    private_key: process.env.GA4_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  },
});
```

## Tag Scanner (Verification)

The tag scanner in `src/lib/website/tag-scanner.ts` verifies that tracking tags are actually present in rendered page HTML.

### Functions

```typescript
// Scan a single page
scanPageTags(url: string, path: string): Promise<TagScanResult>

// Batch scan with concurrency limit (default: 3)
scanBatchTags(pages: { url, path }[], concurrency?: number): Promise<TagScanSummary>
```

### Detection patterns

| Tag | Detection Method |
|-----|-----------------|
| **GA4** | `googletagmanager.com/gtag/js?id=G-*`, `gtag('config', 'G-*')`, `G-` ID in any script |
| **GTM** | `googletagmanager.com/gtm.js?id=GTM-*`, `GTM-` container ID in any context |
| **Meta Pixel** | `fbq('init', '...')`, `connect.facebook.net/.../fbevents.js`, `facebook.com/tr?id=` |
| **PostHog** | `posthog` string presence, `us.i.posthog.com`, `ph.init()` |

### Tracking coverage audit

The `/api/admin/website/tracking` endpoint combines tag scanner data with configured settings to produce a coverage matrix showing which tags are active on which pages.

### Admin UI

The Website Management dashboard (`/admin/website`) has a Tracking tab that displays:
- Coverage percentages per tag type
- Per-page tag presence matrix
- Live scan results vs configured settings

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| Double-counting pageviews | Both GTM and standalone GA4 configured | Remove `googleAnalyticsId` — configure GA4 inside GTM instead |
| Tags missing from scan results | Settings cache stale (5-min TTL) | Wait for cache expiry or call `clearSettingsCache()` |
| Custom script crashes page | Raw HTML pasted incorrectly | Ensure valid `<script>` tags — `parseScriptTags()` handles both HTML and raw JS |
| `SyntaxError: Unexpected token '<'` | Legacy bug (now fixed) | Already fixed — `parseScriptTags()` properly handles `<script>` HTML |
| GA4 Data API returns empty | Missing env vars | Set `GA4_SERVICE_ACCOUNT_EMAIL`, `GA4_PRIVATE_KEY`, `GA4_PROPERTY_ID` |
| GA4 private key auth fails | `\\n` not replaced | Key must have real newlines — `.replace(/\\n/g, "\n")` handles this |
| Analytics dashboard 503 | GA4 not configured | Set all three GA4 env vars in `.env.local` and Vercel |
| Tag scanner timeout | Page takes >15s to respond | Scanner uses 15s `AbortSignal.timeout` — check if page is slow |
| Coverage audit shows 0% | No tracking configured at all | Configure at least GTM or GA4 in admin settings |

## Relationship to Other Tracking

- **Hyros:** Server-side lead tracking via `src/lib/hyros.ts`. Universal script loaded via `customHeadScripts`. See the `hyros-integration` skill.
- **PostHog:** Loaded via `customHeadScripts`. Detected by tag scanner. MCP server available for querying.
- **Meta Pixel:** Has dedicated `facebookPixelId` field in TrackingConfig. Loaded by TrackingScripts directly.
- **Other pixels (LinkedIn, TikTok, Google Ads):** All go in `customHeadScripts` as raw `<script>` tags.

## Common Patterns

### Setting up tracking for a new project
1. Get GTM container ID from Google Tag Manager
2. Configure GA4 as a tag inside GTM (not standalone)
3. Enter GTM ID in admin settings
4. Add any third-party scripts to Custom Head Scripts
5. Verify with tag scanner or admin Website > Tracking tab

### Adding GA4 Data API for analytics dashboard
1. Create a Google Cloud service account
2. Grant it Viewer access to the GA4 property
3. Set `GA4_SERVICE_ACCOUNT_EMAIL`, `GA4_PRIVATE_KEY`, `GA4_PROPERTY_ID` in `.env.local`
4. Add the same vars to Vercel environment
5. Analytics dashboard at `/admin/website` will start showing data

### Debugging missing tracking
1. Check admin settings — is GTM/GA4 configured?
2. Run tag scanner from `/admin/website` Tracking tab
3. Compare configured IDs vs detected IDs
4. Check browser dev console for loading errors
5. Verify the `GlobalTracking` component is in the root layout
