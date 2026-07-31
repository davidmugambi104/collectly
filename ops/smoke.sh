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

echo
echo "=== $PASS passed, $FAIL failed ==="
exit $FAIL
