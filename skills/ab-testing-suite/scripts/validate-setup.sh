#!/usr/bin/env bash
# ============================================================
# A/B Testing Suite — Setup Validator
# ============================================================
# Verifies that all A/B testing infrastructure components
# are properly configured.
#
# Usage: bash scripts/validate-setup.sh
# ============================================================

set -euo pipefail

PASS=0
FAIL=0
WARN=0

check_pass() { echo "  ✅ $1"; PASS=$((PASS + 1)); }
check_fail() { echo "  ❌ $1"; FAIL=$((FAIL + 1)); }
check_warn() { echo "  ⚠️  $1"; WARN=$((WARN + 1)); }

echo ""
echo "🔍 A/B Testing Suite — Setup Validation"
echo "========================================="
echo ""

# --------------------------------------------------------
# 1. Environment Variables
# --------------------------------------------------------
echo "1. Environment Variables"

if [ -n "${NEXT_PUBLIC_SUPABASE_URL:-}" ]; then
  check_pass "NEXT_PUBLIC_SUPABASE_URL is set"
else
  # Check .env.local
  if [ -f .env.local ] && grep -q "NEXT_PUBLIC_SUPABASE_URL" .env.local; then
    check_pass "NEXT_PUBLIC_SUPABASE_URL found in .env.local"
  else
    check_fail "NEXT_PUBLIC_SUPABASE_URL not set (add to .env.local)"
  fi
fi

if [ -n "${NEXT_PUBLIC_SUPABASE_ANON_KEY:-}" ]; then
  check_pass "NEXT_PUBLIC_SUPABASE_ANON_KEY is set"
else
  if [ -f .env.local ] && grep -q "NEXT_PUBLIC_SUPABASE_ANON_KEY" .env.local; then
    check_pass "NEXT_PUBLIC_SUPABASE_ANON_KEY found in .env.local"
  else
    check_fail "NEXT_PUBLIC_SUPABASE_ANON_KEY not set (add to .env.local)"
  fi
fi

echo ""

# --------------------------------------------------------
# 2. Database Tables (via REST API probe)
# --------------------------------------------------------
echo "2. Database Tables"

# Source env vars from .env.local if available
if [ -f .env.local ]; then
  SUPABASE_URL=$(grep "^NEXT_PUBLIC_SUPABASE_URL" .env.local 2>/dev/null | cut -d '=' -f2- | tr -d '"' | tr -d "'" || true)
  SUPABASE_KEY=$(grep "^NEXT_PUBLIC_SUPABASE_ANON_KEY" .env.local 2>/dev/null | cut -d '=' -f2- | tr -d '"' | tr -d "'" || true)
fi

SUPABASE_URL="${SUPABASE_URL:-${NEXT_PUBLIC_SUPABASE_URL:-}}"
SUPABASE_KEY="${SUPABASE_KEY:-${NEXT_PUBLIC_SUPABASE_ANON_KEY:-}}"

if [ -n "$SUPABASE_URL" ] && [ -n "$SUPABASE_KEY" ]; then
  # Check ab_test_registry
  REGISTRY_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
    "${SUPABASE_URL}/rest/v1/ab_test_registry?select=test_id&limit=1" \
    -H "apikey: ${SUPABASE_KEY}" \
    -H "Authorization: Bearer ${SUPABASE_KEY}" 2>/dev/null || echo "000")

  if [ "$REGISTRY_STATUS" = "200" ]; then
    check_pass "ab_test_registry table exists and is accessible"
  else
    check_fail "ab_test_registry table not found (HTTP $REGISTRY_STATUS) — run setup-supabase.sql"
  fi

  # Check ab_test_events
  EVENTS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
    "${SUPABASE_URL}/rest/v1/ab_test_events?select=id&limit=1" \
    -H "apikey: ${SUPABASE_KEY}" \
    -H "Authorization: Bearer ${SUPABASE_KEY}" 2>/dev/null || echo "000")

  if [ "$EVENTS_STATUS" = "200" ]; then
    check_pass "ab_test_events table exists and is accessible"
  else
    check_fail "ab_test_events table not found (HTTP $EVENTS_STATUS) — run setup-supabase.sql"
  fi

  # Check app_settings
  SETTINGS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
    "${SUPABASE_URL}/rest/v1/app_settings?select=key&key=eq.ab_test_settings&limit=1" \
    -H "apikey: ${SUPABASE_KEY}" \
    -H "Authorization: Bearer ${SUPABASE_KEY}" 2>/dev/null || echo "000")

  if [ "$SETTINGS_STATUS" = "200" ]; then
    check_pass "app_settings table exists"
  else
    check_warn "app_settings table not found — global settings won't work"
  fi
else
  check_warn "Cannot probe database — Supabase credentials not available"
fi

echo ""

# --------------------------------------------------------
# 3. Middleware
# --------------------------------------------------------
echo "3. Middleware"

if [ -f "src/lib/ab-test/middleware.ts" ]; then
  check_pass "AB test middleware handler exists (src/lib/ab-test/middleware.ts)"
else
  check_fail "AB test middleware handler missing — copy from assets/middleware-handler.ts"
fi

if [ -f "src/middleware.ts" ]; then
  if grep -q "handleABTest\|ab-test" "src/middleware.ts" 2>/dev/null; then
    check_pass "src/middleware.ts imports AB test handler"
  else
    check_warn "src/middleware.ts exists but may not import AB test handler"
  fi
else
  check_fail "src/middleware.ts not found — create it and import handleABTest"
fi

echo ""

# --------------------------------------------------------
# 4. Components
# --------------------------------------------------------
echo "4. Components"

if [ -f "src/components/ab-test/conversion-tracker.tsx" ]; then
  check_pass "ConversionTracker component exists"
else
  check_fail "ConversionTracker missing — copy from assets/conversion-tracker.tsx"
fi

echo ""

# --------------------------------------------------------
# 5. API Routes
# --------------------------------------------------------
echo "5. API Routes"

ROUTES=(
  "src/app/api/ab-test/track/route.ts:Event tracking"
  "src/app/api/ab-test/registry/route.ts:Test registry"
  "src/app/api/ab-test/toggle/route.ts:Test toggle"
)

for route_info in "${ROUTES[@]}"; do
  ROUTE_PATH="${route_info%%:*}"
  ROUTE_NAME="${route_info##*:}"
  if [ -f "$ROUTE_PATH" ]; then
    check_pass "$ROUTE_NAME route exists ($ROUTE_PATH)"
  else
    check_fail "$ROUTE_NAME route missing ($ROUTE_PATH)"
  fi
done

echo ""

# --------------------------------------------------------
# Summary
# --------------------------------------------------------
echo "========================================="
TOTAL=$((PASS + FAIL + WARN))
echo "Results: $PASS passed, $FAIL failed, $WARN warnings (of $TOTAL checks)"

if [ "$FAIL" -eq 0 ]; then
  echo ""
  echo "🎉 All checks passed! A/B testing infrastructure is ready."
  exit 0
else
  echo ""
  echo "🔧 Fix the failed checks above, then run this script again."
  exit 1
fi
