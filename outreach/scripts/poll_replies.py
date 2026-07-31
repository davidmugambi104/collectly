"""
Reply poller for Collectly outreach tracking.

Why this exists separately from resend_webhook.py:
Resend's webhooks tell you delivered/bounced/opened/clicked — they do NOT
tell you when a prospect hits "reply" and writes back, because that reply
lands as a normal email in your inbox, not as a Resend event. This script
checks the inbox directly and matches replies to sent messages.

HOW MATCHING WORKS:
Email replies keep the original Message-ID in their In-Reply-To / References
headers. So: when you send, you must capture and store the Message-ID
Resend assigns (or your SMTP server assigns) in outreach-log.csv. This
script then looks for incoming mail whose In-Reply-To header matches a
stored message_id, and marks that row as replied.

SETUP:
1. pip install imapclient
2. Enable IMAP access on davie@getcollectly.app (or whichever inbox
   receives replies) and generate an app password if using Gmail/Google
   Workspace (regular password won't work with 2FA on)
3. Fill in IMAP_HOST / IMAP_USER / IMAP_PASSWORD below (use env vars,
   don't hardcode)
4. Run manually first (`python poll_replies.py`) to confirm it finds and
   matches replies, then schedule it (cron every 15-30 min is plenty —
   replies aren't urgent-fast, but Section 5 of the policy doc says
   positive replies should notify you fast, so don't go longer than ~30 min)
5. This script does NOT send anything or touch the inbox destructively —
   it only reads and marks messages \\Seen if UNSEEN_ONLY is True

LIMITATION: this only works if you actually own/control the receiving
inbox via IMAP. If replies go to a Gmail address behind OAuth (not app
password), you'll need the Gmail API instead of IMAP — say so and I'll
swap this for a Gmail API version.
"""

import csv
import os
import re
import shutil
from datetime import datetime, timedelta, timezone
from imapclient import IMAPClient
import email
from email.header import decode_header

# ---- CONFIG (use environment variables in production, not hardcoded) ----
IMAP_HOST = os.environ.get("IMAP_HOST", "imap.gmail.com")  # change if not Gmail/Workspace
IMAP_USER = os.environ.get("IMAP_USER", "davie@getcollectly.app")
IMAP_PASSWORD = os.environ.get("IMAP_PASSWORD", "")  # app password, never commit this
LOG_PATH = os.environ.get("OUTREACH_LOG_PATH", "outreach-log.csv")
UNSEEN_ONLY = True  # only scan unread mail each run (faster, avoids re-processing)
MESSAGE_ID_COL = "message_id"


def decode_mime_header(value):
    if not value:
        return ""
    parts = decode_header(value)
    decoded = ""
    for text, enc in parts:
        if isinstance(text, bytes):
            decoded += text.decode(enc or "utf-8", errors="ignore")
        else:
            decoded += text
    return decoded


def load_known_message_ids():
    """Return dict of {message_id: row_index} from the outreach log so we
    can match incoming In-Reply-To headers against sends we made."""
    if not os.path.exists(LOG_PATH):
        return {}, [], None
    with open(LOG_PATH, "r", newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        fieldnames = reader.fieldnames
        rows = list(reader)
    known = {row[MESSAGE_ID_COL]: i for i, row in enumerate(rows) if row.get(MESSAGE_ID_COL)}
    return known, rows, fieldnames


def save_log(rows, fieldnames):
    tmp_path = LOG_PATH + ".tmp"
    with open(tmp_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)
    shutil.move(tmp_path, LOG_PATH)


def extract_message_id_refs(msg) -> list:
    """Pull all Message-IDs referenced by a reply (In-Reply-To + References,
    since some clients only populate one)."""
    ids = []
    for header_name in ("In-Reply-To", "References"):
        header_val = msg.get(header_name, "")
        found = re.findall(r"<[^>]+>", header_val)
        ids.extend(f.strip("<>") for f in found)
    return ids


def main():
    if not IMAP_PASSWORD:
        print("ERROR: set IMAP_PASSWORD env var (use an app password, not your login password)")
        return

    known_ids, rows, fieldnames = load_known_message_ids()
    if not known_ids:
        print(f"WARNING: no message_ids found in {LOG_PATH} — nothing to match against. "
              f"Make sure your send script logs the message_id for every send.")
        return

    if "replied_at" not in fieldnames:
        fieldnames = fieldnames + ["replied_at"]
    if "reply_snippet" not in fieldnames:
        fieldnames = fieldnames + ["reply_snippet"]

    matched_count = 0

    with IMAPClient(IMAP_HOST) as server:
        server.login(IMAP_USER, IMAP_PASSWORD)
        server.select_folder("INBOX")

        criteria = ["UNSEEN"] if UNSEEN_ONLY else ["ALL"]
        # Optional: only scan recent mail to avoid huge mailboxes
        days = int(os.environ.get("IMAP_DAYS", "0") or "0")
        if days > 0:
            since = (datetime.now(timezone.utc) - timedelta(days=days)).strftime("%d-%b-%Y")
            criteria = criteria + ["SENTSINCE", since]
        message_uids = server.search(criteria)

        print(f"Found {len(message_uids)} messages to scan")

        for uid in message_uids:
            # Fetch headers first; only pull full body if we have a match.
            header_data = server.fetch([uid], ["RFC822.HEADER"])[uid][b"RFC822.HEADER"]
            msg = email.message_from_bytes(header_data)

            referenced_ids = extract_message_id_refs(msg)
            match_id = next((rid for rid in referenced_ids if rid in known_ids), None)

            if match_id:
                row_idx = known_ids[match_id]
                rows[row_idx]["status"] = "REPLIED"
                rows[row_idx]["replied_at"] = datetime.now(timezone.utc).isoformat()

                # grab a short snippet of the reply body for the daily digest
                full = server.fetch([uid], ["RFC822"])[uid][b"RFC822"]
                msg = email.message_from_bytes(full)
                body = ""
                if msg.is_multipart():
                    for part in msg.walk():
                        if part.get_content_type() == "text/plain":
                            body = part.get_payload(decode=True).decode(errors="ignore")
                            break
                else:
                    body = msg.get_payload(decode=True).decode(errors="ignore")

                snippet = " ".join(body.split())[:200]
                rows[row_idx]["reply_snippet"] = snippet

                matched_count += 1
                from_addr = decode_mime_header(msg.get("From", ""))
                print(f"MATCHED reply from {from_addr} -> message_id {match_id}")
            # else: could be a reply to something not in our log, or unrelated mail — skip silently

    if matched_count > 0:
        save_log(rows, fieldnames)
        print(f"Updated {matched_count} row(s) in {LOG_PATH}")
    else:
        print("No new replies matched this run")


if __name__ == "__main__":
    main()
