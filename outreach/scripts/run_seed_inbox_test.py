"""
Seed-inbox deliverability test for Collectly outreach.

Sends 4 test emails via Resend:
  - 2 to a Gmail address you control
  - 2 to an Outlook/Microsoft address you control

Messages use the current v2 opener and a partner-economics variant.
After sending, the script prints instructions for checking inbox placement.
"""
import csv
import json
import os
import urllib.request
import hashlib
import base64
from datetime import datetime, timezone
from pathlib import Path

ENV = Path("/home/davie/.openclaw/workspace/collectly/.env.local")
LOG = Path("/home/davie/.openclaw/workspace/collectly/outreach/data/outreach-log.csv")


def load_env():
    env = {}
    for line in ENV.read_text().splitlines():
        if "=" in line and not line.startswith("#"):
            k, v = line.split("=", 1)
            env[k] = v.strip().strip('"').strip("'")
    return env


def token(email):
    return base64.urlsafe_b64encode(
        hashlib.sha256(f"collectly-2026-07:{email}".encode()).digest()
    ).decode().rstrip("=")[:32]


def send_resend(api_key, from_email, to, subject, body):
    payload = json.dumps({
        "from": from_email,
        "to": [to],
        "subject": subject,
        "text": body,
        "reply_to": "davie@getcollectly.app",
    }).encode()
    req = urllib.request.Request(
        "https://api.resend.com/emails",
        data=payload,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "User-Agent": "collectly-outreach/1.0",
        },
        method="POST",
    )
    resp = urllib.request.urlopen(req, timeout=30)
    return json.loads(resp.read().decode())


def v2_opener(first_name, company):
    return f"""Hi {first_name},

Quick question: any QBO invoice on your books right now that's 14+ days overdue — big enough to matter, but awkward to chase because the client is still active?

I'm building Collectly for small studios and agencies on QuickBooks who do project work and live with awkward 2-4 week follow-up cycles. We use tone-aware AI to send the nudge so it doesn't read like a robot or burn the relationship. Early, live, starting with a small batch before broad launch.

Worth a 2-min Loom?

Davie Mugambi

---

Davie Mugambi · Collectly · getcollectly.app

If this isn't relevant, you can unsubscribe here:
https://getcollectly.app/api/unsubscribe?token={token("")}
"""


def partner_angle(first_name, company):
    return f"""Hi {first_name},

Quick question: do any of {company}'s clients ever ask "can you also chase our overdue invoices?"

I'm building Collectly — tone-aware AR follow-up for agencies and their clients. There's a natural referral/white-label angle for firms like yours that already handle client books or ops. Wanted to see if that's ever come up in your work.

Worth 5 min?

Davie Mugambi

---

Davie Mugambi · Collectly · getcollectly.app

If this isn't relevant, you can unsubscribe here:
https://getcollectly.app/api/unsubscribe?token={token("")}
"""


def log_send(rows, fieldnames, test_id, email, touch, subject, message_id, detail):
    rows.append({
        "id": test_id,
        "email": email,
        "touch": touch,
        "sent_at": datetime.now(timezone.utc).isoformat(),
        "replied_at": "",
        "status": "sent",
        "next_step": "",
        "message_id": message_id,
        "detail": detail,
        "segment": "seed_inbox_test",
    })


def main():
    env = load_env()
    api_key = env.get("RESEND_API_KEY")
    from_email = env.get("RESEND_FROM_EMAIL")
    if not api_key or not from_email:
        print("ERROR: RESEND_API_KEY or RESEND_FROM_EMAIL missing from .env.local")
        return

    gmail = os.environ.get("SEED_GMAIL")
    outlook = os.environ.get("SEED_OUTLOOK")
    if not gmail or not outlook:
        print("Set SEED_GMAIL and SEED_OUTLOOK env vars, then re-run.")
        print("Example: SEED_GMAIL=test@gmail.com SEED_OUTLOOK=test@outlook.com python3 run_seed_inbox_test.py")
        return

    # Load log
    with open(LOG, "r", newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        fieldnames = reader.fieldnames
        rows = list(reader)

    test_cases = [
        (gmail, "v2_opener", "Gmail test — v2 opener"),
        (gmail, "partner_angle", "Gmail test — partner angle"),
        (outlook, "v2_opener", "Outlook test — v2 opener"),
        (outlook, "partner_angle", "Outlook test — partner angle"),
    ]

    print(f"Sending 4 seed-inbox test emails via Resend...")
    for idx, (email, variant, detail) in enumerate(test_cases, 1):
        first_name = "Test"
        company = "TestCo"
        subject = (
            "Quick QBO collections question for Test"
            if variant == "v2_opener"
            else "How TestCo could offer this to clients"
        )
        body = v2_opener(first_name, company) if variant == "v2_opener" else partner_angle(first_name, company)
        try:
            data = send_resend(api_key, from_email, email, subject, body)
            mid = data.get("id", "")
            test_id = f"SEED{idx:02d}"
            log_send(rows, fieldnames, test_id, email, "seed_test", subject, mid, detail)
            print(f"  sent {test_id} -> {email} ({variant}) message_id={mid}")
        except Exception as e:
            print(f"  FAILED {email} ({variant}): {e}")

    # Save log
    with open(LOG, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    print("\nNext steps (manual, 5–10 minutes after send):")
    print("1. Open Gmail inbox for", gmail)
    print("   - Check Primary, Promotions, and Spam tabs")
    print("2. Open Outlook inbox for", outlook)
    print("   - Check Inbox, Other, and Junk Email")
    print("3. Record placement and pass/fail per policy criteria")
    print("   - Pass: 4/4 in Primary/Inbox")
    print("   - Conditional: 3/4 with 1 in Promotions")
    print("   - Fail: 2+ not in Primary/Inbox")


if __name__ == "__main__":
    main()
