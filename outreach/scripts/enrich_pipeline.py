#!/usr/bin/env python3
"""Enrichment pipeline: bulk-discover prospects via Apollo, verify emails,
and append to prospects.csv.

Pipeline:
    1. Apollo people_search (filtered to ICP: titles, geo, size, industry)
    2. For each person: people_enrichment to get email + firmographic
    3. Verify email via Hunter (primary) or Skrapp (backup)
    4. Append verified records to prospects.csv (skip duplicates by domain)

Usage:
    python3 enrich_pipeline.py search --industry-tag-id 5567e1f77369682200d70000
    python3 enrich_pipeline.py enrich --input raw_leads.csv
    python3 enrich_pipeline.py status

Free-tier budget (Apollo free: ~70/mo, Hunter free: 50/mo):
    - 1 search call (0 credits)
    - N enrichment calls (1 credit each)
    - N verification calls (1 credit each)
    Plan: 30 enrichments + 30 verifications per run = 30 Apollo credits + 30 Hunter credits
    = roughly half of monthly free tier per run. Use 2x/month max on free.

Required secrets:
    APOLLO_API_KEY  (in /home/davie/.openclaw/secrets/collectly/)
    HUNTER_API_KEY  OR  SKRAPP_API_KEY (at least one)
"""
import argparse
import csv
import os
import sys
import time
from typing import Any, Dict, List, Optional

# Allow running as a script
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))  # so we can import scripts.clients

from clients import status as secret_status, request
from clients import apollo, hunter, skrapp

CSV_PATH = "/home/davie/.openclaw/workspace/collectly/outreach/data/prospects.csv"
LOG_PATH = "/home/davie/.openclaw/workspace/collectly/outreach/data/outreach-log.csv"

CSV_FIELDS = [
    "id", "first_name", "last_name", "company", "role", "country", "team_size",
    "industry", "linkedin_url", "email", "source", "notes", "hook", "tier",
]


def load_existing() -> List[Dict[str, str]]:
    if not os.path.exists(CSV_PATH):
        return []
    with open(CSV_PATH, newline="") as f:
        return list(csv.DictReader(f))


def next_id(existing: List[Dict[str, str]]) -> str:
    """Return next P### id based on existing rows."""
    used = set()
    for r in existing:
        rid = (r.get("id") or "").strip()
        if rid.startswith("P") and rid[1:].isdigit():
            used.add(int(rid[1:]))
    nxt = max(used) + 1 if used else 1
    return f"P{nxt:03d}"


def already_exists(existing: List[Dict[str, str]], email: str, domain: str) -> bool:
    email = (email or "").lower().strip()
    domain = (domain or "").lower().strip()
    for r in existing:
        if email and r.get("email", "").lower().strip() == email:
            return True
        ed = (r.get("email", "").split("@")[-1] or "").lower().strip()
        if domain and ed == domain:
            # Same domain as an existing record — likely a duplicate contact
            return True
    return False


def verify_email(email: str) -> Dict[str, Any]:
    """Try Hunter first, fall back to Skrapp. Returns {'ok': bool, 'source': 'hunter'|'skrapp'|'none', 'verdict': str}"""
    if secret_status().get("hunter"):
        r = hunter.email_verifier(email)
        if r.get("ok"):
            data = (r.get("data") or {}).get("data") or {}
            return {
                "ok": hunter.is_usable(r),
                "source": "hunter",
                "verdict": data.get("status", "unknown"),
                "score": data.get("score", 0),
            }
    if secret_status().get("skrapp"):
        r = skrapp.email_verifier(email)
        if r.get("ok"):
            return {
                "ok": skrapp.is_usable(r),
                "source": "skrapp",
                "verdict": (r.get("data") or {}).get("status", "unknown"),
                "score": None,
            }
    return {"ok": False, "source": "none", "verdict": "no_verifier", "score": None}


def cmd_status(_args):
    s = secret_status()
    print("=== Lead-gen tool status ===")
    for tool, present in s.items():
        icon = "✓" if present else "✗"
        print(f"  {icon} {tool}: {'wired' if present else 'NOT SET'}")
    print()
    existing = load_existing()
    print(f"prospects.csv: {len(existing)} rows")
    if existing:
        industries = {}
        for r in existing:
            ind = r.get("industry", "unknown")
            industries[ind] = industries.get(ind, 0) + 1
        print("  by industry:")
        for ind, n in sorted(industries.items(), key=lambda x: -x[1]):
            print(f"    {ind}: {n}")


def cmd_search(args):
    """Apollo people_search → enrich → verify → append."""
    secrets = secret_status()
    if not secrets.get("apollo"):
        print("✗ APOLLO_API_KEY not set. See outreach/SETUP.md.")
        return 1

    print(f"Searching Apollo: titles={args.titles}, geo={args.geo}, size={args.size}, industry={args.industry}")
    print(f"Per page: {args.per_page}, max pages: {args.max_pages}")

    existing = load_existing()
    added = 0
    skipped_duplicate = 0
    skipped_unverified = 0
    credit_estimate = 0
    hunter_credit = 0
    skrapp_credit = 0

    for page in range(1, args.max_pages + 1):
        result = apollo.people_search(
            person_titles=args.titles,
            person_locations=args.geo,
            organization_num_employees_ranges=args.size,
            q_keywords=args.keywords,
            page=page,
            per_page=args.per_page,
        )
        if not result.get("ok"):
            print(f"  ✗ page {page} search failed: {result.get('error')}")
            break

        people = ((result.get("data") or {}).get("people")) or []
        if not people:
            print(f"  page {page}: no more people")
            break
        print(f"  page {page}: {len(people)} candidates")

        for p in people:
            credit_estimate += 1  # enrichment will cost 1 credit
            firm = apollo.extract_firmographic(p)
            domain = firm.get("domain") or ""
            company = firm.get("company") or ""
            first = (p.get("first_name") or "").strip()
            last = (p.get("last_name") or "").strip()
            if not (first and last and domain):
                continue
            if not p.get("email"):
                # Need to enrich to get email
                er = apollo.people_enrichment(
                    first_name=first, last_name=last, domain=domain
                )
                if er.get("ok"):
                    enriched_person = (er.get("data") or {}).get("person") or {}
                    if not enriched_person.get("email"):
                        continue
                    p = enriched_person
                    firm = apollo.extract_firmographic(p)

            email = (p.get("email") or "").lower().strip()
            if not email:
                continue
            if already_exists(existing, email, domain):
                skipped_duplicate += 1
                continue

            v = verify_email(email)
            if v["source"] == "hunter":
                hunter_credit += 1
            elif v["source"] == "skrapp":
                skrapp_credit += 1
            if not v["ok"]:
                skipped_unverified += 1
                continue

            new_row = {
                "id": next_id(existing),
                "first_name": first,
                "last_name": last,
                "company": company,
                "role": p.get("title", ""),
                "country": firm.get("country", ""),
                "team_size": str(firm.get("employee_count") or ""),
                "industry": firm.get("industry", "") or args.industry_label or "",
                "linkedin_url": p.get("linkedin_url", ""),
                "email": email,
                "source": f"apollo_{args.tag or 'search'}_{v['source']}",
                "notes": f"discovered via Apollo; verified via {v['source']} ({v['verdict']}, score={v.get('score')})",
                "hook": "",
                "tier": "3",  # bulk tier by default; promote manually to 1/2
            }
            existing.append(new_row)
            added += 1
            print(f"    + {new_row['id']} {email} ({v['source']} {v['verdict']})")

            if added >= args.max_add:
                break

        if added >= args.max_add:
            break

    # Write back
    if added > 0:
        with open(CSV_PATH, "w", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=CSV_FIELDS)
            writer.writeheader()
            for r in existing:
                writer.writerow(r)

    print()
    print(f"=== Summary ===")
    print(f"  Added: {added}")
    print(f"  Skipped (duplicate): {skipped_duplicate}")
    print(f"  Skipped (unverified): {skipped_unverified}")
    print(f"  Est. Apollo credits: ~{credit_estimate}")
    print(f"  Hunter verifies: {hunter_credit}")
    print(f"  Skrapp verifies: {skrapp_credit}")


def cmd_enrich(args):
    """Enrich a CSV of partial leads (name + domain) → email + firmographic.

    Use this when you have a CSV exported from Apollo's web UI (or any other
    source) and need to add emails + firmographic data. Works on Apollo free.

    Expected CSV columns (any subset): first_name, last_name, name, email,
    domain, company, linkedin_url. The script will:
      1. For each row: if no email, call Apollo people_enrichment
      2. Verify the email via Hunter or Skrapp
      3. Append verified records to prospects.csv (skip duplicates)
    """
    import csv as _csv

    if not os.path.exists(args.input):
        print(f"✗ Input file not found: {args.input}")
        return 1

    secrets = secret_status()
    if not secrets.get("apollo"):
        print("✗ APOLLO_API_KEY not set.")
        return 1

    with open(args.input, newline="") as f:
        rows = list(_csv.DictReader(f))
    print(f"Loaded {len(rows)} rows from {args.input}")

    existing = load_existing()
    added = 0
    skipped_dup = 0
    skipped_unverified = 0
    credits = 0

    for r in rows:
        first = (r.get("first_name") or r.get("First Name") or "").strip()
        last = (r.get("last_name") or r.get("Last Name") or "").strip()
        name = (r.get("name") or "").strip() or f"{first} {last}".strip()
        domain = (r.get("domain") or r.get("Website") or r.get("company_domain") or "").strip().lower()
        domain = domain.replace("https://", "").replace("http://", "").split("/")[0]
        email = (r.get("email") or r.get("Email") or "").strip().lower()
        linkedin = (r.get("linkedin_url") or r.get("LinkedIn") or "").strip()
        company = (r.get("company") or r.get("Company") or r.get("organization_name") or "").strip()
        industry_label = args.industry_label or r.get("industry") or r.get("Industry") or ""

        if not domain and not linkedin and not email:
            continue

        # If no email, try enrichment
        if not email:
            credits += 1
            er = apollo.people_enrichment(
                first_name=first or None,
                last_name=last or None,
                name=name or None,
                domain=domain or None,
                linkedin_url=linkedin or None,
            )
            if not er.get("ok"):
                skipped_unverified += 1
                continue
            person = (er.get("data") or {}).get("person") or {}
            email = (person.get("email") or "").lower().strip()
            if not email:
                skipped_unverified += 1
                continue
            if not company:
                firm = apollo.extract_firmographic(person)
                company = firm.get("company") or company
            if not first:
                first = person.get("first_name", "") or first
            if not last:
                last = person.get("last_name", "") or last
            linkedin = linkedin or person.get("linkedin_url", "")
            firm = apollo.extract_firmographic(person)
            role = person.get("title", "")
            country = firm.get("country", "")
            team_size = str(firm.get("employee_count") or "")
            industry = industry_label or firm.get("industry", "") or ""
        else:
            role = r.get("title") or r.get("Title") or r.get("role") or ""
            country = r.get("country") or r.get("Country") or ""
            team_size = r.get("team_size") or r.get("Employee Count") or ""
            industry = industry_label

        if not email:
            continue
        if already_exists(existing, email, domain):
            skipped_dup += 1
            continue

        v = verify_email(email)
        if not v["ok"]:
            skipped_unverified += 1
            continue

        new_row = {
            "id": next_id(existing),
            "first_name": first,
            "last_name": last,
            "company": company,
            "role": role,
            "country": country,
            "team_size": team_size,
            "industry": industry,
            "linkedin_url": linkedin,
            "email": email,
            "source": f"apollo_enrich_{v['source']}",
            "notes": f"enriched via Apollo; verified via {v['source']} ({v['verdict']})",
            "hook": "",
            "tier": "3",
        }
        existing.append(new_row)
        added += 1
        print(f"  + {new_row['id']} {email} ({v['source']} {v['verdict']})")

        if added >= args.max_add:
            break

    if added > 0:
        with open(CSV_PATH, "w", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=CSV_FIELDS)
            writer.writeheader()
            for r in existing:
                writer.writerow(r)

    print()
    print(f"=== Enrich summary ===")
    print(f"  Added: {added}")
    print(f"  Skipped (duplicate): {skipped_dup}")
    print(f"  Skipped (unverified/no email): {skipped_unverified}")
    print(f"  Apollo credits used: ~{credits}")


def main():
    p = argparse.ArgumentParser(description="Collectly enrichment pipeline")
    sub = p.add_subparsers(dest="cmd")

    s_status = sub.add_parser("status", help="Show which lead-gen tools are wired up")

    s_search = sub.add_parser("search", help="Apollo people search → enrich → verify → append (PAID API ONLY)")
    s_search.add_argument("--titles", nargs="+", default=[
        "Founder", "CEO", "Owner", "Managing Director", "Co-Founder", "COO"
    ])
    s_search.add_argument("--geo", nargs="+", default=["United States", "United Kingdom"])
    s_search.add_argument("--size", nargs="+", default=["5,10", "11,20", "21,50"])
    s_search.add_argument("--industry", default=None, help="Apollo industry tag ID")
    s_search.add_argument("--industry-label", default=None, help="Human-readable industry label (saved to prospects.csv)")
    s_search.add_argument("--keywords", default=None, help="Free-text keyword filter")
    s_search.add_argument("--per-page", type=int, default=25)
    s_search.add_argument("--max-pages", type=int, default=2)
    s_search.add_argument("--max-add", type=int, default=30, help="Hard cap on records appended per run")
    s_search.add_argument("--tag", default=None, help="Tag for the source column, e.g. 'branding_uk'")

    s_enrich = sub.add_parser("enrich", help="Enrich a CSV of partial leads (free tier compatible)")
    s_enrich.add_argument("--input", required=True, help="CSV file with at least first_name+last_name+domain (or linkedin_url or email)")
    s_enrich.add_argument("--industry-label", default=None, help="Force industry label on all rows")
    s_enrich.add_argument("--max-add", type=int, default=50)

    args = p.parse_args()
    if args.cmd == "status":
        return cmd_status(args)
    if args.cmd == "search":
        return cmd_search(args)
    if args.cmd == "enrich":
        return cmd_enrich(args)
    p.print_help()
    return 1


if __name__ == "__main__":
    sys.exit(main() or 0)
