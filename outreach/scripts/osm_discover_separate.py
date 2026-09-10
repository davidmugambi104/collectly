#!/usr/bin/env python3
"""Standalone OSM discovery + free email finder that writes to a separate file.

Does NOT touch prospects.csv. Output goes to:
  collectly/outreach/data/osm-new-leads-2026-09-03.csv

This avoids file conflicts when multiple sub-agents are running concurrently.
"""
import csv
import json
import os
import re
import sys
import time
import urllib.parse
import urllib.request
import socket
import struct
import random

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))
from scripts.lib import prospect_utils as pu

OVERPASS_URL = "https://overpass-api.de/api/interpreter"
USER_AGENT = "collectly-research/1.0 (contact: fmugendi@udel.edu)"
RADIUS_M = 20000
SLEEP_BETWEEN = 2.0
FETCH_TIMEOUT = 30
OUTPUT_PATH = os.path.join(os.path.dirname(HERE), "data", "osm-new-leads-2026-09-03.csv")

CATEGORY_MAP = {
    "accountant": ("accounting", "1"),
    "tax_advisor": ("accounting", "1"),
    "financial_advisor": ("financial-services", "1"),
    "consulting": ("consulting", "3"),
    "advertising_agency": ("marketing-agency", "2"),
    "graphic_design": ("design", "2"),
}
OFFICE_REGEX = "|".join(re.escape(k) for k in CATEGORY_MAP)

# Target cities: (city, country_code, lat, lon)
TARGET_CITIES = [
    # Canada
    ("Toronto", "CA", 43.6532, -79.3832),
    ("Montreal", "CA", 45.5019, -73.5674),
    ("Calgary", "CA", 51.0447, -114.0719),
    ("Ottawa", "CA", 45.4215, -75.6972),
    ("Winnipeg", "CA", 49.8951, -97.1384),
    # Australia
    ("Melbourne", "AU", -37.8136, 144.9631),
    ("Brisbane", "AU", -27.4698, 153.0251),
    ("Perth", "AU", -31.9505, 115.8605),
    ("Adelaide", "AU", -34.9285, 138.6007),
    # UK
    ("Birmingham", "GB", 52.4862, -1.8904),
    ("Edinburgh", "GB", 55.9533, -3.1883),
    ("Glasgow", "GB", 55.8642, -4.2518),
    ("Bristol", "GB", 51.4545, -2.5879),
    ("Leeds", "GB", 53.8008, -1.5491),
    # US (underrepresented)
    ("Denver", "US", 39.7392, -104.9903),
    ("Portland", "US", 45.5051, -122.6750),
    ("Minneapolis", "US", 44.9778, -93.2650),
    ("Atlanta", "US", 33.7490, -84.3880),
    ("Miami", "US", 25.7617, -80.1918),
]

GDPR_REVIEW_COUNTRIES = {"GB", "IE"}

# --- Email finding helpers (inlined from free_email_finder.py) ---
MAX_CANDIDATES_TRIED = 5

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
    return out[:MAX_CANDIDATES_TRIED]

def find_email_for_domain(domain, first="", last=""):
    """Return (email, method) or ('', 'no_mx'/'no_domain')."""
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

# --- OSM Overpass ---
def normalize_website(raw):
    raw = (raw or "").strip()
    if not raw:
        return "", ""
    if not raw.startswith(("http://", "https://")):
        raw = "https://" + raw
    domain = urllib.parse.urlparse(raw).netloc.replace("www.", "").lower()
    return raw, domain

def overpass_query(lat, lon):
    q = (
        f'[out:json][timeout:25];'
        f'('
        f'node["office"~"{OFFICE_REGEX}"](around:{RADIUS_M},{lat},{lon});'
        f'way["office"~"{OFFICE_REGEX}"](around:{RADIUS_M},{lat},{lon});'
        f');'
        f'out center 200;'
    )
    data = urllib.parse.urlencode({"data": q}).encode()
    req = urllib.request.Request(OVERPASS_URL, data=data, headers={"User-Agent": USER_AGENT})
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=FETCH_TIMEOUT) as resp:
                return json.loads(resp.read().decode("utf-8", errors="ignore"))
        except Exception as e:
            wait = 5 * (attempt + 1)
            print(f"    overpass error (attempt {attempt+1}/3): {e} -- retrying in {wait}s")
            time.sleep(wait)
    return {}

# --- Chain detection (skip obvious chains) ---
CHAIN_KEYWORDS = ["h&r block", "jackson hewitt", "liberty tax", "crowe", "bdo ", "grant thornton",
                  "deloitte", "pwc", "ey ", "kpmg", "rsm", "baker tilly", "moss adams",
                  "cliftonlabs", "clifton allen", "clifton cpas", "cbiz", "marcum", "berdon",
                  "mazars", "moore global", "nexia", "pricewaterhouse", "ernst & young"]

def is_chain(name):
    nl = name.lower()
    return any(kw in nl for kw in CHAIN_KEYWORDS)

def main():
    suppressed = pu.load_suppressed_emails()
    seen_domains, seen_companies = pu.existing_domains_and_companies()
    print(f"[start] existing domains: {len(seen_domains)}, existing companies: {len(seen_companies)}")

    new_rows = []
    stats = {
        "cities_queried": 0, "elements_seen": 0, "no_website": 0,
        "dup_domain": 0, "chain_skipped": 0, "added": 0,
        "emails_found": 0, "email_failed": 0,
    }
    # Track discoveries by city for reporting
    by_city = {}
    by_country = {}

    for city, cc, lat, lon in TARGET_CITIES:
        print(f"\n=== {city}, {cc} ===")
        result = overpass_query(lat, lon)
        elements = result.get("elements", [])
        stats["cities_queried"] += 1
        stats["elements_seen"] += len(elements)
        print(f"  {len(elements)} tagged offices within {RADIUS_M/1000:.0f}km")

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

            # Try email finding via MX check
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

            # Generate prospect ID
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

        time.sleep(SLEEP_BETWEEN)

    # Write to separate output file
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
    print(f"  Cities queried: {stats['cities_queried']}")
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

    return new_rows


if __name__ == "__main__":
    main()