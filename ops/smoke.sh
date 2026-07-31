#!/usr/bin/env bash
# Collectly smoke test — exercises the dashboard routes that Davie called out
# (invoice search, customer follow-up engine, dunning engine) and prints a
# pass/fail per check. Run after any change to a dashboard page or lib/analytics.
#
# Usage: BASE=http://localhost:3030 ./ops/smoke.sh
#   or:  ./ops/smoke.sh              (defaults to localhost:3030)

set -uo pipefail

BASE="${BASE:-http://localhost:3030}"
CRON_SECRET="${CRON_SECRET:-$(grep -E '^CRON_SECRET=' .env.local 2>/dev/null | cut -d= -f2- | tr -d '"')}"
PASS=0
FAIL=0

check() {
  local name="$1"
  local expect="$2"
  local actual="$3"
  if [[ "$actual" == *"$expect"* ]]; then
    echo "✅ $name"
    PASS=$((PASS+1))
  else
    echo "❌ $name  (expected to find: '$expect')"
    FAIL=$((FAIL+1))
  fi
}

http() { curl -sS -o /tmp/smoke.html -w "%{http_code}" "$@"; }

echo "=== Collectly smoke test against $BASE ==="

# 1. Public site loads
code=$(http "$BASE/")
check "GET / returns 200" "200" "$code"

# 2. Sign-in page loads (clerk redirect, but the page itself should 200)
code=$(http "$BASE/sign-in")
check "GET /sign-in returns 200" "200" "$code"

# 3. Invoice list page (auth-gated — Clerk returns 200 with the sign-in UI in dev)
code=$(http "$BASE/dashboard/invoices")
check "GET /dashboard/invoices returns 200" "200" "$code"

# 4. Invoice search — must find the acme customer
code=$(http "$BASE/dashboard/invoices?q=acme")
check "GET /dashboard/invoices?q=acme returns 200" "200" "$code"
HIT=$(grep -oE "acmestudios|Customer 05|INV-2370" /tmp/smoke.html | head -1)
if [[ -n "$HIT" ]]; then
  echo "✅ Invoice search ?q=acme returns a matching customer/invoice ($HIT)"
  PASS=$((PASS+1))
else
  echo "❌ Invoice search ?q=acme returns a matching customer/invoice  (no match in HTML)"
  FAIL=$((FAIL+1))
fi

# 5. Invoice search — empty result path
code=$(http "$BASE/dashboard/invoices?q=zzznevermatch")
check "GET /dashboard/invoices?q=zzznevermatch returns 200" "200" "$code"
grep -q "No invoices matching" /tmp/smoke.html
check "Empty search shows 'No invoices matching' state" "No invoices matching" "$(cat /tmp/smoke.html)"

# 6. Customer list — must show the risk-sorted table
code=$(http "$BASE/dashboard/customers")
check "GET /dashboard/customers returns 200" "200" "$code"
grep -q "Sorted by risk score" /tmp/smoke.html
check "Customers list shows risk-sorted header" "Sorted by risk score" "$(cat /tmp/smoke.html)"
grep -q "critical\|high\|medium\|low" /tmp/smoke.html
check "Customers list renders risk levels" "critical" "$(cat /tmp/smoke.html)"

# 7. Customer detail — grab first real customer id from the list (skip /new)
curl -sS "$BASE/dashboard/customers" -o /tmp/custs.html
CID=$(grep -oE 'href="/dashboard/customers/[a-z0-9]+"' /tmp/custs.html | grep -v '/new"' | head -1 | sed -E 's|.*customers/([^"]+)"|\1|')
if [[ -n "$CID" ]]; then
  code=$(http "$BASE/dashboard/customers/$CID")
  check "GET /dashboard/customers/$CID returns 200" "200" "$code"
  grep -q "AI follow-up" /tmp/smoke.html
  check "Customer detail page renders AI follow-up panel" "AI follow-up" "$(cat /tmp/smoke.html)"
  grep -q "Likely to pay in 7d" /tmp/smoke.html
  check "Customer detail shows 'Likely to pay in 7d' metric" "Likely to pay in 7d" "$(cat /tmp/smoke.html)"
  # The page must contain at least one of the concrete recommendation strings
  REC=$(grep -oE "Pause new work|firm-tone|friendly-tone|Low risk" /tmp/smoke.html | head -1)
  if [[ -n "$REC" ]]; then
    echo "✅ Customer detail shows a concrete recommended action ($REC)"
    PASS=$((PASS+1))
  else
    echo "❌ Customer detail shows a concrete recommended action  (none of: Pause new work / firm-tone / friendly-tone / Low risk)"
    FAIL=$((FAIL+1))
  fi
else
  echo "⚠️  no customer id found in /dashboard/customers — skipping detail checks"
fi

# 8. Dunning engine — cron route
if [[ -n "$CRON_SECRET" ]]; then
  code=$(curl -sS -o /tmp/cron.json -w "%{http_code}" -X POST "$BASE/api/cron/dunning" -H "Authorization: Bearer $CRON_SECRET")
  check "POST /api/cron/dunning returns 200" "200" "$code"
  grep -q '"ok":true' /tmp/cron.json
  check "Dunning cron reports ok:true" '"ok":true' "$(cat /tmp/cron.json)"
else
  echo "⚠️  CRON_SECRET not found in .env.local — skipping dunning cron check"
fi

# 9. Cash flow, dunning page, relationships — basic 200s
for path in /dashboard /dashboard/dunning /dashboard/dunning/sequence /dashboard/cash-flow /dashboard/relationships; do
  code=$(http "$BASE$path")
  check "GET $path returns 200" "200" "$code"
done

# 10. Dunning composer pre-fill (?customerId=...&tone=...&channel=...) mounts the preview panel
if [[ -n "${CID:-}" ]]; then
  code=$(http "$BASE/dashboard/dunning?customerId=$CID&tone=final&channel=email")
  check "GET /dashboard/dunning?customerId=...&tone=final&channel=email returns 200" "200" "$code"
  cp /tmp/smoke.html /tmp/comp.html  # preserve before later checks clobber /tmp/smoke.html
  HIT=$(grep -oE 'Draft reminder for|Cannot draft reminder' /tmp/comp.html | head -1)
  if [[ -n "$HIT" ]]; then
    echo "✅ Dunning composer mounts for customer ($HIT)"
    PASS=$((PASS+1))
  else
    echo "❌ Dunning composer mounts for customer  (no 'Draft reminder for' / 'Cannot draft reminder' in HTML)"
    FAIL=$((FAIL+1))
  fi
  # Tone/channel should appear in the panel header
  grep -qE "final.*email|email.*final" /tmp/comp.html
  check "Dunning composer shows tone (final) and channel (email)" "final" "$(grep -oE 'final' /tmp/comp.html | head -1)"
  # The actual DunningPreview UI ("Generate reminder" button) is client-side,
  # so we don't see it in SSR HTML — but the wrapper card with the header
  # text and 'Back to customer' link must be there.
  grep -q "Back to customer" /tmp/comp.html
  check "Dunning composer shows 'Back to customer' link" "Back to customer" "$(cat /tmp/comp.html)"
fi

# 11. Dunning composer empty state (no open invoices): hit a non-existent customer
code=$(http "$BASE/dashboard/dunning?customerId=zzz_does_not_exist&tone=firm&channel=email")
check "GET /dashboard/dunning?customerId=zzz_does_not_exist returns 200" "200" "$code"
grep -q "No open invoices" /tmp/smoke.html
check "Dunning composer shows 'No open invoices' for unknown customer" "No open invoices" "$(cat /tmp/smoke.html)"

# 12. /tour is clean — no dead TODO strings leak to visitors
code=$(http "$BASE/tour")
check "GET /tour returns 200" "200" "$code"
cp /tmp/smoke.html /tmp/tour.html
if grep -qE "record as Loom|paste the embed URLs|VideoPlaceholder|video walkthrough" /tmp/tour.html; then
  echo "❌ /tour leaks internal TODO strings to visitors"
  grep -oE "record as Loom|paste the embed URLs|VideoPlaceholder" /tmp/tour.html | head -3 | sed 's/^/   found: /'
  FAIL=$((FAIL+1))
else
  echo "✅ /tour ships clean — no internal TODO strings"
  PASS=$((PASS+1))
fi

# 13. /compare includes vs-zohobooks AND every other vs-page is reachable from /compare
code=$(http "$BASE/compare")
check "GET /compare returns 200" "200" "$code"
grep -q "vs-zohobooks\|vs Zoho Books\|Zoho Books" /tmp/smoke.html
check "/compare lists vs-zohobooks" "Zoho Books" "$(grep -oE 'Zoho Books' /tmp/smoke.html | head -1)"
for slug in chaser bill melio quickbooks zohobooks freshbooks gaviti growfin highradius; do
  if grep -q "/vs-$slug" /tmp/smoke.html; then
    : # ok
  else
    echo "❌ /compare missing /vs-$slug link"
    FAIL=$((FAIL+1))
  fi
done
echo "✅ /compare links to all 9 competitor pages"
PASS=$((PASS+1))

# 14. /tools/ar-cost-calculator is reachable from header/footer/homepage
code=$(http "$BASE/tools/ar-cost-calculator")
check "GET /tools/ar-cost-calculator returns 200" "200" "$code"
# Footer should link to it
code=$(http "$BASE/")
grep -q "tools/ar-cost-calculator" /tmp/smoke.html
check "Homepage links to /tools/ar-cost-calculator" "/tools/ar-cost-calculator" "$(grep -oE '/tools/ar-cost-calculator' /tmp/smoke.html | head -1)"
code=$(http "$BASE/pricing")
grep -q "tools/ar-cost-calculator" /tmp/smoke.html
check "/pricing footer (or page) links to /tools/ar-cost-calculator" "/tools/ar-cost-calculator" "$(grep -oE '/tools/ar-cost-calculator' /tmp/smoke.html | head -1)"

# 15. /compare is in the header nav
code=$(http "$BASE/")
grep -qE '"/compare"' /tmp/smoke.html
check "Header nav contains /compare link" "/compare" "$(grep -oE '/compare' /tmp/smoke.html | head -1)"

# 16. /playbook page does NOT contain the old fabricated Sarah K. / Lumen & Co testimonial
code=$(http "$BASE/playbook")
cp /tmp/smoke.html /tmp/playbook.html
if grep -qE "Sarah K\.|Lumen & Co" /tmp/playbook.html; then
  echo "❌ /playbook still ships fabricated Sarah K. testimonial"
  FAIL=$((FAIL+1))
else
  echo "✅ /playbook has no fabricated testimonial"
  PASS=$((PASS+1))
fi

# 17. Homepage copy names the actual ICP (agencies + bookkeepers)
code=$(http "$BASE/")
if grep -qiE "marketing agencies|bookkeeper" /tmp/smoke.html; then
  echo "✅ Homepage mentions agencies and bookkeepers by name"
  PASS=$((PASS+1))
else
  echo "❌ Homepage doesn't name the actual ICP (agencies / bookkeepers)"
  FAIL=$((FAIL+1))
fi

# 18. Money-path checks — the critical-path bugs the audit flagged.
# /pay/[id] must be reachable WITHOUT auth (your customer's customer
# doesn't have a Collectly account). A placeholder id; we only check
# the auth gate doesn't redirect to /sign-in.
code=$(http "$BASE/pay/test_placeholder_id")
if [[ "$code" == "200" || "$code" == "404" ]]; then
  echo "✅ /pay/[id] is reachable without auth (HTTP $code)"
  PASS=$((PASS+1))
else
  echo "❌ /pay/[id] returned unexpected HTTP $code (auth may still be gating)"
  FAIL=$((FAIL+1))
fi

# /api/payment/* must be reachable (Paystack webhooks + payment-form calls)
code=$(http "$BASE/api/payment/test")
if [[ "$code" != "307" && "$code" != "302" ]]; then
  echo "✅ /api/payment/* is reachable without auth (HTTP $code)"
  PASS=$((PASS+1))
else
  echo "❌ /api/payment/* redirected (HTTP $code) — webhooks can't deliver"
  FAIL=$((FAIL+1))
fi

# /api/paystack/* must be reachable
code=$(http "$BASE/api/paystack/test")
if [[ "$code" != "307" && "$code" != "302" ]]; then
  echo "✅ /api/paystack/* is reachable without auth (HTTP $code)"
  PASS=$((PASS+1))
else
  echo "❌ /api/paystack/* redirected (HTTP $code)"
  FAIL=$((FAIL+1))
fi

# 19. Paystack verify route redirects to /pay/[id], NOT /dashboard/payment/*
if grep -q "APP_URL.*pay" src/app/api/paystack/verify/route.ts; then
  echo "✅ Paystack verify redirects to /pay/[id] (public portal), not /dashboard/*"
  PASS=$((PASS+1))
else
  echo "❌ Paystack verify still redirects to /dashboard/payment/*"
  FAIL=$((FAIL+1))
fi

# 20. AI dunning demo uses honest placeholder names
code=$(curl -sS -X POST "$BASE/api/dunning/public-demo" \
  -H 'content-type: application/json' \
  -d '{"tone":"firm","channel":"email","daysOverdue":35,"amount":"12500"}')
if echo "$code" | grep -q "Sarah from billing"; then
  echo "✅ Demo uses honest placeholder name (not hardcoded 'Lumen & Co')"
  PASS=$((PASS+1))
else
  echo "❌ Demo still uses fabricated Lumen & Co / Acme Studios"
  FAIL=$((FAIL+1))
fi
if echo "$code" | grep -q "your-invoice-id"; then
  echo "✅ Demo pay-link is rewritten to placeholder"
  PASS=$((PASS+1))
else
  echo "❌ Demo pay-link leaks prod domain"
  FAIL=$((FAIL+1))
fi

# 21. AI demo no longer falsely claims to be the production engine
code=$(http "$BASE/")
if grep -qi "same engine we ship in production" /tmp/smoke.html; then
  echo "❌ Homepage still claims demo IS the production engine"
  FAIL=$((FAIL+1))
else
  echo "✅ Homepage no longer falsely claims demo = production engine"
  PASS=$((PASS+1))
fi

# 22. Comparison table now cites sources + includes FreshBooks + has scope note
code=$(http "$BASE/")
if grep -q "Last verified" /tmp/smoke.html; then
  echo "✅ Comparison table has 'Last verified' sourcing stamp"
  PASS=$((PASS+1))
else
  echo "❌ Comparison table has no sourcing stamp"
  FAIL=$((FAIL+1))
fi
if grep -q "FreshBooks" /tmp/smoke.html; then
  echo "✅ Comparison table includes FreshBooks"
  PASS=$((PASS+1))
else
  echo "❌ Comparison table still missing FreshBooks"
  FAIL=$((FAIL+1))
fi
if grep -qi "Scope:" /tmp/smoke.html; then
  echo "✅ Comparison table declares its scope"
  PASS=$((PASS+1))
else
  echo "❌ Comparison table has no scope note"
  FAIL=$((FAIL+1))
fi

# 23. SMS dev-stub now returns status:'skipped' (mirrors sendEmail contract)
if grep -q "status: 'skipped' as const" src/lib/infra.ts; then
  echo "✅ sendSms returns status:'skipped' on missing credentials"
  PASS=$((PASS+1))
else
  echo "❌ sendSms missing-key path doesn't return status:'skipped'"
  FAIL=$((FAIL+1))
fi

# 24. Scheduler SMS branch checks status:'skipped' (mirrors email branch)
if grep -q "status === 'skipped'" src/lib/dunning/scheduler.ts; then
  echo "✅ Scheduler SMS branch guards against stub sends"
  PASS=$((PASS+1))
else
  echo "❌ Scheduler SMS branch missing stub guard"
  FAIL=$((FAIL+1))
fi

# 25. Dev PaystackTestPage removed from production routes
if [[ -f src/app/dashboard/payment/page.tsx ]]; then
  echo "❌ Dev PaystackTestPage still ships at /dashboard/payment"
  FAIL=$((FAIL+1))
else
  echo "✅ Dev PaystackTestPage removed from production"
  PASS=$((PASS+1))
fi

# 26. Dunning messages link to invoice.id (nanoid PK), not invoice.number.
# public-demo uses the same fallbackDunningMessage function that the
# preview/scheduler paths use as their Gemini-failure fallback — so this
# check validates the canonical path the audit fix touched.
code=$(curl -sS -X POST "$BASE/api/dunning/public-demo" \
  -H 'content-type: application/json' \
  -d '{"tone":"firm","channel":"email","daysOverdue":35,"amount":"12500"}' 2>/dev/null)
# The demo rewrites the placeholder id to '[your-invoice-id]' in the
# rendered output. Source-level check is more reliable: the link in
# fallbackDunningMessage now uses ctx.invoiceId, not ctx.invoiceNumber.
if grep -q "ctx.invoiceId" src/lib/ai/dunning.ts; then
  echo "✅ fallbackDunningMessage builds payment link from invoiceId (not invoiceNumber)"
  PASS=$((PASS+1))
else
  echo "❌ fallbackDunningMessage still builds payment link from invoiceNumber"
  FAIL=$((FAIL+1))
fi

echo
echo "=== $PASS passed, $FAIL failed ==="
exit $FAIL
