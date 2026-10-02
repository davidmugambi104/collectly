#!/usr/bin/env bash
# Runs the real Mugavi app on FAKE demo data for filming: in-memory database seeded by the app itself,
# a mail stand-in that never sends, and fake provider keys so no "needs production setup" banner shows.
# Usage: ./demo-server.sh   (leaves the app on :5920 and the stand-in on :5930; Ctrl-C stops both)
set -euo pipefail
cd "$(dirname "$0")/.."
node walkthrough/mock/resend-standin.mjs & MAIL=$!
trap 'kill $MAIL 2>/dev/null || true' EXIT
export USE_DEV_AUTH=1 NEXT_PUBLIC_USE_DEV_AUTH=1 USE_PGLITE=1 NEXT_TELEMETRY_DISABLED=1
export RESEND_API_KEY=re_demo RESEND_BASE_URL=http://127.0.0.1:5930 RESEND_FROM_EMAIL=reminders@demo.example.test
export DUNNING_TRIGGER_SECRET=demo-trigger-secret-1234
export QBO_CLIENT_ID=demo QBO_CLIENT_SECRET=demo XERO_CLIENT_ID=demo XERO_CLIENT_SECRET=demo SQUARE_CLIENT_ID=demo SQUARE_CLIENT_SECRET=demo PLAID_CLIENT_ID=demo PLAID_SECRET=demo
exec npx next dev -p "${APP_PORT:-5920}"
