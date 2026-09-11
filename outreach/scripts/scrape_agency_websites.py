#!/usr/bin/env python3
"""Scrape agency websites for team/about/contact pages to find founder emails.

Uses stdlib only. For each domain, fetches /team, /about, /people, /contact, root.
Looks for names paired with Founder/CEO/Director/MD titles and emails on the page.
"""
import csv
import re
import socket
import ssl
import sys
import time
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse

HERE = Path(__file__).resolve().parent
DATA = HERE.parent / "data"
OUTPUT = HERE.parent / "outputs"

sys.path.insert(0, str(HERE.parent))
from scripts.lib import prospect_utils as pu

SLEEP_BETWEEN = 0.6

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
    # `hello@{domain}` used to be the last entry here. It is a guess at a
    # domain rather than a person, and generating it is how 198 role addresses
    # reached the send list and drove a 34.2% 7-day bounce rate. A pattern
    # built from a REAL name found on the site is a defensible guess; a
    # generic mailbox is not a guess about anybody.
    patterns = [
        f"{f}@{domain}",
        f"{f}.{l}@{domain}",
        f"{fi}{l}@{domain}",
        f"{f}{li}@{domain}",
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


def pick_best_email(res: dict, suppressed: set) -> tuple:
    """Return (email, first, last) -- prefer an email that matches a
    detected founder/exec's name; otherwise the highest-scoring domain
    email (non-generic > generic); skip anything suppressed."""
    domain = res.get("domain", "")
    candidates = [e for e in res.get("domain_emails", []) if not pu.is_suppressed(e, suppressed)]
    if not candidates:
        return "", "", ""

    for person in res.get("people", []):
        first, last = person["first"].lower(), person["last"].lower()
        for e in candidates:
            local = e.split("@", 1)[0].lower()
            if first in local and (last in local or len(last) == 0):
                return e, person["first"], person["last"]

    # No person matched. Previously this fell through to "highest-scoring
    # domain email", which returned a role mailbox with an empty name — the
    # single line responsible for most of the bad list. A prospect we cannot
    # attach to a named human is not a prospect; return nothing and let the
    # domain be retried later by a source that can name someone.
    candidates.sort(key=lambda e: pu.score_email(e, domain), reverse=True)
    best = candidates[0]
    local = best.split("@", 1)[0].lower()
    if local in pu.GENERIC_LOCALPARTS or any(local.startswith(g) for g in pu.GENERIC_LOCALPARTS):
        return "", "", ""
    if "." in local:
        first, last = (local.split(".", 1) + [""])[:2]
        return best, first.capitalize(), last.capitalize()
    # A single-word non-generic local part (e.g. "sarah@") is only usable if
    # the site actually showed us that person.
    for person in res.get("people", []):
        if person["first"].lower() == local:
            return best, person["first"], person["last"]
    return "", "", ""


def main(limit=None):
    with open(DATA / "prospects.csv", newline="") as f:
        prospects = list(csv.DictReader(f))

    targets = []
    for p in prospects:
        if p.get("email"):
            continue
        domain = pu.extract_domain(p)
        if domain:
            targets.append({"id": p["id"], "domain": domain, "row": p})
    if limit:
        targets = targets[:limit]

    print(f"Scraping {len(targets)} domains for missing emails...")
    suppressed = pu.load_suppressed_emails()
    results = []
    updates = {}
    found = 0
    for i, t in enumerate(targets):
        print(f"\n[{i+1}/{len(targets)}] {t['id']} {t['domain']}")
        res = scrape_domain(t["domain"])
        print(f"  emails: {res.get('domain_emails', [])}")
        results.append({**t, **res})

        email, first, last = pick_best_email(res, suppressed)
        if email:
            update = {"email": email}
            if first:
                update["first_name"] = first
                update["last_name"] = last
            existing_notes = t["row"].get("notes") or ""
            update["notes"] = (existing_notes + " | website_scrape_email_found").strip(" |")
            updates[t["id"]] = update
            found += 1
            print(f"  -> matched {email}")
        time.sleep(SLEEP_BETWEEN)

    changed = pu.update_rows_by_id(updates)
    print(f"\n[csv] updated {changed} rows in prospects.csv with emails found on their own site")

    out_path = OUTPUT / f"website-scrape-results-{datetime.now(timezone.utc).strftime('%Y-%m-%dT%H%M')}.csv"
    OUTPUT.mkdir(parents=True, exist_ok=True)
    with open(out_path, "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["id", "domain", "emails_found", "people_found", "chosen_email"])
        for r in results:
            chosen = updates.get(r["id"], {}).get("email", "")
            w.writerow([r["id"], r["domain"], "; ".join(r.get("domain_emails", [])), str(r.get("people", []))[:300], chosen])
    print(f"[log] wrote audit trail to {out_path}")
    print(f"\n=== scrape_agency_websites report ===")
    print(f"  domains scraped: {len(targets)}")
    print(f"  emails found: {found}")


if __name__ == "__main__":
    import argparse
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=None)
    args = ap.parse_args()
    main(limit=args.limit)
