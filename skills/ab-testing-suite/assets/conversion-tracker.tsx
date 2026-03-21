"use client";

/**
 * A/B Test Conversion Tracker
 *
 * Drop-in component that automatically tracks views and conversions
 * for A/B tests. Detects conversion elements (checkout links, forms,
 * submit buttons) and tracks click events.
 *
 * SETUP:
 * 1. Copy this file to src/components/ab-test/conversion-tracker.tsx
 * 2. In your page component, extract v/vid/tid from searchParams
 * 3. Render <ConversionTracker testId={tid} variantId={v} visitorId={vid} />
 *
 * USAGE EXAMPLE:
 * ```tsx
 * // In your page component
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
  /** Custom CSS selector for conversion elements (auto-detected if not provided) */
  selector?: string;
  /** Whether to track view events (default: true) */
  trackViews?: boolean;
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

  // Set up conversion tracking
  useEffect(() => {
    const selectors: string[] = [];

    // Add provided selector or auto-detect
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
  }, [selector, trackEvent]);

  return null; // Renders nothing — side-effect only
}

// ============================================================
// Auto-Detection
// ============================================================

/**
 * Auto-detect the primary conversion element on the page.
 *
 * Priority:
 * 1. Checkout links (Stripe, Shopify, Gumroad, Whop, Paddle, LemonSqueezy)
 * 2. Submit buttons
 * 3. Forms with actions
 * 4. Primary-styled buttons (common Tailwind patterns)
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

  if (document.querySelector("button[type='submit']")) {
    return "button[type='submit']";
  }

  if (document.querySelector("form[action]")) {
    return "form[action]";
  }

  // Common Tailwind primary button patterns
  const primaryPatterns = [
    "button.bg-primary",
    "a.bg-primary",
    "button.bg-blue-600",
    "a.bg-blue-600",
    "button.bg-green-600",
    "a.bg-green-600",
    "button.bg-indigo-600",
    "a.bg-indigo-600",
  ];

  for (const pattern of primaryPatterns) {
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
