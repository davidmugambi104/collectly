#!/usr/bin/env python3
"""Free email discovery + light verification without paid APIs.

Methods:
- Common pattern generation based on first/last name (or generic
  info/hello/contact) + domain.
- MX record liveness check (the domain accepts mail at all) via `dig`.
- SMTP RCPT-TO check disabled by default (many mail servers block/penalize
  it and it risks sender IP reputation) -- opt-in via --smtp-check.

NOTE on what "verification" means here: this can only confirm the domain
is live and picks the most plausible pattern -- it CANNOT confirm the
guessed mailbox actually exists. Earlier this script tried to confirm via
a DuckDuckGo exact-string search, but DuckDuckGo's HTML endpoint is now
behind its own bot-challenge page, which echoes the raw query string back
in a hidden form field -- so `email in html` was true 100% of the time,
regardless of whether the email existed anywhere. That silently produced
fabricated "confirmed" hello@/info@ addresses. Removed; do not re-add
without checking the response actually contains real result markup
(class="result__snippet"/"result__a"), not just the echoed query.

Writes matches straight back into prospects.csv, tagged with real
confidence (mx_only / smtp_confirmed) -- never a fake "web_confirmed".
"""
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))
from scripts.lib import prospect_utils as pu

MAX_CANDIDATES_TRIED = 5
domain_has_mx = pu.domain_has_mx


def smtp_rcpt_ok(email, timeout=6):
    """Opt-in only. Returns True/False/None (inconclusive)."""
    try:
        domain = email.split("@", 1)[1]
        hosts = pu.resolve_mx(domain)
        if not hosts:
            return None
        import smtplib
        with smtplib.SMTP(hosts[0][1], 25, timeout=timeout) as s:
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


def normalize(name):
    return re.sub(r"[^a-z0-9]", "", (name or "").lower())


def patterns(first, last, domain):
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


def find_email(row, smtp_check=False):
    """Return (email, method) or ('', 'no_mx'/'no_domain').

    Picks the single best pattern candidate (name-based preferred over
    generic) for a domain confirmed to accept mail. This is a best-effort
    guess, not a confirmed mailbox -- see module docstring. If
    smtp_check=True, also does a live RCPT-TO probe and only keeps the
    guess if the mailbox is confirmed to exist.
    """
    domain = pu.extract_domain(row)
    if not domain:
        return "", "no_domain"
    if not domain_has_mx(domain):
        return "", "no_mx"

    first, last = row.get("first_name", ""), row.get("last_name", "")
    candidates = patterns(first, last, domain)
    name_based = [c for c in candidates if not c.startswith(("hello@", "info@", "contact@"))]
    generic = [c for c in candidates if c not in name_based]
    ordered = name_based + generic  # generic only if nothing better exists

    if not smtp_check:
        best = ordered[0]
        method = "mx_only_name_guess" if best in name_based else "mx_only_generic_guess"
        return best, method

    for email in ordered:
        result = smtp_rcpt_ok(email)
        if result is True:
            method = "smtp_confirmed_name" if email in name_based else "smtp_confirmed_generic"
            return email, method
    return "", "smtp_no_match"


def main(limit=None, tiers=None, smtp_check=False):
    rows = pu.load_existing_rows()
    suppressed = pu.load_suppressed_emails()

    candidates = []
    for r in rows:
        if r.get("email"):
            continue
        if not pu.extract_domain(r):
            continue
        if tiers and (r.get("tier") or "3") not in tiers:
            continue
        candidates.append(r)
    candidates.sort(key=lambda r: int(r.get("tier") or 3))
    if limit:
        candidates = candidates[:limit]

    print(f"Trying pattern email discovery (MX-confirmed{'+ SMTP RCPT check' if smtp_check else ''}) for {len(candidates)} domain-only rows...")
    updates = {}
    found = 0
    for i, row in enumerate(candidates):
        domain = pu.extract_domain(row)
        print(f"\n[{i+1}/{len(candidates)}] {row['id']} {row.get('company','')} @ {domain}")
        email, method = find_email(row, smtp_check=smtp_check)
        if email and pu.is_suppressed(email, suppressed):
            print(f"  {email} is suppressed -- skipping")
            continue
        if email:
            print(f"  -> {email} ({method})")
            update = {"email": email}
            local = email.split("@", 1)[0]
            if "." in local and not row.get("first_name"):
                first, last = (local.split(".", 1) + [""])[:2]
                update["first_name"] = first.capitalize()
                update["last_name"] = last.capitalize()
            existing_notes = row.get("notes") or ""
            update["notes"] = (existing_notes + f" | free_email_finder:{method}").strip(" |")
            updates[row["id"]] = update
            found += 1
        else:
            print("  -> not found")

    changed = pu.update_rows_by_id(updates)
    print(f"\n[csv] updated {changed} rows in prospects.csv")
    print(f"\n=== free_email_finder report ===")
    print(f"  candidates tried: {len(candidates)}")
    print(f"  emails found: {found}")


if __name__ == "__main__":
    import argparse
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=None)
    ap.add_argument("--tiers", nargs="+", default=None, help="restrict to these tier values, e.g. --tiers 1 2")
    ap.add_argument("--smtp-check", action="store_true", help="opt-in live RCPT-TO probe (sender-IP-reputation risk)")
    args = ap.parse_args()
    main(limit=args.limit, tiers=args.tiers, smtp_check=args.smtp_check)
