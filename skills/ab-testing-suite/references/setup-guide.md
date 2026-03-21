# A/B Testing Setup Guide

Step-by-step infrastructure setup for A/B testing on Next.js + Supabase.

## Prerequisites

- Next.js 14+ with App Router
- Supabase project (with REST API enabled)
- Tailwind CSS
- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.local`

---

## Step 1: Database Setup

Run `scripts/setup-supabase.sql` against your Supabase project:

1. Open **Supabase Dashboard** → **SQL Editor**
2. Paste the entire `scripts/setup-supabase.sql` file
3. Click **Run**

This creates:
- `ab_test_registry` — Test configuration (variants, status, path patterns)
- `ab_test_events` — View and conversion event tracking
- `app_settings` — Global A/B test settings (confidence threshold, auto-winner)
- RLS policies, indexes, and triggers

The script is fully idempotent — safe to run multiple times.

**Verify:**
```sql
SELECT * FROM ab_test_registry LIMIT 1;
SELECT * FROM ab_test_events LIMIT 1;
SELECT * FROM app_settings WHERE key = 'ab_test_settings';
```

---

## Step 2: Edge Middleware

Copy `assets/middleware-handler.ts` to `src/lib/ab-test/middleware.ts`.

Then integrate into your `src/middleware.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { handleABTest } from "./lib/ab-test/middleware";

export async function middleware(request: NextRequest) {
  // A/B test variant assignment (must run first)
  const abResult = await handleABTest(request);
  if (abResult) {
    return abResult.response;
  }

  // Your other middleware logic here...

  return NextResponse.next();
}

// Add paths that have A/B tests to the matcher
export const config = {
  matcher: [
    // Add your tested page paths here:
    // "/pricing",
    // "/signup",
    // "/landing",
  ],
};
```

**Important:** Every page with an A/B test MUST be in the middleware matcher. If a page reads `searchParams.v` / `searchParams.vid` / `searchParams.tid` but isn't in the matcher, it will get 0 views because the middleware never assigns a variant.

### Cookie Prefix

The default cookie prefix is `ab_`. To customize, edit the `COOKIE_PREFIX` constant in `src/lib/ab-test/middleware.ts`.

---

## Step 3: Conversion Tracker Component

Copy `assets/conversion-tracker.tsx` to `src/components/ab-test/conversion-tracker.tsx`.

Then use in your page components:

```tsx
import { ConversionTracker, useABTestParams } from "@/components/ab-test/conversion-tracker";

export default function PricingPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const { testId, variantId, visitorId, hasABTest } = useABTestParams(searchParams);

  return (
    <main>
      {/* Your page content */}
      <h1>{variantId === "a" ? "New Headline" : "Original Headline"}</h1>

      {/* Conversion tracking */}
      {hasABTest && (
        <ConversionTracker
          testId={testId!}
          variantId={variantId!}
          visitorId={visitorId!}
        />
      )}
    </main>
  );
}
```

The component auto-detects conversion elements. To explicitly mark elements:

```html
<button data-conversion="true">Buy Now</button>
```

---

## Step 4: API Routes

Create these API routes in your Next.js app:

### `/api/ab-test/track/route.ts` — Event Tracking (Public)

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { testId, variantId, visitorId, eventType } = await request.json();

    if (!testId || !variantId || !visitorId || !eventType) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    // Don't track preview visits (empty visitorId)
    if (!visitorId) {
      return NextResponse.json({ ok: true });
    }

    const { error } = await supabase.from("ab_test_events").insert({
      test_id: testId,
      variant_id: variantId,
      visitor_id: visitorId,
      event_type: eventType,
    });

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[ab-test] Track error:", error);
    return NextResponse.json({ error: "Failed to track" }, { status: 500 });
  }
}
```

### `/api/ab-test/registry/route.ts` — List Tests with Stats

```typescript
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    // Add your authentication check here
    // e.g., verify admin session

    const { data: tests, error } = await supabase
      .from("ab_test_registry")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    // Compute stats for each test
    const testsWithStats = await Promise.all(
      (tests || []).map(async (test) => {
        const { data: events } = await supabase
          .from("ab_test_events")
          .select("variant_id, event_type")
          .eq("test_id", test.test_id);

        const variants = (test.variants || []).map((variant: { id: string }) => {
          const variantEvents = (events || []).filter(
            (e) => e.variant_id === variant.id
          );
          const views = variantEvents.filter((e) => e.event_type === "view").length;
          const conversions = variantEvents.filter(
            (e) => e.event_type === "conversion"
          ).length;
          return {
            ...variant,
            views,
            conversions,
            rate: views > 0 ? ((conversions / views) * 100).toFixed(1) : "0.0",
          };
        });

        return { ...test, variants };
      })
    );

    return NextResponse.json(testsWithStats);
  } catch (error) {
    console.error("[ab-test] Registry error:", error);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}
```

### `/api/ab-test/toggle/route.ts` — Start/Stop/Pause

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    // Add your authentication check here

    const { testId, action, winnerId } = await request.json();

    if (!testId || !action) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const updates: Record<string, unknown> = {};

    switch (action) {
      case "start":
        updates.status = "active";
        updates.is_active = true;
        updates.started_at = new Date().toISOString();
        break;
      case "stop":
        updates.status = "completed";
        updates.is_active = false;
        updates.concluded_at = new Date().toISOString();
        if (winnerId) updates.winner_variant_id = winnerId;
        break;
      case "pause":
        updates.status = "paused";
        updates.is_active = false;
        break;
      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const { error } = await supabase
      .from("ab_test_registry")
      .update(updates)
      .eq("test_id", testId);

    if (error) throw error;

    return NextResponse.json({ ok: true, status: updates.status });
  } catch (error) {
    console.error("[ab-test] Toggle error:", error);
    return NextResponse.json({ error: "Failed to toggle" }, { status: 500 });
  }
}
```

### `/api/ab-test/[testId]/route.ts` — Single Test CRUD

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  _request: NextRequest,
  { params }: { params: { testId: string } }
) {
  try {
    // Add your authentication check here

    const { data, error } = await supabase
      .from("ab_test_registry")
      .select("*")
      .eq("test_id", params.testId)
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { testId: string } }
) {
  try {
    // Add your authentication check here

    const body = await request.json();
    const { error } = await supabase
      .from("ab_test_registry")
      .update(body)
      .eq("test_id", params.testId);

    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}
```

### `/api/ab-test/[testId]/variants/[variantId]/route.ts` — Variant Toggle

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function PATCH(
  request: NextRequest,
  { params }: { params: { testId: string; variantId: string } }
) {
  try {
    // Add your authentication check here

    const { enabled } = await request.json();

    // Fetch current test
    const { data: test, error: fetchError } = await supabase
      .from("ab_test_registry")
      .select("variants")
      .eq("test_id", params.testId)
      .single();

    if (fetchError || !test) {
      return NextResponse.json({ error: "Test not found" }, { status: 404 });
    }

    // Update variant enabled status
    const variants = test.variants.map((v: { id: string }) =>
      v.id === params.variantId ? { ...v, enabled } : v
    );

    // Prevent disabling the last enabled variant
    const enabledCount = variants.filter((v: { enabled: boolean }) => v.enabled).length;
    if (enabledCount === 0) {
      return NextResponse.json(
        { error: "Cannot disable the last enabled variant" },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("ab_test_registry")
      .update({ variants })
      .eq("test_id", params.testId);

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}
```

---

## Step 5: Environment Variables

Ensure these are set in `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...  # For API routes (server-side only)
```

The anon key is used by the edge middleware (public read). The service role key is used by API routes (write access).

---

## Step 6: Validate Setup

Run the validation script:

```bash
bash .claude/skills/ab-testing-suite/scripts/validate-setup.sh
```

This checks all components are in place and reports pass/fail for each.

---

## Optional: Admin Dashboard

For a visual dashboard, create a page at `/admin/ab-tests` that:
1. Fetches tests from `GET /api/ab-test/registry`
2. Displays each test with variant stats
3. Provides start/stop/pause buttons (via `POST /api/ab-test/toggle`)
4. Shows preview links (`?v=variantId`) for each variant

This is optional — all test management can be done via the API endpoints or Claude Code commands.

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| 0 views on active test | Page path not in middleware matcher config |
| All visitors see same variant | Cookie already set — clear cookies or use incognito |
| Middleware errors in console | Check `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| 500 on track endpoint | Check `SUPABASE_SERVICE_ROLE_KEY` is set (not the anon key) |
| Variants not rendering | Page component not reading `searchParams.v` |
| Preview shows wrong variant | Cookie overrides `?v=` — this was fixed in the middleware; ensure you're using the latest version |
