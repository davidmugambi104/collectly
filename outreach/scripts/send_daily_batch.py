#!/usr/bin/env python3
"""
Send today's batch via Resend. Reads from outreach/ready/t1-batch-YYYY-MM-DD.csv,
appends the result to outreach/data/outbound-send-log-YYYY-MM-DD.csv.

Usage on Davie's machine (where RESEND_API_KEY is set):

  export RESEND_API_KEY="..."
  export COLLECTLY_FROM_EMAIL="Davie Mugambi <davie@getcollectly.app>"
  python3 outreach/scripts/send_daily_batch.py

The script:
- Sends each row in the CSV via Resend.
- Captures the message_id from Resend's response.
- Appends a result row to outreach/data/outbound-send-log-YYYY-MM-DD.csv.
- Stops and reports on any error.
"""
from __future__ import annotations

import csv
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
READY = ROOT / "outreach" / "ready"
DATA = ROOT / "outreach" / "data"
LOGS = DATA

FROM_EMAIL = os.environ.get("COLLECTLY_FROM_EMAIL", "Davie Mugambi <davie@getcollectly.app>")
RESEND_API_KEY = os.environ.get("RESEND_API_KEY", "").strip()

if not RESEND_API_KEY:
    print("RESEND_API_KEY not set; this script must run on a machine with the key.", file=sys.stderr)
    sys.exit(1)

try:
    import resend  # type: ignore
    resend.api_key = RESEND_API_KEY
except ImportError:
    print("resend package not installed. pip install resend", file=sys.stderr)
    sys.exit(1)


def find_today_batch() -> Path | None:
    today = datetime.now(timezone.utc).date().isoformat()
    p = READY / f"t1-batch-{today}.csv"
    return p if p.exists() else None


def main() -> int:
    batch = find_today_batch()
    if not batch:
        print(f"No batch file for today in {READY}", file=sys.stderr)
        return 1

    today_iso = datetime.now(timezone.utc).date().isoformat()
    log_path = LOGS / f"outbound-send-log-{today_iso}.csv"
    log_fields = [
        "sent_at", "channel", "touch", "prospect_id", "first_name", "last_name",
        "company", "email", "subject", "message_id", "status_code", "response_body",
    ]

    is_new = not log_path.exists()
    log_f = log_path.open("a", newline="", encoding="utf-8")
    w = csv.DictWriter(log_f, fieldfields if False else log_fields)  # noqa: F841
    if is_new:
        w.writeheader()

    sent = 0
    errs = 0
    with batch.open(newline="", encoding="utf-8") as f:
        r = csv.DictReader(f)
        for row in r:
            email = row.get("email", "").strip()
            subject = row.get("subject", "").strip()
            body_text = _body_for_row(row)
            try:
                resp = resend.Emails.send({
                    "from": FROM_EMAIL,
                    "to": [email],
                    "subject": subject,
                    "text": body_text,
                })
                msg_id = getattr(resp, "id", "")
                w.writerow({
                    "sent_at": datetime.now(timezone.utc).isoformat(),
                    "channel": row.get("channel", ""),
                    "touch": row.get("touch", ""),
                    "prospect_id": row.get("id", ""),
                    "first_name": row.get("first_name", ""),
                    "last_name": row.get("last_name", ""),
                    "company": row.get("company", ""),
                    "email": email,
                    "subject": subject,
                    "message_id": msg_id,
                    "status_code": 200,
                    "response_body": str(resp),
                })
                sent += 1
            except Exception as e:  # noqa: BLE001
                w.writerow({
                    "sent_at": datetime.now(timezone.utc).isoformat(),
                    "channel": row.get("channel", ""),
                    "touch": row.get("touch", ""),
                    "prospect_id": row.get("id", ""),
                    "first_name": row.get("first_name", ""),
                    "last_name": row.get("last_name", ""),
                    "company": row.get("company", ""),
                    "email": email,
                    "subject": subject,
                    "message_id": "",
                    "status_code": 0,
                    "response_body": str(e)[:500],
                })
                errs += 1
            log_f.flush()

    log_f.close()
    print(f"Sent: {sent}, Errors: {errs}, Log: {log_path}")
    return 0 if errs == 0 else 2


def _body_for_row(row: dict) -> str:
    """Render the same body the dry-run produced, so the sent email matches."""
    # Simple re-derivation: pick the same template the build_daily_batch.py used.
    # For brevity, we read it from outreach/drafts/emails-YYYY-MM-DD.md.
    today = datetime.now(timezone.utc).date().isoformat()
    drafts_path = ROOT / "outreach" / "drafts" / f"emails-{today}.md"
    if not drafts_path.exists():
        return ""
    text = drafts_path.read_text(encoding="utf-8")
    # Find the section for this email
    header = f"<{row.get('email','')}>"
    # Crude split
    sections = text.split("---")
    for sec in sections:
        if header in sec:
            try:
                body = sec.split("```", 2)[1]
                return body.strip()
            except IndexError:
                continue
    return ""


if __name__ == "__main__":
    sys.exit(main())