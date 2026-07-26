#!/usr/bin/env python3
"""Scrape agency websites for team/about/contact pages to find founder emails.

Uses stdlib only. For each domain, fetches /team, /about, /people, /contact, root.
Looks for names paired with Founder/CEO/Director/MD titles and emails on the page.
"""
import csv
import re
import socket
import ssl
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse

HERE = Path(__file__).resolve().parent
DATA = HERE.parent / "data"
OUTPUT = HERE.parent / "outputs"

USER_AGENT = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36"
TIMEOUT = 15

FOUNDER_TITLES = re.compile(
    r"\b(Founder|Co-Founder|CEO|Managing Director|MD|Director|Owner|Partner|Principal|President)\b",
    re.IGNORECASE,
)


def normalize_domain(website: str) -> str:
    website = website.strip().lower()
    if not website:
        return ""
    if not website.startswith(("http://", "https://")):
        website = "https://" + website
    parsed = urlparse(website)
    return parsed.netloc or parsed.path.split("/")[0]


def email_in_text(text: str, domain: str = "") -> list:
    emails = set()
    for m in re.finditer(r"[\w.+-]+@[\w-]+\.[\w.-]+", text):
        email = m.group(0).lower().strip(".>,;:")
        if domain and not email.endswith("@" + domain.lower()):
            continue
        emails.add(email)
    return sorted(emails)


def pattern_emails(first: str, last: str, domain: str) -> list:
    f = re.sub(r"[^a-z0-9]", "", first.lower())
    l = re.sub(r"[^a-z0-9]", "", last.lower())
    fi = f[0] if f else ""
    li = l[0] if l else ""
    patterns = [
        f"{f}@{domain}",
        f"{f}.{l}@{domain}",
        f"{fi}{l}@{domain}",
        f"{f}{li}@{domain}",
        f"hello@{domain}",
    ]
    seen = set()
    out = []
    for p in patterns:
        if p not in seen:
            seen.add(p)
            out.append(p)
    return out


def fetch(url: str) -> str:
    try:
        ctx = ssl.create_default_context()
        req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
        with urllib.request.urlopen(req, timeout=TIMEOUT, context=ctx) as resp:
            return resp.read().decode("utf-8", errors="ignore")
    except Exception as e:
        return ""


def scrape_domain(domain: str) -> dict:
    if not domain:
        return {}
    pages = ["", "/team", "/about", "/people", "/contact"]
    combined_text = ""
    for path in pages:
        text = fetch(f"https://{domain}{path}")
        combined_text += "\n" + text

    if not combined_text.strip():
        for path in pages:
            text = fetch(f"http://{domain}{path}")
            combined_text += "\n" + text

    domain_emails = email_in_text(combined_text, domain)

    people = []
    seen_people = set()
    for line in combined_text.splitlines():
        line = line.strip()
        if len(line) < 10 or len(line) > 200:
            continue
        if FOUNDER_TITLES.search(line):
            parts = re.split(r"[,\-–—|]", line)[0].split()
            name_parts = [p for p in parts[:4] if p and p[0].isupper() and p.lower() not in {"the", "mr", "mrs", "ms", "dr"}]
            if len(name_parts) >= 2:
                first, last = name_parts[0], name_parts[-1]
                key = f"{first} {last}".lower()
                if key not in seen_people:
                    seen_people.add(key)
                    people.append({"first": first, "last": last, "context": line})

    return {
        "domain": domain,
        "domain_emails": domain_emails,
        "people": people,
    }


def main():
    with open(DATA / "prospects.csv", newline="") as f:
        prospects = list(csv.DictReader(f))

    targets = []
    for p in prospects:
        if not p.get("email"):
            domain = normalize_domain(p.get("website", ""))
            if domain:
                targets.append({"id": p["id"], "domain": domain, "row": p})

    print(f"Scraping {len(targets)} domains for missing emails...")
    results = []
    for t in targets:
        print(f"\n{t['id']} {t['domain']}")
        res = scrape_domain(t["domain"])
        print(f"  emails: {res.get('domain_emails', [])}")
        print(f"  people: {res.get('people', [])[:3]}")
        results.append({**t, **res})

    out_path = OUTPUT / f"website-scrape-results-{datetime.now(timezone.utc).strftime('%Y-%m-%dT%H%M')}.csv"
    OUTPUT.mkdir(parents=True, exist_ok=True)
    with open(out_path, "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["id", "domain", "emails_found", "people_found"])
        for r in results:
            w.writerow([r["id"], r["domain"], "; ".join(r.get("domain_emails", [])), str(r.get("people", []))])
    print(f"\nWrote results to {out_path}")


if __name__ == "__main__":
    main()
