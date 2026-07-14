#!/usr/bin/env bash
# Build / extend the prospect list. Walks you through 5 source categories.
set -euo pipefail
cd "$(dirname "$0")/.."

cat <<'EOF'
=== Collectly Prospect Sourcing ===

Target: 30 prospects (expect ~33% conversion → 10 interviews).

Pick ONE category below and add 5-10 leads. Free sources only:

  1) REFERRALS         — Past clients, ex-colleagues, friends with 5-50 person B2B service businesses. HIGHEST conversion. Start here.
  2) LINKEDIN SEARCH   — Free search: "agency owner" OR "consulting founder" + "invoices". Connect first, then DM T1.
  3) CLUTCH.CO / G2    — Browse agencies/consultancies 5-50 people. Look for ones NOT already using a mature AR tool.
  4) INDILE HACKERS    — Filter to agencies / consulting. People with $5k-50k MRR. Often have cash-flow pain.
  5) TWITTER / X       — Search "agency" "invoice" "late payment" "DSO". Reply publicly, then DM.

To add a single prospect:
  ./scripts/add-prospect.sh <id> "<first>" "<last>" "<company>" "<role>" "<country>" "<team_size>" "<industry>" "<linkedin_url>" "<email>" "<source>"

When done, run:
  ./scripts/pipeline-status.sh

EOF
