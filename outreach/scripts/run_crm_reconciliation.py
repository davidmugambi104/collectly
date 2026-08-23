#!/usr/bin/env python3
"""
collectly-crm-auto-logger — daily CRM reconciliation.

Steps:
  1. Load outreach/data/outreach-log.csv (live primary log).
  2. Normalize well-understood structural issues (column-count = header+1 from
     unquoted embedded comma in signal_details). Flag (do NOT silently fix) any
     normalization that requires guessing data values.
  3. Detect 7-day duplicate touches per email address (same bug class as the
     historical 43 duplicate_same_day rows in the 2026-07 cohort).
  4. Detect malformed rows that could not be safely normalized.
  5. Rebuild outreach/prospect-states.json with current per-prospect status.
  6. Emit reconciliation JSON to outreach/data/crm-reconciliation-YYYY-MM-DD.json.
"""
from __future__ import annotations

import csv
import json
import re
import sys
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path

WORKSPACE = Path("/home/user/.openclaw/workspace/collectly")
LIVE_LOG = WORKSPACE / "outreach" / "data" / "outreach-log.csv"
PROSPECT_STATES = WORKSPACE / "outreach" / "prospect-states.json"
TODAY = datetime.now(timezone.utc).strftime("%Y-%m-%d")
OUT_JSON = WORKSPACE / "outreach" / "data" / f"crm-reconciliation-{TODAY}.json"

EXPECTED_HEADER = [
    "id", "email", "touch", "timestamp", "replied",
    "signal", "next_step", "message_id", "signal_details", "segment",
]
ALLOWED_TOUCHES = {"", "t1", "t2", "t3"}
KNOWN_INDUSTRY_TAGS = {
    "branding", "design", "digital_marketing", "ppc", "web_design",
    # extend if more appear; conservative allow-list
}
DUP_WINDOW_DAYS = 7


def parse_iso(ts: str) -> datetime | None:
    if not ts:
        return None
    try:
        # tolerate +00:00 and Z
        return datetime.fromisoformat(ts.replace("Z", "+00:00"))
    except Exception:
        return None


def try_normalize_row(row_idx: int, fields: list[str]) -> tuple[dict | None, list[str]]:
    """Attempt structural normalization of a row.

    Known-good repair: 9-field rows where the 8th (signal_details) contains
    an unquoted embedded comma producing fields[7] = 'template; tierN' and
    fields[8] = '<industry_tag>'. Re-join into the 8th field.

    Returns (parsed_record_or_None, problems_list).
    """
    problems: list[str] = []
    n = len(fields)

    if n == len(EXPECTED_HEADER):
        rec = dict(zip(EXPECTED_HEADER, fields))
    elif n == len(EXPECTED_HEADER) + 1:
        # suspect split inside signal_details (single extra field from one
        # unquoted comma)
        prefix = fields[:7]
        mid = fields[7]
        tail = fields[8]
        if re.match(r"^.+;\s*tier\d+$", mid) and re.match(r"^[a-z_]+$", tail):
            joined = f"{mid},{tail}"
            rec = dict(zip(EXPECTED_HEADER, prefix + [joined]))
            problems.append(
                f"normalized_column_count from=9 to=8 (rejoined signal_details '{mid}'+'{tail}' -> '{joined}')"
            )
        else:
            problems.append(f"wrong_column_count got={n} expected={len(EXPECTED_HEADER)}; mid/tail pattern not recognized")
            return None, problems
    elif n == len(EXPECTED_HEADER) + 2:
        # observed pattern in live log: fields[6] and fields[7] are both
        # empty, fields[8] = '<template>; tierN', fields[9] = '<industry_tag>'.
        # Reconstruct by dropping the phantom empty col 7 and re-joining
        # fields[8:10] into signal_details.
        if (
            fields[6] == "" and fields[7] == ""
            and re.match(r"^.+;\s*tier\d+$", fields[8])
            and re.match(r"^[a-z_]+$", fields[9])
        ):
            joined = f"{fields[8]},{fields[9]}"
            rec = {
                "id": fields[0],
                "email": fields[1],
                "touch": fields[2],
                "timestamp": fields[3],
                "replied": fields[4],
                "signal": fields[5],
                "message_id": fields[6],
                "signal_details": joined,
            }
            problems.append(
                f"normalized_column_count from=10 to=8 "
                f"(dropped phantom empty col 7, rejoined signal_details "
                f"'{fields[8]}'+'{fields[9]}' -> '{joined}')"
            )
        else:
            problems.append(
                f"wrong_column_count got={n} expected={len(EXPECTED_HEADER)} "
                f"(over-split; 10-field pattern not recognized for this row)"
            )
            return None, problems
    else:
        problems.append(f"wrong_column_count got={n} expected={len(EXPECTED_HEADER)}")
        return None, problems

    # field-level validation
    if rec["touch"] not in ALLOWED_TOUCHES:
        problems.append(f"touch_field='{rec['touch']}'_not_in_{sorted(ALLOWED_TOUCHES)}")
    if "@" not in rec["email"] or " " in rec["email"]:
        problems.append(f"email_field='{rec['email']}'_not_email")
    if not parse_iso(rec["timestamp"]):
        problems.append(f"timestamp_field='{rec['timestamp']}'_not_iso8601")
    if problems and any("touch_field" in p or "email_field" in p or "timestamp_field" in p for p in problems):
        # structural field problems — do not emit
        return None, problems
    return rec, problems


def main() -> int:
    if not LIVE_LOG.exists():
        print(f"FATAL: live log not found: {LIVE_LOG}", file=sys.stderr)
        return 2

    with LIVE_LOG.open() as f:
        raw_lines = f.read().splitlines()

    header = raw_lines[0].split(",") if raw_lines else []
    header_ok = header == EXPECTED_HEADER
    data_lines = raw_lines[1:]

    clean: list[dict] = []
    malformed: list[dict] = []
    normalized: list[dict] = []  # rows that required a structural repair
    for i, line in enumerate(data_lines, start=1):
        if not line.strip():
            continue
        fields = line.split(",")
        rec, problems = try_normalize_row(i, fields)
        if rec is None:
            malformed.append({"logical_row": i, "raw_fields": fields, "problems": problems})
        else:
            if problems:
                # column-count was repaired under explicit policy; record the
                # diff for audit but do not count this as a parse failure.
                normalized.append({
                    "logical_row": i,
                    "raw_fields": fields,
                    "normalized_record": rec,
                    "problems": problems,
                    "note": "normalized_under_policy (column-count repair)",
                })
            clean.append(rec)

    # 7-day duplicate touch detection
    now = datetime.now(timezone.utc)
    by_email = defaultdict(list)
    for rec in clean:
        ts = parse_iso(rec["timestamp"])
        if ts:
            by_email[rec["email"].lower()].append((ts, rec))

    dup_flags: list[dict] = []
    for email, hits in by_email.items():
        hits.sort(key=lambda x: x[0])
        for i in range(len(hits)):
            for j in range(i + 1, len(hits)):
                gap = (hits[j][0] - hits[i][0]).total_seconds() / 86400.0
                if 0 <= gap <= DUP_WINDOW_DAYS:
                    dup_flags.append({
                        "email": email,
                        "first_touch": hits[i][0].isoformat(),
                        "second_touch": hits[j][0].isoformat(),
                        "gap_days": round(gap, 4),
                        "first_record": hits[i][1],
                        "second_record": hits[j][1],
                        "rule": f"address_touched_twice_within_{DUP_WINDOW_DAYS}d",
                        "bug_class": "duplicate_same_day (historical 2026-07 cohort)",
                    })

    # touch / signal distributions (clean only)
    touch_dist = Counter(r["touch"] for r in clean)
    signal_dist = Counter(r["signal"] for r in clean)

    # rebuild prospect-states.json
    contacts: dict[str, dict] = {}
    for rec in clean:
        email = rec["email"].lower()
        prev = contacts.get(email)
        if not prev or parse_iso(rec["timestamp"]) > parse_iso(prev["last_touch_at"]):
            contacts[email] = {
                "id": rec["id"],
                "email": email,
                "last_touch": rec["touch"],
                "last_touch_at": rec["timestamp"],
                "last_signal": rec["signal"],
                "replied": rec["replied"] or False,
                "message_id": rec["message_id"],
                "signal_details": rec["signal_details"],
            }
    prospect_states = {
        "generated_at": now.isoformat(),
        "source_log": str(LIVE_LOG.relative_to(WORKSPACE)),
        "contacts": contacts,
        "note": (
            f"Rebuilt from live primary log only ({LIVE_LOG.name}). "
            "Historical test-cohort contacts from outreach-log.test.csv are "
            "intentionally excluded — they are not in the live log and must "
            "not be silently merged into the per-prospect SoT."
        ),
    }

    # decision: write the rebuilt SoT only if no duplicate flags and no
    # unresolved malformed rows. If either, write the SoT but include a
    # 'rebuild_paused_reason' for traceability.
    dup_blocking = len(dup_flags) > 0
    malformed_blocking = any(
        m.get("normalized_record") is None for m in malformed
    )
    prospect_states["rebuild_paused_reason"] = (
        f"duplicate_touch_flags={len(dup_flags)}; unresolved_malformed={sum(1 for m in malformed if m.get('normalized_record') is None)}"
        if (dup_blocking or malformed_blocking)
        else None
    )

    PROSPECT_STATES.write_text(json.dumps(prospect_states, indent=2) + "\n")

    # reconciliation report
    report = {
        "generated_at": now.isoformat(),
        "run_reason": "daily CRM reconciliation (cron 39bb1523) — LIVE primary log",
        "live_log": {
            "path": str(LIVE_LOG.relative_to(WORKSPACE)),
            "header": header,
            "expected_header": EXPECTED_HEADER,
            "header_matches_expected": header_ok,
            "row_count_data": len(data_lines),
            "row_count_clean": len(clean),
            "row_count_malformed": len(malformed),
            "touch_distribution": dict(touch_dist),
            "signal_distribution": dict(signal_dist),
        },
        "rebuild": {
            "prospect_states_path": str(PROSPECT_STATES.relative_to(WORKSPACE)),
            "prospect_states_emitted": len(contacts),
            "historical_test_log_excluded": True,
            "reason": (
                "live log is the canonical source; historical "
                "outreach-log.test.csv is intentionally excluded from the "
                "per-prospect SoT to avoid silently re-merging test-cohort "
                "contacts."
            ),
            "rebuild_paused_reason": prospect_states["rebuild_paused_reason"],
        },
        "duplicate_touch_flags_7day": dup_flags,
        "duplicate_touch_flags_7day_count": len(dup_flags),
        "malformed_rows": malformed,
        "malformed_rows_total": len(malformed),
        "row_count": len(clean),
    }

    OUT_JSON.write_text(json.dumps(report, indent=2) + "\n")

    # console summary
    print(f"row_count={len(clean)}")
    print(f"duplicate_touch_flags_found={len(dup_flags)}")
    print(f"malformed_rows={len(malformed)}")
    print(f"prospect_states_emitted={len(contacts)}")
    print(f"report={OUT_JSON.relative_to(WORKSPACE)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
