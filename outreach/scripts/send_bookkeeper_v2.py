#!/usr/bin/env python3
"""Send the hand-written bookkeeper-channel v2 drafts.

Reads messages/bookkeeper-channel-outbound-v2-2026-09-20.md, pairs each section
with its row in bookkeeper-channel-prospects.csv, and hands each one to
send_with_guard.py -- which keeps the dedup guard, the cross-channel state and
the send log that the whole pipeline relies on.

Why this exists: the drafts are per-prospect prose, not a template, so the
normal daily_send.py path does not apply. Without this, sending them meant three
manual copy-pastes of subject and body into send_with_guard.py, which is exactly
where a wrong body goes to the wrong person.

Only rows marked status=drafted_v2 are sent. Anything HELD or out_of_channel in
the markdown is ignored, because that qualification was the point.

Dry run by default. --send actually sends.
"""
import argparse
import csv
import re
import subprocess
import sys
import tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
DRAFTS = HERE.parent / "messages" / "bookkeeper-channel-outbound-v2-2026-09-20.md"
CSV_PATH = HERE.parent / "data" / "bookkeeper-channel-prospects.csv"

SECTION = re.compile(r"^## …([0-9a-f]{6}) — (.+)$", re.M)


def parse_drafts() -> dict[str, dict[str, str]]:
    text = DRAFTS.read_text(encoding="utf-8")
    out: dict[str, dict[str, str]] = {}
    marks = list(SECTION.finditer(text))
    for i, m in enumerate(marks):
        body_end = marks[i + 1].start() if i + 1 < len(marks) else len(text)
        chunk = text[m.end():body_end]
        if "HELD" in m.group(2):
            continue
        subject = re.search(r"^\*\*Subject:\*\*\s*(.+)$", chunk, re.M)
        block = re.search(r"```\n(.*?)```", chunk, re.S)
        if subject and block:
            out[m.group(1)] = {
                "who": m.group(2).strip(),
                "subject": subject.group(1).strip(),
                "body": block.group(1).strip(),
            }
    return out


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--send", action="store_true", help="actually send (default: dry run)")
    ap.add_argument("--touch", default="t1")
    args = ap.parse_args()

    drafts = parse_drafts()
    rows = {r["id"][-6:]: r for r in csv.DictReader(open(CSV_PATH))}

    queue = []
    for key, d in drafts.items():
        row = rows.get(key)
        if not row:
            print(f"  SKIP {key}: no matching row in {CSV_PATH.name}", file=sys.stderr)
            continue
        if row.get("status") != "drafted_v2":
            print(f"  SKIP {key}: status={row.get('status')!r}, not drafted_v2", file=sys.stderr)
            continue
        queue.append((row["id"], d))

    if not queue:
        print("Nothing to send.")
        return 1

    print(f"{'SENDING' if args.send else 'DRY RUN'} — {len(queue)} prospect(s)\n")
    rc = 0
    for pid, d in queue:
        print(f"  {pid[-6:]}  {d['who']}")
        print(f"    subject: {d['subject']}")
        print(f"    body:    {len(d['body'].splitlines())} lines, {len(d['body'])} chars")
        if not args.send:
            continue
        with tempfile.NamedTemporaryFile("w", suffix=".txt", delete=False, encoding="utf-8") as f:
            f.write(d["body"])
            path = f.name
        r = subprocess.run(
            [sys.executable, str(HERE / "send_with_guard.py"), pid, args.touch, d["subject"], path],
            capture_output=True, text=True,
        )
        print("    " + (r.stdout.strip() or r.stderr.strip()).replace("\n", "\n    "))
        if r.returncode != 0:
            rc = r.returncode
    if not args.send:
        print("\nRe-run with --send to actually send.")
    return rc


if __name__ == "__main__":
    sys.exit(main())
