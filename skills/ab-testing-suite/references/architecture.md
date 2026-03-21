# A/B Testing Architecture

## System Overview

```bash
Database (ab_test_registry)
    ↓ cached (5 min in-memory)
Edge Middleware (variant assignment)
    ↓ sets cookie + URL params (v, vid, tid)
Page Component (renders variant content)
    ↓ includes
ConversionTracker (auto-detects conversion elements)
    ↓ POSTs to
/api/ab-test/track → ab_test_events table
```

## Zero-Flicker Variant Assignment

Variants are assigned **server-side at the edge**, before the page renders. The user never sees a flash of the wrong variant.

1. Edge middleware intercepts the request
2. Checks for an existing cookie assignment
3. If no cookie → assigns a variant by weight
4. Rewrites the URL with invisible search params: `?v=control&vid=uuid&tid=test-id`
5. Sets a cookie: `{prefix}_{testId}` = `variantId:visitorId`
6. Page component reads `searchParams.v` to determine which variant to render

The URL rewrite is invisible to the user — they see `/pricing`, not `/pricing?v=control&vid=...`.

## Cookie Format

```text
Cookie name:  {COOKIE_PREFIX}{testId}
Cookie value: {variantId}:{visitorId}
Max age:      30 days
SameSite:     lax
HttpOnly:     false (client-side tracking needs to read it)
```

Example: `ab_pricing-headline-v1` = `control:550e8400-e29b-41d4-a716-446655440000`

## Cache Strategy

The edge middleware caches test definitions in-memory to avoid hitting Supabase on every request.

**Fallback chain:**
1. **In-memory cache** — Valid for 5 minutes. Fastest.
2. **Supabase REST API** — Fresh data. 3-second timeout.
3. **Empty Map** — If both fail, no tests run. No error for visitors.

Cache is automatically refreshed after 5 minutes. Call `invalidateTestsCache()` after updating test configuration to force a refresh.

## Status Priority (Path Collision Handling)

Multiple test rounds can share the same `path_pattern` (e.g., `pricing-headline-v1`, `pricing-headline-v2` both targeting `/pricing`).

The middleware builds a `Map<path_pattern, test>` from all non-draft tests. When multiple tests match the same path, **STATUS_PRIORITY** determines which test wins:

| Status | Priority | Behavior |
|--------|----------|----------|
| `active` | 2 (highest) | Always wins — gets all traffic |
| `paused` | 1 | Only wins if no active test exists |
| `completed` | 0 (lowest) | Serves winner variant; never overwrites active/paused |

This means:
- Active tests always take precedence
- No manual cleanup needed between test rounds
- Old completed tests safely remain in the database

## Preview Mode

Add `?v=variantId` to any URL to preview a specific variant:

```text
/pricing?v=a        → Shows variant A
/pricing?v=control  → Shows control
```

Preview behavior:
- No cookie is set (doesn't affect real visitor assignments)
- `vid` and `tid` are set to empty strings
- Views are not tracked (empty visitorId is ignored by the tracking API)
- Useful for admin review and QA before activating a test

## Variant Assignment Algorithm

When assigning a new variant, the middleware redistributes weights equally among **enabled** variants only:

```typescript
// If 3 variants exist but only 2 are enabled:
// Each enabled variant gets 50% (not their original weights)
const equalWeight = 100 / enabledVariants.length;
```

This means:
- Disabling a variant immediately redistributes its traffic
- Users with cookies for disabled variants get reassigned on next visit (keeping their visitor ID)
- The last enabled variant cannot be disabled

## Event Tracking

The `ConversionTracker` component handles two event types:

### Views
- Tracked automatically on component mount
- Deduplicated via `useRef` — only one view per page load
- Preview visits (empty `visitorId`) are ignored by the API

### Conversions
- Auto-detected by scanning the page for conversion elements
- Detection priority: checkout links → submit buttons → forms → primary buttons → `[data-conversion="true"]`
- Deduplicated — only one conversion per page load
- For programmatic redirects (`window.location.href`), call `trackConversion()` manually before redirecting

## Database Schema

### `ab_test_registry` — Test Configuration

| Column | Type | Purpose |
|--------|------|---------|
| `test_id` | TEXT (unique) | Identifier, e.g., "pricing-headline-v1" |
| `name` | TEXT | Human-readable name |
| `description` | TEXT | Hypothesis + results documentation |
| `path_pattern` | TEXT | URL path to match |
| `variants` | JSONB | `[{id, name, weight, enabled}]` |
| `status` | TEXT | draft → active → paused → completed |
| `winner_variant_id` | TEXT | Set when test concludes |
| `confidence_threshold` | INT | 90 or 95 |
| `auto_select_winner` | BOOL | Auto-conclude at threshold |
| `webhook_url` | TEXT | Notification URL |
| `conversion_selector` | TEXT | Custom CSS selector |
| `started_at` | TIMESTAMPTZ | When activated |
| `concluded_at` | TIMESTAMPTZ | When completed |

### `ab_test_events` — Event Tracking

| Column | Type | Purpose |
|--------|------|---------|
| `test_id` | TEXT | Reference to registry |
| `variant_id` | TEXT | Which variant |
| `event_type` | ENUM | "view" or "conversion" |
| `visitor_id` | TEXT | Cookie-based visitor ID |
| `created_at` | TIMESTAMPTZ | Timestamp |

## API Endpoints

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/ab-test/track` | POST | Public | Track view/conversion events |
| `/api/ab-test/registry` | GET | Authenticated | List all tests with stats |
| `/api/ab-test/toggle` | POST | Authenticated | Start/stop/pause tests |
| `/api/ab-test/[testId]` | GET | Authenticated | Get single test details |
| `/api/ab-test/[testId]` | PATCH | Authenticated | Update test configuration |
| `/api/ab-test/[testId]/variants/[variantId]` | PATCH | Authenticated | Enable/disable variant |

The track endpoint must be public (called from the client). All admin endpoints should require authentication.
