#!/usr/bin/env python3
"""Pull opt-outs from the production email_suppressions table into suppression.csv.

Why this exists: /api/unsubscribe writes to Postgres, and the send scripts read
outreach/data/suppression.csv. Nothing connected the two, so clicking the
unsubscribe link in an outreach email did not stop outreach email. Run this
before any send.

Needs DATABASE_URL (it is not in .env.local by default -- pull it from Vercel
first, or export it for the command). Exits non-zero if it cannot reach the DB,
so a send gated on this fails closed rather than sending to people who opted out.
"""
import csv
import os
import sys
from datetime import datetime, timezone

WS = os.path.expanduser("~/.openclaw/workspace/collectly")
SUPPRESSION_PATH = f"{WS}/outreach/data/suppression.csv"
ENV_PATH = f"{WS}/.env.local"


def database_url() -> str:
    url = os.environ.get("DATABASE_URL", "").strip()
    if url:
        return url
    if os.path.exists(ENV_PATH):
        for line in open(ENV_PATH):
            if line.startswith("DATABASE_URL="):
                return line.split("=", 1)[1].strip().strip('"').strip("'")
    return ""


def main() -> int:
    url = database_url()
    if not url:
        print("FAIL: DATABASE_URL not set and not in .env.local.", file=sys.stderr)
        print("      Pull it from Vercel, or export it for this command.", file=sys.stderr)
        print("      Refusing to report success -- a send gated on this must not proceed.", file=sys.stderr)
        return 2
    try:
        import psycopg2  # noqa
    except ImportError:
        print("FAIL: psycopg2 not installed (pip install psycopg2-binary).", file=sys.stderr)
        return 2

    import psycopg2
    try:
        conn = psycopg2.connect(url)
    except Exception as e:  # noqa: BLE001
        print(f"FAIL: cannot connect to the database: {e}", file=sys.stderr)
        return 2

    with conn, conn.cursor() as cur:
        cur.execute("SELECT email, reason, source, created_at FROM email_suppressions")
        db_rows = cur.fetchall()

    existing = []
    if os.path.exists(SUPPRESSION_PATH):
        with open(SUPPRESSION_PATH, newline="") as f:
            existing = list(csv.DictReader(f))
    have = {(r.get("email") or "").strip().lower() for r in existing}
    cols = list(existing[0].keys()) if existing else ["email", "reason", "source_row_id", "added_at", "note"]

    added = 0
    for email, reason, source, created_at in db_rows:
        e = (email or "").strip().lower()
        if not e or e in have:
            continue
        row = {c: "" for c in cols}
        row["email"] = e
        row["reason"] = reason or "unsubscribe"
        row["added_at"] = (created_at or datetime.now(timezone.utc)).isoformat()
        row["note"] = f"synced from email_suppressions (source={source or 'unknown'})"
        existing.append(row)
        have.add(e)
        added += 1

    if added:
        with open(SUPPRESSION_PATH, "w", newline="") as f:
            w = csv.DictWriter(f, fieldnames=cols)
            w.writeheader()
            w.writerows(existing)

    print(f"email_suppressions rows: {len(db_rows)} | new to suppression.csv: {added} | total: {len(existing)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
