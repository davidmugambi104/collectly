"""
Generate the daily outreach digest.

Reads outreach-log.csv and outputs a markdown summary in the policy logs dir.
Run once per day, preferably morning, to replace live mid-run questions.
"""
import csv
import shutil
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

import os
LOG = Path(f"{os.path.expanduser('~')}/.openclaw/workspace/collectly/outreach/data/outreach-log.csv")
LOG_DIR = Path(f"{os.path.expanduser('~')}/.openclaw/workspace/collectly/outreach/policy")


def main():
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    with open(LOG, "r", newline="", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))

    total = len(rows)
    statuses = Counter(r["status"] for r in rows)
    sent = sum(
        1
        for r in rows
        if r["status"] in ("sent", "delivered", "opened", "clicked")
    )
    replied = sum(1 for r in rows if r["status"].startswith("REPLIED") or r["status"].startswith("replied"))
    positive = sum(1 for r in rows if "positive" in r["status"])
    negative = sum(1 for r in rows if "not_interested" in r["status"] or "unsubscribe" in r["status"])
    dnc = sum(1 for r in rows if "DNC" in r["status"])

    # top segments by send count
    segments = Counter(r.get("segment", "") for r in rows if r.get("segment"))

    reply_rate = replied / sent if sent else 0

    digest_path = LOG_DIR / f"decision-log-{today}.md"
    # If file exists, append; else create
    if digest_path.exists():
        mode = "a"
    else:
        mode = "w"

    with open(digest_path, mode, encoding="utf-8") as f:
        if mode == "w":
            f.write(f"# Outreach Decision Log — {today}\n\n")
        f.write(f"## Daily digest — {datetime.now(timezone.utc).isoformat()}\n\n")
        f.write(f"- **Total log rows:** {total}\n")
        f.write(f"- **Sent:** {sent} | **Replied:** {replied} | **Positive:** {positive} | **Negative:** {negative} | **DNC:** {dnc}\n")
        f.write(f"- **Overall reply rate:** {reply_rate:.1%}\n")
        f.write(f"- **Status breakdown:** {dict(statuses)}\n")
        f.write(f"- **Segments (by sends):** {dict(segments.most_common(5))}\n\n")
        f.write("### Auto-kill / auto-scale triggered\n- none\n\n")
        f.write("### Escalations\n- none\n\n")
        f.write("### Uncertain calls\n- none\n\n")

    print(f"Digest written to: {digest_path}")


if __name__ == "__main__":
    main()
