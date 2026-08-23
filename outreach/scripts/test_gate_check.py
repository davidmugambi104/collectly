"""
Regression test for the 2026-08-09 02:21 UTC gate-bypass incident.

daily_send.py's _check_gate() used to return None when gate-status.json was
missing, and the caller treated None as "proceed" — that fail-open bug let
17 emails out while the deliverability gate was unresolved. This test proves
_check_gate() now fails CLOSED (returns 2) for every non-happy-path input,
using isolated temp files. It never touches the real gate-status.json.

Run: python3 test_gate_check.py
Exit code 0 = all scenarios pass, non-zero = regression.
"""
import json
import os
import sys
import tempfile
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import daily_send  # noqa: E402


PASS = "\033[32mPASS\033[0m"
FAIL = "\033[31mFAIL\033[0m"


def _valid_allow_payload(checked_at: datetime) -> dict:
    return {
        "gate": "allow",
        "reason": "deliverability=pass, bounce=0.0%, spam=0.0%",
        "checked_at": checked_at.isoformat(),
        "deliverability_status": "pass",
        "resend_daily_cap": 100,
    }


def run_case(name: str, setup, expect: int) -> bool:
    """setup(path) writes/removes the gate file at `path`; expect is the required _check_gate() return."""
    with tempfile.TemporaryDirectory() as tmp:
        gate_path = os.path.join(tmp, "gate-status.json")
        setup(gate_path)
        got = daily_send._check_gate(gate_path)
        ok = got == expect
        print(f"[{PASS if ok else FAIL}] {name}: expected {expect}, got {got}")
        return ok


def main() -> int:
    results = []

    # (a) gate file missing entirely — the exact incident scenario.
    results.append(run_case(
        "missing gate file",
        setup=lambda path: None,  # never create it
        expect=2,
    ))

    # (b) gate file empty (0 bytes) — e.g. caught right after truncation.
    results.append(run_case(
        "empty gate file",
        setup=lambda path: Path(path).write_text(""),
        expect=2,
    ))

    # (c) gate file corrupt / mid-write (partial JSON, as a non-atomic
    #     writer could leave it if a reader catches it mid-write() call).
    results.append(run_case(
        "corrupt/mid-write gate file",
        setup=lambda path: Path(path).write_text('{"gate": "allow", "resend_daily'),
        expect=2,
    ))

    # (d) gate file present, well-formed, explicit block state.
    results.append(run_case(
        "explicit block state",
        setup=lambda path: Path(path).write_text(json.dumps({
            "gate": "block", "reason": "deliverability=FAIL", "checked_at": datetime.now(timezone.utc).isoformat(),
            "resend_daily_cap": 0,
        })),
        expect=2,
    ))

    # (e) gate file present, allow, but stale (older than GATE_MAX_AGE_HOURS).
    stale_time = datetime.now(timezone.utc) - timedelta(hours=daily_send.GATE_MAX_AGE_HOURS + 1)
    results.append(run_case(
        "stale allow (past max age)",
        setup=lambda path: Path(path).write_text(json.dumps(_valid_allow_payload(stale_time))),
        expect=2,
    ))

    # (f) sanity check: a genuinely fresh, valid allow file should NOT block.
    fresh_time = datetime.now(timezone.utc)
    results.append(run_case(
        "fresh valid allow (sanity check, should pass)",
        setup=lambda path: Path(path).write_text(json.dumps(_valid_allow_payload(fresh_time))),
        expect=0,
    ))

    passed = sum(results)
    total = len(results)
    print(f"\n{passed}/{total} scenarios correct.")
    if passed != total:
        print("REGRESSION: _check_gate() is not failing closed in all cases.")
        return 1
    print("All fail-closed scenarios confirmed. No sends were performed by this test.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
