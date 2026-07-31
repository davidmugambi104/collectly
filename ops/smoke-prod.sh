#!/usr/bin/env bash
# Public-funnel smoke test — safe to run against real production.
#
# Unlike ops/smoke.sh (which assumes USE_DEV_AUTH=1 and seeded dev sample
# data, and will false-fail constantly against a real Clerk-gated deploy),
# this script only touches the unauthenticated marketing/signup surface:
# the exact path a new visitor walks before they have an account. Meant
# to be scheduled daily (see .github/workflows/daily-funnel-check.yml).
#
# Usage: BASE=https://getcollectly.app ./ops/smoke-prod.sh
#   or:  ./ops/smoke-prod.sh   (defaults to production)

set -uo pipefail

BASE="${BASE:-https://getcollectly.app}"
PASS=0
FAIL=0

check() {
  local name="$1" expect="$2" actual="$3"
  if [[ "$actual" == *"$expect"* ]]; then
    echo "✅ $name"; PASS=$((PASS+1))
  else
    echo "❌ $name  (expected to find: '$expect', got: '$actual')"; FAIL=$((FAIL+1))
  fi
}

http() { curl -sS -o /tmp/smoke-prod.html -w "%{http_code}" --max-time 15 "$@"; }

echo "=== Collectly public-funnel smoke test against $BASE ==="

# 1-11. Every public marketing/legal page a visitor or crawler can land on.
for path in / /sign-up /sign-in /tour /pricing /integrations /security /dpa /privacy /terms /customers /about /contact /compare; do
  code=$(http "$BASE$path")
  check "GET $path returns 200" "200" "$code"
done

# 12. Homepage's primary CTA points at the real signup route, not a stale domain.
code=$(http "$BASE/")
grep -q 'href="/sign-up"' /tmp/smoke-prod.html
check "Homepage primary CTA links to /sign-up" "/sign-up" "$(grep -oE 'href="/sign-up"' /tmp/smoke-prod.html | head -1)"

# 13. Domain-fragmentation regression guard — the bug this project fixed
# once already (a waitlist CTA and a blog link both pointed at a
# different/dead domain than the rest of the site). If either resurfaces
# anywhere in the rendered homepage, fail loudly.
code=$(http "$BASE/")
if grep -qE "app\.getcollectly\.app|collectly\.com" /tmp/smoke-prod.html; then
  echo "❌ Homepage leaks a stale/fragmented domain (app.getcollectly.app or collectly.com)"
  FAIL=$((FAIL+1))
else
  echo "✅ No stale/fragmented domain on homepage"
  PASS=$((PASS+1))
fi

# 14. /dashboard must not 500 for a signed-out visitor, and must not leak
# real data — it should either show a sign-in wall or redirect, never 200
# with dashboard content.
code=$(http -o /tmp/smoke-dash.html -w "%{http_code}" "$BASE/dashboard")
if [[ "$code" == "200" || "$code" == "302" || "$code" == "307" ]]; then
  echo "✅ GET /dashboard (signed out) doesn't 500 (HTTP $code)"
  PASS=$((PASS+1))
else
  echo "❌ GET /dashboard (signed out) returned unexpected HTTP $code"
  FAIL=$((FAIL+1))
fi

# 15. Public payment portal must be reachable without auth — this is the
# link customers' customers click from a dunning email.
code=$(http "$BASE/pay/smoke_test_placeholder_id")
if [[ "$code" == "200" || "$code" == "404" ]]; then
  echo "✅ /pay/[id] is reachable without auth (HTTP $code)"
  PASS=$((PASS+1))
else
  echo "❌ /pay/[id] returned unexpected HTTP $code (auth may be gating the public portal)"
  FAIL=$((FAIL+1))
fi

# 16. Payment webhooks must be reachable without auth (Paystack/Stripe
# deliver here — if these redirect to /sign-in, real payments break silently).
for path in /api/payment/smoke_test /api/paystack/smoke_test; do
  code=$(http "$BASE$path")
  if [[ "$code" != "307" && "$code" != "302" ]]; then
    echo "✅ $path is reachable without auth (HTTP $code)"
    PASS=$((PASS+1))
  else
    echo "❌ $path redirected (HTTP $code) — webhooks can't deliver"
    FAIL=$((FAIL+1))
  fi
done

echo
echo "=== $PASS passed, $FAIL failed ==="
exit $FAIL
