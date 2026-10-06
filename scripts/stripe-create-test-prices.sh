#!/usr/bin/env bash
# Creates Mugavi's four recurring monthly USD prices in Stripe TEST mode and prints their ids.
# Run it in your own shell with your test secret key in the environment (never paste the key anywhere):
#   export STRIPE_SECRET_KEY='sk_test_...'
#   bash scripts/stripe-create-test-prices.sh
# Safe to re-run: each price has a lookup_key, and an existing one is reused, not duplicated.
# It refuses to run with anything but a test key. Live prices are made by hand at go-live (see 45-stripe-go-live-steps.md).
set -euo pipefail
KEY="${STRIPE_SECRET_KEY:-}"
case "$KEY" in
  sk_test_*) ;;
  "") echo "Set STRIPE_SECRET_KEY to your sk_test_ key first." >&2; exit 2 ;;
  *) echo "Refusing: this script only runs with a test key (sk_test_...)." >&2; exit 2 ;;
esac
API="https://api.stripe.com/v1"
call() { curl -sS -u "$KEY:" "$@"; }
jget() { python3 -c 'import sys,json; d=json.load(sys.stdin); print(eval(sys.argv[1]))' "$1"; }

make_price() { # envname lookup_key product_name cents [per_unit_note]
  local env="$1" lk="$2" name="$3" cents="$4"
  local existing
  existing="$(call -G "$API/prices" -d "lookup_keys[]=$lk" -d active=true | jget "(d['data'][0]['id'] if d.get('data') else '')")"
  if [ -n "$existing" ]; then echo "$env=$existing   (already existed)"; return; fi
  local prod
  prod="$(call "$API/products" -d "name=$name" -d "metadata[mugavi]=$lk" | jget "d['id']")"
  local price
  price="$(call "$API/prices" -d "product=$prod" -d "currency=usd" -d "unit_amount=$cents" \
    -d "recurring[interval]=month" -d "recurring[usage_type]=licensed" -d "tax_behavior=exclusive" \
    -d "lookup_key=$lk" | jget "d['id']")"
  echo "$env=$price"
}

echo "Test-mode prices (ids are not secrets):"
make_price STRIPE_PRICE_STARTER    mugavi_single_monthly   "Mugavi Single business"      7900
make_price STRIPE_PRICE_PRACTICE   mugavi_practice_monthly "Mugavi Practice"             39900
make_price STRIPE_PRICE_SCALE      mugavi_scale_monthly    "Mugavi Practice Scale"       99900
make_price STRIPE_PRICE_EXTRA_BOOK mugavi_extra_book_month "Mugavi extra client book"     2500
echo
echo "Next: set each as a Production env var in Vercel (test values first), redeploy, then open /dashboard/admin/config."
echo "Tax code: set 'Software as a service (SaaS)' on each product in the Stripe dashboard (step 2 in 45-stripe-go-live-steps.md)."
