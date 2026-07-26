"""
Resend webhook receiver for Collectly outreach tracking.

What this does:
- Listens for Resend events (delivered, bounced, complained, opened, clicked)
- Matches the event's message_id against outreach-log.csv
- Updates the log's status/replied_at columns automatically

What this does NOT do (Resend webhooks don't cover actual email replies —
replies go to your inbox as normal email, not as a webhook event):
- Detect a prospect's reply text. For that, use the second script
  (poll_replies.py) which checks the davie@getcollectly.app inbox via IMAP
  and matches by thread/subject. Run both together.

SETUP:
1. pip install flask
2. Deploy this somewhere reachable (Render/Railway/Fly.io free tier, or
   ngrok for local testing)
3. In Resend dashboard -> Webhooks -> add endpoint -> point to
   https://your-deployed-url/webhook/resend
4. Subscribe to: email.delivered, email.bounced, email.complained,
   email.opened, email.clicked
5. Copy the signing secret Resend gives you into RESEND_WEBHOOK_SECRET below
6. Make sure outreach-log.csv has a `message_id` column that matches the
   `id` Resend returns when you send (capture this in send-gmail.py /
   your Resend send script and log it)

CSV SCHEMA EXPECTED (edit COLUMN names below if yours differ):
message_id, prospect_email, niche, subject_variant, hook_variant, status, sent_at, delivered_at, bounced_at, opened_at, replied_at
"""

import csv
import os
import hmac
import hashlib
import shutil
from datetime import datetime, timezone
from flask import Flask, request, jsonify

app = Flask(__name__)

# ---- CONFIG ----
LOG_PATH = os.environ.get("OUTREACH_LOG_PATH", "outreach-log.csv")
RESEND_WEBHOOK_SECRET = os.environ.get("RESEND_WEBHOOK_SECRET", "")  # from Resend dashboard
MESSAGE_ID_COL = "message_id"

# Map Resend event types -> which CSV column + status value to set
EVENT_MAP = {
    "email.delivered": {"status": "delivered", "timestamp_col": "delivered_at"},
    "email.bounced": {"status": "bounced", "timestamp_col": "bounced_at"},
    "email.complained": {"status": "complained_DNC", "timestamp_col": "bounced_at"},
    "email.opened": {"status": "opened", "timestamp_col": "opened_at"},
    "email.clicked": {"status": "clicked", "timestamp_col": "opened_at"},
}


def verify_signature(payload_body: bytes, signature_header: str) -> bool:
    """Verify the webhook actually came from Resend (svix-style signing).
    If RESEND_WEBHOOK_SECRET isn't set, skip verification (dev mode only —
    do not run in production without this)."""
    if not RESEND_WEBHOOK_SECRET:
        return True
    if not signature_header:
        return False
    expected = hmac.new(
        RESEND_WEBHOOK_SECRET.encode(), payload_body, hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(expected, signature_header)


def update_log(message_id: str, status: str, timestamp_col: str) -> bool:
    """Find the row matching message_id and update status + timestamp.
    Writes to a temp file then swaps, so a crash mid-write can't corrupt the log."""
    if not os.path.exists(LOG_PATH):
        print(f"WARNING: {LOG_PATH} not found")
        return False

    tmp_path = LOG_PATH + ".tmp"
    found = False
    now_iso = datetime.now(timezone.utc).isoformat()

    with open(LOG_PATH, "r", newline="", encoding="utf-8") as infile:
        reader = csv.DictReader(infile)
        fieldnames = reader.fieldnames
        rows = list(reader)

    # make sure timestamp column exists even if the CSV predates this script
    if timestamp_col not in fieldnames:
        fieldnames = fieldnames + [timestamp_col]

    for row in rows:
        if row.get(MESSAGE_ID_COL) == message_id:
            row["status"] = status
            row[timestamp_col] = now_iso
            found = True

    if found:
        with open(tmp_path, "w", newline="", encoding="utf-8") as outfile:
            writer = csv.DictWriter(outfile, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(rows)
        shutil.move(tmp_path, LOG_PATH)
    else:
        print(f"WARNING: message_id {message_id} not found in log")

    return found


@app.route("/webhook/resend", methods=["POST"])
def resend_webhook():
    payload = request.get_data()
    signature = request.headers.get("svix-signature", "")

    if not verify_signature(payload, signature):
        return jsonify({"error": "invalid signature"}), 401

    data = request.get_json(silent=True) or {}
    event_type = data.get("type", "")
    message_data = data.get("data", {})
    message_id = message_data.get("email_id") or message_data.get("id", "")

    if not message_id:
        return jsonify({"error": "no message_id in payload"}), 400

    mapping = EVENT_MAP.get(event_type)
    if not mapping:
        # event we don't care about (e.g. email.sent) — ack and ignore
        return jsonify({"status": "ignored", "event": event_type}), 200

    updated = update_log(message_id, mapping["status"], mapping["timestamp_col"])

    return jsonify({
        "status": "ok" if updated else "message_id_not_found",
        "event": event_type,
        "message_id": message_id,
    }), 200


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"}), 200


if __name__ == "__main__":
    # For local testing: ngrok http 5000, then point Resend webhook at the ngrok URL
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5000)))
