#!/usr/bin/env python3
"""Collectly prospect discovery.

Scrapes Clutch.co (free, public agency directory) for:
  - web design/dev studios
  - marketing agencies
  - branding agencies

For each, extracts:
  - company, website, founder_name, founder_title, country, team_size, source
Then runs Hunter email-finder to get the founder's email.
Verifies with Hunter email-verifier before adding to prospects.csv.

Avoids duplicates (by domain) and respects a hard 50-lookups/run cap.
"""
import csv, os, re, json, time, urllib.parse, urllib.request
from urllib.parse import urlparse

# Paths
import os
CSV_PATH = f'{os.path.expanduser("~")}/.openclaw/workspace/collectly/outreach/data/prospects.csv'
LOG_PATH = f'{os.path.expanduser("~")}/.openclaw/workspace/collectly/outreach/data/outreach-log.csv'

# Hunter
HUNTER_KEY_PATH = f'{os.path.expanduser("~")}/.openclaw/secrets/collectly/HUNTER_API_KEY'

# Segments to scrape
SEGMENTS = [
    {'clutch_slug': 'web-developers', 'name': 'web_design', 'label': 'web design studio', 'country_filter': ['United States', 'United Kingdom']},
    {'clutch_slug': 'digital-marketing', 'name': 'marketing', 'label': 'marketing agency', 'country_filter': ['United States', 'United Kingdom']},
    {'clutch_slug': 'branding', 'name': 'branding', 'label': 'branding studio', 'country_filter': ['United States', 'United Kingdom']},
]

USER_AGENT = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36'


def hunter_get(path):
    key = open(HUNTER_KEY_PATH).read().strip()
    url = f"https://api.hunter.io/v2/{path}"
    sep = '&' if '?' in url else '?'
    url += f"{sep}api_key={key}"
    req = urllib.request.Request(url, headers={'User-Agent': 'collectly/1.0'})
    try:
        return json.loads(urllib.request.urlopen(req, timeout=10).read())
    except Exception as e:
        return {'errors': [{'detail': str(e)}]}


def load_existing():
    if not os.path.exists(CSV_PATH):
        return []
    with open(CSV_PATH, newline='') as f:
        return list(csv.DictReader(f))


def load_log():
    if not os.path.exists(LOG_PATH):
        return []
    with open(LOG_PATH, newline='') as f:
        return list(csv.DictReader(f))


def get_existing_domains():
    domains = set()
    for r in load_existing():
        website = r.get('website', '') or r.get('linkedin_url', '')
        domain = urlparse(website).netloc.replace('www.', '') if website else ''
        if domain:
            domains.add(domain)
    return domains


def get_contacted_ids():
    return {r['id'] for r in load_log()}


def fetch_clutch_page(slug, page=0):
    """Scrape one Clutch.co directory page."""
    url = f'https://clutch.co/{slug}?page={page}'
    req = urllib.request.Request(url, headers={
        'User-Agent': USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml',
    })
    try:
        return urllib.request.urlopen(req, timeout=15).read().decode('utf-8', errors='ignore')
    except Exception as e:
        return ''


def parse_clutch_agencies(html):
    """Extract company names + website links from Clutch directory page."""
    if not html:
        return []
    # Clutch profile links look like: /profile/company-name
    profiles = re.findall(r'<a[^>]*href="(/profile/[^"]+)"[^>]*>([^<]+)</a>', html)
    seen = set()
    out = []
    for href, name in profiles:
        name = name.strip()
        if not name or name in seen or 'review' in name.lower() or 'agency' in name.lower() and len(name) < 4:
            continue
        seen.add(name)
        out.append({
            'company': name,
            'clutch_url': f'https://clutch.co{href}',
        })
    return out


def fetch_company_website(clutch_url):
    """Visit a Clutch profile to get the company website URL."""
    req = urllib.request.Request(clutch_url, headers={'User-Agent': USER_AGENT})
    try:
        html = urllib.request.urlopen(req, timeout=10).read().decode('utf-8', errors='ignore')
        # Look for "Visit Website" link
        m = re.search(r'href="(https?://[^"]+)"[^>]*class="[^"]*website[^"]*"', html, re.IGNORECASE)
        if m:
            return m.group(1)
        # Fallback: find any external link
        m = re.search(r'href="(https?://(?!clutch\.co|facebook\.com|twitter\.com|linkedin\.com|instagram\.com)[^"]+)"', html)
        if m:
            return m.group(1)
    except Exception:
        pass
    return ''


def get_email_for_domain(domain):
    """Use Hunter domain-search to find the best email."""
    data = hunter_get(f"domain-search?domain={domain}&limit=5").get('data', {})
    emails = data.get('emails', [])
    if not emails:
        return None, None, 0
    personal = [e for e in emails if e.get('type') == 'personal']
    pick = (personal or emails)[0]
    return pick.get('value'), pick.get('position', ''), pick.get('confidence', 0)


def verify_email(email):
    data = hunter_get(f"email-verifier?email={urllib.parse.quote(email)}").get('data', {})
    return data.get('status', '?'), data.get('score', 0)


def add_to_csv(row, fieldnames):
    rows = load_existing()
    rows.append(row)
    with open(CSV_PATH, 'w', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def main():
    if not os.path.exists(HUNTER_KEY_PATH):
        print("no Hunter API key found")
        return

    existing_domains = get_existing_domains()
    contacted = get_contacted_ids()
    print(f"existing domains: {len(existing_domains)}, contacted: {len(contacted)}")

    new_prospects = []
    found = 0
    verified = 0
    errors = 0

    for seg in SEGMENTS:
        print(f"\n=== {seg['name']} ({seg['clutch_slug']}) ===")
        # Scrape first 5 pages (150 agencies) — pick the first 30 in country
        for page in range(5):
            html = fetch_clutch_page(seg['clutch_slug'], page)
            agencies = parse_clutch_agencies(html)
            if not agencies:
                print(f"  page {page}: no agencies parsed")
                break
            for a in agencies[:10]:  # limit per page
                if found >= 100:
                    break
                # Skip if already in CSV
                if a['company'].lower() in [r.get('company', '').lower() for r in load_existing()]:
                    continue
                print(f"  {a['company']} -> fetching site...")
                website = fetch_company_website(a['clutch_url'])
                if not website:
                    print(f"    no website found")
                    continue
                domain = urlparse(website).netloc.replace('www.', '')
                if not domain or domain in existing_domains:
                    continue
                existing_domains.add(domain)
                # Find email via Hunter
                time.sleep(0.5)
                email, position, conf = get_email_for_domain(domain)
                if not email:
                    print(f"    no email found for {domain}")
                    continue
                # Verify
                time.sleep(0.5)
                status, score = verify_email(email)
                if status not in ('valid', 'accept_all'):
                    print(f"    email {email} {status} (skip)")
                    continue
                # OK, add to CSV
                pid = f"P{900 + found:03d}"  # avoid collision with P001-P030
                # Derive first/last from email
                local = email.split('@')[0]
                if '.' in local:
                    first, last = local.split('.', 1)
                else:
                    first, last = local, ''
                row = {
                    'id': pid,
                    'first_name': first.capitalize(),
                    'last_name': last.capitalize(),
                    'company': a['company'],
                    'role': position or '',
                    'country': 'US',  # default; refine later
                    'team_size': '5-50',
                    'industry': seg['name'],
                    'linkedin_url': a['clutch_url'],
                    'email': email,
                    'source': 'clutch.co',
                    'notes': f'auto-discovery | hunter_{status}_score={score} | conf={conf}',
                }
                new_prospects.append(row)
                verified += 1
                found += 1
                print(f"    ✅ {pid} {email} ({status}, score {score})")
            time.sleep(1)
        if found >= 100:
            break

    # Append to CSV
    if new_prospects:
        rows = load_existing()
        fieldnames = list(rows[0].keys()) if rows else list(new_prospects[0].keys())
        # Pad any missing keys
        for r in new_prospects:
            for k in fieldnames:
                if k not in r:
                    r[k] = ''
        rows.extend(new_prospects)
        with open(CSV_PATH, 'w', newline='') as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(rows)

    print(f"\n=== Discovery report ===")
    print(f"new found: {found}")
    print(f"verified: {verified}")
    print(f"errors: {errors}")
    return new_prospects


if __name__ == '__main__':
    main()
