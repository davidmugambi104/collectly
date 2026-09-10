#!/usr/bin/env python3
"""Post-run sanity check + summary for the lead-gen pipeline.

Verifies: no duplicate emails/domains, no suppressed emails/domains
present, then prints a breakdown by source/country/industry/tier and
overall email coverage.
"""
import os
import re
import sys
from collections import Counter

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from scripts.lib import prospect_utils as pu


def main():
    rows = pu.load_existing_rows()
    suppressed = pu.load_suppressed_emails()

    total = len(rows)
    with_email = [r for r in rows if r.get("email")]
    without_email = total - len(with_email)

    email_counts = Counter((r.get("email") or "").lower() for r in with_email)
    dup_emails = {e: c for e, c in email_counts.items() if c > 1}

    domain_counts = Counter()
    for r in rows:
        d = pu.extract_domain(r)
        if d:
            domain_counts[d] += 1
    dup_domains = {d: c for d, c in domain_counts.items() if c > 1}

    suppressed_hits = [r for r in with_email if (r.get("email") or "").lower() in suppressed]

    print("=== Pipeline sanity check ===")
    print(f"  total rows:              {total}")
    print(f"  rows with email:         {len(with_email)} ({100*len(with_email)/total:.1f}%)" if total else "  no rows")
    print(f"  rows without email:      {without_email}")
    print(f"  duplicate emails:        {len(dup_emails)}" + (f"  {list(dup_emails.items())[:5]}" if dup_emails else ""))
    print(f"  duplicate-domain rows:   {sum(c-1 for c in dup_domains.values())}" + (f"  ({len(dup_domains)} domains affected)" if dup_domains else ""))
    print(f"  suppressed emails leaked into CSV: {len(suppressed_hits)}" + (f"  {[r['email'] for r in suppressed_hits][:5]}" if suppressed_hits else ""))

    print("\n=== By source ===")
    for src, n in Counter(r.get("source", "unknown") for r in rows).most_common():
        print(f"  {src:35s} {n}")

    print("\n=== By country ===")
    for c, n in Counter(r.get("country", "?") for r in rows).most_common():
        print(f"  {c:8s} {n}")

    print("\n=== By industry ===")
    for ind, n in Counter(r.get("industry", "?") for r in rows).most_common():
        print(f"  {ind:20s} {n}")

    print("\n=== By tier ===")
    for t, n in sorted(Counter(r.get("tier", "?") for r in rows).items()):
        print(f"  tier {t}: {n}")

    print("\n=== Email discovery method (new rows only) ===")
    method_re = re.compile(r"(free_email_finder:\S+|website_scrape_email_found|osm-discovery)")
    methods = Counter()
    for r in with_email:
        notes = r.get("notes") or ""
        m = method_re.findall(notes)
        methods[m[-1] if m else "legacy/other"] += 1
    for m, n in methods.most_common():
        print(f"  {m:35s} {n}")

    gdpr_flagged = sum(1 for r in rows if "gdpr_review" in (r.get("notes") or ""))
    print(f"\nGDPR/PECR-flagged rows (UK/IE, for manual review not auto-send): {gdpr_flagged}")


if __name__ == "__main__":
    main()
