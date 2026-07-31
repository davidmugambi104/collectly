#!/usr/bin/env python3
"""Process inbound replies and update outreach state.

Can be called:
  1. As Resend inbound webhook handler: POST JSON {email, subject, text, from}
  2. From CLI with --email and --text for manual entry
  3. By an IMAP poller (future)
"""
import argparse
import json
import os
import re
from datetime import datetime, timezone
from pathlib import Path

from outreach_state import load_state, save_state

AUTO_REPLY_PATTERNS = [
    r"out of (the )?office",
    r"automated response",
    r"auto[- ]?reply",
    r"no longer (at|with)",
    r"this mailbox is not monitored",
    r"i am away",
]


def is_auto_reply(text: str, subject: str = "") -> bool:
    combined = f"{text} {subject}".lower()
    return any(re.search(p, combined) for p in AUTO_REPLY_PATTERNS)


def classify_reply(text: str, subject: str = "") -> dict:
    text_lower = f"{text} {subject}".lower()
    if is_auto_reply(text, subject):
        return {"state": "t1_sent", "next_step": "ignore_auto_reply", "note": "Auto-reply detected; keep sequence running"}
    if any(x in text_lower for x in ["unsubscribe", "remove me", "don't email", "stop emailing", "not interested"]):
        return {"state": "do_not_contact", "next_step": "suppress", "note": "Opt-out request"}
    if any(x in text_lower for x in ["book", "calendar", "demo", "call", "schedule", "meet", " interested", "tell me more", "pricing"]):
        return {"state": "replied", "next_step": "human_review_priority", "note": "Positive reply / buying signal"}
    return {"state": "replied", "next_step": "human_review", "note": "Reply received; needs human triage"}


def record_inbound(email: str, subject: str, text: str, source: str = "webhook", received_at: str = None):
    state = load_state()
    e = email.strip().lower()
    now = received_at or datetime.now(timezone.utc).isoformat()

    if e not in state["contacts"]:
        state["contacts"][e] = {
            "state": "replied",
            "sent_history": [],
            "replies": [],
            "created_at": now,
        }

    classification = classify_reply(text, subject)

    state["contacts"][e]["state"] = classification["state"]
    state["contacts"][e]["last_contact"] = now
    state["contacts"][e]["next_step"] = classification["next_step"]
    state["contacts"][e]["replies"].append({
        "received_at": now,
        "source": source,
        "subject": subject,
        "reply_text": text[:2000],
    })

    note = state["contacts"][e].get("note", "")
    state["contacts"][e]["note"] = f"{note}\n{classification['note']}".strip()

    save_state(state)
    return classification


def handle_resend_webhook(payload: dict) -> dict:
    """Resend inbound webhook payload structure:
    {
      "from": "sender@example.com",
      "to": ["davie@getcollectly.app"],
      "subject": "Re: ...",
      "text": "...",
      "html": "...",
      "headers": {...}
    }
    """
    from_email = payload.get("from", "")
    subject = payload.get("subject", "")
    text = payload.get("text", "")
    return record_inbound(from_email, subject, text, source="resend_webhook")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--email", required=True)
    parser.add_argument("--subject", default="")
    parser.add_argument("--text", required=True)
    parser.add_argument("--source", default="manual")
    args = parser.parse_args()

    result = record_inbound(args.email, args.subject, args.text, source=args.source)
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
