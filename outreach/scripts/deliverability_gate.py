#!/usr/bin/env python3
"""Collectly deliverability gate.

Decides whether `daily_send.py` is allowed to send today, based on:

  1. `outreach/data/seed-inbox-test-log.csv` — pass criteria per
     `outreach/policy/collectly_bot_policy.md` Section 0:
         - 4/4 in Primary/Inbox = pass
         - 3/4 with 1 in Promotions = conditional pass
         - 2+ in Spam/Junk/Promotions = fail
         - Anything else (e.g. folder not yet reported) = unknown
  2. `outreach/data/outbound-send-log-*.csv` — rolling 7-day bounce/spam
     rate. >5% triggers pull-back to 30/day (per policy Section 4/limits).

Writes:
  - `outreach/data/deliverability-status.json` (machine-readable; what the
    hourly cron reads first).
  - `outreach/data/gate-status.json` (combined gate decision; what the
    hourly cron reads second).

Designed to be safe to run repeatedly (idempotent, no sends, no network).
"""
from __future__ import annotations

import csv
import glob
import json
import os
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

HERE = Path(__file__).resolve().parent
DATA = HERE.parent / "data"


def _atomic_write_json(path: Path, payload: dict) -> None:
    """Write JSON so readers never observe a truncated/partial file.

    Path.write_text() truncates in place: a concurrent reader (daily_send.py's
    _check_gate()) can catch the file mid-write. Write to a temp file in the
    same directory, then os.replace() — that rename is atomic on POSIX, so
    readers always see either the old complete file or the new complete file,
    never something in between.
    """
    tmp_path = path.with_name(f".{path.name}.tmp-{os.getpid()}")
    tmp_path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(tmp_path, path)

SEED_LOG = DATA / "seed-inbox-test-log.csv"
DELIV_STATUS = DATA / "deliverability-status.json"
GATE_STATUS = DATA / "gate-status.json"
SNAPSHOTS = DATA / "deliverability-snapshots"
SNAPSHOT_MAX_AGE_HOURS = 24

# Pass criteria from collectly_bot_policy.md Section 0.
PRIMARY_REQUIRED = 4   # 4/4 in Primary/Inbox = pass
CONDITIONAL_REQUIRED = 3  # 3/4 with 1 in Promotions = conditional pass
FAIL_SPAM_THRESHOLD = 2  # 2+ in Spam/Junk/Promotions = fail

# Rolling-window thresholds from collectly_bot_policy.md.
BOUNCE_SPAM_PULLBACK = 0.05  # 5% rolling 7-day bounce or spam -> pull back

# Real caps (overrides generic 30-50/day from policy).
RESEND_DAILY_CAP = 100
PULLBACK_CAP = 30
GMAIL_DAILY_CAP = 0  # 0/day until OAuth is fixed


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _iso(dt: datetime) -> str:
    return dt.isoformat()


def _read_seed_log() -> dict:
    """Return aggregate counts from the seed-inbox log."""
    counts = {
        "total": 0,
        "ok_200": 0,
        "failed": 0,
        "primary": 0,
        "promotions": 0,
        "spam": 0,
        "pending_folder_report": 0,
        "latest_test_at": None,
    }
    if not SEED_LOG.exists():
        return counts
    with SEED_LOG.open(newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            counts["total"] += 1
            st = (row.get("status_code") or "").strip()
            folder = (row.get("inbox_folder") or "").strip()
            ts = (row.get("sent_at") or "").strip()
            if ts and (counts["latest_test_at"] is None or ts > counts["latest_test_at"]):
                counts["latest_test_at"] = ts
            if st == "200":
                counts["ok_200"] += 1
                fl = folder.lower()
                if "primary" in fl or "inbox" in fl:
                    counts["primary"] += 1
                elif "promotion" in fl:
                    counts["promotions"] += 1
                elif "spam" in fl or "junk" in fl:
                    counts["spam"] += 1
                else:
                    counts["pending_folder_report"] += 1
            else:
                counts["failed"] += 1
    return counts


def _read_send_logs(window_days: int = 7) -> dict:
    """Compute rolling-window bounce/spam rate across outbound send logs."""
    cutoff = _now() - timedelta(days=window_days)
    total = 0
    bounced = 0
    spam = 0
    by_log: dict[str, dict] = {}
    for path in sorted(glob.glob(str(DATA / "outbound-send-log-*.csv"))):
        per = {"total": 0, "bounced": 0, "spam": 0}
        with open(path, newline="", encoding="utf-8") as f:
            for row in csv.DictReader(f):
                ts = (row.get("sent_at") or row.get("timestamp") or "").strip()
                if not ts:
                    continue
                try:
                    when = datetime.fromisoformat(ts.replace("Z", "+00:00"))
                except ValueError:
                    continue
                if when < cutoff:
                    continue
                per["total"] += 1
                total += 1
                status = (row.get("status") or row.get("event") or "").lower()
                folder = (row.get("inbox_folder") or "").lower()
                if "bounce" in status or "bounced" in status:
                    per["bounced"] += 1
                    bounced += 1
                if "spam" in status or "spam" in folder or "junk" in folder:
                    per["spam"] += 1
                    spam += 1
        by_log[os.path.basename(path)] = per
    return {
        "window_days": window_days,
        "total": total,
        "bounced": bounced,
        "spam": spam,
        "bounce_rate": (bounced / total) if total else 0.0,
        "spam_rate": (spam / total) if total else 0.0,
        "by_log": by_log,
    }


def _read_live_snapshot() -> dict | None:
    """Return rolling-window bounce/spam data from the latest live Resend
    snapshot (written by run_daily_deliverability_monitor.py), if one
    exists and is fresh enough to trust.

    The local-CSV rollup in _read_send_logs() is blind to bounces once
    Resend's actual send activity outruns the per-day
    outbound-send-log-*.csv files (which this repo hasn't kept current) --
    it silently reports 0 total / 0% bounce and the gate defaults to
    allow/100 even when the live bounce rate is well over the pull-back
    threshold. Preferring the live snapshot here, when present and recent,
    keeps every caller of this script (including the 5-minute reply/gate
    cron) from clobbering the correct pullback state that the daily
    deliverability monitor already computed from the real Resend API.
    """
    candidates = sorted(glob.glob(str(SNAPSHOTS / "resend-7d-summary-*.json")))
    if not candidates:
        return None
    latest = Path(candidates[-1])
    try:
        payload = json.loads(latest.read_text(encoding="utf-8"))
        rollup = payload["rollup"]
        fetched_at = datetime.fromisoformat(payload["fetched_at"].replace("Z", "+00:00"))
    except (OSError, KeyError, ValueError):
        return None
    age_hours = (_now() - fetched_at).total_seconds() / 3600.0
    if age_hours > SNAPSHOT_MAX_AGE_HOURS:
        return None
    return {
        "window_days": rollup.get("window_days", 7),
        "total": rollup["total"],
        "bounced": rollup["bounced"],
        "spam": rollup.get("complained", 0),
        "bounce_rate": rollup["bounce_rate"],
        "spam_rate": rollup.get("complaint_rate", rollup.get("spam_rate", 0.0)),
        "source": str(latest.relative_to(HERE.parent.parent)),
        "fetched_at": payload["fetched_at"],
        "age_hours": round(age_hours, 2),
    }


def _classify(seed: dict) -> tuple[str, str]:
    """Return (status, reason) per policy Section 0."""
    if seed["total"] == 0:
        return "unknown", "no seed-inbox tests on file"
    p, pr, sp, pend = seed["primary"], seed["promotions"], seed["spam"], seed["pending_folder_report"]
    # Fail: 2+ in Spam/Junk/Promotions
    if (pr + sp) >= FAIL_SPAM_THRESHOLD:
        return "fail", f"{pr} promotions + {sp} spam of {seed['ok_200']} successful sends"
    # Conditional pass: 3/4 with at most 1 in Promotions
    if p >= CONDITIONAL_REQUIRED and (pr + sp) <= 1:
        return "conditional_pass", f"{p}/{seed['ok_200']} in Primary, {pr} Promotions, {sp} Spam; {pend} awaiting folder report"
    # Full pass: 4/4 Primary
    if p >= PRIMARY_REQUIRED:
        return "pass", f"{p}/{seed['ok_200']} in Primary"
    # Otherwise: enough tests, but missing folder confirmations
    return "unknown", f"{p} Primary confirmed, {pend} awaiting folder report (need {PRIMARY_REQUIRED - p} more)"


def _decide_gate(deliv_status: str, send_metrics: dict) -> tuple[str, str, int]:
    """Combine deliverability + bounce/spam into final gate decision."""
    bounce = send_metrics["bounce_rate"]
    spam_rate = send_metrics["spam_rate"]
    if deliv_status == "fail":
        return "block", "deliverability=FAIL (2+ in spam/promotions)", 0
    if deliv_status == "unknown":
        # Don't send until we know inbox placement. Default conservative.
        return "block", f"deliverability=UNKNOWN ({deliv_status}); waiting on {send_metrics}", 0
    # pass / conditional_pass
    if bounce > BOUNCE_SPAM_PULLBACK or spam_rate > BOUNCE_SPAM_PULLBACK:
        return "pullback", f"bounce_rate={bounce:.1%} or spam_rate={spam_rate:.1%} > 5% rolling 7d", PULLBACK_CAP
    return "allow", f"deliverability={deliv_status}, bounce={bounce:.1%}, spam={spam_rate:.1%}", RESEND_DAILY_CAP


def main() -> int:
    now = _now()
    seed = _read_seed_log()
    live_snapshot = _read_live_snapshot()
    send = live_snapshot if live_snapshot is not None else _read_send_logs(window_days=7)
    deliv_status, deliv_reason = _classify(seed)
    gate, gate_reason, cap = _decide_gate(deliv_status, send)

    deliv_payload = {
        "status": deliv_status,
        "reason": deliv_reason,
        "checked_at": _iso(now),
        "seed_inbox": seed,
        "source_log": str(SEED_LOG.name),
        "policy": "collectly_bot_policy.md section 0",
    }
    gate_payload = {
        "gate": gate,
        "reason": gate_reason,
        "checked_at": _iso(now),
        "deliverability_status": deliv_status,
        "resend_daily_cap": cap,
        "gmail_daily_cap": GMAIL_DAILY_CAP,
        "linkedin_daily_cap": 10,
        "rollup": {
            "send_metrics_7d": send,
            "thresholds": {
                "primary_required": PRIMARY_REQUIRED,
                "conditional_required": CONDITIONAL_REQUIRED,
                "fail_spam_threshold": FAIL_SPAM_THRESHOLD,
                "bounce_spam_pullback": BOUNCE_SPAM_PULLBACK,
                "resend_daily_cap_default": RESEND_DAILY_CAP,
                "pullback_cap": PULLBACK_CAP,
            },
        },
    }

    DATA.mkdir(parents=True, exist_ok=True)
    _atomic_write_json(DELIV_STATUS, deliv_payload)
    _atomic_write_json(GATE_STATUS, gate_payload)

    print(f"deliverability: {deliv_status} — {deliv_reason}")
    print(f"gate: {gate} — {gate_reason}")
    print(f"resend_daily_cap: {cap}  (gmail: {GMAIL_DAILY_CAP})")
    print(f"wrote: {DELIV_STATUS.name}, {GATE_STATUS.name}")
    # Exit non-zero if gate blocks — lets cron alert on real failures.
    return 0 if gate in ("allow", "pullback") else 1


if __name__ == "__main__":
    sys.exit(main())
