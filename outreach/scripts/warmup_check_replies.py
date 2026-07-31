#!/usr/bin/env python3
"""Check Gmail (forwarded from Zoho) for replies to warmup emails and log them.

Usage:
    python3 warmup_check_replies.py [--days 7]
"""
import argparse
import csv
import email
import imaplib
import os
import re
from datetime import datetime, timedelta, timezone
from pathlib import Path

HERE = Path(__file__).resolve().parent
ENV_PATH = HERE.parent.parent / ".env.local"
CONTACTS_CSV = HERE.parent / "data" / "warmup-contacts.csv"
LOG_CSV = HERE.parent / "data" / "outreach-log.csv"

IMAP_HOST = "imap.gmail.com"
LOG_FIELDS = [
    "id", "email", "touch", "sent_at", "replied_at", "status", "next_step",
    "message_id", "detail", "segment", "delivered_at", "bounced_at",
    "opened_at", "clicked_at", "reply_snippet",
]


def load_env(path: Path) -> dict:
    env = {}
    if not path.exists():
        return env
    with open(path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            env[k.strip()] = v.strip().strip('"').strip("'")
    return env


def load_warmup_emails(path: Path) -> set:
    emails = set()
    if not path.exists():
        return emails
    with open(path, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            email = (row.get("email") or "").strip().lower()
            if email:
                emails.add(email)
    return emails


def load_log(path: Path) -> list:
    if not path.exists():
        return []
    with open(path, newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))


def already_logged(log: list, message_id: str) -> bool:
    for r in log:
        if (r.get("message_id") or "").strip().lower() == message_id.strip().lower():
            return True
        if message_id in (r.get("detail") or ""):
            return True
    return False


def fetch_replies(env: dict, warmup_emails: set, days: int):
    user = env.get("GMAIL_USER") or env.get("ZOHO_USER")
    password = env.get("GMAIL_APP_PASSWORD")
    if not user or not password:
        print("Missing GMAIL_USER or GMAIL_APP_PASSWORD in .env.local")
        return []

    since = (datetime.now(timezone.utc) - timedelta(days=days)).strftime("%d-%b-%Y")
    mail = imaplib.IMAP4_SSL(IMAP_HOST)
    mail.login(user, password)
    mail.select("inbox")

    # Build OR query across all warmup email addresses
    addrs = list(warmup_emails)
    if not addrs:
        print("No warmup email addresses to check.")
        return []
    query = f'(FROM "{addrs[-1]}")'
    for addr in reversed(addrs[:-1]):
        query = f'OR (FROM "{addr}") {query}'
    query = f'(SINCE "{since}" {query})'

    status, data = mail.search(None, query)
    ids = data[0].split()
    results = []
    for mid in ids:
        status, data = mail.fetch(mid, "(RFC822)")
        raw = data[0][1]
        msg = email.message_from_bytes(raw)
        body = ""
        if msg.is_multipart():
            for part in msg.walk():
                ctype = part.get_content_type()
                cdisp = str(part.get("Content-Disposition", ""))
                if ctype == "text/plain" and "attachment" not in cdisp:
                    payload = part.get_payload(decode=True)
                    if payload:
                        try:
                            body = payload.decode("utf-8", errors="replace")
                        except Exception:
                            body = payload.decode("latin-1", errors="replace")
                        break
        else:
            payload = msg.get_payload(decode=True)
            if payload:
                try:
                    body = payload.decode("utf-8", errors="replace")
                except Exception:
                    body = payload.decode("latin-1", errors="replace")

        # Strip quoted sections loosely
        body = re.sub(r"\n-*>?\s*\n.*", "", body, flags=re.S)
        body = re.sub(r"On .* wrote:.*", "", body, flags=re.S)
        body = re.sub(r"\r\n", "\n", body)
        body = body.strip()
        snippet = body[:200].replace("\n", " ")

        from_addr = msg["From"] or ""
        addr_match = re.search(r"<?([^\s>]+@[^\s>]+)>?", from_addr)
        email_addr = (addr_match.group(1) if addr_match else from_addr).lower().strip()

        results.append({
            "message_id": msg["Message-ID"] or str(mid),
            "from": from_addr,
            "email": email_addr,
            "subject": msg["Subject"] or "",
            "date": msg["Date"] or "",
            "body": body,
            "snippet": snippet,
        })
    mail.logout()
    return results


def find_original_id(log: list, email_addr: str, subject: str) -> str:
    """Find the most recent warmup send to this email with a matching subject prefix."""
    # Map common subject prefixes
    prefix_map = {
        "re: quick question": "Quick question",
        "re: honest take?": "Honest take?",
        "re: quick agency ops question": "Quick agency ops question",
        "re: checking in": "Checking in",
        "re: quick catch up": "Quick catch up",
    }
    subject_lower = subject.lower().strip()
    matched_prefix = None
    for key, val in prefix_map.items():
        if subject_lower.startswith(key):
            matched_prefix = val
            break

    candidates = []
    for r in log:
        if r.get("email", "").lower().strip() != email_addr:
            continue
        if r.get("touch") != "warmup":
            continue
        candidates.append(r)
    if not candidates:
        return ""

    # Sort by sent_at descending
    candidates.sort(key=lambda r: r.get("sent_at") or "", reverse=True)
    # If we can match subject via detail, prefer it
    if matched_prefix:
        for r in candidates:
            if matched_prefix in r.get("detail", ""):
                return r.get("id", "")
    return candidates[0].get("id", "")


def main():
    parser = argparse.ArgumentParser(description="Check Gmail for warmup replies")
    parser.add_argument("--days", type=int, default=7, help="How many days back to scan")
    args = parser.parse_args()

    env = load_env(ENV_PATH)
    warmup_emails = load_warmup_emails(CONTACTS_CSV)
    log = load_log(LOG_CSV)

    replies = fetch_replies(env, warmup_emails, args.days)
    if not replies:
        print("No warmup replies found.")
        return 0

    new_replies = 0
    with open(LOG_CSV, "a", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=LOG_FIELDS)
        for r in replies:
            msg_id = r["message_id"]
            if already_logged(log, msg_id):
                print(f"  ⏭ already logged: {r['email']} — {r['subject']}")
                continue

            original_id = find_original_id(log, r["email"], r["subject"])
            reply_id = f"{original_id or 'UNKNOWN'}-reply"
            replied_at = ""
            try:
                dt = email.utils.parsedate_to_datetime(r["date"])
                if dt:
                    replied_at = dt.strftime("%Y-%m-%dT%H:%M:%SZ")
            except Exception:
                pass

            row = {field: "" for field in LOG_FIELDS}
            row.update({
                "id": reply_id,
                "email": r["email"],
                "touch": "warmup_reply",
                "replied_at": replied_at or datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
                "status": "replied_warmup",
                "message_id": msg_id,
                "detail": f"subject={r['subject']}; original_id={original_id}",
                "segment": "warmup",
                "reply_snippet": r["snippet"],
            })
            writer.writerow(row)
            log.append(row)
            new_replies += 1
            print(f"  ✓ logged reply from {r['email']}: {r['subject'][:60]}")

    print(f"\n=== New warmup replies logged: {new_replies}/{len(replies)} ===")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
