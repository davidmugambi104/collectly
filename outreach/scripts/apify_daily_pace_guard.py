#!/usr/bin/env python3
"""Daily PACE cap on Apify-sourced leads for the enrichment cron job.

IMPORTANT -- this has nothing to do with dollars. It counts today's
Apify-sourced rows already in prospects.csv (source column tagged
apify_<actor>_YYYY-MM-DD) against a fixed daily lead-volume throttle,
purely to pace sourcing/review workload. It predates the Apify account
being on a paid plan and was never rewired afterward, which made every
report that quoted it read like Apify itself was still capped -- it
isn't. Renamed 2026-08-24 from apify_budget_guard.py specifically to
stop that confusion (see git history for the old name/docstring).

For the REAL dollar picture, this script also does a best-effort live
lookup against the Apify API (account plan + actual usage this billing
cycle) when APIFY_TOKEN is available. That lookup is informational only
and never affects the ALLOWED/BLOCKED decision -- the pace cap is a
volume throttle, and no plan/dollar API failure should block sourcing.

Usage:
    python3 apify_daily_pace_guard.py --check   # prints ALLOWED or BLOCKED
    python3 apify_daily_pace_guard.py            # prints JSON with max_leads_today + real usage
"""
import argparse
import csv
import json
import os
import sys
import urllib.error
import urllib.request
from zoneinfo import ZoneInfo
from datetime import datetime

HERE = os.path.dirname(os.path.abspath(__file__))
PROSPECTS_CSV = os.path.join(HERE, "..", "data", "prospects.csv")
TZ = ZoneInfo("Africa/Nairobi")  # matches the cron job's schedule tz
MAX_LEADS_PER_DAY = int(os.environ.get("APIFY_MAX_LEADS_PER_DAY", "30"))
APIFY_TOKEN_PATH = os.path.expanduser("~/.openclaw/secrets/apify/APIFY_TOKEN")


def leads_added_today() -> int:
    today = datetime.now(TZ).strftime("%Y-%m-%d")
    count = 0
    if not os.path.exists(PROSPECTS_CSV):
        return 0
    with open(PROSPECTS_CSV, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            source = (row.get("source") or "")
            if source.startswith("apify_") and source.endswith(today):
                count += 1
    return count


def real_dollar_usage() -> dict | None:
    """Best-effort live Apify billing lookup. Returns None on any failure
    (missing token, network error, unexpected response) -- never raises,
    never blocks the caller."""
    try:
        token = open(APIFY_TOKEN_PATH).read().strip()
    except OSError:
        return None
    if not token:
        return None

    def _get(path):
        req = urllib.request.Request(
            f"https://api.apify.com/v2{path}",
            headers={"Authorization": f"Bearer {token}"},
        )
        with urllib.request.urlopen(req, timeout=15) as resp:
            return json.loads(resp.read())

    try:
        me = _get("/users/me")["data"]
        usage = _get("/users/me/usage/monthly")["data"]
        plan = me.get("plan", {})
        total_usd = sum(
            v.get("amountAfterVolumeDiscountUsd", 0)
            for v in usage.get("monthlyServiceUsage", {}).values()
        )
        return {
            "plan": plan.get("id"),
            "monthly_credit_usd": plan.get("maxMonthlyUsageUsd"),
            "used_this_cycle_usd": round(total_usd, 4),
            "cycle_ends": usage.get("usageCycle", {}).get("endAt"),
        }
    except (urllib.error.URLError, KeyError, ValueError, TimeoutError):
        return None


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()

    added = leads_added_today()
    remaining = max(0, MAX_LEADS_PER_DAY - added)
    blocked = remaining <= 0

    if args.check:
        print("BLOCKED" if blocked else "ALLOWED")
        if blocked:
            print(f"reason: {added}/{MAX_LEADS_PER_DAY} daily lead-sourcing PACE cap already reached "
                  f"(this is a volume throttle, not a dollar limit)", file=sys.stderr)
        sys.exit(1 if blocked else 0)

    payload = {
        "status": "BLOCKED" if blocked else "ALLOWED",
        "leads_added_today": added,
        "pace_cap": MAX_LEADS_PER_DAY,
        "max_leads_today": remaining,
        "note": "pace_cap is a daily lead-volume throttle, unrelated to Apify dollar spend",
    }
    real_usage = real_dollar_usage()
    if real_usage is not None:
        payload["real_apify_billing"] = real_usage
    print(json.dumps(payload, indent=2))
    sys.exit(1 if blocked else 0)


if __name__ == "__main__":
    main()
