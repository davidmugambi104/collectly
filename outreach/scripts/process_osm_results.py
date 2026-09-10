#!/usr/bin/env python3
"""Process Overpass JSON results from web_fetch output files.
Extracts accountant/tax_advisor companies with websites, dedupes against
prospects.csv, runs MX-based email guessing, and writes to osm-new-leads-2026-09-03.csv.
"""
import csv
import json
import os
import re
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))
from scripts.lib import prospect_utils as pu

RESULTS_DIR = "/tmp/osm_overpass_results"
OUTPUT_PATH = os.path.join(os.path.dirname(HERE), "data", "osm-new-leads-2026-09-03.csv")

CATEGORY_MAP = {
    "accountant": ("accounting", "1"),
    "tax_advisor": ("accounting", "1"),
    "financial_advisor": ("financial-services", "1"),
    "consulting": ("consulting", "3"),
    "advertising_agency": ("marketing-agency", "2"),
    "graphic_design": ("design", "2"),
}

CHAIN_KEYWORDS = ["h&r block", "jackson hewitt", "liberty tax", "crowe", "bdo ",
                  "grant thornton", "deloitte", "pwc", "ey ", "kpmg", "rsm",
                  "baker tilly", "moss adams", "cbiz", "marcum", "berdon",
                  "mazars", "moore global", "nexia", "pricewaterhouse",
                  "ernst & young", "edward jones", "ig wealth management",
                  "manulife securities"]

GDPR_REVIEW_COUNTRIES = {"GB", "IE"}

def is_chain(name):
    nl = name.lower()
    return any(kw in nl for kw in CHAIN_KEYWORDS)

def normalize_website(raw):
    raw = (raw or "").strip()
    if not raw:
        return "", ""
    if not raw.startswith(("http://", "https://")):
        raw = "https://" + raw
    import urllib.parse
    domain = urllib.parse.urlparse(raw).netloc.replace("www.", "").lower()
    return raw, domain

def normalize(name):
    return re.sub(r"[^a-z0-9]", "", (name or "").lower())

def email_patterns(first, last, domain):
    f, l = normalize(first), normalize(last)
    fi, li = (f[0] if f else ""), (l[0] if l else "")
    base = []
    if f and l:
        base += [f"{f}.{l}@{domain}", f"{f}@{domain}", f"{fi}{l}@{domain}",
                 f"{f}{li}@{domain}", f"{f}{l}@{domain}"]
    elif f:
        base += [f"{f}@{domain}"]
    base += [f"hello@{domain}", f"info@{domain}", f"contact@{domain}"]
    seen, out = set(), []
    for p in base:
        if p not in seen:
            seen.add(p)
            out.append(p)
    return out[:5]

def find_email_for_domain(domain, first="", last=""):
    if not domain:
        return "", "no_domain"
    if not pu.domain_has_mx(domain):
        return "", "no_mx"
    candidates = email_patterns(first, last, domain)
    name_based = [c for c in candidates if not c.startswith(("hello@", "info@", "contact@"))]
    generic = [c for c in candidates if c not in name_based]
    ordered = name_based + generic
    best = ordered[0]
    method = "mx_only_name_guess" if best in name_based else "mx_only_generic_guess"
    return best, method

def process_file(filepath, city, cc, seen_domains, seen_companies, suppressed, stats, new_rows, by_city, by_country):
    """Process a single Overpass JSON file."""
    try:
        with open(filepath) as f:
            content = f.read()
        # Strip web_fetch wrapper if present
        if "EXTERNAL_UNTRUSTED_CONTENT" in content:
            # Find the JSON block
            start = content.find('{\n  "version"')
            end = content.rfind('<<<END_EXTERNAL')
            if start >= 0 and end >= 0:
                content = content[start:end].strip()
            else:
                start = content.find('{\n  "version"')
                if start >= 0:
                    content = content[start:].strip()
        data = json.loads(content)
    except Exception as e:
        print(f"  ERROR parsing {filepath}: {e}")
        return

    elements = data.get("elements", [])
    stats["elements_seen"] += len(elements)
    print(f"  {len(elements)} tagged offices")
    city_added = 0

    for el in elements:
        tags = el.get("tags", {})
        name = (tags.get("name") or "").strip()
        office = tags.get("office", "")
        website_raw = tags.get("website") or tags.get("contact:website") or ""
        if not name or not website_raw:
            stats["no_website"] += 1
            continue
        website, domain = normalize_website(website_raw)
        if not domain or domain in seen_domains or name.lower() in seen_companies:
            stats["dup_domain"] += 1
            continue
        if is_chain(name):
            stats["chain_skipped"] += 1
            continue

        industry, tier = CATEGORY_MAP.get(office, ("consulting", "3"))
        direct_email = (tags.get("contact:email") or tags.get("email") or "").strip().lower()
        if direct_email and pu.is_suppressed(direct_email, suppressed):
            direct_email = ""

        addr_city = tags.get("addr:city", city)
        phone = (tags.get("phone") or tags.get("contact:phone") or "").strip()

        email = direct_email
        email_verification = ""
        if not email:
            email, method = find_email_for_domain(domain)
            if email:
                if pu.is_suppressed(email, suppressed):
                    email = ""
                    email_verification = "suppressed"
                else:
                    email_verification = method
                    stats["emails_found"] += 1
            else:
                stats["email_failed"] += 1
        else:
            email_verification = "osm_direct"
            stats["emails_found"] += 1

        prospect_id = f"OSM-{int(time.time())}-{stats['added']:04d}"

        row = {
            "prospect_id": prospect_id,
            "company_name": name,
            "email": email,
            "phone": phone,
            "website": website,
            "city": addr_city,
            "country": cc,
            "industry": industry,
            "tier": tier,
            "team_size": "",
            "source": "osm_overpass",
            "email_verification": email_verification,
            "date_added": "2026-09-03",
            "notes": f"osm-discovery | domain={domain} | office={office}"
                     + (" | gdpr_review" if cc in GDPR_REVIEW_COUNTRIES else ""),
        }
        new_rows.append(row)
        seen_domains.add(domain)
        seen_companies.add(name.lower())
        stats["added"] += 1
        city_added += 1
        by_country[cc] = by_country.get(cc, 0) + 1
        by_city[f"{city}, {cc}"] = by_city.get(f"{city}, {cc}", 0) + 1

        print(f"  + {name} ({domain}) [{industry}]" + (f" email={email}" if email else " [no email]"))

    print(f"  City total: {city_added} new companies")

def main():
    suppressed = pu.load_suppressed_emails()
    seen_domains, seen_companies = pu.existing_domains_and_companies()
    print(f"[start] existing domains: {len(seen_domains)}, existing companies: {len(seen_companies)}")

    # City file mapping: filename -> (city_name, country_code)
    city_files = {
        "Toronto_CA.json": ("Toronto", "CA"),
        "Montreal_CA.json": ("Montreal", "CA"),
        "Calgary_CA.json": ("Calgary", "CA"),
        "Ottawa_CA.json": ("Ottawa", "CA"),
        "Winnipeg_CA.json": ("Winnipeg", "CA"),
        "Melbourne_AU.json": ("Melbourne", "AU"),
        "Brisbane_AU.json": ("Brisbane", "AU"),
        "Perth_AU.json": ("Perth", "AU"),
        "Adelaide_AU.json": ("Adelaide", "AU"),
        "Birmingham_GB.json": ("Birmingham", "GB"),
        "Edinburgh_GB.json": ("Edinburgh", "GB"),
        "Glasgow_GB.json": ("Glasgow", "GB"),
        "Bristol_GB.json": ("Bristol", "GB"),
        "Leeds_GB.json": ("Leeds", "GB"),
        "Denver_US.json": ("Denver", "US"),
        "Portland_US.json": ("Portland", "US"),
        "Minneapolis_US.json": ("Minneapolis", "US"),
        "Atlanta_US.json": ("Atlanta", "US"),
        "Miami_US.json": ("Miami", "US"),
    }

    stats = {
        "elements_seen": 0, "no_website": 0, "dup_domain": 0,
        "chain_skipped": 0, "added": 0, "emails_found": 0, "email_failed": 0,
    }
    new_rows = []
    by_city = {}
    by_country = {}
    cities_processed = 0

    for filename, (city, cc) in sorted(city_files.items()):
        filepath = os.path.join(RESULTS_DIR, filename)
        if not os.path.exists(filepath):
            print(f"\n=== {city}, {cc} === [FILE MISSING - SKIPPED]")
            continue
        print(f"\n=== {city}, {cc} ===")
        process_file(filepath, city, cc, seen_domains, seen_companies, suppressed,
                     stats, new_rows, by_city, by_country)
        cities_processed += 1

    # Write output
    fieldnames = ["prospect_id", "company_name", "email", "phone", "website",
                  "city", "country", "industry", "tier", "team_size",
                  "source", "email_verification", "date_added", "notes"]
    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    with open(OUTPUT_PATH, "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames)
        w.writeheader()
        for r in new_rows:
            w.writerow({k: r.get(k, "") for k in fieldnames})

    print(f"\n=== OSM Discovery + Email Finder Report ===")
    print(f"  Output file: {OUTPUT_PATH}")
    print(f"  Cities processed: {cities_processed}")
    print(f"  Total elements seen: {stats['elements_seen']}")
    print(f"  No website (skipped): {stats['no_website']}")
    print(f"  Duplicate (skipped): {stats['dup_domain']}")
    print(f"  Chain (skipped): {stats['chain_skipped']}")
    print(f"  New companies added: {stats['added']}")
    print(f"  Emails found (MX check + direct): {stats['emails_found']}")
    print(f"  Emails not found: {stats['email_failed']}")
    print(f"\n  Breakdown by country:")
    for cc, count in sorted(by_country.items()):
        print(f"    {cc}: {count}")
    print(f"\n  Breakdown by city:")
    for city_key, count in sorted(by_city.items(), key=lambda x: -x[1]):
        print(f"    {city_key}: {count}")

if __name__ == "__main__":
    main()