#!/usr/bin/env python3
"""Rebuild outreach/data/follow-up-queue.csv deterministically.

The follow-up scheduler was a judgement call made by an LLM skill reading the
send log. That was fine until 2026-09-11, when `quarantined_role_address` was
introduced as a tier on prospects.csv to fence off the 198 role addresses that
drove the 34.2% bounce rate. New T1 batches respect it (build_daily_batch.py
filters on exact tier), but the follow-up path never learned about it: it keys
off outreach-log.csv, where a quarantined address looks like any other prospect
we already touched.

The pause file written on 2026-09-03 claims 180 eligible follow-ups. 108 of
those are quarantined role addresses. Releasing that queue on the Sep 20 restart
would have re-sent into the exact mailboxes that caused the pullback.

Filters applied, in order:
  1. must have a completed t1 send in outreach-log.csv
  2. drop anyone suppressed (bounce, complaint, warmup contact, DNC)
  3. drop tier=quarantined_role_address and tier=REMOVED
  4. drop anyone who replied or is past the sequence
  5. drop anyone touched within the dedup window (7 days)
  6. T2 due at +4 days, T3 at +9 days, then cold

Gate-aware: if the deliverability gate is not `allow`, the queue is written with
a single paused row (the existing convention) rather than a live list, so this
can run on the daily cron without ever releasing sends on its own.

    python3 outreach/scripts/build_followup_queue.py --dry-run
    python3 outreach/scripts/build_followup_queue.py
    python3 outreach/scripts/build_followup_queue.py --force-unpause   # ignore gate
"""
import argparse
import csv
import json
import os
import shutil
import sys
from datetime import datetime, timedelta, timezone

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))
from scripts.lib import suppression as supp  # noqa: E402

WS = f"{os.path.expanduser('~')}/.openclaw/workspace/collectly"
DATA = f"{WS}/outreach/data"
LOG_CSV = f"{DATA}/outreach-log.csv"
PROSPECTS_CSV = f"{DATA}/prospects.csv"
STATE_JSON = f"{DATA}/outreach-state.json"
GATE_JSON = f"{DATA}/gate-status.json"
QUEUE_CSV = f"{DATA}/follow-up-queue.csv"

FIELDNAMES = ["email", "due_touch", "last_touch_ts", "days_since_last", "overdue", "paused_reason"]

T2_DAYS = 4
T3_DAYS = 9
DEDUP_DAYS = 7
BLOCKED_TIERS = {"quarantined_role_address", "REMOVED"}
# States that mean the sequence is over for this contact, one way or another.
TERMINAL_STATES = {"replied", "unsubscribed", "do_not_contact", "cold", "recovery_reply_sent"}


def _norm(e) -> str:
    if isinstance(e, list):
        e = e[0] if e else ""
    return str(e or "").strip().lower()


def _parse_ts(ts: str):
    if not ts:
        return None
    try:
        return datetime.fromisoformat(ts.replace("Z", "+00:00"))
    except ValueError:
        return None


def _load_json(path, default):
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except (OSError, json.JSONDecodeError):
        return default


def build(now=None):
    now = now or datetime.now(timezone.utc)

    suppressed = supp.load_suppressed()

    tiers = {}
    for p in csv.DictReader(open(PROSPECTS_CSV, newline="", encoding="utf-8")):
        e = _norm(p.get("email"))
        if e:
            tiers[e] = (p.get("tier") or "").strip()

    contacts = _load_json(STATE_JSON, {}).get("contacts", {})
    states = {_norm(k): (v.get("state") or "") for k, v in contacts.items()}

    # last successful touch per address, and how many touches they have had
    last_touch, touches = {}, {}
    for row in csv.DictReader(open(LOG_CSV, newline="", encoding="utf-8")):
        if (row.get("signal") or "") != "sent":
            continue
        e = _norm(row.get("email"))
        ts = _parse_ts(row.get("timestamp"))
        if not e or not ts:
            continue
        touches.setdefault(e, set()).add((row.get("touch") or "").strip())
        if e not in last_touch or ts > last_touch[e]:
            last_touch[e] = ts

    queue, dropped = [], {"suppressed": 0, "quarantined": 0, "terminal": 0,
                          "dedup": 0, "not_due": 0, "sequence_done": 0}

    for email, ts in last_touch.items():
        if email in suppressed:
            dropped["suppressed"] += 1
            continue
        if tiers.get(email) in BLOCKED_TIERS:
            dropped["quarantined"] += 1
            continue
        if states.get(email) in TERMINAL_STATES:
            dropped["terminal"] += 1
            continue

        done = touches.get(email, set())
        if "t3" in done:
            dropped["sequence_done"] += 1
            continue
        due_touch = "t3" if "t2" in done else "t2"
        threshold = T3_DAYS if due_touch == "t3" else T2_DAYS

        days = (now - ts).total_seconds() / 86400
        if days < DEDUP_DAYS:
            dropped["dedup"] += 1
            continue
        if days < threshold:
            dropped["not_due"] += 1
            continue

        queue.append(
            {
                "email": email,
                "due_touch": due_touch,
                "last_touch_ts": ts.isoformat(),
                "days_since_last": f"{days:.1f}",
                "overdue": "yes" if days > threshold * 2 else "no",
                "paused_reason": "",
            }
        )

    queue.sort(key=lambda r: float(r["days_since_last"]), reverse=True)
    return queue, dropped


def gate_state():
    g = _load_json(GATE_JSON, {})
    return (g.get("gate") or "unknown"), g


def write_queue(rows, pause_reason=None):
    tmp = QUEUE_CSV + ".tmp"
    with open(tmp, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=FIELDNAMES)
        w.writeheader()
        if pause_reason:
            w.writerow({"email": "", "due_touch": "", "last_touch_ts": "",
                        "days_since_last": "", "overdue": "", "paused_reason": pause_reason})
        else:
            w.writerows(rows)
    shutil.move(tmp, QUEUE_CSV)


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--dry-run", action="store_true", help="report without writing the queue")
    ap.add_argument("--force-unpause", action="store_true",
                    help="build a live queue even if the gate is not allow")
    args = ap.parse_args()

    queue, dropped = build()
    gate, gate_blob = gate_state()

    print(f"gate: {gate} (cap={gate_blob.get('resend_daily_cap')})")
    print(f"eligible after filters: {len(queue)}")
    for k, v in dropped.items():
        print(f"  dropped {k}: {v}")
    if queue:
        by_touch = {}
        for r in queue:
            by_touch[r["due_touch"]] = by_touch.get(r["due_touch"], 0) + 1
        print(f"  by touch: {by_touch}")
        print(f"  oldest waiting: {queue[0]['days_since_last']} days")

    paused = gate != "allow" and not args.force_unpause
    reason = None
    if paused:
        rate = gate_blob.get("rollup", {}).get("send_metrics_7d", {}).get("bounce_rate")
        rate_str = f"{rate * 100:.1f}%" if isinstance(rate, (int, float)) else "unknown"
        reason = (f"PAUSED: deliverability gate={gate} "
                  f"(bounce_rate={rate_str}, threshold 5%); "
                  f"{len(queue)} follow-ups eligible and held")
        print(f"\nqueue held: {reason}")
    else:
        print(f"\nqueue live: {len(queue)} rows")

    if args.dry_run:
        print("(dry run — nothing written)")
        return 0

    write_queue(queue, reason)
    print(f"wrote {QUEUE_CSV}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
