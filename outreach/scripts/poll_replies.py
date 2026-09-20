"""
Reply poller for Collectly outreach.

Reads the mailbox replies land in, matches each one to a prospect, classifies
what the reply actually SAYS, writes the outcome back to outreach-log.csv, and
suppresses anyone who asked to be left alone.

WHY THIS WAS REWRITTEN (2026-09-20)
-----------------------------------
The previous version never ran, and would not have worked if it had:

1. It required `imapclient`, which is not installed and cannot be installed
   here (no pip). Now uses stdlib `imaplib`, which is already proven against
   this mailbox.

2. It defaulted to imap.gmail.com while inbound mail for getcollectly.app is
   on Zoho. A password alone would not have fixed it.

3. It matched replies by In-Reply-To against stored message_ids — but
   outreach-log.csv stores Resend's internal UUIDs, not RFC Message-IDs.
   Header threading was never possible with this data. Matching is by sender
   address, with the header kept as a secondary signal.

4. It recorded `replied=yes` and stopped. `replied=yes` is not a sentiment.
   P050 wrote "Thanks, but I am not interested" on 2026-08-03; the log read
   `replied=yes, next_step=human_review`, and he was emailed three more times
   because a refusal and a buying signal look identical to every downstream
   step. Classification, and automatic suppression on a refusal, is the point
   of this script.

USAGE
-----
    IMAP_PASSWORD=... python3 scripts/poll_replies.py [--dry-run]

Reads only. The mailbox is opened readonly, so nothing is marked \\Seen and a
re-run is safe.
"""
from __future__ import annotations

import argparse
import csv
import email
import imaplib
import io
import os
import re
import ssl
import sys
from datetime import datetime, timezone
from email.header import decode_header

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(os.path.dirname(HERE), "data")
LOG_PATH = os.environ.get("OUTREACH_LOG_PATH", os.path.join(DATA, "outreach-log.csv"))
SUPPRESSION_PATH = os.path.join(DATA, "suppression.csv")

def _load_dotenv() -> dict:
    """Read .env.local, same file and format daily_send.py uses.

    Without this the poller saw only the process environment, so it printed
    "set ZOHO_IMAP_APP_PASSWORD" even with the password sitting in .env.local
    next to RESEND_API_KEY. Every other script in this directory reads that
    file; this one silently did not, which made it look like a credentials
    problem rather than a loading one.

    The real environment still wins, so Vercel's configured values are never
    shadowed by a stale local file.
    """
    path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), ".env.local")
    out = {}
    if not os.path.exists(path):
        return out
    with open(path) as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            out[k.strip()] = v.strip().strip('"').strip("'")
    return out


_DOTENV = _load_dotenv()


def _env(*names: str, default: str = "") -> str:
    """First of `names` that is set.

    The Vercel crons (/api/cron/outreach-poll) run the TypeScript pollers,
    which read ZOHO_IMAP_* — and those are already configured in production.
    Introducing IMAP_PASSWORD as a separate name would mean two variables
    holding the same Zoho app password, drifting the first time one is
    rotated. This script reads the names that already exist and keeps IMAP_*
    only as a local override.
    """
    for name in names:
        value = os.environ.get(name) or _DOTENV.get(name)
        if value:
            return value
    return default


IMAP_HOST = _env("IMAP_HOST", "ZOHO_IMAP_HOST", default="imap.zoho.com")
IMAP_USER = _env("IMAP_USER", "ZOHO_IMAP_USER", default="davie@getcollectly.app")
IMAP_PASSWORD = _env("IMAP_PASSWORD", "ZOHO_IMAP_APP_PASSWORD", "AR_DUNNING_IMAP_APP_PASSWORD")
MAILBOXES = [m.strip() for m in _env("IMAP_MAILBOXES", default="INBOX,Spam").split(",") if m.strip()]

# Ordered: the first pattern that matches wins, so a refusal beats a pleasantry
# in the same message ("Thanks, but I am not interested" is not a thank-you).
CLASSIFIERS: list[tuple[str, str, re.Pattern[str]]] = [
    ("do_not_contact", "suppress", re.compile(
        r"\b(unsubscribe|remove me|take me off|do not (contact|email)|stop (emailing|contacting))\b", re.I)),
    ("not_interested", "suppress", re.compile(
        r"\b(not interested|no thanks|no thank you|we'?re (all )?(good|set|sorted)|not (for us|a fit)|pass on this)\b", re.I)),
    ("wrong_person", "human_review", re.compile(
        r"\b(wrong person|not the right person|no longer (with|at)|has left|forward(ed)? (this )?to)\b", re.I)),
    ("auto_reply", "ignore_auto_reply", re.compile(
        r"\b(out of (the )?office|on annual leave|auto(matic)?[- ]repl|vacation|maternity|paternity)\b", re.I)),
    ("positive", "human_review_priority", re.compile(
        r"\b(interested|tell me more|sounds good|happy to|let'?s (talk|chat)|book (a )?(call|time)|send (me )?(more|details)|how much|pricing)\b", re.I)),
]


def decode_mime(value: str | None) -> str:
    if not value:
        return ""
    out = []
    for text, enc in decode_header(value):
        out.append(text.decode(enc or "utf-8", "replace") if isinstance(text, bytes) else text)
    return "".join(out)


def body_text(msg) -> str:
    if msg.is_multipart():
        for part in msg.walk():
            if part.get_content_type() == "text/plain":
                payload = part.get_payload(decode=True)
                if payload:
                    return payload.decode("utf-8", "replace")
        return ""
    payload = msg.get_payload(decode=True)
    return payload.decode("utf-8", "replace") if payload else ""


def strip_quoted(text: str) -> str:
    """Only the reply, not the thread it quotes.

    Without this, our own sent copy is scanned too — and our own subject line
    contains "overdue invoice", which the positive classifier would match on
    every single reply.
    """
    return re.split(r"\nOn .{0,120}wrote:|\n-{2,}\s*\n|\n>+", text)[0].strip()


# A reply that is nothing but an opt-out word. The outreach footer asks people
# to reply "stop", and the do_not_contact pattern below needs "stop emailing" or
# "stop contacting" -- a bare "stop" fell through to human_review and would sit
# unactioned. Matched against the whole stripped body so "stop chasing invoices"
# in a real sentence does not trip it.
BARE_OPT_OUT = re.compile(
    r"^\W*(stop|unsubscribe|remove|remove me|opt[- ]?out|no|nope|no thanks)\W*$", re.I)


def classify(subject: str, body: str) -> tuple[str, str]:
    if BARE_OPT_OUT.match((body or "").strip()):
        return "do_not_contact", "suppress"
    blob = f"{subject}\n{body}"
    for state, next_step, pattern in CLASSIFIERS:
        if pattern.search(blob):
            return state, next_step
    return "replied", "human_review"


def load_log() -> tuple[list[dict], list[str]]:
    with open(LOG_PATH, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        return list(reader), list(reader.fieldnames or [])


def suppressed_emails() -> set[str]:
    out: set[str] = set()
    if not os.path.exists(SUPPRESSION_PATH):
        return out
    with open(SUPPRESSION_PATH, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            value = (row.get("email") or "").strip().lower()
            if value:
                out.add(value)
    return out


def add_suppression(entries: list[tuple[str, str, str]]) -> None:
    exists = os.path.exists(SUPPRESSION_PATH)
    with io.open(SUPPRESSION_PATH, "a", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        if not exists:
            writer.writerow(["email", "reason", "source_row_id", "added_at", "note"])
        stamp = datetime.now(timezone.utc).isoformat(timespec="seconds")
        for addr, prospect_id, note in entries:
            writer.writerow([addr, "opted_out", prospect_id, stamp, note])


def main() -> int:
    ap = argparse.ArgumentParser(description="Poll the mailbox for outreach replies")
    ap.add_argument("--dry-run", action="store_true", help="report only; write nothing")
    args = ap.parse_args()

    if not IMAP_PASSWORD:
        print("ERROR: set ZOHO_IMAP_APP_PASSWORD (or IMAP_PASSWORD) to a Zoho app password.", file=sys.stderr)
        return 2

    rows, fieldnames = load_log()
    # address -> prospect id, from what we actually sent
    sent_to: dict[str, str] = {}
    for row in rows:
        addr = (row.get("email") or "").strip().lower()
        if addr and (row.get("signal") or "") == "sent":
            sent_to.setdefault(addr, row.get("id") or "")

    already = suppressed_emails()
    found: dict[str, dict] = {}

    server = imaplib.IMAP4_SSL(IMAP_HOST, ssl_context=ssl.create_default_context())
    server.login(IMAP_USER, IMAP_PASSWORD)
    try:
        for mailbox in MAILBOXES:
            # readonly: never mark anything \Seen, so re-running is harmless and
            # a human reading the inbox later still sees it as unread.
            typ, _ = server.select(f'"{mailbox}"', readonly=True)
            if typ != "OK":
                print(f"  {mailbox}: cannot open, skipping")
                continue
            typ, data = server.search(None, "ALL")
            ids = data[0].split() if data and data[0] else []
            print(f"  {mailbox}: {len(ids)} messages")
            for i in range(0, len(ids), 100):
                typ, chunk = server.fetch(b",".join(ids[i:i + 100]), "(RFC822)")
                for part in chunk:
                    if not isinstance(part, tuple):
                        continue
                    msg = email.message_from_bytes(part[1])
                    from_hdr = decode_mime(msg.get("From"))
                    match = re.search(r"[\w\.\-\+]+@[\w\.\-]+", from_hdr)
                    if not match:
                        continue
                    addr = match.group(0).lower()
                    if addr not in sent_to:
                        continue
                    subject = decode_mime(msg.get("Subject"))
                    reply = strip_quoted(body_text(msg))
                    state, next_step = classify(subject, reply)
                    found[addr] = {
                        "id": sent_to[addr],
                        "state": state,
                        "next_step": next_step,
                        "subject": subject,
                        "date": msg.get("Date") or "",
                        "excerpt": " ".join(reply.split())[:120],
                    }
    finally:
        try:
            server.logout()
        except Exception:
            pass

    if not found:
        print("\n  no prospect replies found.")
        return 0

    print(f"\n  {len(found)} prospect repl{'y' if len(found) == 1 else 'ies'}:")
    to_suppress: list[tuple[str, str, str]] = []
    for addr, hit in sorted(found.items()):
        flag = "" if addr in already else "  [NEW]"
        print(f"    {hit['id']:8} {addr.split('@')[1]:26} {hit['state']:15} {hit['excerpt'][:60]}{flag}")
        if hit["next_step"] == "suppress" and addr not in already:
            to_suppress.append((addr, hit["id"], f'Replied "{hit["excerpt"][:70]}" on {hit["date"][:31]}'))

    if args.dry_run:
        print(f"\n  DRY RUN — would suppress {len(to_suppress)}, would update {len(found)} log row(s).")
        return 0

    changed = 0
    for row in rows:
        addr = (row.get("email") or "").strip().lower()
        hit = found.get(addr)
        if not hit or (row.get("signal") or "") != "sent":
            continue
        row["replied"] = "yes"
        row["next_step"] = hit["next_step"]
        details = row.get("signal_details") or ""
        tag = f"reply:{hit['state']}"
        if tag not in details:
            row["signal_details"] = f"{details}; {tag}".strip("; ")
        changed += 1

    with io.open(LOG_PATH, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    if to_suppress:
        add_suppression(to_suppress)

    print(f"\n  updated {changed} log row(s); suppressed {len(to_suppress)} address(es).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
