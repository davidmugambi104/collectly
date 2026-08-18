#!/usr/bin/env python3
"""Daily send pipeline: pick next tier → load v3 message → render → send via Resend → log.

Usage:
    python3 daily_send.py --tier 1 --limit 5
    python3 daily_send.py --tier 2 --limit 20
    python3 daily_send.py --tier 3 --limit 100

Tier semantics (matches TIER-1-SHORTLIST.md):
    1 = handpicked, slow drip (5/day, 9am EAT)
    2 = segmented, medium drip (20/day)
    3 = bulk, ramp with domain warmup (max 100/day on Pro, 100/day on Free)

Free tier constraint: Resend free caps at 100 emails/day. The --limit
flag respects this — set --limit 100 max on free, 500 on Pro.

Required secrets:
    RESEND_API_KEY  (in /home/davie/.openclaw/secrets/collectly/)
    FROM_EMAIL is read from .env.local as RESEND_FROM_EMAIL
"""
import argparse
import csv
import json
import os
import sys
import time
from datetime import datetime, timezone
from typing import Any, Dict, List

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))
from clients import request, load_secret
from outreach_state import can_send as state_can_send, record_send as state_record_send

PROSPECTS_CSV = f"{os.path.expanduser('~')}/.openclaw/workspace/collectly/outreach/data/prospects.csv"
LOG_CSV = f"{os.path.expanduser('~')}/.openclaw/workspace/collectly/outreach/data/outreach-log.csv"
MESSAGES_DIR = f"{os.path.expanduser('~')}/.openclaw/workspace/collectly/outreach/messages"
ENV_PATH = f"{os.path.expanduser('~')}/.openclaw/workspace/collectly/.env.local"
LOG_DIR = f"{os.path.expanduser('~')}/.openclaw/workspace/collectly/outreach/logs"

# Keep in sync with reconcile_live.py:LIVE_CANON (10 columns).
# Field renames vs prior schema: sent_at→timestamp, replied_at→replied,
# status→signal, detail→signal_details. next_step and segment retained.
LOG_FIELDS = ["id", "email", "touch", "timestamp", "replied", "signal", "next_step", "message_id", "signal_details", "segment"]


def load_env() -> Dict[str, str]:
    env = {}
    if not os.path.exists(ENV_PATH):
        return env
    with open(ENV_PATH) as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            env[k.strip()] = v.strip().strip('"').strip("'")
    return env


def load_log() -> List[Dict[str, str]]:
    if not os.path.exists(LOG_CSV):
        return []
    with open(LOG_CSV, newline="") as f:
        return list(csv.DictReader(f))


def already_sent_today(log: List[Dict[str, str]], prospect_id: str) -> bool:
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    for r in log:
        if r.get("id") == prospect_id and (r.get("timestamp") or "").startswith(today):
            return True
    return False


def pick_prospects(tier: int, limit: int, log: List[Dict[str, str]]) -> List[Dict[str, str]]:
    """Pick next N prospects in this tier that haven't been sent today.

    Order: tier matches, no recent t1 send in last 14 days, lowest id first.
    """
    if not os.path.exists(PROSPECTS_CSV):
        return []
    with open(PROSPECTS_CSV, newline="") as f:
        all_rows = list(csv.DictReader(f))

    sent_ids = {r.get("id") for r in log}
    last_sent: Dict[str, str] = {}
    for r in log:
        rid = r.get("id")
        if rid and r.get("timestamp"):
            if rid not in last_sent or r["timestamp"] > last_sent[rid]:
                last_sent[rid] = r["timestamp"]

    cutoff = "2026-07-09T00:00:00Z"  # 14 days ago
    eligible = []
    for r in all_rows:
        if (r.get("tier") or "").strip() != str(tier):
            continue
        if not r.get("email"):
            continue
        rid = r.get("id")
        # Cooldown: don't re-t1 within 14 days
        if rid in last_sent and last_sent[rid] > cutoff:
            continue
        # Cross-channel dedup: outreach_state.py is shared with send_with_guard.py
        # (bookkeeper channel). A prospect present in both prospects.csv and
        # bookkeeper-channel-prospects.csv must not get touched by both.
        ok, _reason = state_can_send(r["email"], "t1")
        if not ok:
            continue
        eligible.append(r)

    eligible.sort(key=lambda r: r.get("id", ""))
    return eligible[:limit]


def load_template(name: str) -> str:
    path = os.path.join(MESSAGES_DIR, name)
    with open(path) as f:
        return f.read()


def _select_variant_block(template: str, industry: str) -> str:
    """Pull out the code block matching the prospect's industry.

    v3 has these variant blocks: Branding, Design, Web design,
    Digital marketing / SEO / PPC, Ecommerce agency / beauty marketing.

    Mapping (per TIER-1-SHORTLIST.md and t1-cold-v3 doc):
        branding → Branding
        design → Design
        web_design → Web design
        digital_marketing / seo / ppc → Digital marketing / SEO / PPC
        motion → Design
        ecommerce_agency / beauty_marketing → Ecommerce agency / beauty marketing
    """
    mapping = {
        "branding": "Branding",
        "design": "Design",
        "web_design": "Web design",
        "digital_marketing": "Digital marketing",
        "seo": "Digital marketing",
        "ppc": "Digital marketing",
        "motion": "Design",
        "ecommerce_agency": "Ecommerce agency",
        "beauty_marketing": "Ecommerce agency",
        "bookkeeping": "Bookkeeping",
        "outsourced-accounting": "Outsourced accounting",
        "fractional-cfo": "Fractional CFO",
    }
    target = mapping.get((industry or "").lower(), "Branding")

    # Find the "### <Variant>" header closest to our target, then grab the
    # following code-fenced block.
    lines = template.splitlines()
    for i, line in enumerate(lines):
        if line.strip().startswith("###") and target.lower() in line.lower():
            # Find the next code fence
            for j in range(i + 1, min(i + 10, len(lines))):
                if lines[j].strip().startswith("```"):
                    # Collect until closing fence
                    block = []
                    for k in range(j + 1, len(lines)):
                        if lines[k].strip().startswith("```"):
                            return "\n".join(block)
                        block.append(lines[k])
                    return "\n".join(block)
    return ""


def render_template(template: str, prospect: Dict[str, str]) -> Dict[str, str]:
    """Render subject + body from a t1 template.

    For v3 industry-variants: subject from "## Subject" header, body from
    the variant code block matching the prospect's industry.

    For v2: subject from "## Subject", body from the single code block
    under "## Body".
    """
    first = prospect.get("first_name", "")
    last = prospect.get("last_name", "")
    company = prospect.get("company", "")
    industry = prospect.get("industry", "")
    hook = prospect.get("hook", "")

    text = template
    for k, v in {
        "{{first_name}}": first,
        "{{last_name}}": last,
        "{{company}}": company,
        "{{hook}}": hook or "[specific observation here]",
    }.items():
        text = text.replace(k, v)

    # Parse subject
    subject = ""
    body_start = 0
    lines = text.splitlines()
    for i, line in enumerate(lines):
        stripped = line.strip()
        if not subject and (
            stripped.startswith("## Subject")
            or stripped.startswith("# Subject")
            or stripped.lower().startswith("subject:")
        ):
            for j in range(i + 1, min(i + 5, len(lines))):
                nxt = lines[j].strip()
                if not nxt:
                    continue
                if nxt.startswith("`") and nxt.endswith("`"):
                    nxt = nxt[1:-1].strip()
                subject = nxt
                body_start = j + 1
                break
            if not subject:
                continue
            break
        if subject:
            break

    # Body: try v3 variant selector first; fall back to first code block.
    body = _select_variant_block(text, industry)
    if not body:
        # Fall back: first fenced code block after the subject
        in_code = False
        body_lines = []
        for line in lines[body_start:]:
            stripped = line.strip()
            if not in_code:
                if stripped.startswith("```"):
                    in_code = True
                continue
            if stripped.startswith("```"):
                break
            body_lines.append(line)
        body = "\n".join(body_lines).strip()

    return {"subject": subject, "body": body}


def send_one(env: Dict[str, str], to: str, subject: str, body: str) -> Dict[str, Any]:
    """Send via Resend API."""
    api_key = env.get("RESEND_API_KEY", "")
    from_email = env.get("RESEND_FROM_EMAIL", "")
    if not api_key or not from_email:
        return {"ok": False, "error": "RESEND_API_KEY or RESEND_FROM_EMAIL missing in .env.local"}
    payload = {
        "from": from_email,
        "to": [to],
        "subject": subject,
        "text": body,
        "reply_to": "davidmugambi104@gmail.com",
    }
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "User-Agent": "collectly-outreach/1.0",
    }
    return request("POST", "https://api.resend.com/emails", headers=headers, json_body=payload, timeout=30)


GATE_MAX_AGE_HOURS = 6  # gate-status.json older than this is untrustworthy: block rather than act on stale data.


def _check_gate(gate_path: str = None) -> int:
    """Read gate-status.json. If gate != 'allow'/'pullback' (with cap > 0), refuse to send.

    Returns exit code: 0 = ok to send, 2 = blocked.

    Fails CLOSED on every non-happy-path: missing file, unreadable file,
    malformed JSON, stale checked_at, or an explicit block/unknown state
    all return 2. A missing or stale gate file is not "no opinion" — it
    means deliverability_gate.py hasn't confirmed anything recently, which
    is exactly when sending is riskiest. (Previously this returned None on
    a missing file and the caller treated that as "proceed" — see the
    2026-08-09 02:21 UTC incident where that let 17 emails out despite the
    gate being unresolved. Never make this function return anything but
    0 or 2.)

    gate_path is injectable for testing (see test_gate_check.py) so tests
    never need to touch the real gate-status.json.
    """
    if gate_path is None:
        gate_path = os.path.join(os.path.dirname(LOG_CSV), "gate-status.json")
    if not os.path.exists(gate_path):
        print("BLOCKED: gate-status.json missing — deliverability_gate.py hasn't run (or hasn't finished) yet. Failing closed.", file=sys.stderr)
        return 2
    try:
        with open(gate_path) as f:
            gate = json.load(f)
    except (json.JSONDecodeError, OSError) as e:
        print(f"BLOCKED: gate-status.json unreadable/malformed ({e}); failing closed.", file=sys.stderr)
        return 2

    checked_at_raw = gate.get("checked_at")
    if not checked_at_raw:
        print("BLOCKED: gate-status.json missing checked_at field; failing closed.", file=sys.stderr)
        return 2
    try:
        checked_at = datetime.fromisoformat(str(checked_at_raw).replace("Z", "+00:00"))
        if checked_at.tzinfo is None:
            checked_at = checked_at.replace(tzinfo=timezone.utc)
    except ValueError:
        print(f"BLOCKED: gate-status.json has unparseable checked_at={checked_at_raw!r}; failing closed.", file=sys.stderr)
        return 2
    age_hours = (datetime.now(timezone.utc) - checked_at).total_seconds() / 3600
    if age_hours > GATE_MAX_AGE_HOURS:
        print(f"BLOCKED: gate-status.json is {age_hours:.1f}h old (max {GATE_MAX_AGE_HOURS}h) — failing closed on stale data.", file=sys.stderr)
        return 2

    state = (gate.get("gate") or "").lower()
    cap = int(gate.get("resend_daily_cap") or 0)
    reason = gate.get("reason") or "(no reason)"
    if state in ("allow", "pullback") and cap > 0:
        print(f"gate: {state}, cap: {cap}/day")
        return 0
    print(f"BLOCKED by deliverability gate: state={state!r}, cap={cap}, reason={reason}", file=sys.stderr)
    return 2


def cmd_send(args):
    env = load_env()
    log = load_log()
    template = load_template(args.template)

    # Enforce gate before doing any work. Idempotent: gate script already ran
    # in the cron pipeline; this is a defense-in-depth check at the producer.
    # _check_gate() always returns 0 or 2 — never a third "unknown" state.
    gate_exit = _check_gate()
    if gate_exit != 0:
        return gate_exit

    prospects = pick_prospects(args.tier, args.limit, log)
    if not prospects:
        print(f"No eligible prospects for tier {args.tier}.")
        return 1

    if args.dry_run:
        print(f"DRY RUN — would send {len(prospects)} emails using {args.template}:")
        for p in prospects:
            print(f"  {p['id']:6s} {p['email']:35s} {p['first_name']:15s} ({p['company']})")
        return 0

    sent_at = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    os.makedirs(LOG_DIR, exist_ok=True)
    results = []

    for p in prospects:
        rendered = render_template(template, p)
        result = send_one(env, p["email"], rendered["subject"], rendered["body"])
        results.append({"id": p["id"], "email": p["email"], "ok": result.get("ok"), "result": result})

        # Append to log
        row = {
            "id": p["id"],
            "email": p["email"],
            "touch": "t1",
            "timestamp": sent_at,
            "replied": "",
            "signal": "sent" if result.get("ok") else "send_failed",
            "message_id": (result.get("data") or {}).get("id", "") if result.get("ok") else "",
            "signal_details": f"{args.template}; tier{args.tier}",
            "next_step": "",
            "segment": p.get("industry", "unknown"),
        }
        with open(LOG_CSV, "a", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=LOG_FIELDS)
            writer.writerow(row)

        if result.get("ok"):
            state_record_send(
                p["email"], "t1",
                message_id=row["message_id"],
                campaign=f"tier{args.tier}",
                prospect_id=p["id"],
            )

        status = "✓" if result.get("ok") else "✗"
        print(f"  {status} {p['id']} → {p['email']}: {result.get('error') or (result.get('data') or {}).get('id', '')}")
        time.sleep(1)  # Resend is fine with bursts but be polite

    ts = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    with open(os.path.join(LOG_DIR, f"send-{ts}.json"), "w") as f:
        json.dump(results, f, indent=2)

    sent = sum(1 for r in results if r["ok"])
    print(f"\n=== Sent {sent}/{len(results)} ===")
    return 0 if sent == len(results) else 1


def main():
    p = argparse.ArgumentParser(description="Daily send pipeline")
    p.add_argument("--tier", type=int, required=True, choices=[1, 2, 3])
    p.add_argument("--limit", type=int, default=5)
    p.add_argument("--template", default="t1-cold-v3-industry-variants.md")
    p.add_argument("--dry-run", action="store_true", help="Show what would be sent, do not actually send")
    args = p.parse_args()
    return cmd_send(args) or 0


if __name__ == "__main__":
    sys.exit(main())
