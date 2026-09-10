#!/usr/bin/env python3
"""Discover prospect companies via the OpenStreetMap Overpass API.

Why this exists: Clutch.co (the previous best free source) is now behind a
Cloudflare JS challenge and returns 403 to any non-browser client, and
Google Maps / most agency directories (Sortlist, GoodFirms, Bark, UpCity)
either require a real browser (JS SPA) or don't expose company websites
publicly. Overpass is a genuine, ToS-clean, unblocked free API over OSM's
public business-listing data -- no scraping, no bot-detection arms race.

For each (city, category) we ask Overpass for tagged offices within a
radius of the city center, keep only entries with a `website` tag (no
website = nothing for the email pipeline to work with), and append them
to prospects.csv as email-less rows for scrape_agency_websites.py /
free_email_finder.py to fill in.

Coverage caveat (expect, don't be surprised by): OSM's office-tag fill
rate is modest and inconsistent city to city -- this is mapping data,
not a commercial directory, so yield per city is much lower than Clutch
used to give per page.
"""
import csv
import json
import os
import re
import sys
import time
import urllib.parse
import urllib.request

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from scripts.lib import prospect_utils as pu

OVERPASS_URL = "https://overpass-api.de/api/interpreter"
USER_AGENT = "collectly-research/1.0 (contact: fmugendi@udel.edu)"
RADIUS_M = 20000
SLEEP_BETWEEN = 2.0
FETCH_TIMEOUT = 30

# office=* tag -> (industry label, tier)
CATEGORY_MAP = {
    "accountant": ("accounting", "1"),
    "tax_advisor": ("accounting", "1"),
    "financial_advisor": ("financial-services", "1"),
    "consulting": ("consulting", "3"),
    "advertising_agency": ("marketing-agency", "2"),
    "graphic_design": ("design", "2"),
}
OFFICE_REGEX = "|".join(re.escape(k) for k in CATEGORY_MAP)

# (city, country_code, lat, lon)
CITIES = [
    # United States
    ("New York", "US", 40.7128, -74.0060), ("Los Angeles", "US", 34.0522, -118.2437),
    ("Chicago", "US", 41.8781, -87.6298), ("Houston", "US", 29.7604, -95.3698),
    ("Phoenix", "US", 33.4484, -112.0740), ("Philadelphia", "US", 39.9526, -75.1652),
    ("San Antonio", "US", 29.4241, -98.4936), ("San Diego", "US", 32.7157, -117.1611),
    ("Dallas", "US", 32.7767, -96.7970), ("Austin", "US", 30.2672, -97.7431),
    ("San Jose", "US", 37.3382, -121.8863), ("Seattle", "US", 47.6062, -122.3321),
    ("Denver", "US", 39.7392, -104.9903), ("Boston", "US", 42.3601, -71.0589),
    ("Atlanta", "US", 33.7490, -84.3880), ("Miami", "US", 25.7617, -80.1918),
    ("Minneapolis", "US", 44.9778, -93.2650), ("Detroit", "US", 42.3314, -83.0458),
    ("Charlotte", "US", 35.2271, -80.8431), ("Portland", "US", 45.5051, -122.6750),
    ("Nashville", "US", 36.1627, -86.7816), ("Indianapolis", "US", 39.7684, -86.1581),
    ("Columbus", "US", 39.9612, -82.9988), ("Raleigh", "US", 35.7796, -78.6382),
    # Canada
    ("Toronto", "CA", 43.6532, -79.3832), ("Vancouver", "CA", 49.2827, -123.1207),
    ("Montreal", "CA", 45.5019, -73.5674), ("Calgary", "CA", 51.0447, -114.0719),
    ("Ottawa", "CA", 45.4215, -75.6972),
    # United Kingdom
    ("London", "GB", 51.5074, -0.1278), ("Manchester", "GB", 53.4808, -2.2426),
    ("Birmingham", "GB", 52.4862, -1.8904), ("Edinburgh", "GB", 55.9533, -3.1883),
    ("Leeds", "GB", 53.8008, -1.5491), ("Bristol", "GB", 51.4545, -2.5879),
    ("Glasgow", "GB", 55.8642, -4.2518),
    # Australia
    ("Sydney", "AU", -33.8688, 151.2093), ("Melbourne", "AU", -37.8136, 144.9631),
    ("Brisbane", "AU", -27.4698, 153.0251), ("Perth", "AU", -31.9505, 115.8605),
    ("Adelaide", "AU", -34.9285, 138.6007),
    # New Zealand
    ("Auckland", "NZ", -36.8485, 174.7633), ("Wellington", "NZ", -41.2865, 174.7762),
    ("Christchurch", "NZ", -43.5321, 172.6362),
    # Ireland
    ("Dublin", "IE", 53.3498, -6.2603), ("Cork", "IE", 51.8985, -8.4756),
    # Singapore
    ("Singapore", "SG", 1.3521, 103.8198),
    # South Africa
    ("Johannesburg", "ZA", -26.2041, 28.0473), ("Cape Town", "ZA", -33.9249, 18.4241),
    ("Durban", "ZA", -29.8587, 31.0218), ("Pretoria", "ZA", -25.7479, 28.2293),
]

# Countries where cold-emailing individuals carries meaningful GDPR/PECR
# exposure vs. the US's permissive CAN-SPAM regime. We still collect these
# (they're public business listings) but flag them for manual review
# instead of letting them auto-queue -- see classify_task() in
# task_runner.py, which already treats "new segment" the same way.
GDPR_REVIEW_COUNTRIES = {"GB", "IE"}


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


def normalize_website(raw):
    raw = (raw or "").strip()
    if not raw:
        return "", ""
    if not raw.startswith(("http://", "https://")):
        raw = "https://" + raw
    domain = urllib.parse.urlparse(raw).netloc.replace("www.", "").lower()
    return raw, domain


def main(city_filter=None, max_cities=None, countries=None):
    suppressed = pu.load_suppressed_emails()
    seen_domains, seen_companies = pu.existing_domains_and_companies()
    print(f"[start] existing domains: {len(seen_domains)}, existing companies: {len(seen_companies)}")

    cities = CITIES
    if countries:
        wanted = {c.upper() for c in countries}
        cities = [c for c in cities if c[1] in wanted]
    if city_filter:
        cities = [c for c in cities if city_filter.lower() in c[0].lower()]
    if max_cities:
        cities = cities[:max_cities]

    new_rows = []
    stats = {"cities_queried": 0, "elements_seen": 0, "no_website": 0,
              "dup_domain": 0, "added": 0, "direct_email": 0}

    for city, cc, lat, lon in cities:
        print(f"\n=== {city}, {cc} ===")
        result = overpass_query(lat, lon)
        elements = result.get("elements", [])
        stats["cities_queried"] += 1
        stats["elements_seen"] += len(elements)
        print(f"  {len(elements)} tagged offices within {RADIUS_M/1000:.0f}km")

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

            industry, tier = CATEGORY_MAP.get(office, ("consulting", "3"))
            direct_email = (tags.get("contact:email") or tags.get("email") or "").strip().lower()
            if direct_email and pu.is_suppressed(direct_email, suppressed):
                direct_email = ""
            if direct_email:
                stats["direct_email"] += 1

            addr_city = tags.get("addr:city", city)
            row = {
                "id": f"OSM-{int(time.time())}-{stats['added']:04d}",
                "first_name": "", "last_name": "",
                "company": name,
                "role": "",
                "country": cc,
                "team_size": "",
                "industry": industry,
                "linkedin_url": "",
                "email": direct_email,
                "source": "osm_overpass",
                "notes": f"osm-discovery | domain={domain} | city={addr_city} | office={office}"
                         + (" | gdpr_review" if cc in GDPR_REVIEW_COUNTRIES else ""),
                "hook": "",
                "tier": tier,
            }
            new_rows.append(row)
            seen_domains.add(domain)
            seen_companies.add(name.lower())
            stats["added"] += 1
            print(f"  + {name} ({domain}) [{industry}]" + (f" email={direct_email}" if direct_email else ""))

        # Checkpoint after every city, not just at the very end -- a
        # rate-limit (429) or a kill signal partway through a many-city
        # run used to lose everything found so far, since append only
        # ran once after the full city loop.
        if new_rows:
            pu.append_new_rows(new_rows)
            print(f"  [checkpoint] appended {len(new_rows)} row(s) so far to {pu.CSV_PATH}")
            new_rows = []

        time.sleep(SLEEP_BETWEEN)

    print("\n=== OSM discovery report ===")
    for k, v in stats.items():
        print(f"  {k}: {v}")
    return new_rows


if __name__ == "__main__":
    import argparse
    ap = argparse.ArgumentParser()
    ap.add_argument("--city", default=None, help="substring filter on city name")
    ap.add_argument("--max-cities", type=int, default=None)
    ap.add_argument("--countries", nargs="+", default=None, help="restrict to these 2-letter country codes")
    args = ap.parse_args()
    main(city_filter=args.city, max_cities=args.max_cities, countries=args.countries)
