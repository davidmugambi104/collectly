#!/usr/bin/env python3
"""Collectly outreach task runner -- controlled-autonomy layer on daily_send.py.

One queue, five states: PENDING, RUNNING, FAILED, NEEDS_APPROVAL, DONE.
One bot; no per-task owner/agent field.

Cycle (see cmd_cycle): check for new prospects -> classify approval level ->
send with retry/backoff -> verify (Resend status + CSV read-back) -> log ->
reconcile replies/bounces -> pause/dedup as needed.

Reuses daily_send.py for the deliverability gate check, prospect selection,
template rendering, Resend send, and CSV logging; reuses outreach_state.py
for cross-channel dedup; reuses reconcile_live.py for reply/duplicate
detection. Does not reimplement any of them.

Approval levels (exactly three, per policy -- not per-task owner/agent):
    auto            routine sends within existing dedup/pause rules.
    flag_for_review a new segment/industry never contacted before (not a
                    new domain -- see classify_task docstring), or a
                    reply that looks like it needs a human response.
    requires_yes    changing send volume/rate, billing, or a new OAuth/API
                    credential. The runner cannot self-approve these -- it
                    refuses structurally (see cmd_set_cap) rather than
                    modeling them as a task state.

Usage:
    python3 task_runner.py status
    python3 task_runner.py cycle [--dry-run] [--limit-per-tier N]
    python3 task_runner.py approve <task_id>
    python3 task_runner.py set-cap <n> --yes
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
sys.path.insert(0, str(HERE.parent.parent))  # matches daily_send.py's clients-package path

import daily_send  # noqa: E402  (reused: gate check, prospect selection, send, CSV log)
import outreach_state  # noqa: E402  (reused: cross-channel dedup + reply state)
import experiment  # noqa: E402  (reused: subject-line rotation + kill/scale rules)
from clients import request as http_request  # noqa: E402

DATA = HERE.parent / "data"
CONFIG_PATH = HERE.parent / "config.json"
QUEUE_PATH = DATA / "task-queue.json"
RATE_PATH = DATA / "rate-usage.json"

STATES = ("PENDING", "RUNNING", "FAILED", "NEEDS_APPROVAL", "DONE")
APPROVAL_LEVELS = ("auto", "flag_for_review", "requires_yes")

DEFAULT_CONFIG = {
    "daily_send_cap": 20,
    "max_retries": 3,
    "backoff_base_seconds": 30,
    "tiers": [1, 2, 3],
    "limit_per_tier": 10,
}


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _iso(dt: Optional[datetime] = None) -> str:
    return (dt or _now()).isoformat()


def _atomic_write_json(path: Path, payload: Any) -> None:
    """Same pattern as deliverability_gate.py: write temp file, then atomic rename."""
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_name(f".{path.name}.tmp-{os.getpid()}")
    tmp.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(tmp, path)


# --------------------------------------------------------------------------
# Config
# --------------------------------------------------------------------------

def load_config() -> Dict[str, Any]:
    if not CONFIG_PATH.exists():
        _atomic_write_json(CONFIG_PATH, DEFAULT_CONFIG)
        return dict(DEFAULT_CONFIG)
    cfg = json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
    merged = dict(DEFAULT_CONFIG)
    merged.update(cfg)
    return merged


def cmd_set_cap(args: argparse.Namespace) -> int:
    """Changing send volume/rate is a 'requires_yes' action -- the --yes flag
    is the explicit-approval mechanism; there is no code path that changes
    the cap without it."""
    if not args.yes:
        print(
            "REFUSED: changing daily_send_cap changes sending volume/rate, "
            "which requires your explicit yes. Re-run with --yes to confirm.",
            file=sys.stderr,
        )
        return 2
    cfg = load_config()
    old = cfg["daily_send_cap"]
    cfg["daily_send_cap"] = args.n
    _atomic_write_json(CONFIG_PATH, cfg)
    print(f"daily_send_cap: {old} -> {args.n} (explicit --yes given)")
    return 0


# --------------------------------------------------------------------------
# Queue persistence
# --------------------------------------------------------------------------

def load_queue() -> List[Dict[str, Any]]:
    if not QUEUE_PATH.exists():
        return []
    payload = json.loads(QUEUE_PATH.read_text(encoding="utf-8"))
    return payload.get("tasks", [])


def save_queue(tasks: List[Dict[str, Any]]) -> None:
    _atomic_write_json(QUEUE_PATH, {"tasks": tasks, "updated_at": _iso()})


# --------------------------------------------------------------------------
# History (for "new segment" classification)
# --------------------------------------------------------------------------

def known_segments_seen(log: List[Dict[str, str]]) -> set:
    """Segments/industries already contacted, from the live log."""
    segments = set()
    for r in log:
        if (r.get("signal") or "") == "sent" and r.get("segment"):
            segments.add(r["segment"].strip().lower())
    return segments


# --------------------------------------------------------------------------
# Approval classification
# --------------------------------------------------------------------------

def classify_task(prospect: Dict[str, str], known_segments: set) -> tuple[str, str]:
    """Return (approval_level, reason). Only ever returns 'auto' or
    'flag_for_review' -- 'requires_yes' actions (volume/rate, billing, new
    credentials) are never per-prospect decisions, so they're never
    produced here; see module docstring.

    Per-prospect new-domain is deliberately NOT a review trigger for this
    (cold-outreach, tier 1-3) channel -- every first-touch cold prospect is
    a new domain by definition, so that rule flagged ~everything (19/20 on
    2026-08-19) and added review load without adding signal. Confirmed with
    Davie 2026-08-19: approve-all for this channel. New *segment* stays a
    review trigger -- entering a whole new industry vertical is a real
    strategic signal, unlike one more company in an already-worked segment.
    If task_runner ever builds tasks for the bookkeeper-referral channel
    (repeat/known-partner relationships, where a new domain IS unusual),
    that channel should get its own classify function, not this one.
    """
    segment = (prospect.get("industry") or "").strip().lower()
    if segment and segment not in known_segments:
        return "flag_for_review", f"new segment never contacted before: {segment}"
    return "auto", "routine send within existing dedup/pause rules"


# --------------------------------------------------------------------------
# Task construction: "check for new prospects"
# --------------------------------------------------------------------------

def reconcile_stale_tasks(tasks: List[Dict[str, Any]]) -> int:
    """A prospect can get sent through a path other than this queue (e.g.
    the raw hourly sequencer cron calling daily_send.py directly, or a
    manual run) -- refresh_queue only ever adds tasks, so without this,
    a PENDING/NEEDS_APPROVAL entry for an already-sent prospect goes
    stale forever and misreports as still needing action. Reconcile
    against outreach_state.py (the shared cross-channel dedup record)
    every refresh. Returns how many were reconciled."""
    reconciled = 0
    for t in tasks:
        if t["state"] not in ("PENDING", "NEEDS_APPROVAL"):
            continue
        ok, reason = outreach_state.can_send(t["email"], t["touch"])
        if not ok:
            t["state"] = "DONE"
            t["result"] = t.get("result") or {}
            t["error"] = None
            t["approval_reason"] += f" (reconciled: {reason} -- sent via another path)"
            t["updated_at"] = _iso()
            reconciled += 1
    return reconciled


def refresh_queue(cfg: Dict[str, Any]) -> List[Dict[str, Any]]:
    tasks = load_queue()
    reconciled = reconcile_stale_tasks(tasks)
    if reconciled:
        print(f"  reconciled {reconciled} stale task(s): already sent via another path since last refresh")
    existing_ids = {t["id"] for t in tasks if t["state"] != "DONE"}
    # DONE tasks stay in the queue as history but don't block re-creation
    # of a *new* touch for the same prospect (touch is part of the id).
    log = daily_send.load_log()
    known_segments = known_segments_seen(log)

    for tier in cfg["tiers"]:
        prospects = daily_send.pick_prospects(tier, cfg["limit_per_tier"], log)
        for p in prospects:
            task_id = f"{p['id']}:t1"
            if task_id in existing_ids:
                continue
            if any(t["id"] == task_id and t["state"] == "DONE" for t in tasks):
                continue
            level, reason = classify_task(p, known_segments)
            tasks.append({
                "id": task_id,
                "prospect_id": p["id"],
                "email": p["email"],
                "touch": "t1",
                "tier": tier,
                "segment": p.get("industry", "unknown"),
                "state": "PENDING" if level == "auto" else "NEEDS_APPROVAL",
                "approval_level": level,
                "approval_reason": reason,
                "attempts": 0,
                "max_retries": cfg["max_retries"],
                "next_attempt_at": None,
                "created_at": _iso(),
                "updated_at": _iso(),
                "result": None,
                "error": None,
            })
    save_queue(tasks)
    return tasks


# --------------------------------------------------------------------------
# Rate/cost tracking
# --------------------------------------------------------------------------

def load_rate_usage() -> Dict[str, Any]:
    today = _now().strftime("%Y-%m-%d")
    if RATE_PATH.exists():
        usage = json.loads(RATE_PATH.read_text(encoding="utf-8"))
        if usage.get("date") == today:
            return usage
    return {"date": today, "sends_today": 0, "resend_api_calls_today": 0}


def save_rate_usage(usage: Dict[str, Any]) -> None:
    _atomic_write_json(RATE_PATH, usage)


# --------------------------------------------------------------------------
# Verification: Resend status check + CSV read-back
# --------------------------------------------------------------------------

def reverify_failed_tasks(tasks: List[Dict[str, Any]], env: Dict[str, str]) -> int:
    """Self-repair for the one FAILED case that's safe to retry: a send
    that Resend accepted but our post-send verification couldn't confirm
    (e.g. Resend's API hadn't propagated last_event yet). This is a
    read-only re-check (GET + CSV read), never a resend -- a task that
    genuinely never sent (exhausted retries, no message_id) is never
    touched here, since retrying *that* risks a duplicate send. Runs
    every cycle regardless of gate state; it isn't sending anything.
    Returns how many were resolved."""
    resolved = 0
    for t in tasks:
        if t["state"] != "FAILED":
            continue
        message_id = (t.get("result") or {}).get("message_id")
        if not message_id:
            continue  # never actually sent -- nothing to re-verify
        csv_ok, csv_reason = verify_csv_row({
            "id": t["prospect_id"], "email": t["email"], "touch": t["touch"], "message_id": message_id,
        })
        resend_ok, resend_reason = verify_resend_accepted(message_id, env)
        if csv_ok and resend_ok:
            t["state"] = "DONE"
            t["error"] = None
            t["result"] = {"message_id": message_id, "csv_verified": True, "resend_verified": resend_reason}
            t["approval_reason"] += " (resolved on re-verification)"
            t["updated_at"] = _iso()
            resolved += 1
            print(f"  re-verified and resolved: {t['id']} -> {resend_reason}")
    return resolved


def verify_resend_accepted(message_id: str, env: Dict[str, str]) -> tuple[bool, str]:
    """Confirm Resend actually accepted the send, not just that the POST
    didn't error. GET /emails/{id} and check it isn't already bounced/
    complained/failed."""
    api_key = env.get("RESEND_API_KEY", "")
    if not api_key or not message_id:
        return False, "no message_id or api key to verify against"
    resp = http_request(
        "GET",
        f"https://api.resend.com/emails/{message_id}",
        headers={"Authorization": f"Bearer {api_key}"},
        timeout=15,
        max_retries=1,
    )
    if not resp.get("ok"):
        return False, f"verify GET failed: {resp.get('error')}"
    last_event = (resp.get("data") or {}).get("last_event", "")
    if last_event in ("bounced", "complained"):
        return False, f"Resend reports last_event={last_event}"
    return True, f"Resend confirms last_event={last_event or 'queued/sent'}"


def verify_csv_row(expected: Dict[str, str]) -> tuple[bool, str]:
    """Re-read the log file's last row back and confirm it matches what we
    intended to write -- not just that the append call didn't raise."""
    if not os.path.exists(daily_send.LOG_CSV):
        return False, "log file does not exist after write"
    import csv
    with open(daily_send.LOG_CSV, newline="") as f:
        rows = list(csv.DictReader(f))
    if not rows:
        return False, "log file has no rows after write"
    last = rows[-1]
    mismatches = [k for k in ("id", "email", "touch", "message_id") if last.get(k) != expected.get(k)]
    if mismatches:
        return False, f"read-back mismatch on {mismatches}: wrote {expected}, read {last}"
    return True, "read-back matches what was written"


# --------------------------------------------------------------------------
# Send one task with retry/backoff
# --------------------------------------------------------------------------

def process_task(task: Dict[str, Any], env: Dict[str, str], template_cache: Dict[str, str],
                  usage: Dict[str, Any], prospects_by_id: Dict[str, Dict[str, str]],
                  cfg: Dict[str, Any], exp_state: Dict[str, Any], dry_run: bool) -> None:
    task["state"] = "RUNNING"
    task["updated_at"] = _iso()

    prospect = prospects_by_id.get(task["prospect_id"])
    if not prospect:
        task["state"] = "FAILED"
        task["error"] = "prospect no longer in prospects.csv"
        task["updated_at"] = _iso()
        return

    template_name = "t1-cold-v3-industry-variants.md"
    if template_name not in template_cache:
        template_cache[template_name] = daily_send.load_template(template_name)
    rendered = daily_send.render_template(template_cache[template_name], prospect)
    variant_id = experiment.pick_variant(exp_state["index"], exp_state["weights"])
    exp_state["index"] += 1
    rendered["subject"] = experiment.subject_text(variant_id, prospect)

    if dry_run:
        print(f"  [DRY RUN] would send {task['id']} -> {task['email']} ({task['approval_level']}) [subj:{variant_id}]")
        task["state"] = "PENDING"
        task["updated_at"] = _iso()
        return

    usage["resend_api_calls_today"] += 1
    result = daily_send.send_one(env, task["email"], rendered["subject"], rendered["body"])

    if not result.get("ok"):
        task["attempts"] += 1
        task["error"] = result.get("error")
        if task["attempts"] >= task["max_retries"]:
            task["state"] = "FAILED"
            task["next_attempt_at"] = None
            print(f"  FAILED (exhausted {task['max_retries']} retries): {task['id']} -> {task['error']}")
        else:
            from datetime import timedelta
            backoff = cfg["backoff_base_seconds"] * (2 ** (task["attempts"] - 1))
            task["state"] = "PENDING"
            task["next_attempt_at"] = _iso(_now() + timedelta(seconds=backoff))
            print(f"  retry {task['attempts']}/{task['max_retries']} scheduled for {task['id']} "
                  f"(backoff {backoff}s): {task['error']}")
        task["updated_at"] = _iso()
        return

    message_id = (result.get("data") or {}).get("id", "")
    sent_at = _now().strftime("%Y-%m-%dT%H:%M:%SZ")
    row = {
        "id": task["prospect_id"],
        "email": task["email"],
        "touch": "t1",
        "timestamp": sent_at,
        "replied": "",
        "signal": "sent",
        "next_step": "",
        "message_id": message_id,
        "signal_details": f"{template_name}; tier{task['tier']}; task_runner; subj:{variant_id}",
        "segment": task["segment"],
    }
    import csv
    os.makedirs(os.path.dirname(daily_send.LOG_CSV), exist_ok=True)
    with open(daily_send.LOG_CSV, "a", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=daily_send.LOG_FIELDS)
        writer.writerow(row)

    csv_ok, csv_reason = verify_csv_row(row)
    resend_ok, resend_reason = verify_resend_accepted(message_id, env)

    daily_send.state_record_send(task["email"], "t1", message_id=message_id,
                                  campaign=f"tier{task['tier']}", prospect_id=task["prospect_id"])

    usage["sends_today"] += 1

    if csv_ok and resend_ok:
        task["state"] = "DONE"
        task["result"] = {"message_id": message_id, "csv_verified": True, "resend_verified": resend_reason}
        print(f"  DONE: {task['id']} -> {task['email']} ({resend_reason})")
    else:
        # The send genuinely happened (money/reputation already spent) -- do
        # not silently retry and risk a duplicate send. Surface loudly instead.
        task["state"] = "FAILED"
        task["error"] = f"sent but verification failed: csv={csv_reason} resend={resend_reason}"
        task["result"] = {"message_id": message_id, "csv_verified": csv_ok, "resend_verified": resend_ok}
        print(f"  SENT BUT UNVERIFIED (marked FAILED for human review, NOT retried): {task['id']} -> {task['error']}")
    task["updated_at"] = _iso()


# --------------------------------------------------------------------------
# Cycle
# --------------------------------------------------------------------------

def gate_cap() -> int:
    """Read the deliverability gate's own cap (drops to 30 on a bounce/spam
    pullback, 0 on block). _check_gate() only returns pass/fail, not the
    number, so read gate-status.json directly -- the same file it writes."""
    gate_path = os.path.join(os.path.dirname(daily_send.LOG_CSV), "gate-status.json")
    try:
        with open(gate_path) as f:
            return int(json.load(f).get("resend_daily_cap") or 0)
    except (OSError, json.JSONDecodeError, ValueError):
        return 0


def cmd_cycle(args: argparse.Namespace) -> int:
    cfg = load_config()
    env = daily_send.load_env()

    # Self-repair first, regardless of gate state or --dry-run: re-checking
    # an already-sent message's status is read-only (GET, never a resend)
    # and only ever corrects our own records, so it isn't gated by whether
    # new sends are currently allowed or requested.
    pending_tasks = load_queue()
    resolved = reverify_failed_tasks(pending_tasks, env)
    if resolved:
        save_queue(pending_tasks)
        print(f"  self-repaired {resolved} previously-FAILED task(s) via re-verification")

    gate_exit = daily_send._check_gate()
    if gate_exit != 0:
        print("Cycle stopped: deliverability gate is not open. No prospects queued, no sends attempted.")
        return gate_exit

    tasks = refresh_queue(cfg)
    usage = load_rate_usage()
    # The gate's cap can be lower than the founder's configured cap (e.g. a
    # bounce/spam pullback to 30/day) -- always honor whichever is stricter.
    effective_cap = min(cfg["daily_send_cap"], gate_cap())

    prospects_by_id = {}
    if os.path.exists(daily_send.PROSPECTS_CSV):
        import csv
        with open(daily_send.PROSPECTS_CSV, newline="") as f:
            for row in csv.DictReader(f):
                prospects_by_id[row["id"]] = row

    template_cache: Dict[str, str] = {}
    processed = 0
    limit = args.limit_per_tier or cfg["limit_per_tier"] * len(cfg["tiers"])
    exp_weights, exp_index = experiment.load_weights_and_start_index()
    exp_state = {"weights": exp_weights, "index": exp_index}

    for task in tasks:
        if usage["sends_today"] >= effective_cap:
            print(f"Daily send cap reached ({effective_cap}). Remaining PENDING tasks stay queued for next cycle.")
            break
        if processed >= limit:
            break
        if task["state"] != "PENDING":
            continue
        if task["next_attempt_at"] and task["next_attempt_at"] > _iso():
            continue  # still in backoff window
        process_task(task, env, template_cache, usage, prospects_by_id, cfg, exp_state, dry_run=args.dry_run)
        processed += 1

    save_queue(tasks)
    if not args.dry_run:
        save_rate_usage(usage)

    # Reconcile replies/bounces using the existing (already-audited, already
    # fixed) reconciliation script rather than reimplementing duplicate/
    # reply detection.
    if not args.dry_run:
        import subprocess
        subprocess.run([sys.executable, str(HERE / "reconcile_live.py")], cwd=str(HERE.parent.parent))

    print_status(tasks, usage, cfg)
    return 0


def print_status(tasks: List[Dict[str, Any]], usage: Dict[str, Any], cfg: Dict[str, Any]) -> None:
    counts = {s: 0 for s in STATES}
    for t in tasks:
        counts[t["state"]] = counts.get(t["state"], 0) + 1
    print("\n=== Task queue status ===")
    for s in STATES:
        print(f"  {s:15s} {counts[s]}")
    print(f"\nRate today ({usage['date']}): sends={usage['sends_today']}/{cfg['daily_send_cap']}  "
          f"resend_api_calls={usage['resend_api_calls_today']}")
    needs_approval = [t for t in tasks if t["state"] == "NEEDS_APPROVAL"]
    if needs_approval:
        print(f"\n{len(needs_approval)} task(s) need approval:")
        for t in needs_approval[:10]:
            print(f"  {t['id']:12s} {t['email']:35s} [{t['approval_level']}] {t['approval_reason']}")
    failed = [t for t in tasks if t["state"] == "FAILED"]
    if failed:
        print(f"\n{len(failed)} task(s) genuinely FAILED (retries exhausted or verification still "
              f"unresolved after re-check -- these need a human look, not another retry):")
        for t in failed[:10]:
            print(f"  {t['id']:12s} {t['email']:35s} {t['error']}")


def cmd_status(args: argparse.Namespace) -> int:
    tasks = load_queue()
    usage = load_rate_usage()
    cfg = load_config()
    print_status(tasks, usage, cfg)
    return 0


def cmd_approve(args: argparse.Namespace) -> int:
    tasks = load_queue()
    for t in tasks:
        if t["id"] == args.task_id:
            if t["state"] != "NEEDS_APPROVAL":
                print(f"Task {args.task_id} is in state {t['state']}, not NEEDS_APPROVAL. Nothing to do.")
                return 1
            t["approval_level"] = "auto"
            t["approval_reason"] += " (approved by founder)"
            t["state"] = "PENDING"
            t["updated_at"] = _iso()
            save_queue(tasks)
            print(f"Approved {args.task_id} -> PENDING")
            return 0
    print(f"Task {args.task_id} not found in queue.", file=sys.stderr)
    return 1


def main() -> int:
    p = argparse.ArgumentParser(description="Collectly outreach task runner")
    sub = p.add_subparsers(dest="cmd", required=True)

    sub.add_parser("status", help="show queue + rate status")

    p_cycle = sub.add_parser("cycle", help="run one cycle: refresh queue, send eligible tasks, reconcile")
    p_cycle.add_argument("--dry-run", action="store_true")
    p_cycle.add_argument("--limit-per-tier", type=int, default=0, help="override total tasks processed this cycle")

    p_approve = sub.add_parser("approve", help="approve a NEEDS_APPROVAL task -> PENDING")
    p_approve.add_argument("task_id")

    p_cap = sub.add_parser("set-cap", help="change daily_send_cap (requires --yes: volume/rate change)")
    p_cap.add_argument("n", type=int)
    p_cap.add_argument("--yes", action="store_true")

    args = p.parse_args()
    return {
        "status": cmd_status,
        "cycle": cmd_cycle,
        "approve": cmd_approve,
        "set-cap": cmd_set_cap,
    }[args.cmd](args)


if __name__ == "__main__":
    sys.exit(main())
