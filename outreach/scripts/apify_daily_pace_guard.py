#!/usr/bin/env python3
"""Daily PACE cap on Apify-sourced leads for the enrichment cron job,
PLUS a real dollar-spend circuit breaker.

The pace cap counts today's Apify-sourced rows already in prospects.csv
(source column tagged apify_<actor>_YYYY-MM-DD) against a fixed daily
lead-volume throttle, purely to pace sourcing/review workload. It
predates the Apify account being on a paid plan, which made early
reports that quoted it read like Apify itself was still capped -- it
isn't. Renamed 2026-08-24 from apify_budget_guard.py to stop that
confusion (see git history for the old name/docstring).

Until 2026-08-24 the live Apify billing lookup below was informational
only. That day, the same cron run that crashed on an unrelated bug
also called `compass/crawler-google-places` -- an actor that isn't in
the documented source list (logiover/b2b-lead-scraper primary,
poidata/google-maps-email-extractor backup), doesn't even extract
emails, and costs 30-100x more per run. 3 calls to it burned $3.52 of
the day's $3.77 total Apify spend for ~1200 raw place listings that
never became usable leads. Written instructions telling the agent
which actors to use didn't prevent that by themselves, so this script
now also enforces a real per-day dollar ceiling (MAX_DAILY_USD,
default $2.00 -- comfortably above the ~$0.05-0.30/day the documented
actors actually cost, but below what one more off-list actor call
would burn) by summing today's actual actor-run costs from the Apify
API. BLOCKED here means BLOCKED, same as the volume cap.

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
from datetime import datetime, timezone

HERE = os.path.dirname(os.path.abspath(__file__))
PROSPECTS_CSV = os.path.join(HERE, "..", "data", "prospects.csv")
TZ = ZoneInfo("Africa/Nairobi")  # matches the cron job's schedule tz
MAX_LEADS_PER_DAY = int(os.environ.get("APIFY_MAX_LEADS_PER_DAY", "60"))
MAX_DAILY_USD = float(os.environ.get("APIFY_MAX_DAILY_USD", "2.00"))
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


def today_dollar_spend() -> dict | None:
    """Sum actual Apify actor-run cost (usageTotalUsd) for runs started
    today (UTC, matching Apify's own run timestamps), broken down by
    actor. Returns None on any failure (missing token, network error) --
    the caller treats None as "can't verify, don't block on it" so an
    Apify API hiccup never becomes a false BLOCKED."""
    try:
        token = open(APIFY_TOKEN_PATH).read().strip()
    except OSError:
        return None
    if not token:
        return None

    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    req = urllib.request.Request(
        f"https://api.apify.com/v2/actor-runs?limit=100&desc=true",
        headers={"Authorization": f"Bearer {token}"},
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            items = json.loads(resp.read())["data"]["items"]
    except (urllib.error.URLError, KeyError, ValueError, TimeoutError):
        return None

    total = 0.0
    by_actor: dict[str, float] = {}
    for item in items:
        started = item.get("startedAt") or ""
        if not started.startswith(today):
            continue
        cost = item.get("usageTotalUsd") or 0
        total += cost
        act = item.get("actId") or "unknown"
        by_actor[act] = by_actor.get(act, 0) + cost
    return {"total_usd": round(total, 4), "by_actor_id": {k: round(v, 4) for k, v in by_actor.items()}}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()

    added = leads_added_today()
    remaining = max(0, MAX_LEADS_PER_DAY - added)
    volume_blocked = remaining <= 0

    spend_today = today_dollar_spend()
    dollar_blocked = spend_today is not None and spend_today["total_usd"] >= MAX_DAILY_USD
    blocked = volume_blocked or dollar_blocked

    if args.check:
        print("BLOCKED" if blocked else "ALLOWED")
        if volume_blocked:
            print(f"reason: {added}/{MAX_LEADS_PER_DAY} daily lead-sourcing PACE cap already reached "
                  f"(this is a volume throttle, not a dollar limit)", file=sys.stderr)
        if dollar_blocked:
            print(f"reason: today's real Apify spend (${spend_today['total_usd']}) has hit the "
                  f"${MAX_DAILY_USD} daily ceiling -- this IS a dollar limit, likely caused by an "
                  f"actor outside the documented source list. Check by_actor_id in the JSON output "
                  f"before running anything else today.", file=sys.stderr)
        sys.exit(1 if blocked else 0)

    payload = {
        "status": "BLOCKED" if blocked else "ALLOWED",
        "leads_added_today": added,
        "pace_cap": MAX_LEADS_PER_DAY,
        "max_leads_today": remaining,
        "note": "pace_cap is a daily lead-volume throttle, separate from the dollar ceiling below",
        "dollar_ceiling": {
            "max_daily_usd": MAX_DAILY_USD,
            "spend_today": spend_today,
            "blocked_on_dollars": dollar_blocked,
        },
    }
    real_usage = real_dollar_usage()
    if real_usage is not None:
        payload["real_apify_billing"] = real_usage
    print(json.dumps(payload, indent=2))
    sys.exit(1 if blocked else 0)


if __name__ == "__main__":
    main()
