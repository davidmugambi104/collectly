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
import base64
import csv
import hashlib
import re
import json
import os
import sys
import time
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))
from clients import request, load_secret
from outreach_state import can_send as state_can_send, record_send as state_record_send
from scripts.lib import prospect_utils as pu
import experiment

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


# accounts@ / billing@ / info@ and friends. Matched on the local part only, so
# a real person whose address merely contains one of these words is unaffected.
ROLE_ADDRESS_RE = re.compile(
    r"^(accounts?|billing|ap|ar|info|admin|hello|contact|enquiries|enquiry|office"
    r"|finance|team|support|sales|mail|noreply|no-reply|help|service|reception"
    # Added after six of these went out in a follow-up batch: studio@, tax@,
    # advice@ and interns@ are shared mailboxes at exactly the firms this list
    # targets. An accounting practice's tax@ is a department queue, not a
    # person, and it behaves like every other role box — 39.1% bounce against
    # 1.8% for personal addresses.
    r"|advice|tax|intern|interns|hr|jobs|careers|booking|bookings|studio|hi|hey"
    r"|ask|talk|press|media|legal|audit|payroll|client|clients|general)@",
    re.IGNORECASE,
)


def is_role_address(email: str) -> bool:
    return bool(ROLE_ADDRESS_RE.match((email or "").strip()))


def pick_prospects(tier: int, limit: int, log: List[Dict[str, str]]) -> List[Dict[str, str]]:
    """Pick next N prospects in this tier that haven't been sent today.

    Order: tier matches, no recent t1 send in last 14 days, lowest id first.
    """
    if not os.path.exists(PROSPECTS_CSV):
        return []
    with open(PROSPECTS_CSV, newline="") as f:
        all_rows = list(csv.DictReader(f))

    # Identity is the email address, not the id column. 12 rows in
    # prospects.csv have a blank id and 4 ids are duplicated, and the old
    # id-keyed cooldown skipped blank ids entirely ("if rid and ...") -- so
    # those 12 had no cooldown at all. Two of them were sent a t2 on
    # 2026-09-19 and were next in line for a fresh t1 cold opener the
    # following day: two emails in two days, in the wrong order.
    last_sent: Dict[str, str] = {}
    for r in log:
        key = (r.get("email") or "").strip().lower()
        if key and r.get("timestamp"):
            if key not in last_sent or r["timestamp"] > last_sent[key]:
                last_sent[key] = r["timestamp"]

    cutoff = (datetime.now(timezone.utc) - timedelta(days=14)).isoformat().replace("+00:00", "Z")  # 14 days ago, dynamic
    suppressed = pu.load_suppressed_emails()
    eligible = []
    for r in all_rows:
        if (r.get("tier") or "").strip() != str(tier):
            continue
        if not r.get("email"):
            continue
        if r["email"].strip().lower() in suppressed:
            continue
        if is_role_address(r["email"]):
            # Defence in depth. Role mailboxes are currently kept out by being
            # tiered `quarantined_role_address`, which never equals "1"/"2"/"3"
            # -- but that is an accident of string comparison, not a rule. One
            # re-tier puts them back in the send path.
            #
            # They are why the bounce rate went from 1.2% on 2026-08-30 to
            # 18.2% on 2026-09-18: over that period role addresses went from
            # 4.5% to 44.1% of the sending mix, and measured across the current
            # window they bounce at 39.1% (68/174) against 1.8% (4/221) for
            # personal addresses. 68 of the 72 bounces are role mailboxes.
            continue
        # Cooldown: don't re-t1 within 14 days of ANY prior touch to this
        # address, t1 or t2.
        key = r["email"].strip().lower()
        if key in last_sent and last_sent[key] > cutoff:
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


def _select_ab_variant(template: str, prospect: Dict[str, str]) -> Dict[str, str]:
    """Pick one arm of a v6-style A/B template.

    v6 dropped industry variants for a two-arm test of the *approach*, so each
    "### Variant X" carries its own "**Subject:**" line followed by its own
    code block. The arm is a stable hash of the recipient rather than a coin
    flip, so a prospect stays in the same arm across t1/t2/t3 -- otherwise the
    follow-up contradicts the opener and the test measures nothing.

    Returns {} for any template without these headers, which leaves the v2/v3
    parsing below untouched.
    """
    lines = template.splitlines()
    arms: List[Dict[str, str]] = []
    for i, line in enumerate(lines):
        if not re.match(r"^###\s+Variant\s+([A-Z])\b", line.strip()):
            continue
        subject = ""
        body: List[str] = []
        j = i + 1
        while j < len(lines) and not lines[j].strip().startswith("###"):
            stripped = lines[j].strip()
            m = re.match(r"^\*{0,2}Subject:?\*{0,2}\s*(.+)$", stripped, re.I)
            if m and not subject:
                subject = m.group(1).strip().strip("`").strip()
            elif stripped.startswith("```") and not body:
                for k in range(j + 1, len(lines)):
                    if lines[k].strip().startswith("```"):
                        j = k
                        break
                    body.append(lines[k])
            j += 1
        text = "\n".join(body).strip()
        if subject and text:
            arms.append({"subject": subject, "body": text})

    if len(arms) < 2:
        return {}

    key = (prospect.get("email") or prospect.get("company") or "").strip().lower()
    idx = int(hashlib.sha256(key.encode()).hexdigest(), 16) % len(arms)
    arm = dict(arms[idx])
    arm["variant"] = chr(ord("A") + idx)
    return arm


def render_template(template: str, prospect: Dict[str, str], hook_override: str = None) -> Dict[str, str]:
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
    # hook_override wins when the caller passed one (the H1/H2 rotation from
    # experiment.py) -- falls back to the prospect's own CSV hook field for
    # any template/call site that doesn't opt into rotation.
    hook = hook_override if hook_override is not None else prospect.get("hook", "")

    text = template
    for k, v in {
        "{{first_name}}": first,
        "{{last_name}}": last,
        "{{company}}": company,
        "{{hook}}": hook or "[specific observation here]",
        "{{unsubscribe_token}}": unsubscribe_token(prospect.get("email", "")),
    }.items():
        text = text.replace(k, v)

    ab = _select_ab_variant(text, prospect)
    if ab:
        return ab

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
    # Last line of defence. The t1 path shipped 292 sends with no opt-out at
    # all -- only the t2 template carried one -- which is a CAN-SPAM breach for
    # every US recipient. Enforcing it here rather than in render_* means a new
    # template cannot reintroduce the gap by forgetting a line.
    if "api/unsubscribe" not in body:
        body = body.rstrip() + (
            "\n\n--\nDon't want these? One click and I'll stop:\n"
            f"https://getcollectly.app/api/unsubscribe?token={unsubscribe_token(to)}"
        )
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


def _gate_cap(gate_path: str = None) -> int:
    """The cap the gate currently allows, or 0 if sending is blocked."""
    try:
        path = gate_path or os.path.join(os.path.dirname(LOG_CSV), "gate-status.json")
        with open(path) as f:
            gate = json.load(f)
    except (OSError, ValueError):
        return 0
    state = (gate.get("gate") or "").lower()
    cap = int(gate.get("resend_daily_cap") or 0)
    return cap if state in ("allow", "pullback") else 0


def _sent_today(log: List[Dict[str, str]]) -> int:
    """Sends already logged for the current UTC day.

    The cap is per DAY, not per invocation. Counting only the current batch
    would let three runs of 30 put 90 out against a cap of 30.
    """
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    return sum(
        1 for r in log
        if (r.get("signal") or "") == "sent" and (r.get("timestamp") or "").startswith(today)
    )


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


FOLLOWUP_QUEUE = os.path.join(DATA_DIR, "follow-up-queue.csv") if "DATA_DIR" in dir() else os.path.join(os.path.dirname(PROSPECTS_CSV), "follow-up-queue.csv")


def unsubscribe_token(email: str) -> str:
    """base64url(email) — the format /api/unsubscribe decodes."""
    return base64.urlsafe_b64encode(email.strip().lower().encode()).decode().rstrip("=")


def _prior_subject_for(email: str, log: List[Dict[str, str]]) -> str:
    """The subject line this address was actually sent, or "" if unknown."""
    variant = ""
    for row in log:
        if (row.get("email") or "").strip().lower() != email:
            continue
        if (row.get("touch") or "") != "t1":
            continue
        details = row.get("signal_details") or ""
        for token in details.split(";"):
            token = token.strip()
            if token.startswith("subj:"):
                variant = token.split(":", 1)[1].strip()
    if not variant:
        return ""
    for vid, text in experiment.SUBJECT_VARIANTS:
        if vid == variant:
            return text
    return ""


def pick_followups(limit: int, log: List[Dict[str, str]]) -> List[Dict[str, str]]:
    """Prospects due a t2, from the follow-up queue built by build_followup_queue.py.

    The queue carries only an email address, so each row is joined back to
    prospects.csv for the name and company the template needs. A queued address
    with no prospect record is skipped rather than sent an email addressed to
    nobody.

    Every guard that applies to a t1 applies here. That is the whole reason this
    lives in daily_send.py rather than in send_touch.py, send_touch_v2.py or
    send_t1_t2.py: none of those three checks the deliverability gate, reads the
    queue, or consults the suppression list, and send_t1_t2.py routes through
    the Gmail fallback that is explicitly out of scope. Sending 104 follow-ups
    through any of them would bypass every safeguard added after the 2026-08-01
    incident.
    """
    if not os.path.exists(FOLLOWUP_QUEUE):
        return []
    with open(FOLLOWUP_QUEUE, newline="") as f:
        queued = [r for r in csv.DictReader(f) if (r.get("email") or "").strip()]
    if not queued:
        return []
    # A queue row still marked paused is not eligible, whatever the cap says.
    queued = [r for r in queued if not (r.get("paused_reason") or "").strip()]

    with open(PROSPECTS_CSV, newline="") as f:
        by_email = {
            (r.get("email") or "").strip().lower(): r
            for r in csv.DictReader(f)
            if (r.get("email") or "").strip()
        }

    suppressed = pu.load_suppressed_emails()
    already = {(r.get("email") or "").strip().lower() for r in log if (r.get("touch") or "") == "t2"}

    out: List[Dict[str, str]] = []
    for row in queued:
        email = row["email"].strip().lower()
        if email in suppressed:
            continue
        if is_role_address(email):
            # Same rule as t1. A follow-up to accounts@ bounces exactly as hard
            # as a first touch to accounts@ did.
            continue
        if email in already:
            continue
        p = by_email.get(email)
        if not p:
            continue
        ok, _reason = state_can_send(email, "t2")
        if not ok:
            continue
        # Thread on the subject this person actually received.
        #
        # t2-followup.md hardcodes "Re: Who chases invoices?", which is not one
        # of the four subjects ever sent (they are in experiment.py:
        # SUBJECT_VARIANTS). A "Re:" on a thread that never existed is a spam
        # tactic, it breaks threading in the recipient's client, and on a site
        # whose homepage promises no invented anything it is the wrong thing to
        # put in a stranger's inbox. The log records which variant each address
        # got as `subj:X`, so the real one is recoverable.
        p = dict(p)
        p["_prior_subject"] = _prior_subject_for(email, log)
        out.append(p)
        if len(out) >= limit:
            break
    return out


def render_followup(template: str, prospect: Dict[str, str]) -> Dict[str, str]:
    """Render the t2 file, whose header is `Subject: ...` rather than `## Subject`.

    Also fills {{unsubscribe_token}}, which render_template() does not know
    about — and which is not decoration: an unsubscribe link is what makes these
    lawful under CAN-SPAM and PECR.
    """
    lines = template.splitlines()
    subject = ""
    body_start = 0
    prior = (prospect.get("_prior_subject") or "").strip()
    for i, line in enumerate(lines):
        if line.strip().lower().startswith("subject:"):
            subject = line.split(":", 1)[1].strip()
            body_start = i + 1
            break
    body = "\n".join(lines[body_start:]).strip()
    first = (prospect.get("first_name") or "there").strip()
    repl = {
        "{{first_name}}": first,
        "{{last_name}}": (prospect.get("last_name") or "").strip(),
        "{{company}}": (prospect.get("company") or "your team").strip(),
        "{{unsubscribe_token}}": unsubscribe_token(prospect.get("email", "")),
    }
    for k, v in repl.items():
        subject = subject.replace(k, v)
        body = body.replace(k, v)
    if prior:
        # Real thread, real Re:.
        subject = prior if prior.lower().startswith("re:") else f"Re: {prior}"
        for k, v in repl.items():
            subject = subject.replace(k, v)
    elif subject.lower().startswith("re:"):
        # No record of what they were sent, so drop the Re: rather than invent
        # a thread. A follow-up that admits it is a new message is still honest.
        subject = subject[3:].strip()
    return {"subject": subject, "body": body}


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

    # Clamp to the gate's cap. This was documented as already happening — the
    # outreach-sequencer skill says daily_send.py "will refuse to send (or
    # clamp the limit) if the gate is red ... enforced in code, not just
    # something this skill is supposed to remember to check". It was not
    # enforced: _check_gate() read the cap, printed it, and returned. A
    # --limit of 73 against a cap of 30 sent 72.
    #
    # Also counts what has already gone out today, because the cap is per day.
    # Three runs of 30 against a cap of 30 is still a breach.
    cap = _gate_cap()
    already = _sent_today(log)
    remaining = max(0, cap - already)
    if remaining <= 0:
        print(f"BLOCKED: {already} already sent today against a cap of {cap}.", file=sys.stderr)
        return 2
    if args.limit > remaining:
        print(f"limit {args.limit} clamped to {remaining} (cap {cap}/day, {already} already sent today)")
        args.limit = remaining

    if args.touch == "t2":
        prospects = pick_followups(args.limit, log)
        if not prospects:
            print("No eligible follow-ups in the queue.")
            return 1
    else:
        prospects = pick_prospects(args.tier, args.limit, log)
        if not prospects:
            print(f"No eligible prospects for tier {args.tier}.")
            return 1

    if args.dry_run:
        print(f"DRY RUN — would send {len(prospects)} emails using {args.template}:")
        exp_weights, exp_index = experiment.load_weights_and_start_index()
        hook_weights, hook_index = experiment.load_hook_weights_and_start_index()
        for p in prospects:
            variant_id = experiment.pick_variant(exp_index, exp_weights)
            exp_index += 1
            hook_id = experiment.pick_hook(hook_index, hook_weights)
            hook_index += 1
            print(f"  {p['id']:6s} {p['email']:35s} {p['first_name']:15s} ({p['company']}) [subj:{variant_id}] [hook:{hook_id}]")
        return 0

    sent_at = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    os.makedirs(LOG_DIR, exist_ok=True)
    results = []

    # Compute subject-line and hook experiment weights once per batch (not
    # per send -- each send just advances its running index) per
    # experiment.py's kill/scale rules.
    exp_weights, exp_index = experiment.load_weights_and_start_index()
    hook_weights, hook_index = experiment.load_hook_weights_and_start_index()

    for p in prospects:
        variant_id = experiment.pick_variant(exp_index, exp_weights)
        exp_index += 1
        hook_id = experiment.pick_hook(hook_index, hook_weights)
        hook_index += 1
        if args.touch == "t2":
            # No subject/hook experiment on a follow-up: the four-way t1
            # subject test already ran at ~73 sends per variant and returned
            # one reply in total, so splitting 104 four ways would measure
            # nothing.
            rendered = render_followup(template, p)
            variant_id = hook_id = "-"
        else:
            rendered = render_template(template, p, hook_override=experiment.hook_text(hook_id, p))
            rendered["subject"] = experiment.subject_text(variant_id, p)
        result = send_one(env, p["email"], rendered["subject"], rendered["body"])
        results.append({"id": p["id"], "email": p["email"], "ok": result.get("ok"), "result": result})

        # Append to log
        row = {
            "id": p["id"],
            "email": p["email"],
            "touch": args.touch,
            "timestamp": sent_at,
            "replied": "",
            "signal": "sent" if result.get("ok") else "send_failed",
            "message_id": (result.get("data") or {}).get("id", "") if result.get("ok") else "",
            "signal_details": f"{args.template}; tier{args.tier}; subj:{variant_id}; hook:{hook_id}",
            "next_step": "",
            "segment": p.get("industry", "unknown"),
        }
        with open(LOG_CSV, "a", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=LOG_FIELDS)
            writer.writerow(row)

        if result.get("ok"):
            state_record_send(
                p["email"], args.touch,
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
    p.add_argument("--touch", default="t1", choices=["t1", "t2"],
                   help="t1 reads prospects.csv; t2 reads the follow-up queue")
    p.add_argument("--limit", type=int, default=5)
    p.add_argument("--template", default="t1-cold-v3-industry-variants.md")
    p.add_argument("--dry-run", action="store_true", help="Show what would be sent, do not actually send")
    args = p.parse_args()
    return cmd_send(args) or 0


if __name__ == "__main__":
    sys.exit(main())
