"""
Daily reply-stats checker for Collectly outreach.

Outputs a short summary suitable for the daily digest.
"""
import csv
from collections import Counter
from pathlib import Path

LOG = Path("/home/davie/.openclaw/workspace/collectly/outreach/data/outreach-log.csv")


def main():
    with open(LOG, "r", newline="", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))

    total = len(rows)
    statuses = Counter(r["status"] for r in rows)
    sent = statuses.get("sent", 0) + statuses.get("delivered", 0) + statuses.get("opened", 0) + statuses.get("clicked", 0)
    replied = sum(1 for r in rows if r["status"].startswith("REPLIED") or r["status"].startswith("replied"))
    positive = sum(1 for r in rows if "positive" in r["status"])
    negative = sum(1 for r in rows if "not_interested" in r["status"] or "unsubscribe" in r["status"])
    dnc = sum(1 for r in rows if "DNC" in r["status"])

    print(f"Total log rows: {total}")
    print(f"Sent: {sent} | Replied: {replied} | Positive: {positive} | Negative: {negative} | DNC: {dnc}")
    print(f"Status breakdown: {dict(statuses)}")

    if sent > 0:
        print(f"Overall reply rate: {replied / sent:.1%}")


if __name__ == "__main__":
    main()
