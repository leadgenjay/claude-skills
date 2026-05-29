"use client";

/**
 * A/B Test Conversion Tracker
 *
 * Drop-in component that tracks a VIEW on mount and, optionally, a CONVERSION
 * on click. Read references/tracking-gotchas.md before wiring this — the single
 * most common way to corrupt A/B data is firing the conversion in the wrong
 * place. Decide the conversion model FIRST:
 *
 *   ┌─ Opt-in / lead form (the conversion IS the form submit)
 *   │    → Do NOT click-track. Pass trackConversions={false} and fire the
 *   │      conversion SERVER-SIDE from your form-submit success handler.
 *   │      A click listener on a submit button double-fires on validation
 *   │      retries, double-clicks, and abandoned submits (LGJ 2026-05-15 bug).
 *   │
 *   ├─ Pure CTA / outbound checkout link (the conversion IS the click)
 *   │    → Click-track. Auto-detect covers outbound purchase links, OR pass an
 *   │      explicit `selector` / mark elements with [data-conversion="true"].
 *   │      For programmatic redirects, call trackConversion() before navigating.
 *   │
 *   └─ Post-opt-in checkout (visitor already opted in upstream)
 *        → Client click is canonical; don't reconcile against the upstream test.
 *
 * IMPORTANT — auto-detect is intentionally conservative. It matches ONLY
 * outbound purchase/checkout links (Stripe/Shopify/Whop/etc.). It will NOT
 * auto-attach to submit buttons or <form> elements, because those are almost
 * always opt-in forms that must be tracked server-side. To click-track a
 * non-link element, opt in explicitly via `selector` or [data-conversion="true"].
 *
 * SETUP:
 * 1. Copy this file to src/components/ab-test/conversion-tracker.tsx
 * 2. In your page component, extract v/vid/tid from searchParams via useABTestParams
 * 3. Mount <ConversionTracker .../> ONCE at the OUTERMOST root of the page —
 *    never inside a conditionally-rendered step/branch. A multi-return SPA that
 *    remounts the tracker resets its view-dedup ref and re-fires the view event
 *    (2-3x inflation for any visitor who advances a step).
 *
 * ATTRIBUTION CAVEAT (cookie leak): always derive testId/variantId/visitorId from
 * THIS page's search params (what the edge middleware assigned for THIS request),
 * never by reading "the first ab_* cookie" — a visitor who hit another test earlier
 * carries the wrong test_id and silently mis-attributes every conversion.
 *
 * USAGE EXAMPLE (CTA / outbound checkout — click-tracked):
 * ```tsx
 * import { ConversionTracker, useABTestParams } from "@/components/ab-test/conversion-tracker";
 *
 * export default function PricingPage({ searchParams }) {
 *   const { testId, variantId, visitorId, hasABTest } = useABTestParams(searchParams);
 *
 *   return (
 *     <>
 *       {hasABTest && (
 *         <ConversionTracker
 *           testId={testId!}
 *           variantId={variantId!}
 *           visitorId={visitorId!}
 *         />
 *       )}
 *       {/* Page content */}
 *     </>
 *   );
 * }
 * ```
 *
 * USAGE EXAMPLE (opt-in form — view-only; conversion fires server-side):
 * ```tsx
 * <ConversionTracker testId={testId!} variantId={variantId!} visitorId={visitorId!}
 *   trackConversions={false} />
 * // ...then, in the opt-in API route's success path, record the conversion
 * // against (testId, variantId, visitorId) server-side.
 * ```
 *
 * FOR PROGRAMMATIC REDIRECTS (window.location.href):
 * Call trackConversion() manually BEFORE redirecting:
 * ```tsx
 * import { trackConversion } from "@/components/ab-test/conversion-tracker";
 *
 * async function handleCheckout() {
 *   await trackConversion(testId, variantId, visitorId);
 *   window.location.href = checkoutUrl;
 * }
 * ```
 */

import { useEffect, useRef, useCallback } from "react";

// ============================================================
// Configuration
// ============================================================

/** API endpoint for tracking events. Change if your route differs. */
const TRACK_ENDPOINT = "/api/ab-test/track";

// ============================================================
// Types
// ============================================================

interface ConversionTrackerProps {
  /** Test ID from registry */
  testId: string;
  /** Assigned variant ID */
  variantId: string;
  /** Unique visitor ID */
  visitorId: string;
  /**
   * Custom CSS selector for conversion elements. If omitted, auto-detection
   * matches OUTBOUND PURCHASE LINKS ONLY (never submit buttons / forms — those
   * are opt-in forms that must be tracked server-side). Mark any other element
   * with [data-conversion="true"] to click-track it.
   */
  selector?: string;
  /** Whether to track view events (default: true) */
  trackViews?: boolean;
  /**
   * Whether to attach click-based conversion tracking (default: true).
   * Set FALSE for opt-in / lead-form pages, where the conversion is the form
   * submit and must be recorded server-side — never via a submit-button click
   * listener (double-fires on retries / abandoned submits).
   */
  trackConversions?: boolean;
}

// ============================================================
// Component
// ============================================================

export function ConversionTracker({
  testId,
  variantId,
  visitorId,
  selector,
  trackViews = true,
  trackConversions = true,
}: ConversionTrackerProps) {
  const viewTrackedRef = useRef(false);
  const conversionTrackedRef = useRef(false);

  const trackEvent = useCallback(
    async (eventType: "view" | "conversion") => {
      try {
        await fetch(TRACK_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ testId, variantId, visitorId, eventType }),
        });
      } catch (error) {
        console.error(`[ab-test] Failed to track ${eventType}:`, error);
      }
    },
    [testId, variantId, visitorId]
  );

  // Track view on mount
  useEffect(() => {
    if (!trackViews || viewTrackedRef.current) return;
    viewTrackedRef.current = true;
    trackEvent("view");
  }, [trackViews, trackEvent]);

  // Set up conversion tracking (click-based). Skipped for opt-in / lead-form
  // pages (trackConversions={false}) — those fire the conversion server-side.
  useEffect(() => {
    if (!trackConversions) return;

    const selectors: string[] = [];

    // Add provided selector, or auto-detect OUTBOUND PURCHASE LINKS ONLY.
    // (Never submit buttons / forms — those are opt-in forms, server-side only.)
    const primarySelector = selector || detectConversionElement();
    if (primarySelector) {
      selectors.push(primarySelector);
    }

    // Always include elements explicitly marked for conversion tracking
    selectors.push('[data-conversion="true"]');

    const combinedSelector = selectors.join(", ");
    const elements = document.querySelectorAll(combinedSelector);
    if (elements.length === 0) return;

    const handleClick = () => {
      if (conversionTrackedRef.current) return;
      conversionTrackedRef.current = true;
      trackEvent("conversion");
    };

    elements.forEach((el) => el.addEventListener("click", handleClick));

    return () => {
      elements.forEach((el) => el.removeEventListener("click", handleClick));
    };
  }, [selector, trackConversions, trackEvent]);

  return null; // Renders nothing — side-effect only
}

// ============================================================
// Auto-Detection
// ============================================================

/**
 * Auto-detect the primary conversion element on the page.
 *
 * SCOPE — outbound purchase/checkout links ONLY (Stripe, Shopify, Gumroad,
 * Whop, Paddle, LemonSqueezy, /checkout, /buy). These are unambiguous one-shot
 * conversions where the click IS the conversion.
 *
 * Deliberately does NOT match submit buttons, <form> elements, or primary-styled
 * buttons: those are almost always opt-in / lead forms, where a click listener
 * double-fires on validation retries, double-clicks, and abandoned submits
 * (the LGJ 2026-05-15 click-vs-opt-in bug). Track opt-in conversions server-side
 * from the form-submit success handler instead. To click-track any non-link
 * element on purpose, opt in explicitly via `selector` or [data-conversion="true"].
 */
function detectConversionElement(): string | null {
  const checkoutPatterns = [
    "a[href*='checkout']",
    "a[href*='stripe']",
    "a[href*='shopify']",
    "a[href*='gumroad']",
    "a[href*='whop.com']",
    "a[href*='paddle']",
    "a[href*='lemonsqueezy']",
    "a[href*='buy']",
  ];

  for (const pattern of checkoutPatterns) {
    if (document.querySelector(pattern)) return pattern;
  }

  return null;
}

// ============================================================
// Utilities
// ============================================================

/**
 * Extract A/B test tracking info from URL search params.
 * Use in page components to get the variant assignment from middleware.
 */
export function useABTestParams(searchParams: {
  [key: string]: string | string[] | undefined;
}) {
  const v = typeof searchParams.v === "string" ? searchParams.v : undefined;
  const vid =
    typeof searchParams.vid === "string" ? searchParams.vid : undefined;
  const tid =
    typeof searchParams.tid === "string" ? searchParams.tid : undefined;

  return {
    variantId: v,
    visitorId: vid,
    testId: tid,
    hasABTest: Boolean(v && vid && tid),
  };
}

/**
 * Track a conversion programmatically.
 *
 * Use this in click handlers that do programmatic redirects
 * (window.location.href) where the ConversionTracker can't
 * intercept the click.
 *
 * @example
 * async function handleCheckout() {
 *   await trackConversion(testId, variantId, visitorId);
 *   window.location.href = checkoutUrl;
 * }
 */
export async function trackConversion(
  testId: string,
  variantId: string,
  visitorId: string
): Promise<void> {
  if (!testId || !variantId || !visitorId) {
    console.warn("[ab-test] trackConversion: Missing required parameters");
    return;
  }

  try {
    await fetch(TRACK_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ testId, variantId, visitorId, eventType: "conversion" }),
    });
  } catch (error) {
    console.error("[ab-test] Failed to track conversion:", error);
  }
}
