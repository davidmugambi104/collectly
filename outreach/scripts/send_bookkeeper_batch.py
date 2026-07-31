#!/usr/bin/env python3
"""Send the first bookkeeper-channel batch with proper logging and flushing."""
import csv
import os
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

import requests

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


def main():
    load_env()
    api_key = os.environ.get("RESEND_API_KEY", "").strip()
    from_email = os.environ.get("RESEND_FROM_EMAIL", "").strip()
    if not api_key or not from_email:
        print("Missing RESEND_API_KEY or RESEND_FROM_EMAIL", file=sys.stderr)
        sys.exit(1)

    prospects_path = DATA / "bookkeeper-channel-prospects.csv"
    log_path = DATA / "outbound-send-log-2026-07-30.csv"

    targets = [
        ("6a6b115b96b7e90001b5e07a", "AR follow-up for fractional CFO clients", """Hi Dan,

Ascent CFO works with startups on cash flow and funding strategy. One pattern I see: the same clients who delay fundraising also delay AR follow-up, and the invoices sit past 60 days.

I built Collectly to automate the predictable part — QBO/Xero reminders, overdue tracking, and a clear escalation timeline — so fractional CFOs don't have to chase manually.

Worth a 10-minute conversation to see if it fits the work you do with Ascent clients?

Thanks,
Davie Mugambi
Founder, Collectly"""),
        ("6a6b115b96b7e90001b5e084", "Workflow automation for bookkeeping clients", """Hi Lana,

Hill Bookkeeping emphasizes workflow automation and transparent pricing — that caught my attention because AR follow-up is usually the workflow nobody owns.

Collectly connects to QBO/Xero, sends the right reminder at the right time, and flags which clients are consistently slow to pay. It turns AR from a reactive fire drill into a system.

Would you be open to a quick look? I can demo it against a sample client file.

Thanks,
Davie Mugambi
Founder, Collectly"""),
        ("6a6b115b96b7e90001b5e06d", "A/R follow-up for mission-driven clients", """Hi Shetu,

Diverge Finance does collective accounting for values-aligned organizations. I'm building Collectly to help firms like yours get clients paid without the awkward manual chase.

It reads QBO/Xero, automates polite reminders at 7, 14, 30 days, and keeps a clear log so you and the client both know what happened.

Worth a 10-minute call to see if it fits the nonprofits and cooperatives you support?

Thanks,
Davie Mugambi
Founder, Collectly"""),
        ("6a6b115b96b7e90001b5e076", "Automated AR for cloud accounting firms", """Hi Ambrose,

Chief Accounting already automates bookkeeping and invoice transcription. The next logical gap is AR follow-up after the invoice is sent.

Collectly handles that part: it reads QBO/Xero, sends timed reminders, and surfaces overdue invoices before they become collection problems.

Would a 10-minute demo be useful? I can walk through how it fits a cloud accounting stack.

Thanks,
Davie Mugambi
Founder, Collectly"""),
        ("6a6b115b96b7e90001b5e06e", "AR automation for online businesses", """Hi Cenk,

Tukel Inc. serves online businesses, SaaS, and e-commerce companies with Xero and automation. Those clients often have dozens of small invoices and no one chasing them.

Collectly automates the AR follow-up layer — QBO/Xero reminders, overdue tracking, and slow-payer reporting — so your team spends less time on collections.

Open to a 10-minute call to see if it fits your virtual CFO clients?

Thanks,
Davie Mugambi
Founder, Collectly"""),
    ]

    with open(prospects_path, newline="", encoding="utf-8") as f:
        rows = {r["id"]: r for r in csv.DictReader(f)}

    log_fields = ["sent_at", "prospect_id", "first_name", "last_name", "company", "email", "subject", "message_id", "status_code", "response_body"]
    DATA.mkdir(parents=True, exist_ok=True)
    file_exists = log_path.exists()

    with open(log_path, "a", newline="", encoding="utf-8") as logf:
        logw = csv.DictWriter(logf, fieldnames=log_fields)
        if not file_exists:
            logw.writeheader()

        for i, (pid, subject, body) in enumerate(targets):
            p = rows.get(pid)
            if not p:
                print(f"Prospect {pid} not found", file=sys.stderr)
                continue

            print(f"[{datetime.now(timezone.utc).isoformat()}] Sending to {p['first_name']} {p['last_name']} at {p['email']} ...")
            sys.stdout.flush()

            resp = requests.post(
                "https://api.resend.com/emails",
                headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                json={"from": from_email, "to": [p["email"]], "subject": subject, "text": body},
                timeout=30,
            )
            mid = ""
            try:
                mid = resp.json().get("id", "")
            except Exception:
                pass

            logw.writerow({
                "sent_at": datetime.now(timezone.utc).isoformat(),
                "prospect_id": pid,
                "first_name": p["first_name"],
                "last_name": p["last_name"],
                "company": p["company"],
                "email": p["email"],
                "subject": subject,
                "message_id": mid,
                "status_code": resp.status_code,
                "response_body": resp.text.strip(),
            })
            logf.flush()
            os.fsync(logf.fileno())

            if resp.status_code == 200:
                print(f"  OK: {mid}")
            else:
                print(f"  FAIL {resp.status_code}: {resp.text.strip()}")
            sys.stdout.flush()

            if i < len(targets) - 1:
                print("  Sleeping 5 minutes before next send...")
                sys.stdout.flush()
                time.sleep(300)

    print(f"\nDone. Log: {log_path}")


if __name__ == "__main__":
    main()
