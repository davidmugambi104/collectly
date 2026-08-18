#!/usr/bin/env python3
"""Disciplined subject-line experimentation for Collectly cold outreach.

Rotates a small set of subject-line variants and enforces the kill/scale
rules already approved in outreach/policy/collectly_bot_policy.md section 3
("the actual scaling judgment, pre-decided"):
  - reply rate < 2% after >= 50 sends of a variant -> weight 0 (paused,
    not sent again without manual review)
  - reply rate > 8% after >= 30 sends of a variant -> weight x3
  - otherwise: even weight (default rotation)

$0 cost, no new tooling, no approval needed for routine operation (this is
"auto" per task_runner.py's approval-level docstring -- it's rotating
copy, not changing volume/rate/billing/credentials).

Deliberately scoped to ONE dimension (subject line), not the full
matrix in collectly_bot_policy.md section 2 (subject x hook x niche).
At this channel's actual volume, splitting across many dimensions before
any one of them has enough sends to read the signal would just add
noise -- discipline here means testing fewer things well, not everything
at once.

Never pauses every variant: if the rules would kill all of them
simultaneously, falls back to even weights rather than going dark --
a false-kill from unlucky small-sample noise across the board shouldn't
silently halt the whole channel.

Which variant a send used is recorded in outreach-log.csv's
signal_details field as "subj:<id>" appended to the existing
"<template>; tier<N>" text -- no schema/column change needed.
"""
from __future__ import annotations

import csv
import json
import os
import re
from pathlib import Path
from typing import Dict, List, Tuple

HERE = Path(__file__).resolve().parent
DATA = HERE.parent / "data"
LOG_CSV = DATA / "outreach-log.csv"
STATUS_PATH = DATA / "experiment-status.json"

SUBJECT_VARIANTS: List[Tuple[str, str]] = [
    ("A", "QBO invoice, 2 weeks overdue, awkward to chase?"),
    ("B", "Chasing an overdue invoice yet?"),
    ("C", "{{first_name}} -- quick one on your overdue QBO invoices"),
    ("D", "Awkward client invoice still unpaid?"),
]

KILL_MIN_SENDS = 50
KILL_MAX_REPLY_RATE = 0.02
SCALE_MIN_SENDS = 30
SCALE_MIN_REPLY_RATE = 0.08
SCALE_WEIGHT_MULTIPLIER = 3


def variant_ids() -> List[str]:
    return [v[0] for v in SUBJECT_VARIANTS]


def subject_text(variant_id: str, prospect: Dict[str, str]) -> str:
    for vid, text in SUBJECT_VARIANTS:
        if vid == variant_id:
            return text.replace("{{first_name}}", prospect.get("first_name", ""))
    return SUBJECT_VARIANTS[0][1]


def _extract_variant(signal_details: str) -> str:
    m = re.search(r"subj:([A-Z])", signal_details or "")
    if m and m.group(1) in variant_ids():
        return m.group(1)
    return "A"  # rows from before this existed used the original baseline copy, i.e. variant A


def compute_stats() -> Dict[str, Dict[str, float]]:
    """sent/replied/reply_rate per variant, from the live log + reply state."""
    stats = {vid: {"sent": 0, "replied": 0} for vid in variant_ids()}
    if not LOG_CSV.exists():
        return {vid: {**s, "reply_rate": 0.0} for vid, s in stats.items()}

    import outreach_state
    state = outreach_state.load_state()

    with open(LOG_CSV, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            if (row.get("signal") or "") != "sent":
                continue
            vid = _extract_variant(row.get("signal_details", ""))
            stats[vid]["sent"] += 1
            email = (row.get("email") or "").strip().lower()
            contact = state.get("contacts", {}).get(email, {})
            if contact.get("state") == "replied" or contact.get("replies"):
                stats[vid]["replied"] += 1

    return {
        vid: {**s, "reply_rate": (s["replied"] / s["sent"]) if s["sent"] else 0.0}
        for vid, s in stats.items()
    }


def decide_weights(stats: Dict[str, Dict[str, float]]) -> Dict[str, float]:
    """Apply the pre-decided kill/scale rules. Never returns all-zero."""
    weights = {}
    for vid, s in stats.items():
        w = 1.0
        if s["sent"] >= KILL_MIN_SENDS and s["reply_rate"] < KILL_MAX_REPLY_RATE:
            w = 0.0
        elif s["sent"] >= SCALE_MIN_SENDS and s["reply_rate"] > SCALE_MIN_REPLY_RATE:
            w = float(SCALE_WEIGHT_MULTIPLIER)
        weights[vid] = w
    if all(w == 0.0 for w in weights.values()):
        return {vid: 1.0 for vid in weights}
    return weights


def pick_variant(index: int, weights: Dict[str, float]) -> str:
    """Deterministic weighted round-robin by running send index -- not
    random, so distribution is reproducible and exact, no RNG to debug."""
    ids = variant_ids()
    expanded: List[str] = []
    for vid in ids:
        reps = max(0, round(weights.get(vid, 1.0)))
        expanded.extend([vid] * reps)
    if not expanded:
        expanded = ids
    return expanded[index % len(expanded)]


def load_weights_and_start_index() -> tuple[Dict[str, float], int]:
    """One call per batch/cycle -- computes stats+weights once, and the
    running index to hand to pick_variant() for each successive send in
    that batch (caller increments locally, does not recompute per-send)."""
    stats = compute_stats()
    weights = decide_weights(stats)
    start_index = sum(s["sent"] for s in stats.values())
    return weights, start_index


def main() -> int:
    stats = compute_stats()
    weights = decide_weights(stats)
    payload = {
        "variants": {
            vid: {**stats[vid], "weight": weights[vid], "text": text}
            for vid, text in SUBJECT_VARIANTS
        },
        "thresholds": {
            "kill_min_sends": KILL_MIN_SENDS,
            "kill_max_reply_rate": KILL_MAX_REPLY_RATE,
            "scale_min_sends": SCALE_MIN_SENDS,
            "scale_min_reply_rate": SCALE_MIN_REPLY_RATE,
            "scale_weight_multiplier": SCALE_WEIGHT_MULTIPLIER,
        },
    }
    DATA.mkdir(parents=True, exist_ok=True)
    tmp = STATUS_PATH.with_name(f".{STATUS_PATH.name}.tmp-{os.getpid()}")
    tmp.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(tmp, STATUS_PATH)

    print("Subject-line variant performance:")
    for vid in variant_ids():
        s = stats[vid]
        print(f"  {vid}: sent={s['sent']:4d} replied={s['replied']:3d} "
              f"reply_rate={s['reply_rate']:.1%}  weight={weights[vid]}")
    return 0


if __name__ == "__main__":
    import sys
    sys.exit(main())
