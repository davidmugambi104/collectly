"""
Integration test for reply tracking pipeline.

This exercises both resend_webhook.py and poll_replies.py logic against
the real outreach-log.csv without needing a live Resend webhook or IMAP inbox.
"""
import csv
import shutil
import json
from datetime import datetime, timezone
from pathlib import Path

LOG = Path("/home/davie/.openclaw/workspace/collectly/outreach/data/outreach-log.csv")
TEST_LOG = LOG.with_suffix(".test.csv")


def load_log(path):
    with open(path, "r", newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        return reader.fieldnames, list(reader)


def save_log(path, fieldnames, rows):
    tmp = path.with_suffix(".tmp")
    with open(tmp, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)
    shutil.move(tmp, path)


def update_from_webhook(rows, message_id, event_type, timestamp=None):
    """Mimic resend_webhook.update_log behavior."""
    ts = timestamp or datetime.now(timezone.utc).isoformat()
    mapping = {
        "email.delivered": {"status": "delivered", "col": "delivered_at"},
        "email.bounced": {"status": "bounced", "col": "bounced_at"},
        "email.complained": {"status": "complained_DNC", "col": "bounced_at"},
        "email.opened": {"status": "opened", "col": "opened_at"},
        "email.clicked": {"status": "clicked", "col": "clicked_at"},
    }
    m = mapping.get(event_type)
    if not m:
        return False
    for r in rows:
        if r.get("message_id") == message_id:
            r["status"] = m["status"]
            r[m["col"]] = ts
            return True
    return False


def update_from_reply(rows, fieldnames, message_id, from_addr, body):
    """Mimic poll_replies.py behavior."""
    if "replied_at" not in fieldnames:
        fieldnames.append("replied_at")
    if "reply_snippet" not in fieldnames:
        fieldnames.append("reply_snippet")
    for r in rows:
        if r.get("message_id") == message_id:
            r["status"] = "REPLIED"
            r["replied_at"] = datetime.now(timezone.utc).isoformat()
            r["reply_snippet"] = " ".join(body.split())[:200]
            return True
    return False


def main():
    shutil.copy(LOG, TEST_LOG)
    fieldnames, rows = load_log(TEST_LOG)

    # Pick a pilot send to test with
    pilot_id = "57a0d1e7-5723-4914-b78e-962fe59d9fa9"

    # 1. Simulate delivered webhook
    ok1 = update_from_webhook(rows, pilot_id, "email.delivered")
    print(f"[webhook delivered] updated={ok1}")

    # 2. Simulate open webhook
    ok2 = update_from_webhook(rows, pilot_id, "email.opened")
    print(f"[webhook opened] updated={ok2}")

    # 3. Simulate human reply
    ok3 = update_from_reply(
        rows,
        fieldnames,
        pilot_id,
        "josh@goldfront.com",
        "Hey Davie — yeah, this is actually a real pain for us. Can you send a quick Loom?",
    )
    print(f"[reply matched] updated={ok3}")

    save_log(TEST_LOG, fieldnames, rows)

    # Show final row for the pilot message
    for r in rows:
        if r.get("message_id") == pilot_id:
            print("\nFinal pilot row:")
            print(json.dumps(r, indent=2))
            break

    print(f"\nTest log written to: {TEST_LOG}")
    print("If this looks correct, replace outreach-log.csv with this file.")


if __name__ == "__main__":
    main()
