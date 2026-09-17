"""Write-side helper for outreach/data/suppression.csv.

`prospect_utils` already knows how to *read* the suppression list; nothing in
the repo knew how to *write* it, so every bounce was suppressed by hand. That
gap is why 21 bounced addresses sat live across the Sep 2-6 batches while sends
continued into them (see briefings/2026-09-06.md).

Stdlib only, same as prospect_utils, so the cron scripts can import it without
touching requirements.

Run directly to backfill from the deliverability snapshots already on disk:

    python3 outreach/scripts/lib/suppression.py --dry-run
    python3 outreach/scripts/lib/suppression.py
"""
import csv
import glob
import json
import os
import shutil
from datetime import datetime, timezone

WS = f"{os.path.expanduser('~')}/.openclaw/workspace/collectly"
SUPPRESSION_PATH = f"{WS}/outreach/data/suppression.csv"
SNAPSHOT_GLOB = f"{WS}/outreach/data/deliverability-snapshots/resend-7d-summary-*.json"

FIELDNAMES = ["email", "reason", "source_row_id", "added_at", "note"]


def _norm(email) -> str:
    """Resend returns `to` as either a string or a single-element list."""
    if isinstance(email, list):
        email = email[0] if email else ""
    return str(email or "").strip().lower()


def load_suppressed() -> set:
    out = set()
    if not os.path.exists(SUPPRESSION_PATH):
        return out
    with open(SUPPRESSION_PATH, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            e = _norm(row.get("email"))
            if e:
                out.add(e)
    return out


def append_suppressions(entries, default_reason="bounce_auto") -> list:
    """Append any address not already suppressed. Idempotent.

    `entries` is an iterable of dicts with at least `email`; optional `reason`,
    `source_row_id` and `note` override the defaults.

    Writes via temp file + atomic move so a crash mid-write cannot truncate the
    list — losing this file means sending into known-bad addresses again.
    Returns the rows actually added.
    """
    existing = load_suppressed()
    now_iso = datetime.now(timezone.utc).isoformat()

    new_rows = []
    seen = set()
    for entry in entries:
        email = _norm(entry.get("email"))
        if not email or email in existing or email in seen:
            continue
        seen.add(email)
        new_rows.append(
            {
                "email": email,
                "reason": entry.get("reason") or default_reason,
                "source_row_id": entry.get("source_row_id") or "",
                "added_at": entry.get("added_at") or now_iso,
                "note": entry.get("note") or "",
            }
        )

    if not new_rows:
        return []

    had_file = os.path.exists(SUPPRESSION_PATH)
    tmp_path = SUPPRESSION_PATH + ".tmp"
    with open(tmp_path, "w", newline="", encoding="utf-8") as out:
        writer = csv.DictWriter(out, fieldnames=FIELDNAMES)
        writer.writeheader()
        if had_file:
            with open(SUPPRESSION_PATH, newline="", encoding="utf-8") as src:
                for row in csv.DictReader(src):
                    writer.writerow({k: row.get(k, "") for k in FIELDNAMES})
        writer.writerows(new_rows)
    shutil.move(tmp_path, SUPPRESSION_PATH)
    return new_rows


def bounces_from_resend(emails, bounce_predicate, complaint_predicate=None) -> list:
    """Turn raw Resend email records into suppression entries.

    Deliberately ignores the 7-day window the bounce *rate* uses: a bounce
    ageing out of the rate window does not make the mailbox deliverable again.
    """
    entries = []
    for e in emails:
        if bounce_predicate(e):
            reason = "bounce_auto"
        elif complaint_predicate and complaint_predicate(e):
            reason = "complaint_auto"
        else:
            continue
        entries.append(
            {
                "email": _norm(e.get("to")),
                "reason": reason,
                "source_row_id": e.get("id") or "",
                "note": f"auto-suppressed from Resend last_event={e.get('last_event')}",
            }
        )
    return entries


def _entries_from_snapshots() -> list:
    entries = {}
    for path in sorted(glob.glob(SNAPSHOT_GLOB)):
        try:
            data = json.load(open(path, encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            continue
        for b in data.get("bounced_recipients", []):
            email = _norm(b.get("to"))
            if email:
                entries[email] = {
                    "email": email,
                    "reason": "bounce_auto",
                    "source_row_id": b.get("id") or "",
                    "note": f"backfilled from {os.path.basename(path)}",
                }
    return list(entries.values())


def main() -> int:
    import argparse

    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--dry-run", action="store_true", help="report without writing")
    args = ap.parse_args()

    entries = _entries_from_snapshots()
    existing = load_suppressed()
    pending = [e for e in entries if e["email"] not in existing]

    print(f"snapshots: {len(entries)} distinct bounced addresses")
    print(f"suppression.csv: {len(existing)} already listed")
    print(f"missing: {len(pending)}")

    if args.dry_run:
        for e in pending:
            print(f"  would add {e['email']}")
        return 0

    added = append_suppressions(entries)
    for row in added:
        print(f"  added {row['email']}")
    print(f"added {len(added)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
