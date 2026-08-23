#!/usr/bin/env python3
"""Free email discovery + light verification without paid APIs.

Methods:
- Web search snippets for exact email mentions.
- Common pattern generation based on first/last name + domain.
- Optional SMTP MX check (disabled by default; many servers block it).
"""
import csv, re, json, urllib.request, urllib.parse, time, sys, os

import os
PROSPECTS_PATH = f'{os.path.expanduser("~")}/.openclaw/workspace/collectly/outreach/data/prospects.csv'
NEXT_BATCH_PATH = f'{os.path.expanduser("~")}/.openclaw/workspace/collectly/outreach/data/prospects-next-batch.csv'

def normalize(name):
    return re.sub(r"[^a-z0-9]", "", name.lower())

def patterns(first, last, domain):
    f = normalize(first)
    l = normalize(last)
    fi = f[0] if f else ''
    li = l[0] if l else ''
    base = [
        f'{f}@{domain}',
        f'{l}@{domain}',
        f'{f}.{l}@{domain}',
        f'{f}{l}@{domain}',
        f'{fi}{l}@{domain}',
        f'{f}{li}@{domain}',
        f'{fi}.{l}@{domain}',
        f'{f}.{li}@{domain}',
        f'{f}_{l}@{domain}',
        f'{fi}{li}@{domain}',
        f'hello@{domain}',
        f'info@{domain}',
        f'contact@{domain}',
    ]
    # de-duplicate
    seen = set()
    out = []
    for p in base:
        if p not in seen:
            seen.add(p)
            out.append(p)
    return out
def smtp_check(email, timeout=10):
    # Disabled to avoid IP reputation risk. Use web search + pattern confidence only.
    return None, 'disabled'

def web_search_email(email):
    """Search for exact email string on web. Returns True if found in snippet."""
    q = f'"{email}"'
    url = f'https://html.duckduckgo.com/html/?q={urllib.parse.quote(q)}'
    try:
        req = urllib.request.Request(url, headers={'User-Agent':'Mozilla/5.0'})
        html = urllib.request.urlopen(req, timeout=10).read().decode('utf-8', errors='ignore')
        return email.lower() in html.lower()
    except Exception as e:
        return False

def main():
    rows = []
    for path in [PROSPECTS_PATH, NEXT_BATCH_PATH]:
        if not os.path.exists(path):
            continue
        with open(path, newline='') as f:
            r = csv.DictReader(f)
            for row in r:
                if row.get('email') or 'hunter_found' in row.get('notes',''):
                    continue
                if not row.get('first_name') or not row.get('website'):
                    continue
                rows.append(row)

    # prioritize tier 1, then 2
    rows.sort(key=lambda r: int(r.get('tier','3')))

    results = []
    for row in rows[:10]:  # limit per run to avoid SMTP blocks / search rate limits
        first, last, domain = row['first_name'], row.get('last_name',''), row['website']
        domain = re.sub(r'^https?://','', domain).split('/')[0]
        print(f"\n{row['id']} {first} {last} @ {domain}")
        candidates = patterns(first, last, domain)
        found = None
        for email in candidates:
            time.sleep(0.5)
            # Web search exact match
            if web_search_email(email):
                print('  web match:', email)
                found = email
                break
            # SMTP check (may fail on many servers)
            ok, reason = smtp_check(email)
            print('  tried:', email, '->', reason)
            if ok:
                found = email
                break
            time.sleep(1)
        if found:
            results.append((row['id'], found, 'web_or_smtp'))
        else:
            results.append((row['id'], '', 'not_found'))

    # Print as CSV
    print('\n--- RESULTS ---')
    for pid, email, src in results:
        print(f'{pid},{email},{src}')

if __name__ == '__main__':
    main()
