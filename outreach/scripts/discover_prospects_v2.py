#!/usr/bin/env python3
"""Collectly prospect discovery v2 — Apify replacement.

Pipeline:
  1. Scrape Clutch.co slugs (accounting-services, bookkeeping, fractional-cfo, financial-services)
     — US/CA filter, free, no API key
  2. Visit each Clutch profile, pull the company website
  3. Visit the company website, scan for AR/cashflow/job-posting pain signals
  4. Pull team / about / contact page to find founder email
  5. Free email-guess cascade (pattern-match + MX via dig)
  6. Append to prospects.csv (dedup by domain)

Replaces Apify (account capped $9.35/$5 on 2026-08-18).
"""
import csv
import os
import re
import json
import time
import socket
import urllib.parse
import urllib.request
import subprocess
from urllib.parse import urlparse
from html.parser import HTMLParser

# -------- Paths --------
HOME = os.path.expanduser("~")
WS = f"{HOME}/.openclaw/workspace/collectly"
CSV_PATH = f"{WS}/outreach/data/prospects.csv"
LOG_PATH = f"{WS}/outreach/data/outreach-log.csv"
NEW_BATCH_PATH = f"{WS}/outreach/data/new-prospects.csv"
SECRETS_DIR = f"{HOME}/.openclaw/secrets/collectly"

# -------- Segments (Apify replacement, US/CA heavy) --------
SEGMENTS = [
    {"clutch_slug": "accounting-services", "name": "accounting", "label": "accounting firm",
     "country_filter": ["United States", "Canada"]},
    {"clutch_slug": "bookkeeping", "name": "bookkeeping", "label": "bookkeeping firm",
     "country_filter": ["United States", "Canada"]},
    {"clutch_slug": "financial-services", "name": "financial-services", "label": "financial services",
     "country_filter": ["United States", "Canada"]},
    {"clutch_slug": "fractional-cfo", "name": "fractional-cfo", "label": "fractional CFO",
     "country_filter": ["United States"]},
]

# -------- Signal keywords (the "research quality" layer that beats Apify) --------
AR_PAIN_SIGNALS = [
    "accounts receivable", "ar management", "ar automation", "ar follow",
    "dunning", "collections", "billing", "invoicing",
    "cash flow", "cashflow forecast", "cash-flow management",
    "overdue", "past due", "late payment", "payment reminders",
    "monthly close", "month end close",
    "quickbooks", "xero", "sage",
    "small business", "small to mid", "smb",
]
TEAM_HINTS = ["our team", "meet the team", "founders", "leadership", "about us", "contact"]
EMAIL_PATTERN_RE = re.compile(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}")
FOUNDER_HINT_RE = re.compile(
    r"(founder|co-founder|co founder|ceo|owner|principal|managing partner|president)\b",
    re.IGNORECASE,
)

USER_AGENT = (
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/120 Safari/537.36"
)

# -------- Tunables --------
MAX_PER_SEGMENT = 25          # smoke test: keep small
MAX_PAGES_PER_SEGMENT = 3     # 3 pages of Clutch ≈ 90 listings/slug
SLEEP_BETWEEN = 0.8           # polite
FETCH_TIMEOUT = 10
MAX_BYTES = 200_000           # cap response to avoid huge pages


# ---------- Networking ----------
def fetch(url, timeout=FETCH_TIMEOUT, allow_redirects=True):
    """GET a URL. Returns '' on any failure. Capped at MAX_BYTES."""
    try:
        req = urllib.request.Request(url, headers={
            "User-Agent": USER_AGENT,
            "Accept": "text/html,application/xhtml+xml",
        })
        resp = urllib.request.urlopen(req, timeout=timeout)
        raw = resp.read(MAX_BYTES)
        return raw.decode("utf-8", errors="ignore")
    except Exception:
        return ""


# ---------- Clutch parsing ----------
CLUTCH_PROFILE_RE = re.compile(
    r'<a[^>]*href="(/profile/[^"]+)"[^>]*>\s*([^<]+?)\s*</a>', re.DOTALL
)
CLUTCH_WEBSITE_RE = re.compile(
    r'href="(https?://[^"]+)"[^>]*class="[^"]*website-link[^"]*"', re.IGNORECASE
)
CLUTCH_WEBSITE_FALLBACK_RE = re.compile(
    r'href="(https?://(?!clutch\.co|facebook\.com|twitter\.com|linkedin\.com|instagram\.com)[^"]+)"'
)
CLUTCH_COUNTRY_RE = re.compile(
    r'<span[^>]*class="[^"]*country[^"]*"[^>]*>\s*([^<]+?)\s*</span>', re.IGNORECASE
)
CLUTCH_EMPLOYEES_RE = re.compile(
    r'(\d+)\s*-\s*(\d+)\s*employees', re.IGNORECASE
)


def parse_clutch(html):
    """Return list of {company, profile_url} from one Clutch directory page."""
    out, seen = [], set()
    for href, name in CLUTCH_PROFILE_RE.findall(html):
        name = name.strip()
        if not name or len(name) < 2 or len(name) > 80:
            continue
        if name.lower() in seen:
            continue
        # Skip nav / UI junk
        if any(bad in name.lower() for bad in ["add agency", "view profile", "see more", "load more", "filter"]):
            continue
        seen.add(name.lower())
        out.append({"company": name, "profile_url": f"https://clutch.co{href}"})
    return out


def fetch_clutch_profile(profile_url):
    """Visit a Clutch profile, return dict with website + country + employees."""
    html = fetch(profile_url)
    info = {"website": "", "country": "", "employees": "", "snippet": ""}
    if not html:
        return info
    m = CLUTCH_WEBSITE_RE.search(html)
    if m:
        info["website"] = m.group(1)
    if not info["website"]:
        m = CLUTCH_WEBSITE_FALLBACK_RE.search(html)
        if m and "clutch.co" not in m.group(1):
            info["website"] = m.group(1)
    m = CLUTCH_COUNTRY_RE.search(html)
    if m:
        info["country"] = m.group(1).strip()
    m = CLUTCH_EMPLOYEES_RE.search(html)
    if m:
        info["employees"] = f"{m.group(1)}-{m.group(2)}"
    # Mini-bio snippet — first <p> after the h1
    snip = re.search(r'<h1[^>]*>[^<]+</h1>\s*<p[^>]*>([^<]{40,400})', html)
    if snip:
        info["snippet"] = re.sub(r"<[^>]+>", "", snip.group(1)).strip()
    return info


# ---------- Company-site scan ----------
def normalize_url(raw):
    if not raw:
        return ""
    if not raw.startswith(("http://", "https://")):
        raw = "https://" + raw
    return raw.rstrip("/")


def find_pain_signals(html):
    """Return list of matched AR/cashflow signal phrases (lowercased)."""
    if not html:
        return []
    text = re.sub(r"<[^>]+>", " ", html.lower())
    text = re.sub(r"\s+", " ", text)
    hits = []
    for sig in AR_PAIN_SIGNALS:
        if sig in text:
            hits.append(sig)
    return hits


def find_email_on_page(html):
    """First plausible email on the page (skip image/asset patterns)."""
    if not html:
        return ""
    candidates = EMAIL_PATTERN_RE.findall(html)
    skip_domains = ("example.com", "yourcompany", "email.com", "domain.com",
                    "sentry.io", "wixpress.com", "wordpress.com", "schema.org")
    for c in candidates:
        low = c.lower()
        if any(s in low for s in skip_domains):
            continue
        # skip image filenames
        if low.endswith((".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp")):
            continue
        return c
    return ""


def guess_founder_email(domain, first=None, last=None):
    """Pattern-match common founder email formats."""
    if not domain:
        return ""
    candidates = []
    if first:
        candidates.append(f"{first}@{domain}")
        if last:
            candidates.append(f"{first}.{last}@{domain}")
            candidates.append(f"{first[0]}{last}@{domain}")
            candidates.append(f"{first}{last[0]}@{domain}")
    candidates += [
        f"founder@{domain}", f"hello@{domain}", f"info@{domain}",
        f"contact@{domain}", f"team@{domain}", f"admin@{domain}",
    ]
    return candidates


def domain_has_mx(domain):
    """True if the domain has MX records (cheap liveness check)."""
    try:
        out = subprocess.run(
            ["dig", "+short", "MX", domain],
            capture_output=True, text=True, timeout=5
        ).stdout.strip()
        return bool(out)
    except Exception:
        return False


def verify_smtp_rcpt(email, timeout=5):
    """Best-effort: connect to MX, RCPT TO, see if accepted. Returns True/False/None.

    None = inconclusive (timeout, blocked, etc.) — treated as 'unknown, use with caution'.
    """
    try:
        domain = email.split("@", 1)[1]
        # Resolve MX host
        mx_out = subprocess.run(
            ["dig", "+short", "MX", domain],
            capture_output=True, text=True, timeout=5
        ).stdout.strip().splitlines()
        mx_hosts = []
        for line in mx_out:
            parts = line.split()
            if len(parts) >= 2 and parts[0].isdigit():
                mx_hosts.append((int(parts[0]), parts[1].rstrip(".")))
            elif len(parts) == 1:
                mx_hosts.append((10, parts[0].rstrip(".")))
        if not mx_hosts:
            return None
        mx_hosts.sort()
        host = mx_hosts[0][1]
        import smtplib
        with smtplib.SMTP(host, 25, timeout=timeout) as s:
            s.helo("collectly.local")
            s.mail("verify@collectly.local")
            code, _ = s.rcpt(email)
            s.quit()
        if code in (250, 251):
            return True
        if code in (550, 551, 552, 553):
            return False
        return None
    except Exception:
        return None


# ---------- Source-specific free enrichment ----------
def try_hunter(domain):
    """If Hunter key present, use it. Otherwise skip (don't fail)."""
    key_path = f"{SECRETS_DIR}/HUNTER_API_KEY"
    if not os.path.exists(key_path):
        return ""
    try:
        key = open(key_path).read().strip()
    except Exception:
        return ""
    url = f"https://api.hunter.io/v2/domain-search?domain={domain}&limit=5&api_key={key}"
    try:
        resp = urllib.request.urlopen(url, timeout=10).read()
        data = json.loads(resp).get("data", {})
        emails = data.get("emails", [])
        # Prefer personal, then any
        personal = [e for e in emails if e.get("type") == "personal"]
        pick = (personal or emails)[0] if (personal or emails) else {}
        return pick.get("value", "")
    except Exception:
        return ""


# ---------- CSV I/O ----------
def load_existing():
    if not os.path.exists(CSV_PATH):
        return []
    with open(CSV_PATH, newline="") as f:
        return list(csv.DictReader(f))


def existing_domains():
    rows = load_existing()
    domains = set()
    for r in rows:
        for k in ("website", "linkedin_url", "company"):
            v = r.get(k, "") or ""
            if k == "company":
                continue
            d = urlparse(v).netloc.replace("www.", "")
            if d:
                domains.add(d)
        # also company-name match (lowercase)
        if r.get("company"):
            domains.add(r["company"].lower().strip())
    return domains


def fieldnames_from_existing_or_default():
    rows = load_existing()
    if rows:
        return list(rows[0].keys())
    return [
        "id", "first_name", "last_name", "company", "role",
        "country", "team_size", "industry", "linkedin_url",
        "email", "source", "notes", "hook", "tier",
    ]


def append_csv(new_rows):
    if not new_rows:
        return
    rows = load_existing()
    fieldnames = fieldnames_from_existing_or_default()
    for r in new_rows:
        for k in fieldnames:
            r.setdefault(k, "")
        rows.append(r)
    with open(CSV_PATH, "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames)
        w.writeheader()
        w.writerows(rows)


# ---------- Main ----------
def main(slug_to_run=None, max_per_seg=None):
    max_per_seg = max_per_seg or MAX_PER_SEGMENT
    domains_seen = existing_domains()
    print(f"[start] existing domains in CSV: {len(domains_seen)}")

    new_rows = []
    stats = {"considered": 0, "added": 0, "skipped_dup": 0,
             "no_website": 0, "no_email": 0, "domain_no_mx": 0}

    for seg in SEGMENTS:
        if slug_to_run and seg["clutch_slug"] != slug_to_run:
            continue
        print(f"\n=== {seg['name']} ({seg['clutch_slug']}) ===")
        added_this_seg = 0
        for page in range(MAX_PAGES_PER_SEGMENT):
            url = f"https://clutch.co/{seg['clutch_slug']}?page={page}"
            html = fetch(url)
            if not html:
                print(f"  page {page}: empty fetch")
                break
            agencies = parse_clutch(html)
            print(f"  page {page}: {len(agencies)} parsed")
            for a in agencies:
                if added_this_seg >= max_per_seg:
                    break
                stats["considered"] += 1
                company_key = a["company"].lower().strip()
                if company_key in domains_seen:
                    stats["skipped_dup"] += 1
                    continue
                # Fetch Clutch profile
                profile = fetch_clutch_profile(a["profile_url"])
                website = normalize_url(profile["website"])
                country = profile["country"]
                if seg["country_filter"]:
                    if country and country not in seg["country_filter"]:
                        continue
                if not website:
                    stats["no_website"] += 1
                    continue
                domain = urlparse(website).netloc.replace("www.", "")
                if not domain or domain in domains_seen:
                    stats["skipped_dup"] += 1
                    continue
                # Domain MX check (cheap liveness)
                if not domain_has_mx(domain):
                    stats["domain_no_mx"] += 1
                    continue
                # Fetch company site + look for AR signals + emails
                time.sleep(SLEEP_BETWEEN)
                site_html = fetch(website)
                signals = find_pain_signals(site_html)
                # Try Hunter first if key is present
                email = try_hunter(domain)
                if not email:
                    # Try the contact / about / team pages
                    for sub in ["", "/contact", "/about", "/team", "/about-us", "/our-team"]:
                        if email:
                            break
                        cand = find_email_on_page(fetch(website.rstrip("/") + sub))
                        if cand and domain in cand:
                            email = cand
                    # Try team-page LinkedIn-style snippet extraction
                    if not email:
                        # Snippet might list founder first name — use generic guess
                        founder_email = ""
                        snippet = profile["snippet"] or ""
                        # First word of snippet if it starts with "We are X..." is usually company name, skip
                        # Try to grab a first name from snippet via simple heuristic
                        words = re.findall(r"\b[A-Z][a-z]{2,}\b", snippet)
                        if words:
                            first_guess = words[0].lower()
                            for guess in guess_founder_email(domain, first=first_guess):
                                if verify_smtp_rcpt(guess) is True:
                                    founder_email = guess
                                    break
                        email = founder_email
                # Also accept if email found even without MX strict pass
                if not email:
                    # Final fallback: pattern-match MX-verified guesses
                    for guess in guess_founder_email(domain, first="info"):
                        if verify_smtp_rcpt(guess) is True:
                            email = guess
                            break
                if not email:
                    stats["no_email"] += 1
                    continue
                # Build row
                local = email.split("@")[0]
                if "." in local and not local.startswith("info"):
                    first, last = (local.split(".", 1) + [""])[:2]
                else:
                    first, last = "", ""
                # Guess a hook line
                hook = ""
                if signals:
                    hook = f"AR/cashflow language on site: {', '.join(signals[:4])}"
                elif profile["snippet"]:
                    hook = profile["snippet"][:200]
                else:
                    hook = f"Clutch profile: {a['company']} — {seg['label']}"
                row = {
                    "id": f"PV2-{int(time.time())}-{stats['considered']:04d}",
                    "first_name": first.capitalize() if first else "",
                    "last_name": last.capitalize() if last else "",
                    "company": a["company"],
                    "role": "Founder/Owner (verify)",
                    "country": country or "US",
                    "team_size": profile["employees"] or "5-50",
                    "industry": seg["name"],
                    "linkedin_url": a["profile_url"],
                    "email": email,
                    "source": f"clutch.co/{seg['clutch_slug']}",
                    "notes": f"v2-discovery | signals={','.join(signals[:6])} | domain={domain}",
                    "hook": hook,
                    "tier": "1",
                }
                new_rows.append(row)
                domains_seen.add(domain)
                domains_seen.add(company_key)
                stats["added"] += 1
                added_this_seg += 1
                print(f"  ✅ {a['company']} | {email} | signals={signals[:3]}")
                time.sleep(SLEEP_BETWEEN)
            time.sleep(SLEEP_BETWEEN)
        if added_this_seg >= max_per_seg:
            break

    # Append
    if new_rows:
        append_csv(new_rows)
        print(f"\n[csv] appended {len(new_rows)} rows to {CSV_PATH}")

    print(f"\n=== v2 discovery report ===")
    for k, v in stats.items():
        print(f"  {k}: {v}")
    return new_rows


if __name__ == "__main__":
    import sys
    slug = sys.argv[1] if len(sys.argv) > 1 else None
    n = int(sys.argv[2]) if len(sys.argv) > 2 else None
    main(slug_to_run=slug, max_per_seg=n)
