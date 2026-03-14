---
name: hyros-integration
description: Add Hyros conversion tracking to new opt-in forms, checkout pages, and landing pages. Use this skill when creating new API routes that capture leads, building checkout flows, adding form submissions, or when the user mentions Hyros, attribution tracking, or conversion tracking. Also use when adding tracking to existing pages that don't yet have Hyros integration.
---

# Hyros Integration

Add server-side lead tracking and client-side checkout intent tracking via Hyros. This skill captures the exact patterns used across the Lead Gen Jay codebase.

## Architecture Overview

Three tracking layers work together:

1. **Universal Script** (client-side) — Cookie/attribution tracking on all pages. Already configured globally via Admin Settings > Custom Head Scripts. Uses custom domain `track.leadgenjay.com`. No code changes needed for new pages.

2. **Server-Side Lead API** — `trackHyrosLead()` fires in API routes on form submissions. Immune to ad blockers. This is what you add when creating new opt-in forms.

3. **Whop Purchase Integration** — Automatic via Hyros's native Whop dashboard integration. No code needed for purchase tracking.

## Adding Lead Tracking to a New Opt-In Route

When creating a new API route that captures leads (email opt-ins, form submissions), add Hyros tracking alongside the existing webhook call. The pattern is always the same — two lines: import + function call.

### Step 1: Add the tracking call

```typescript
import { trackHyrosLead } from "@/lib/hyros"

// Inside your POST handler, after validation and webhook, before the success response:
trackHyrosLead({
  email: email.toLowerCase().trim(),
  source: "your-source-name",      // kebab-case identifier for this form
  tags: ["your-page", "optin"],     // categorization tags
});
```

The call is fire-and-forget — it logs errors but never throws or blocks the response. Safe to call without awaiting.

### Step 2: Choose source and tags

Pick a descriptive `source` string in kebab-case that identifies where the lead came from. This maps to a source link in the Hyros dashboard.

Existing source strings for reference:

| Route | Source | Tags |
|-------|--------|------|
| `/api/aia/optin` | `aia-landing` | `["aia", "optin"]` |
| `/api/consult/optin` | `consult-booking` | `["consult", "optin"]` |
| `/api/lead-machine/optin` | `lead-machine` | `["lead-machine", "optin"]` |
| `/api/resources/opt-in` | `resource-{slug}` | `["resource", "optin", slug]` |

For dynamic sources (like resources), use template strings: `resource-${submission.resourceSlug}`.

### Step 3: Create matching source link in Hyros dashboard

After deploying, create a source link at https://app.hyros.com/settings/tracking/source-links:

1. Click "+ Add Source"
2. Name: your source string (e.g., `your-source-name`)
3. Tag: click "+ Add", search for `@your-source-name`, select it
4. Traffic source: select `general`
5. Click "Add sourcelink"

The source name in the dashboard must exactly match the `source` string in your code.

## Adding Checkout Intent Tracking

For checkout pages that redirect to an external payment processor (Whop), add client-side tracking before the redirect. This captures checkout *intent* before the user leaves our domain.

```typescript
// In handleCheckout(), after any GA4/analytics events, before the redirect:
try {
  const w = window as Window & { hyros?: (...args: unknown[]) => void };
  w.hyros?.("track", "initiate_checkout", { plan: selectedPlan });
} catch {}

window.location.href = checkoutUrl;
```

The `try/catch` with optional chaining ensures this never blocks checkout even if the Hyros script hasn't loaded.

## API Client Reference

The shared client lives at `src/lib/hyros.ts`. Three exported functions:

```typescript
// Lead tracking — use for opt-in forms
trackHyrosLead({ email, source, tags[] })

// Sale tracking — reserved for future use (Whop handles this natively)
trackHyrosSale({ email, amount, product })

// Event tracking — for custom conversion events
trackHyrosEvent({ email, event })
```

All functions:
- Silent no-op when `HYROS_API_KEY` env var is not set (safe for dev)
- Auth via `Bearer` token in `Authorization` header
- POST to `https://api.hyros.com/v1/{endpoint}`
- Log errors to console but never throw
- Server-only — never import in client components (`"use client"` files)

## Environment

| Variable | Where | Purpose |
|----------|-------|---------|
| `HYROS_API_KEY` | `.env.local` + Vercel | Server-side API auth |

API key from: https://app.hyros.com/settings/api

## Common Patterns

### New landing page with opt-in form
1. Create the page and form component (client-side)
2. Create the API route (server-side)
3. Add `trackHyrosLead()` to the API route (2 lines)
4. No changes needed for universal script — it loads globally
5. Deploy, then create source link in Hyros dashboard

### New checkout page
1. Build the checkout page with plan selection
2. Add `hyros?.("track", "initiate_checkout")` in `handleCheckout()` before redirect
3. Purchase tracking is automatic via Whop-Hyros integration

### New resource with opt-in gate
The resources opt-in route already uses dynamic source strings (`resource-{slug}`), so new gated resources are tracked automatically. The `resource-optin` source link in Hyros catches all of them.

## Verification

After deploying:
1. Submit a test opt-in on the new form
2. Check Vercel function logs for `[hyros]` entries (success = no log, failure = error log)
3. Verify the lead appears in the Hyros dashboard within a few minutes
4. Confirm the source attribution matches your source string

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| No leads in Hyros | Missing `HYROS_API_KEY` | Add to `.env.local` + Vercel env vars |
| `[hyros] /leads failed: 401` | Invalid/expired API key | Regenerate at app.hyros.com/settings/api |
| `[hyros] /leads failed: 422` | Missing required field | Ensure `email` and `source` are provided |
| Lead appears but wrong source | Source string mismatch | Source in code must match Hyros source link name |
| Forms still work without key | Expected behavior | The client silently no-ops when key is missing |

## Full Documentation

See `docs/hyros-guide.md` for the complete reference including universal script details, Whop integration setup, and the full architecture diagram.
