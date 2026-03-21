/**
 * A/B Test Middleware Handler
 *
 * Edge-compatible variant assignment for A/B tests.
 * Runs in Next.js Edge Middleware for zero-flicker experience.
 *
 * SETUP:
 * 1. Copy this file to src/lib/ab-test/middleware.ts
 * 2. In your src/middleware.ts, import and call handleABTest(request)
 * 3. Ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set
 *
 * INTEGRATION EXAMPLE (src/middleware.ts):
 * ```typescript
 * import { handleABTest } from "./lib/ab-test/middleware";
 *
 * export async function middleware(request: NextRequest) {
 *   const abResult = await handleABTest(request);
 *   if (abResult) return abResult.response;
 *   return NextResponse.next();
 * }
 *
 * export const config = {
 *   matcher: ["/pricing", "/signup", "/landing"],
 * };
 * ```
 */

import { NextRequest, NextResponse } from "next/server";

// ============================================================
// Configuration — customize these for your project
// ============================================================

/** Cookie name prefix for A/B test assignments */
export const COOKIE_PREFIX = "ab_";

/** Cookie max age in seconds (30 days) */
export const COOKIE_MAX_AGE = 30 * 24 * 60 * 60;

/** Cache duration for test config (5 minutes) */
const CACHE_DURATION_MS = 5 * 60 * 1000;

/** Fetch timeout for Supabase REST API (3 seconds) */
const FETCH_TIMEOUT_MS = 3000;

// ============================================================
// Types
// ============================================================

export interface ABTestVariant {
  id: string;
  name: string;
  weight: number;
  enabled: boolean;
}

export interface ABTestDefinition {
  testId: string;
  name: string;
  description?: string;
  pathPattern: string;
  variants: ABTestVariant[];
  conversionSelector?: string;
  status: "draft" | "active" | "paused" | "completed";
  winnerVariantId?: string;
}

export interface ABTestResult {
  test?: ABTestDefinition;
  variantId?: string;
  visitorId?: string;
  isNewAssignment: boolean;
}

// ============================================================
// Cache
// ============================================================

let testsCache: Map<string, ABTestDefinition> | null = null;
let cacheTimestamp = 0;

/**
 * Fetch all active tests from Supabase with caching.
 * Edge-compatible using REST API (no Node.js dependencies).
 */
async function fetchActiveTests(): Promise<Map<string, ABTestDefinition>> {
  if (testsCache && Date.now() - cacheTimestamp < CACHE_DURATION_MS) {
    return testsCache;
  }

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error("[ab-test] Missing Supabase environment variables");
      return testsCache || new Map();
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    const response = await fetch(
      `${supabaseUrl}/rest/v1/ab_test_registry?select=test_id,name,description,path_pattern,variants,conversion_selector,status,winner_variant_id,is_active&or=(status.eq.active,status.eq.paused,status.eq.completed)`,
      {
        headers: {
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${supabaseAnonKey}`,
        },
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error("[ab-test] Failed to fetch tests:", response.status);
      return testsCache || new Map();
    }

    const data = await response.json();
    const testsMap = new Map<string, ABTestDefinition>();

    // Status priority: active tests always win over completed/paused
    // when multiple tests share the same path_pattern (e.g., test rounds)
    const STATUS_PRIORITY: Record<string, number> = {
      completed: 0,
      paused: 1,
      active: 2,
    };

    for (const row of data || []) {
      const rowStatus = row.status || (row.is_active ? "active" : "draft");
      const newPriority = STATUS_PRIORITY[rowStatus] ?? 0;
      const existing = testsMap.get(row.path_pattern);
      const existingPriority = existing
        ? (STATUS_PRIORITY[existing.status] ?? 0)
        : -1;

      if (newPriority > existingPriority) {
        testsMap.set(row.path_pattern, {
          testId: row.test_id,
          name: row.name,
          description: row.description,
          pathPattern: row.path_pattern,
          variants: row.variants || [],
          conversionSelector: row.conversion_selector,
          status: rowStatus,
          winnerVariantId: row.winner_variant_id,
        });
      }
    }

    testsCache = testsMap;
    cacheTimestamp = Date.now();
    return testsMap;
  } catch (error) {
    console.error("[ab-test] Error fetching tests:", error);
    return testsCache || new Map();
  }
}

/**
 * Get test definition for a given URL path.
 * Matches exact paths first, then tries regex patterns.
 */
async function getTestForPath(
  path: string
): Promise<ABTestDefinition | undefined> {
  const tests = await fetchActiveTests();

  // Exact match first
  if (tests.has(path)) {
    return tests.get(path);
  }

  // Regex match for complex patterns
  for (const [pattern, test] of tests.entries()) {
    try {
      if (/[*+?^${}()|[\]\\]/.test(pattern)) {
        const regex = new RegExp(pattern);
        if (regex.test(path)) {
          return test;
        }
      }
    } catch {
      // Invalid regex, skip
    }
  }

  return undefined;
}

/**
 * Assign a variant based on weights from enabled variants only.
 * Redistributes weights equally among enabled variants.
 */
function assignVariantByWeight(variants: ABTestVariant[]): string {
  const enabledVariants = variants.filter((v) => v.enabled);

  if (enabledVariants.length === 0) return "control";
  if (enabledVariants.length === 1) return enabledVariants[0].id;

  const equalWeight = 100 / enabledVariants.length;
  const totalWeight = enabledVariants.length * equalWeight;
  const random = Math.random() * totalWeight;

  let cumulative = 0;
  for (const variant of enabledVariants) {
    cumulative += equalWeight;
    if (random < cumulative) return variant.id;
  }

  return enabledVariants[0].id;
}

/**
 * Parse variant assignment from cookie.
 * Cookie format: "variantId:visitorId"
 */
function parseCookie(
  value: string
): { variantId: string; visitorId: string } | null {
  const parts = value.split(":");
  if (parts.length !== 2) return null;
  return { variantId: parts[0], visitorId: parts[1] };
}

/**
 * Generate a unique visitor ID (Edge Runtime compatible).
 */
function generateVisitorId(): string {
  return crypto.randomUUID();
}

/**
 * Handle A/B test variant assignment in middleware.
 *
 * 1. Checks if the path matches an active test
 * 2. Assigns variant (from cookie or new random assignment)
 * 3. Rewrites URL to include variant params (invisible to user)
 * 4. Sets/refreshes tracking cookie
 *
 * @returns Response with variant assignment, or null if no test matches
 */
export async function handleABTest(
  request: NextRequest
): Promise<{ response: NextResponse; result: ABTestResult } | null> {
  const path = request.nextUrl.pathname;
  const test = await getTestForPath(path);

  if (!test) return null;

  const cookieName = `${COOKIE_PREFIX}${test.testId}`;
  const existingCookie = request.cookies.get(cookieName);

  let variantId: string;
  let visitorId: string;
  let isNewAssignment = false;

  // Preview mode: explicit ?v= in URL bypasses assignment
  // Used for admin previews — doesn't set cookie, doesn't count as view
  const explicitVariant = request.nextUrl.searchParams.get("v");
  if (explicitVariant) {
    const isValidVariant = test.variants.some((v) => v.id === explicitVariant);
    if (isValidVariant) {
      const url = request.nextUrl.clone();
      url.searchParams.set("vid", "");
      url.searchParams.set("tid", "");
      const response = NextResponse.rewrite(url);
      return {
        response,
        result: {
          test,
          variantId: explicitVariant,
          visitorId: "",
          isNewAssignment: false,
        },
      };
    }
  }

  // Winner takes all: completed test with winner serves that variant
  if (test.winnerVariantId) {
    variantId = test.winnerVariantId;
    visitorId = existingCookie
      ? parseCookie(existingCookie.value)?.visitorId || generateVisitorId()
      : generateVisitorId();
  }
  // Active test: check cookie or assign new variant
  else if (test.status === "active") {
    if (existingCookie) {
      const parsed = parseCookie(existingCookie.value);
      if (parsed) {
        const variant = test.variants.find((v) => v.id === parsed.variantId);
        if (variant && variant.enabled) {
          variantId = parsed.variantId;
          visitorId = parsed.visitorId;
        } else {
          // Variant was disabled — reassign but keep visitor ID
          variantId = assignVariantByWeight(test.variants);
          visitorId = parsed.visitorId;
          isNewAssignment = true;
        }
      } else {
        variantId = assignVariantByWeight(test.variants);
        visitorId = generateVisitorId();
        isNewAssignment = true;
      }
    } else {
      variantId = assignVariantByWeight(test.variants);
      visitorId = generateVisitorId();
      isNewAssignment = true;
    }
  }
  // Not active and no winner — serve control
  else {
    variantId = "control";
    visitorId = existingCookie
      ? parseCookie(existingCookie.value)?.visitorId || generateVisitorId()
      : generateVisitorId();
  }

  // Rewrite URL with variant params (invisible to user)
  const url = request.nextUrl.clone();
  url.searchParams.set("v", variantId);
  url.searchParams.set("vid", visitorId);
  url.searchParams.set("tid", test.testId);

  const response = NextResponse.rewrite(url);

  // Set/refresh cookie for variant persistence
  response.cookies.set(cookieName, `${variantId}:${visitorId}`, {
    maxAge: COOKIE_MAX_AGE,
    path: "/",
    sameSite: "lax",
    httpOnly: false, // Allow client-side reading for tracking
  });

  return {
    response,
    result: { test, variantId, visitorId, isNewAssignment },
  };
}

/**
 * Invalidate the tests cache.
 * Call after updating test configuration.
 */
export function invalidateTestsCache(): void {
  testsCache = null;
  cacheTimestamp = 0;
}
