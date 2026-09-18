"""
Daily reply-stats checker for Collectly outreach.

Outputs a short summary suitable for the daily digest.

This script used to read a `status` column and died with KeyError on every
run, because outreach-log.csv has never had one -- its columns are
`signal` (sent / send_failed) and `replied`. So the one script whose job was
to report the reply rate had been crashing rather than reporting, which is
part of why 313 first-touch emails went out between 2026-08-08 and 2026-09-10
with nothing measuring what came back.

It now reads the real schema, and it reports "not tracked" rather than "0%"
when the reply column is empty -- those are very different facts, and printing
a confident 0.0% reply rate off an unpopulated column is worse than printing
nothing.
"""
import csv
import json
import os
from collections import Counter
from pathlib import Path

BASE = Path(f"{os.path.expanduser('~')}/.openclaw/workspace/collectly/outreach")
LOG = BASE / "data" / "outreach-log.csv"
SNAPSHOTS = BASE / "data" / "deliverability-snapshots"

TRUTHY = {"1", "true", "yes", "y", "replied", "positive"}


def _bounce_summary() -> str:
    """Bounces come from Resend, not from the local log, which cannot see them."""
    # Sort by the DATE in the filename, not lexically: "resend-all-current.json"
    # sorts after every "resend-all-2026-..." name, and it is a stale August
    # file. Picking it made this report print 1.0% while the current window was
    # 18.2%.
    dated = [p for p in SNAPSHOTS.glob("resend-all-????-??-??*.json")]
    snaps = sorted(dated, key=lambda p: p.name)
    if not snaps:
        return "bounces: no Resend snapshot on file"
    try:
        payload = json.loads(snaps[-1].read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return "bounces: snapshot unreadable"
    rows = payload if isinstance(payload, list) else (payload.get("emails") or payload.get("data") or [])
    if not rows:
        return "bounces: snapshot empty"
    events = Counter((r.get("last_event") or r.get("status") or "?") for r in rows)
    bounced = events.get("bounced", 0) + events.get("complained", 0)
    return f"bounces (current Resend window): {bounced}/{len(rows)} = {bounced / len(rows):.1%}"


def main() -> int:
    if not LOG.exists():
        print(f"no log at {LOG}")
        return 1

    with LOG.open("r", newline="", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))

    total = len(rows)
    signals = Counter((r.get("signal") or "").strip() for r in rows)
    touches = Counter((r.get("touch") or "").strip() for r in rows)
    sent = signals.get("sent", 0)
    failed = signals.get("send_failed", 0)

    replied_vals = [(r.get("replied") or "").strip().lower() for r in rows]
    tracked = sum(1 for v in replied_vals if v != "")
    replied = sum(1 for v in replied_vals if v in TRUTHY)

    print(f"Total log rows: {total}")
    print(f"Sent: {sent} | Send failed: {failed}")
    print(f"Touch breakdown: {dict(touches)}")
    print(f"Signal breakdown: {dict(signals)}")

    if tracked == 0:
        print("Reply rate: NOT TRACKED — the `replied` column is empty on all "
              f"{total} rows. Nothing has written reply outcomes back to this log, "
              "so no reply rate exists to report and the ICP refinement engine "
              "has no signal to work from.")
    else:
        print(f"Replied: {replied}/{tracked} tracked = {replied / tracked:.1%}")
        if tracked < total:
            print(f"  (note: {total - tracked} of {total} rows have no reply outcome recorded)")

    print(_bounce_summary())
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
