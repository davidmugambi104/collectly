#!/usr/bin/env python3
"""Central state machine and dedup guard for Collectly outbound outreach.

Supported states:
  ready
  t1_sent
  t2_sent
  t3_sent
  t4_sent
  replied
  booked
  nurture
  do_not_contact
  bounced
"""
import csv
import json
import os
import re
from collections import defaultdict
from datetime import datetime, timezone, timedelta
from pathlib import Path

HERE = Path(__file__).resolve().parent
DATA = HERE.parent / "data"
STATE_FILE = DATA / "outreach-state.json"
DEDUP_DAYS = 7


def load_state():
    if not STATE_FILE.exists():
        return {"contacts": {}, "emails": {}, "notes": []}
    with open(STATE_FILE, encoding="utf-8") as f:
        return json.load(f)


def save_state(state):
    DATA.mkdir(parents=True, exist_ok=True)
    with open(STATE_FILE, "w", encoding="utf-8") as f:
        json.dump(state, f, indent=2)


def normalize_email(email: str) -> str:
    return (email or "").strip().lower()


def can_send(email: str, touch: str, min_days: int = DEDUP_DAYS) -> tuple[bool, str]:
    """Return (ok, reason). Blocks resending the same touch within min_days."""
    state = load_state()
    e = normalize_email(email)
    key = f"{e}:{touch}"
    last_sent = state["emails"].get(key)
    if last_sent:
        last = datetime.fromisoformat(last_sent)
        if datetime.now(timezone.utc) - last < timedelta(days=min_days):
            return False, f"already_sent_{touch}_within_{min_days}_days"
    return True, ""


def record_send(email: str, touch: str, message_id: str = "", campaign: str = "", prospect_id: str = "", meta: dict = None):
    state = load_state()
    e = normalize_email(email)
    now = datetime.now(timezone.utc).isoformat()
    key = f"{e}:{touch}"
    state["emails"][key] = now

    if e not in state["contacts"]:
        state["contacts"][e] = {
            "state": "ready",
            "sent_history": [],
            "replies": [],
            "created_at": now,
        }

    state["contacts"][e]["state"] = f"{touch}_sent"
    state["contacts"][e]["sent_history"].append({
        "touch": touch,
        "sent_at": now,
        "message_id": message_id,
        "campaign": campaign,
        "prospect_id": prospect_id,
        "meta": meta or {},
    })
    state["contacts"][e]["last_contact"] = now
    save_state(state)


def record_reply(email: str, reply_text: str = "", source: str = "inbound", received_at: str = None):
    state = load_state()
    e = normalize_email(email)
    now = received_at or datetime.now(timezone.utc).isoformat()

    if e not in state["contacts"]:
        state["contacts"][e] = {
            "state": "replied",
            "sent_history": [],
            "replies": [],
            "created_at": now,
        }

    state["contacts"][e]["state"] = "replied"
    state["contacts"][e]["replies"].append({
        "received_at": now,
        "source": source,
        "reply_text": reply_text,
    })
    state["contacts"][e]["last_contact"] = now
    state["contacts"][e]["next_step"] = "human_review"
    save_state(state)


def update_state(email: str, new_state: str, note: str = ""):
    allowed = {"ready", "t1_sent", "t2_sent", "t3_sent", "t4_sent", "replied", "booked", "nurture", "do_not_contact", "bounced"}
    if new_state not in allowed:
        raise ValueError(f"Invalid state {new_state}. Allowed: {allowed}")
    state = load_state()
    e = normalize_email(email)
    if e not in state["contacts"]:
        state["contacts"][e] = {"state": "ready", "sent_history": [], "replies": [], "created_at": datetime.now(timezone.utc).isoformat()}
    state["contacts"][e]["state"] = new_state
    state["contacts"][e]["last_contact"] = datetime.now(timezone.utc).isoformat()
    if note:
        state["contacts"][e]["note"] = note
    save_state(state)


def get_state(email: str) -> dict:
    state = load_state()
    return state["contacts"].get(normalize_email(email), {})


def summarize():
    state = load_state()
    counts = defaultdict(int)
    for c in state["contacts"].values():
        counts[c.get("state", "ready")] += 1
    print("State counts:")
    for k, v in sorted(counts.items(), key=lambda x: -x[1]):
        print(f"  {k}: {v}")


if __name__ == "__main__":
    summarize()
