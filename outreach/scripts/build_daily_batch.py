#!/usr/bin/env python3
"""
Generate today's outreach batch as a CSV ready to send, plus a markdown
preview Davie can review before approval.

Reads from outreach/data/prospects.csv, outreach/data/bookkeeper-channel-prospects.csv,
outreach/data/suppression.csv, outreach/data/outbound-send-log-*.csv.

Writes to:
  outreach/ready/t1-batch-YYYY-MM-DD.csv    (the actual send list)
  outreach/ready/preview-YYYY-MM-DD.md      (human-readable preview)
  outreach/drafts/emails-YYYY-MM-DD.md      (rendered email copy per prospect)
"""
from __future__ import annotations

import csv
import os
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]  # collectly/
DATA = ROOT / "outreach" / "data"
READY = ROOT / "outreach" / "ready"
DRAFTS = ROOT / "outreach" / "drafts"

DAILY_CAP = int(os.environ.get("COLLECTLY_DAILY_CAP", "100"))
TIER = os.environ.get("COLLECTLY_TIER", "1")
SEVEN_DAYS = timedelta(days=7)
TWO_DAYS = timedelta(days=7)  # T2 cadence = no-send-window per policy
TODAY = datetime.now(timezone.utc).date()


def read_csv(path: Path) -> list[dict]:
    if not path.exists():
        return []
    with path.open(newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))


def already_contacted_recently() -> set[str]:
    out: set[str] = set()
    cutoff = TODAY - SEVEN_DAYS
    for path in DATA.glob("outbound-send-log-*.csv"):
        for row in read_csv(path):
            sent_date_str = row.get("sent_at", "")[:10]
            if not sent_date_str:
                continue
            try:
                sent_date = datetime.strptime(sent_date_str, "%Y-%m-%d").date()
            except ValueError:
                continue
            if sent_date >= cutoff:
                out.add(row.get("email", "").lower().strip())
    return out


def suppression_emails() -> set[str]:
    out: set[str] = set()
    for row in read_csv(DATA / "suppression.csv"):
        e = row.get("email", "").lower().strip()
        if e:
            out.add(e)
    return out


def _safe_first(p: dict) -> str:
    first = (p.get("first_name") or "there").strip()
    if first.upper() in ("TBD", ""):
        return "there"
    return first


def render_t1(prospect: dict, channel: str) -> tuple[str, str]:
    """Touch 1 cold email."""
    first = _safe_first(prospect)
    company = (prospect.get("company") or "your company").strip()
    industry = (prospect.get("industry") or "your space").strip()
    if channel == "bookkeeper":
        subject = f"AR follow-up for {company} clients — 5-min check"
        body = f"""Hi {first},

Wanted to flag something I'm seeing across bookkeepers/CFOs: clients are asking you to chase their invoices, and you're doing it manually.

We built Collectly so you can offer AR automation as a service to your clients — branded reminder sequences (email + SMS) that pause on payment or reply, white-labeled under your firm, integrated with QBO/Xero/Paystack.

Quick question: how much time does your team spend chasing client invoices right now?

If 5+ hours/week, this would pay for itself. Flat $99/mo partner plan for up to 5 client accounts; white-label included.

— Davie
Founder, Collectly
https://collectly.app

P.S. We just shipped the partner/agency plan — flat $99/mo up to 5 client accounts, white-label included.
"""
    else:
        subject = f"Quick question about {company}'s client AR follow-up"
        body = f"""Hi {first},

Most {industry} agencies I talk to have a client asking "can you also chase invoices" at some point. We built Collectly so your agency can offer that as a service — white-label AR automation for your clients on QBO/Xero.

Three things worth 5 minutes:
1. Branded reminder sequences (email + SMS) that pause on payment or reply.
2. A 4-week cash-flow forecast your clients actually use to plan payroll.
3. White-label option so it looks like your agency.

If that fits how {company} works with clients, happy to send a one-pager. If not, no worries.

— Davie
Founder, Collectly
https://collectly.app

P.S. We just shipped the partner/agency plan — flat $99/mo up to 5 client accounts, white-label included.
"""
    return subject, body


def render_t2(prospect: dict) -> tuple[str, str]:
    """Touch 2 follow-up at day +4."""
    first = _safe_first(prospect)
    company = (prospect.get("company") or "your firm").strip()
    subject = f"Re: AR follow-up for {company} clients"
    body = f"""Hi {first},

Following up. I shared how Collectly lets bookkeepers/CFOs offer AR automation as a branded service to their clients (white-label email + SMS reminders, QBO/Xero/Paystack, 4-week cash-flow forecast).

Wanted to make sure you saw it. Happy to jump on a 15-min screen share to walk through the partner plan, or send a one-pager — your call.

— Davie
Founder, Collectly
https://collectly.app
"""
    return subject, body


def load_agency_prospects() -> list[dict]:
    out: list[dict] = []
    for p in read_csv(DATA / "prospects.csv"):
        tier = (p.get("tier") or "").strip()
        if tier != TIER:
            continue
        p["__channel"] = "agency"
        p["__status"] = "ready"
        out.append(p)
    return out


def load_bookkeeper_prospects() -> list[dict]:
    out: list[dict] = []
    for p in read_csv(DATA / "bookkeeper-channel-prospects.csv"):
        status = (p.get("status") or "").strip()
        if status not in ("ready", "step_1_sent"):
            continue
        p["__channel"] = "bookkeeper"
        p["__status"] = status
        out.append(p)
    return out


def is_bookkeeper_t2_eligible(p: dict) -> bool:
    """T2 = at least 7 days since last_contact (policy dedup window)."""
    last = (p.get("last_contact") or "")[:10]
    try:
        last_date = datetime.strptime(last, "%Y-%m-%d").date()
        return (TODAY - last_date) >= TWO_DAYS
    except ValueError:
        return False


def main() -> int:
    READY.mkdir(parents=True, exist_ok=True)
    DRAFTS.mkdir(parents=True, exist_ok=True)

    agency = load_agency_prospects()
    bookkeepers = load_bookkeeper_prospects()
    # Filter bookkeeper T2 candidates by dedup window
    bookkeepers = [
        p for p in bookkeepers
        if p["__status"] != "step_1_sent" or is_bookkeeper_t2_eligible(p)
    ]
    all_prospects = agency + bookkeepers

    suppressed = suppression_emails()
    recently_contacted = already_contacted_recently()

    eligible = []
    for p in all_prospects:
        email = (p.get("email") or "").lower().strip()
        if not email:
            continue
        if email in suppressed:
            continue
        if email in recently_contacted:
            continue
        first = (p.get("first_name") or "").strip()
        last = (p.get("last_name") or "").strip()
        # Skip rows where neither first nor last name is filled in
        if not first and not last:
            continue
        if first.upper() == "TBD":
            continue
        eligible.append(p)

    if len(eligible) > DAILY_CAP:
        eligible = eligible[:DAILY_CAP]

    today_iso = TODAY.isoformat()
    csv_path = READY / f"t1-batch-{today_iso}.csv"
    preview_path = READY / f"preview-{today_iso}.md"
    drafts_path = DRAFTS / f"emails-{today_iso}.md"

    # Determine touch per row
    def touch_for(p: dict) -> str:
        if p["__channel"] == "bookkeeper" and p["__status"] == "step_1_sent":
            return "T2"
        return "T1"

    agency_count = sum(1 for p in eligible if p["__channel"] == "agency")
    bookkeeper_count = sum(1 for p in eligible if p["__channel"] == "bookkeeper")
    t2_count = sum(1 for p in eligible if p["__channel"] == "bookkeeper" and p["__status"] == "step_1_sent")
    t1_count = len(eligible) - t2_count

    # Build CSV
    fieldnames = [
        "id", "channel", "touch", "first_name", "last_name", "company", "role", "country",
        "industry", "email", "subject", "message_id", "status",
    ]
    with csv_path.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames)
        w.writeheader()
        for p in eligible:
            if touch_for(p) == "T2":
                subject, _ = render_t2(p)
            else:
                subject, _ = render_t1(p, p["__channel"])
            w.writerow({
                "id": p.get("id", ""),
                "channel": p["__channel"],
                "touch": touch_for(p),
                "first_name": p.get("first_name", ""),
                "last_name": p.get("last_name", ""),
                "company": p.get("company", ""),
                "role": p.get("role", ""),
                "country": p.get("country", ""),
                "industry": p.get("industry", ""),
                "email": p.get("email", ""),
                "subject": subject,
                "message_id": "",
                "status": "queued",
            })

    # Build preview
    with preview_path.open("w", encoding="utf-8") as f:
        f.write(f"# Outreach Batch Preview — {today_iso}\n\n")
        f.write(f"- Tier-1 agency + bookkeeper channel (T1 ready + T2 due after dedup window)\n")
        f.write(f"- Daily cap: {DAILY_CAP}\n")
        f.write(f"- Total eligible: {len(eligible)} ({agency_count} agency T1, {bookkeeper_count - t2_count} bookkeeper T1, {t2_count} bookkeeper T2)\n")
        f.write(f"- Pool sizes: {len(agency)} agency tier-1, {len(bookkeepers)} bookkeeper candidates\n")
        f.write(f"- Suppressed: {len(suppressed)}\n")
        f.write(f"- Recently contacted (7d): {len(recently_contacted)}\n\n")
        f.write("## Send list\n\n")
        for i, p in enumerate(eligible, 1):
            f.write(
                f"{i}. **[{p['__channel']} {touch_for(p)}]** "
                f"{p.get('first_name', '')} {p.get('last_name', '')} — "
                f"{p.get('company', '')} ({p.get('country', '')}) — "
                f"{p.get('email', '')}\n"
            )

    # Build drafts
    with drafts_path.open("w", encoding="utf-8") as f:
        f.write(f"# Outreach Email Drafts — {today_iso}\n\n")
        for p in eligible:
            if touch_for(p) == "T2":
                subject, body = render_t2(p)
            else:
                subject, body = render_t1(p, p["__channel"])
            f.write(
                f"## [{p['__channel']} {touch_for(p)}] "
                f"{p.get('first_name', '')} {p.get('last_name', '')} <{p.get('email', '')}>\n\n"
            )
            f.write(f"**Company:** {p.get('company', '')} ({p.get('industry', '')})\n\n")
            f.write(f"**Subject:** {subject}\n\n")
            f.write(f"**Body:**\n\n```\n{body}\n```\n\n---\n\n")

    print(f"Wrote {csv_path}")
    print(f"Wrote {preview_path}")
    print(f"Wrote {drafts_path}")
    print(f"Eligible: {len(eligible)} ({agency_count} agency T1 + {bookkeeper_count - t2_count} bookkeeper T1 + {t2_count} bookkeeper T2)")
    return 0


if __name__ == "__main__":
    sys.exit(main())