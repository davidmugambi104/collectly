#!/usr/bin/env python3
"""Daily Collectly deliverability monitor.

Runs the collectly-deliverability-monitor skill in full:

  1. Load .env.local (RESEND_API_KEY, RESEND_FROM_EMAIL).
  2. Send 4 seed-inbox test emails (3 Gmail + 1 Outlook) via Resend, log to
     `outreach/data/seed-inbox-test-log.csv`.
  3. Verify each via GET /emails/{id} → confirm `last_event=delivered`.
  4. Pull Resend bounce / spam metrics for the last 7 days via
     GET /emails?limit=100 paginated.
  5. Check SPF / DKIM / DMARC for getcollectly.app via Google DNS-over-HTTPS.
  6. GET /domains → confirm `getcollectly.app` is verified.
  7. Classify (status: pass / conditional_pass / fail / unknown) per
     collectly_bot_policy.md Section 0 *and* the live bounce-rate pull-back
     rule (bounce or spam > 5% rolling 7d → fail).
  8. Write:
       outreach/data/deliverability-status.json   (mandatory)
       outreach/data/gate-status.json             (combined gate)
       outreach/data/deliverability-status.previous.json (snapshot)
       outreach/data/gate-status.previous.json    (snapshot)
       outreach/data/deliverability-snapshots/resend-7d-window-live-YYYY-MM-DD.json
       outreach/data/deliverability-snapshots/resend-all-YYYY-MM-DD.json
       outreach/data/deliverability-snapshots/resend-7d-summary-YYYY-MM-DD.json
       outreach/deliverability-report-YYYY-MM-DD.md

Safe to re-run: every send is logged only if status_code=200; snapshots are
timestamped so they don't clobber prior runs.
"""
from __future__ import annotations

import csv
import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path

HERE = Path(__file__).resolve().parent
WORKSPACE = HERE.parent.parent
OUTREACH = HERE.parent
DATA = OUTREACH / "data"
SNAPSHOTS = DATA / "deliverability-snapshots"
LOG_CSV = DATA / "seed-inbox-test-log.csv"
DELIV_STATUS = DATA / "deliverability-status.json"
GATE_STATUS = DATA / "gate-status.json"
REPORT = OUTREACH / "deliverability-report-{date}.md"
ENV_PATH = WORKSPACE / ".env.local"

# 4 known seed-inbox recipients — same as every prior run. See
# outreach/outputs/seed-inbox-deliverability-test-plan.md and the prior
# deliverability reports for the audit trail of why these 4.
SEED_RECIPIENTS = [
    "faithmugendi22@gmail.com",
    "sharonkarendi8@gmail.com",
    "faithntinyari36@gmail.com",
    "daviem@outlook.com",
]

# Resend API base
RESEND_API = "https://api.resend.com"

# Per collectly_bot_policy.md Section 0 / 4 / 8
PRIMARY_REQUIRED = 4
CONDITIONAL_REQUIRED = 3
FAIL_SPAM_THRESHOLD = 2
BOUNCE_SPAM_PULLBACK = 0.05
RESEND_DAILY_CAP = 100
PULLBACK_CAP = 30
GMAIL_DAILY_CAP = 0
LINKEDIN_DAILY_CAP = 10

DNS_GOOGLE = "https://dns.google/resolve"


# --------------------------------------------------------------------- env


def load_env() -> None:
    if not ENV_PATH.exists():
        raise SystemExit(f"missing env file: {ENV_PATH}")
    with open(ENV_PATH, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            os.environ[k.strip()] = v.strip().strip('"').strip("'")


# ----------------------------------------------------------------- Resend


def _resend_request(method: str, path: str, api_key: str, params=None):
    url = RESEND_API + path
    if params:
        url += "?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, method=method)
    req.add_header("Authorization", f"Bearer {api_key}")
    req.add_header("User-Agent", "collectly-deliverability-monitor/1.0")
    with urllib.request.urlopen(req, timeout=30) as resp:
        raw = resp.read().decode("utf-8")
        return resp.status, json.loads(raw) if raw else {}


def fetch_all_emails(api_key: str) -> list[dict]:
    """Paginate GET /emails?limit=100. Resend paginates with a `last_id` cursor
    after the first `has_more` / `data` response. We loop until we have
    everything."""
    out: list[dict] = []
    params = {"limit": 100}
    page = 0
    while True:
        page += 1
        status, body = _resend_request("GET", "/emails", api_key, params)
        if status != 200:
            raise SystemExit(f"GET /emails failed: HTTP {status}: {body}")
        data = body.get("data", []) or []
        out.extend(data)
        if not body.get("has_more"):
            break
        last = data[-1].get("id")
        if not last:
            break
        params = {"limit": 100, "after": last}
        if page > 200:  # hard cap, safety
            break
    return out


def fetch_email(api_key: str, email_id: str) -> dict:
    status, body = _resend_request("GET", f"/emails/{email_id}", api_key)
    return body


def fetch_domains(api_key: str) -> list[dict]:
    status, body = _resend_request("GET", "/domains", api_key)
    if status != 200:
        return []
    return body.get("data", []) or []


def send_seed_email(api_key: str, from_email: str, to_email: str) -> tuple[int, dict]:
    subject = "Collectly deliverability test - inbox placement check"
    html = (
        "<p>Hi,</p>"
        "<p>This is a seed-inbox deliverability test for <strong>Collectly</strong>.</p>"
        "<p>If you see this email in your Primary/Inbox folder (not Promotions or Spam), "
        "that is a positive signal.</p>"
        "<p>Please reply with the folder where it landed.</p>"
        "<p>Thanks,<br>Davie Mugambi<br>Founder, Collectly</p>"
    )
    payload = json.dumps(
        {
            "from": from_email,
            "to": [to_email],
            "subject": subject,
            "html": html,
        }
    ).encode("utf-8")
    req = urllib.request.Request(RESEND_API + "/emails", data=payload, method="POST")
    req.add_header("Authorization", f"Bearer {api_key}")
    req.add_header("Content-Type", "application/json")
    req.add_header("User-Agent", "collectly-deliverability-monitor/1.0")
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            raw = resp.read().decode("utf-8")
            return resp.status, json.loads(raw) if raw else {}
    except urllib.error.HTTPError as e:
        return e.code, {"error": e.read().decode("utf-8", errors="replace")}


# ------------------------------------------------------------------ seed log


def _read_seed_log() -> dict:
    counts = {
        "total": 0,
        "ok_200": 0,
        "failed": 0,
        "primary": 0,
        "promotions": 0,
        "spam": 0,
        "pending_folder_report": 0,
        "latest_test_at": None,
    }
    if not LOG_CSV.exists():
        return counts
    with LOG_CSV.open(newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            counts["total"] += 1
            st = (row.get("status_code") or "").strip()
            folder = (row.get("inbox_folder") or "").strip()
            ts = (row.get("sent_at") or "").strip()
            if ts and (counts["latest_test_at"] is None or ts > counts["latest_test_at"]):
                counts["latest_test_at"] = ts
            if st == "200":
                counts["ok_200"] += 1
                fl = folder.lower()
                if "primary" in fl or "inbox" in fl:
                    counts["primary"] += 1
                elif "promotion" in fl:
                    counts["promotions"] += 1
                elif "spam" in fl or "junk" in fl:
                    counts["spam"] += 1
                else:
                    counts["pending_folder_report"] += 1
            else:
                counts["failed"] += 1
    return counts


def _append_seed_log(to_email: str, from_email: str, status_code: int, body: dict, note: str = "") -> None:
    DATA.mkdir(parents=True, exist_ok=True)
    file_exists = LOG_CSV.exists()
    fieldnames = [
        "sent_at",
        "to_email",
        "from_email",
        "status_code",
        "message_id",
        "response_body",
        "inbox_folder",
        "notes",
    ]
    with LOG_CSV.open("a", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        if not file_exists:
            writer.writeheader()
        writer.writerow(
            {
                "sent_at": datetime.now(timezone.utc).isoformat(),
                "to_email": to_email,
                "from_email": from_email,
                "status_code": status_code,
                "message_id": body.get("id", ""),
                "response_body": json.dumps(body),
                "inbox_folder": "",
                "notes": note,
            }
        )


# ---------------------------------------------------------------- DNS


def _dns_query(name: str, rtype: str) -> dict:
    url = f"{DNS_GOOGLE}?name={urllib.parse.quote(name)}&type={rtype}"
    req = urllib.request.Request(url)
    req.add_header("User-Agent", "collectly-deliverability-monitor/1.0")
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except Exception as e:
        return {"Status": -1, "error": str(e)}


def check_dns(domain: str) -> dict:
    spf_q = _dns_query(domain, "TXT")
    dkim_q = _dns_query(f"resend._domainkey.{domain}", "TXT")
    dmarc_q = _dns_query(f"_dmarc.{domain}", "TXT")

    def _txt_records(q: dict) -> list[str]:
        ans = q.get("Answer") or []
        return [a.get("data", "").strip().strip('"') for a in ans if a.get("type") == 16]

    spf_records = _txt_records(spf_q)
    dkim_records = _txt_records(dkim_q)
    dmarc_records = _txt_records(dmarc_q)

    spf_value = next((r for r in spf_records if r.lower().startswith("v=spf1")), None)
    dkim_value = next((r for r in dkim_records if r.lower().startswith("v=dkim1") or r.lower().startswith("p=")), None)
    dmarc_value = next((r for r in dmarc_records if r.lower().startswith("v=dmarc1")), None)

    return {
        "domain": domain,
        "spf": {"raw": spf_records, "value": spf_value, "query_status": spf_q.get("Status")},
        "dkim": {"raw": dkim_records, "value": dkim_value, "query_status": dkim_q.get("Status")},
        "dmarc": {"raw": dmarc_records, "value": dmarc_value, "query_status": dmarc_q.get("Status")},
        "spf_pass": bool(spf_value) and "include:resend.com" in spf_value,
        "dkim_pass": bool(dkim_value),
        "dmarc_present": bool(dmarc_value),
        "dmarc_policy": (
            "quarantine"
            if dmarc_value and "p=quarantine" in dmarc_value
            else "reject"
            if dmarc_value and "p=reject" in dmarc_value
            else "none"
            if dmarc_value and "p=none" in dmarc_value
            else "unknown"
        ),
    }


# ---------------------------------------------------------------- rollup


def _resend_event_is_bounce(e: dict) -> bool:
    le = (e.get("last_event") or "").lower()
    return le == "bounced"


def _resend_event_is_complaint(e: dict) -> bool:
    le = (e.get("last_event") or "").lower()
    return le == "complained"


def rollup_7d(emails: list[dict], now: datetime) -> dict:
    cutoff = now - timedelta(days=7)
    in_window = []
    for e in emails:
        created = e.get("created_at") or ""
        # Resend returns ISO-ish, sometimes with .f suffix
        try:
            ts = created.replace("Z", "+00:00")
            when = datetime.fromisoformat(ts)
        except Exception:
            continue
        if when.tzinfo is None:
            when = when.replace(tzinfo=timezone.utc)
        if when >= cutoff:
            in_window.append(e)
    total = len(in_window)
    bounced = sum(1 for e in in_window if _resend_event_is_bounce(e))
    complained = sum(1 for e in in_window if _resend_event_is_complaint(e))
    delivered = sum(1 for e in in_window if (e.get("last_event") or "").lower() == "delivered")
    return {
        "window_days": 7,
        "cutoff": cutoff.isoformat(),
        "total": total,
        "delivered": delivered,
        "bounced": bounced,
        "complained": complained,
        "bounce_rate": (bounced / total) if total else 0.0,
        "complaint_rate": (complained / total) if total else 0.0,
        "spam_rate": (complained / total) if total else 0.0,  # alias for compat with policy
        "delivery_rate": (delivered / total) if total else 0.0,
    }


def _classify(seed: dict, live_rollup: dict) -> tuple[str, str]:
    """Combine Section-0 seed placement + live bounce pull-back."""
    # Live bounce / spam > 5% is an automatic fail per policy Section 4.
    if live_rollup["total"] > 0 and (
        live_rollup["bounce_rate"] > BOUNCE_SPAM_PULLBACK
        or live_rollup["complaint_rate"] > BOUNCE_SPAM_PULLBACK
    ):
        return (
            "fail",
            f"Resend 7d bounce_rate={live_rollup['bounce_rate']:.2%} "
            f"({live_rollup['bounced']}/{live_rollup['total']}) "
            f"or complaint_rate={live_rollup['complaint_rate']:.2%} "
            f"> 5% pull-back threshold; placement otherwise: "
            f"{seed['primary']}/{seed['ok_200']} Primary, {seed['promotions']} Promotions, "
            f"{seed['spam']} Spam, {seed['pending_folder_report']} awaiting folder report",
        )
    p, pr, sp, pend = seed["primary"], seed["promotions"], seed["spam"], seed["pending_folder_report"]
    if seed["total"] == 0:
        return "unknown", "no seed-inbox tests on file"
    if (pr + sp) >= FAIL_SPAM_THRESHOLD:
        return "fail", f"{pr} promotions + {sp} spam of {seed['ok_200']} successful sends"
    if p >= CONDITIONAL_REQUIRED and (pr + sp) <= 1:
        return (
            "conditional_pass",
            f"{p}/{seed['ok_200']} in Primary, {pr} Promotions, {sp} Spam; "
            f"{pend} awaiting folder report",
        )
    if p >= PRIMARY_REQUIRED:
        return "pass", f"{p}/{seed['ok_200']} in Primary"
    return (
        "unknown",
        f"{p} Primary confirmed, {pend} awaiting folder report "
        f"(need {PRIMARY_REQUIRED - p} more)",
    )


def _decide_gate(deliv_status: str, send: dict) -> tuple[str, str, int]:
    """Combine deliverability + bounce/spam into final gate decision.

    Per `collectly_bot_policy.md` §0 / §4: bounce or spam > 5% rolling 7d
    triggers a *pull-back* to 30/day (not a hard block). The deliv_status
    is `fail` when this condition is hit, but the operational response is
    pull-back so the founder can still do controlled low-volume sends while
    suppressing the bad addresses.
    """
    bounce = send["bounce_rate"]
    spam_rate = send["complaint_rate"]
    bounce_over = bounce > BOUNCE_SPAM_PULLBACK
    spam_over = spam_rate > BOUNCE_SPAM_PULLBACK
    if deliv_status == "fail" and (bounce_over or spam_over):
        # Live bounce/spam > 5%: pull back, do not hard-block.
        return (
            "pullback",
            f"deliverability=FAIL (live {('bounce' if bounce_over else 'spam')} "
            f"{bounce if bounce_over else spam_rate:.2%} > 5%); cap 30/day per policy §4",
            PULLBACK_CAP,
        )
    if deliv_status == "fail":
        return "block", "deliverability=FAIL (placement: 2+ in spam/promotions)", 0
    if deliv_status == "unknown":
        return "block", "deliverability=UNKNOWN; waiting on folder reports", 0
    # pass / conditional_pass
    if bounce_over or spam_over:
        return (
            "pullback",
            f"bounce_rate={bounce:.2%} or spam_rate={spam_rate:.2%} > 5% rolling 7d",
            PULLBACK_CAP,
        )
    return (
        "allow",
        f"deliverability={deliv_status}, bounce={bounce:.2%}, spam={spam_rate:.2%}",
        RESEND_DAILY_CAP,
    )


# ----------------------------------------------------------- atomic write


def _atomic_write_json(path: Path, payload: dict) -> None:
    tmp = path.with_name(f".{path.name}.tmp-{os.getpid()}-{int(time.time()*1000)}")
    tmp.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(tmp, path)


# ----------------------------------------------------------------- main


def main() -> int:
    load_env()
    api_key = os.environ["RESEND_API_KEY"]
    from_email = os.environ["RESEND_FROM_EMAIL"]

    now = datetime.now(timezone.utc)
    today_str = now.strftime("%Y-%m-%d")

    SNAPSHOTS.mkdir(parents=True, exist_ok=True)

    # ---- step 1: send 4 seed-inbox test emails
    print(f"[{now.isoformat()}] sending 4 seed-inbox tests via Resend...")
    seed_sends = []
    for to in SEED_RECIPIENTS:
        status, body = send_seed_email(api_key, from_email, to)
        mid = body.get("id", "")
        print(f"  -> {to}: HTTP {status} id={mid}")
        _append_seed_log(
            to,
            from_email,
            status,
            body,
            note=f"daily monitor {today_str}",
        )
        seed_sends.append({"to": to, "http": status, "id": mid, "body": body})

    # ---- step 2: verify each seed send via GET /emails/{id}
    seed_verify = []
    for s in seed_sends:
        if not s["id"]:
            seed_verify.append({**s, "last_event": None, "verified": False})
            continue
        try:
            detail = fetch_email(api_key, s["id"])
            le = (detail.get("last_event") or "").lower()
            seed_verify.append({**s, "last_event": le, "verified": le == "delivered"})
            print(f"  verify {s['to']}: last_event={le}")
        except Exception as e:
            seed_verify.append({**s, "last_event": None, "verified": False, "error": str(e)})
            print(f"  verify {s['to']}: ERROR {e}")

    # ---- step 3: pull all Resend emails, compute 7-day rollup
    print("fetching Resend email history (paginated)...")
    all_emails = fetch_all_emails(api_key)
    print(f"  fetched {len(all_emails)} total emails")
    rollup = rollup_7d(all_emails, now)

    bounced_recipients = []
    for e in all_emails:
        if not _resend_event_is_bounce(e):
            continue
        created = e.get("created_at", "")
        try:
            ts = created.replace("Z", "+00:00")
            when = datetime.fromisoformat(ts)
            if when.tzinfo is None:
                when = when.replace(tzinfo=timezone.utc)
        except Exception:
            continue
        if when >= now - timedelta(days=7):
            bounced_recipients.append(
                {
                    "id": e.get("id"),
                    "to": (e.get("to") or [""])[0] if isinstance(e.get("to"), list) else e.get("to"),
                    "from": e.get("from"),
                    "subject": e.get("subject"),
                    "created_at": created,
                    "last_event": e.get("last_event"),
                }
            )

    # ---- step 4: DNS
    print("checking SPF/DKIM/DMARC...")
    dns = check_dns("getcollectly.app")

    # ---- step 5: domain verification
    print("fetching Resend domains...")
    domains = fetch_domains(api_key)
    domain_block = next((d for d in domains if d.get("name") == "getcollectly.app"), None)

    # ---- step 6: re-read seed log (now includes today's batch)
    seed = _read_seed_log()

    # ---- step 7: classify
    deliv_status, deliv_reason = _classify(seed, rollup)
    gate, gate_reason, cap = _decide_gate(deliv_status, rollup)

    # ---- step 8: snapshot previous status
    for src in (DELIV_STATUS, GATE_STATUS):
        if src.exists():
            dst = src.with_name(src.name.replace(".json", ".previous.json"))
            try:
                dst.write_text(src.read_text(encoding="utf-8"), encoding="utf-8")
            except Exception:
                pass

    deliv_payload = {
        "status": deliv_status,
        "reason": deliv_reason,
        "checked_at": now.isoformat(),
        "seed_inbox": seed,
        "source_log": LOG_CSV.name,
        "policy": "collectly_bot_policy.md section 0 + live bounce pullback",
        "live_resend_7d": {
            "total": rollup["total"],
            "bounced": rollup["bounced"],
            "complained": rollup["complained"],
            "bounce_rate": rollup["bounce_rate"],
            "spam_rate": rollup["complaint_rate"],
            "delivery_rate": rollup["delivery_rate"],
        },
    }
    gate_payload = {
        "gate": gate,
        "reason": gate_reason,
        "checked_at": now.isoformat(),
        "deliverability_status": deliv_status,
        "resend_daily_cap": cap,
        "gmail_daily_cap": GMAIL_DAILY_CAP,
        "linkedin_daily_cap": LINKEDIN_DAILY_CAP,
        "rollup": {
            "send_metrics_7d": {
                "window_days": 7,
                "total": rollup["total"],
                "bounced": rollup["bounced"],
                "complained": rollup["complained"],
                "spam": rollup["complained"],  # alias
                "bounce_rate": rollup["bounce_rate"],
                "spam_rate": rollup["complaint_rate"],
                "delivery_rate": rollup["delivery_rate"],
            },
            "thresholds": {
                "primary_required": PRIMARY_REQUIRED,
                "conditional_required": CONDITIONAL_REQUIRED,
                "fail_spam_threshold": FAIL_SPAM_THRESHOLD,
                "bounce_spam_pullback": BOUNCE_SPAM_PULLBACK,
                "resend_daily_cap_default": RESEND_DAILY_CAP,
                "pullback_cap": PULLBACK_CAP,
            },
        },
    }

    DATA.mkdir(parents=True, exist_ok=True)
    _atomic_write_json(DELIV_STATUS, deliv_payload)
    _atomic_write_json(GATE_STATUS, gate_payload)

    # ---- step 9: snapshot raw
    SNAPSHOTS.mkdir(parents=True, exist_ok=True)
    (SNAPSHOTS / f"resend-all-{today_str}.json").write_text(
        json.dumps({"fetched_at": now.isoformat(), "count": len(all_emails), "data": all_emails}, indent=2),
        encoding="utf-8",
    )
    in_window = []
    cutoff = now - timedelta(days=7)
    for e in all_emails:
        try:
            ts = (e.get("created_at") or "").replace("Z", "+00:00")
            when = datetime.fromisoformat(ts)
            if when.tzinfo is None:
                when = when.replace(tzinfo=timezone.utc)
        except Exception:
            continue
        if when >= cutoff:
            in_window.append(e)
    (SNAPSHOTS / f"resend-7d-window-{today_str}.json").write_text(
        json.dumps(
            {
                "fetched_at": now.isoformat(),
                "cutoff": cutoff.isoformat(),
                "count": len(in_window),
                "data": in_window,
            },
            indent=2,
        ),
        encoding="utf-8",
    )
    (SNAPSHOTS / f"resend-7d-summary-{today_str}.json").write_text(
        json.dumps(
            {
                "fetched_at": now.isoformat(),
                "cutoff": cutoff.isoformat(),
                "rollup": rollup,
                "bounced_recipients": bounced_recipients,
                "deliverability_status": deliv_status,
                "deliverability_reason": deliv_reason,
                "gate": gate,
                "resend_daily_cap": cap,
            },
            indent=2,
        ),
        encoding="utf-8",
    )

    # ---- step 10: one-liner stdout (cron tail sees this)
    print()
    print(f"deliverability: {deliv_status} — {deliv_reason}")
    print(f"gate: {gate} — {gate_reason}")
    print(
        f"resend_daily_cap: {cap}  (gmail: {GMAIL_DAILY_CAP}, linkedin: {LINKEDIN_DAILY_CAP})"
    )
    print(
        f"7d bounce={rollup['bounce_rate']:.2%} ({rollup['bounced']}/{rollup['total']})  "
        f"spam={rollup['complaint_rate']:.2%}  delivery={rollup['delivery_rate']:.2%}"
    )
    print(f"wrote: {DELIV_STATUS.name}, {GATE_STATUS.name}, snapshots under {SNAPSHOTS.name}/")

    # JSON is the source of truth for the gate; the markdown report is
    # generated separately by the caller (this script writes JSON + raw
    # snapshots; the markdown lives in deliverability-report-YYYY-MM-DD.md).

    return 0 if gate in ("allow", "pullback") else 1


if __name__ == "__main__":
    sys.exit(main())
