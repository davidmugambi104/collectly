#!/usr/bin/env python3
"""Send one outreach email with dedup guard and state recording.

Usage:
    send_with_guard.py <prospect_id> <touch> <subject> "<body_file_or_string>" [--html]

Example:
    send_with_guard.py P001 t1 "Hello" "path/to/body.txt"
"""
import argparse
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

import requests

from outreach_state import can_send, record_send, update_state

HERE = Path(__file__).resolve().parent
DATA = HERE.parent / "data"
ENV_PATH = HERE.parent.parent / ".env.local"


def load_env():
    if ENV_PATH.exists():
        with open(ENV_PATH, encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if "=" in line and not line.startswith("#"):
                    k, v = line.split("=", 1)
                    v = v.strip().strip('"').strip("'")
                    os.environ[k] = v


def load_prospect(prospect_id: str) -> dict:
    prospects_path = DATA / "bookkeeper-channel-prospects.csv"
    with open(prospects_path, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            if row["id"] == prospect_id:
                return row
    return None


def send_email(to_email: str, subject: str, body: str, from_email: str, api_key: str, html: bool = False):
    payload = {
        "from": from_email,
        "to": [to_email],
        "subject": subject,
    }
    if html:
        payload["html"] = body
    else:
        payload["text"] = body

    resp = requests.post(
        "https://api.resend.com/emails",
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
        json=payload,
        timeout=30,
    )
    return resp


def main():
    import csv
    parser = argparse.ArgumentParser()
    parser.add_argument("prospect_id")
    parser.add_argument("touch")
    parser.add_argument("subject")
    parser.add_argument("body")
    parser.add_argument("--html", action="store_true")
    args = parser.parse_args()

    load_env()
    api_key = os.environ.get("RESEND_API_KEY", "").strip()
    from_email = os.environ.get("RESEND_FROM_EMAIL", "").strip()
    if not api_key or not from_email:
        print("Missing RESEND_API_KEY or RESEND_FROM_EMAIL", file=sys.stderr)
        sys.exit(1)

    prospect = load_prospect(args.prospect_id)
    if not prospect:
        print(f"Prospect {args.prospect_id} not found", file=sys.stderr)
        sys.exit(1)

    to_email = prospect["email"]

    ok, reason = can_send(to_email, args.touch)
    if not ok:
        print(f"BLOCKED: {reason}")
        update_state(to_email, prospect.get("status", "ready"), f"blocked: {reason}")
        sys.exit(0)

    body = args.body
    if Path(body).exists():
        body = Path(body).read_text(encoding="utf-8")

    print(f"Sending {args.touch} to {to_email} ...")
    resp = send_email(to_email, args.subject, body, from_email, api_key, args.html)
    if resp.status_code != 200:
        print(f"FAIL {resp.status_code}: {resp.text.strip()}", file=sys.stderr)
        sys.exit(1)

    mid = resp.json().get("id", "")
    record_send(to_email, args.touch, message_id=mid, campaign="bookkeeper_channel", prospect_id=args.prospect_id)
    new_state = f"{args.touch}_sent"
    update_state(to_email, new_state, f"sent {args.touch} via Resend, id={mid}")

    # Also update the prospect CSV for backward compatibility
    prospects_path = DATA / "bookkeeper-channel-prospects.csv"
    rows = []
    with open(prospects_path, newline="", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))
    for r in rows:
        if r["id"] == args.prospect_id:
            r["status"] = new_state
            r["last_contact"] = datetime.now(timezone.utc).isoformat()[:10]
    with open(prospects_path, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=rows[0].keys())
        w.writeheader()
        w.writerows(rows)

    print(f"OK: {mid}")


if __name__ == "__main__":
    main()
