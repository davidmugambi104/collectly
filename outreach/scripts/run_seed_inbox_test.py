#!/usr/bin/env python3
"""Send seed-inbox deliverability test emails from Collectly.

Usage:
    run_seed_inbox_test.py gmail1@example.com outlook1@example.com [outlook2@example.com gmail2@example.com]

Reads RESEND_API_KEY and RESEND_FROM_EMAIL from collectly/.env.local.
Logs results to collectly/outreach/data/seed-inbox-test-log.csv.
"""
import csv
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

import requests

HERE = Path(__file__).resolve().parent
DATA = HERE.parent / "data"
LOG_CSV = DATA / "seed-inbox-test-log.csv"
ENV_PATH = HERE.parent.parent / ".env.local"


def load_env():
    if ENV_PATH.exists():
        with open(ENV_PATH, encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if "=" in line and not line.startswith("#"):
                    k, v = line.split("=", 1)
                    v = v.strip().strip('"').strip("'")
                    os.environ[k] = v  # force override from project env


def send_test_email(to_email, from_email, api_key):
    subject = "Collectly deliverability test - inbox placement check"
    html = f"""<p>Hi,</p>
<p>This is a seed-inbox deliverability test for <strong>Collectly</strong>.</p>
<p>If you see this email in your Primary/Inbox folder (not Promotions or Spam), that is a positive signal.</p>
<p>Please reply with the folder where it landed.</p>
<p>Thanks,<br>Davie Mugambi<br>Founder, Collectly</p>"""

    resp = requests.post(
        "https://api.resend.com/emails",
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        json={
            "from": from_email,
            "to": [to_email],
            "subject": subject,
            "html": html,
        },
        timeout=30,
    )
    return resp


def log_result(to_email, status_code, response_body, message_id=None):
    DATA.mkdir(parents=True, exist_ok=True)
    file_exists = LOG_CSV.exists()
    fieldnames = ["sent_at", "to_email", "from_email", "status_code", "message_id", "response_body", "inbox_folder", "notes"]
    with open(LOG_CSV, "a", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        if not file_exists:
            writer.writeheader()
        writer.writerow({
            "sent_at": datetime.now(timezone.utc).isoformat(),
            "to_email": to_email,
            "from_email": os.environ.get("RESEND_FROM_EMAIL", ""),
            "status_code": status_code,
            "message_id": message_id or "",
            "response_body": response_body,
            "inbox_folder": "",
            "notes": "",
        })


def main():
    load_env()

    api_key = os.environ.get("RESEND_API_KEY", "").strip()
    from_email = os.environ.get("RESEND_FROM_EMAIL", "").strip()

    if not api_key or not from_email:
        print("Missing RESEND_API_KEY or RESEND_FROM_EMAIL in collectly/.env.local")
        sys.exit(1)

    args = sys.argv[1:]
    dry_run = False
    if "--dry-run" in args:
        dry_run = True
        args.remove("--dry-run")

    if not args:
        print("Usage: run_seed_inbox_test.py [--dry-run] <gmail1> [gmail2] <outlook1> [outlook2]")
        sys.exit(1)

    emails = args

    for to_email in emails:
        print(f"{'[DRY] ' if dry_run else ''}Sending to {to_email} ...")
        if dry_run:
            # Don't hit Resend, don't append to the log CSV.
            print(f"  [DRY] from={from_email} to={to_email} subject='Collectly deliverability test - inbox placement check'")
            continue
        resp = send_test_email(to_email, from_email, api_key)
        body = resp.text.strip()
        mid = ""
        try:
            data = resp.json()
            mid = data.get("id", "")
        except Exception:
            pass
        log_result(to_email, resp.status_code, body, mid)
        if resp.status_code == 200:
            print(f"  OK: {mid}")
        else:
            print(f"  FAIL {resp.status_code}: {body}")


if __name__ == "__main__":
    main()
