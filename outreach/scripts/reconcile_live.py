#!/usr/bin/env python3
"""
Collectly CRM Auto-Logger — daily reconciliation against the LIVE primary log.

Per collectly-crm-auto-logger/SKILL.md:
  1. Normalize and append to outreach/data/outreach-log.csv (append-only; never
     overwrite). This script READS the live log; it does not write to it.
  2. Update prospect state per reply classification.
  3. Rebuild outreach/prospect-states.json with current per-prospect status.
  4. Detect duplicates: FLAG (do not silently fix) any address touched twice
     within 7 days — same bug class as the 43 duplicate_same_day rows in the
     historical test log (outreach-log.test.csv).

Behavior:
  - Idempotent: only overwrites derived artifacts (prospect-states.json +
    today's reconciliation report). Never rewrites the canonical live log.
  - On schema-drift rows, flags for manual review (per skill failure mode:
    'If CSV is malformed, stop appends and report; do not corrupt the log').
  - Source is explicitly outreach/data/outreach-log.csv (the live primary
    log), NOT outreach-log.test.csv. The historical test log is intentionally
    excluded from the per-prospect SoT rebuild (per 2026-08-08 FLAG-3 from
    yesterday's run — do not silently re-merge 41 historical test contacts).

Run from the repo root (e.g. ~/.openclaw/workspace/collectly).
"""
import csv
import io
import json
import re
import sys
from datetime import datetime, timezone, timedelta
from collections import defaultdict, Counter, OrderedDict

LIVE_LOG = 'outreach/data/outreach-log.csv'
STATE = 'outreach/prospect-states.json'
REPORT_DATE = datetime.now(timezone.utc).strftime('%Y-%m-%d')
REPORT = f'outreach/data/crm-reconciliation-{REPORT_DATE}.json'

# Live log schema (must match daily_send.py:LOG_FIELDS — keep in sync)
# Order matches the on-disk CSV produced by daily_send.py so the existing
# 34 rows map correctly. Field renames vs prior schema: sent_at→timestamp,
# replied_at→replied, status→signal, detail→signal_details.
LIVE_CANON = ['id', 'email', 'touch', 'timestamp', 'replied', 'signal',
              'next_step', 'message_id', 'signal_details', 'segment']
VALID_TOUCH = {'t1', 't2', 't3', ''}
EMAIL_RE = re.compile(r'^[^@\s]+@[^@\s]+\.[^@\s]+$')
ISO_RE = re.compile(r'^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}')
ISO_INLINE_RE = re.compile(
    r'(20\d{2}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:[\.\d]*)?(?:Z|[+-]\d{2}:?\d{2})?)')
ID_RE = re.compile(r'^P\d{3}$|^META$|^PX-\d+-\d+$')


def parse_log(path):
    """Multi-line-aware csv parse of the live outreach log."""
    with open(path, 'r', encoding='utf-8') as f:
        raw = f.read()
    reader = csv.reader(io.StringIO(raw))
    rows = list(reader)
    if not rows:
        return [], []
    header = rows[0]
    return header, rows[1:]


def parse_iso(s):
    if not s:
        return None
    m = ISO_INLINE_RE.search(s)
    if not m:
        return None
    ts = m.group(1).rstrip('Z')
    try:
        dt = datetime.fromisoformat(ts)
    except ValueError:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    else:
        dt = dt.astimezone(timezone.utc)
    return dt


def validate_live(rec):
    """Return list of problem strings, or empty list if clean."""
    problems = []
    # Required fields present
    for k in ('id', 'email', 'touch', 'timestamp'):
        if rec.get(k, '') == '' and rec.get(k) != '':
            problems.append(f"missing_required={k}")
    # id shape
    if rec.get('id') and not ID_RE.match(rec['id']):
        problems.append(f"id_field={rec['id']!r}_not_prospect_id")
    # touch enum
    if rec.get('touch') not in VALID_TOUCH:
        problems.append(f"touch_field={rec['touch']!r}_not_in_{sorted(VALID_TOUCH)}")
    # email shape (only if non-empty)
    if rec.get('email') and not EMAIL_RE.match(rec['email']):
        problems.append(f"email_field={rec['email']!r}_not_email")
    # timestamp ISO (only if non-empty)
    if rec.get('timestamp') and not ISO_RE.match(rec['timestamp']):
        problems.append(f"timestamp_field={rec['timestamp']!r}_not_iso")
    return problems


def normalize(rec):
    """Return dict with normalized/derived fields."""
    out = dict(rec)
    ts = parse_iso(rec.get('timestamp') or '')
    if ts:
        out['_iso'] = ts.isoformat()
    return out


def main():
    header, data_rows = parse_log(LIVE_LOG)
    header_matches = (header == LIVE_CANON)

    records = []          # clean canonical
    malformed = []        # schema-drift rows
    normalized_all = []   # all rows, for duplicate detection

    for idx, fields in enumerate(data_rows, 1):
        if len(fields) != len(LIVE_CANON):
            malformed.append({
                'logical_row': idx,
                'raw_fields': fields,
                'problems': [
                    f"wrong_column_count got={len(fields)} expected={len(LIVE_CANON)}",
                ],
            })
            # Still produce a normalized stub so duplicate detection can see it
            padded = (fields + [''] * len(LIVE_CANON))[:len(LIVE_CANON)]
            normalized_all.append(normalize(dict(zip(LIVE_CANON, padded))))
            continue
        rec = dict(zip(LIVE_CANON, fields))
        problems = validate_live(rec)
        if problems:
            malformed.append({
                'logical_row': idx,
                'rec': rec,
                'problems': problems,
            })
        else:
            records.append(rec)
        normalized_all.append(normalize(rec))

    # 7-day duplicate-touch detection (skill rule)
    timeline = defaultdict(list)
    for idx, rec in enumerate(normalized_all, 1):
        email = (rec.get('email') or '').strip().lower()
        touch = (rec.get('touch') or '').strip()
        iso = rec.get('_iso')
        if email and touch in {'t1', 't2', 't3'} and iso:
            timeline[(email, touch)].append(
                (datetime.fromisoformat(iso), idx, rec)
            )

    dup_flags = []
    for (email, touch), entries in timeline.items():
        entries.sort()
        for i in range(len(entries)):
            for j in range(i + 1, len(entries)):
                t_i, idx_i, rec_i = entries[i]
                t_j, idx_j, rec_j = entries[j]
                delta = t_j - t_i
                if delta <= timedelta(days=7):
                    dup_flags.append({
                        'email': email,
                        'touch': touch,
                        'first_logical_row': idx_i,
                        'first_timestamp': t_i.isoformat(),
                        'second_logical_row': idx_j,
                        'second_timestamp': t_j.isoformat(),
                        'days_apart': round(delta.total_seconds() / 86400.0, 3),
                        'first_signal': rec_i.get('signal') or '',
                        'second_signal': rec_j.get('signal') or '',
                    })

    # Build per-prospect state from CLEAN records only.
    by_email = defaultdict(list)
    for rec in records:
        if rec.get('email'):
            by_email[rec['email']].append(rec)

    def state_for(recs):
        # Priority order — top-of-list wins. Mirrors the existing script.
        statuses = [r.get('signal', '') for r in recs if r.get('signal', '')]
        pri = [
            'replied_do_not_contact', 'closed_lost', 'closed_won', 'booked',
            'replied', 'replied_positive', 'replied_not_interested',
            'replied_unsubscribe',
            't2_sent', 't1_sent',
            'err', 'duplicate_same_day', 'sent', 't2_drafts_queued',
            'REPLIED',
        ]
        for p in pri:
            if p in statuses:
                return p
        return statuses[-1] if statuses else 'unknown'

    prospect_states = OrderedDict()
    for email, recs in by_email.items():
        recs_sorted = sorted(recs, key=lambda r: r.get('timestamp') or '')
        last = recs_sorted[-1]
        sent_history = []
        replies = []
        for r in recs_sorted:
            if r.get('timestamp'):
                sent_history.append({
                    'touch': r['touch'],
                    'sent_at': r['timestamp'],
                    'message_id': r.get('message_id') or None,
                    'signal': r.get('signal') or None,
                    'signal_details': r.get('signal_details') or None,
                })
            if r.get('replied'):
                replies.append({
                    'received_at': r['replied'],
                    'source': 'live_log',
                })
        prospect_states[email] = {
            'prospect_id': last['id'],
            'state': state_for(recs_sorted),
            'last_contact': last.get('timestamp') or None,
            'touch_count': len(sent_history),
            'sent_history': sent_history,
            'replies': replies,
            'next_step': '',
        }

    # Preserve any top-level keys we don't generate (notes, emails, etc.)
    existing = {}
    try:
        with open(STATE, 'r') as f:
            existing = json.load(f)
    except FileNotFoundError:
        pass

    new_state = OrderedDict()
    new_state['generated_at'] = datetime.now(timezone.utc).isoformat()
    new_state['source_log'] = 'outreach/data/outreach-log.csv'
    new_state['contacts'] = dict(prospect_states)
    # Carry the explanatory note forward if present (do not overwrite silently)
    if existing.get('note') is not None:
        new_state['note'] = existing['note']
    if existing.get('notes') is not None:
        new_state['notes'] = existing['notes']
    if existing.get('emails') is not None:
        new_state['emails'] = existing['emails']

    with open(STATE, 'w') as f:
        json.dump(new_state, f, indent=2)

    # Action flags
    action_flags = []
    action_flags.append({
        'id': 'FLAG-LIVE-1',
        'severity': 'info',
        'summary': (
            f"Live outreach-log.csv has {len(records)} clean data row(s) "
            f"(plus {len(malformed)} malformed). All current rows are "
            f"signal=send_failed at 2026-08-08T08:23:09Z — gate is BLOCKED "
            "(resend_daily_cap=0). No real sends have succeeded since "
            "2026-07-30."
        ),
    })
    if not header_matches:
        action_flags.append({
            'id': 'FLAG-LIVE-2',
            'severity': 'medium',
            'summary': (
                f"Live log header does not match expected schema "
                f"({LIVE_CANON}). Got: {header}."
            ),
        })
    if dup_flags:
        action_flags.append({
            'id': 'FLAG-LIVE-3',
            'severity': 'high',
            'summary': (
                f"{len(dup_flags)} duplicate-touch flag(s) in the live log "
                "(same address+touch within 7 days). NOT silently fixed — "
                "review before resuming outreach."
            ),
            'flags': dup_flags,
        })
    if malformed:
        action_flags.append({
            'id': 'FLAG-LIVE-4',
            'severity': 'medium',
            'summary': (
                f"{len(malformed)} malformed row(s) detected in the live log. "
                "Per skill failure mode, appends were stopped and rows are "
                "flagged for manual review."
            ),
            'malformed_rows': malformed,
        })
    if not prospect_states:
        action_flags.append({
            'id': 'FLAG-LIVE-5',
            'severity': 'low',
            'summary': (
                "Prospect-states.json contacts map is empty. This is the "
                "expected steady-state under deliverability gate=BLOCK — "
                "no live-log entries to emit."
            ),
        })

    # Reconciliation report
    report = {
        'generated_at': datetime.now(timezone.utc).isoformat(),
        'run_reason': (
            'daily CRM reconciliation (cron 39bb1523) — LIVE primary log'
        ),
        'live_log': {
            'path': LIVE_LOG,
            'header': header,
            'expected_header': LIVE_CANON,
            'header_matches_expected': header_matches,
            'row_count_data': len(data_rows),
            'touch_distribution': dict(Counter(
                r['touch'] for r in records
            )),
            'signal_distribution': dict(Counter(
                r.get('signal', '') for r in records
            )),
        },
        'rebuild': {
            'prospect_states_path': STATE,
            'prospect_states_emitted': len(prospect_states),
            'historical_test_log_excluded': True,
            'reason': (
                'live log is the canonical source per SKILL.md; historical '
                'outreach-log.test.csv is intentionally excluded from the '
                'per-prospect SoT to avoid silently re-merging 41 test-cohort '
                'contacts (FLAG-3 from 2026-08-07 reconciliation).'
            ),
        },
        'duplicate_touch_flags_7day': dup_flags,
        'malformed_rows': malformed,
        'malformed_rows_total': len(malformed),
        'action_flags': action_flags,
        'row_count': len(records),
    }
    with open(REPORT, 'w') as f:
        json.dump(report, f, indent=2)

    # Human-friendly summary
    print('=== CRM reconciliation (live log) — '
          f'{datetime.now(timezone.utc).isoformat()} ===')
    print(f"Live log:                  {LIVE_LOG}")
    print(f"Header matches expected:   {header_matches}")
    print(f"Data rows (logical):       {len(data_rows)}")
    print(f"Clean canonical records:   {len(records)}")
    print(f"Malformed rows:            {len(malformed)}")
    print(f"7-day duplicate-touch:     {len(dup_flags)}")
    print(f"Prospect states emitted:   {len(prospect_states)}")
    print()
    print('--- Touch distribution (clean) ---')
    for t, c in Counter(r['touch'] for r in records).most_common():
        print(f"  {t or '(empty)':20} {c}")
    print()
    print('--- Signal distribution (clean) ---')
    for s, c in Counter(r.get('signal', '') for r in records).most_common():
        print(f"  {s or '(empty)':30} {c}")
    if malformed:
        print()
        print('--- Malformed row signatures (count by problem) ---')
        prob_counter = Counter()
        for m in malformed:
            for p in m['problems']:
                prob_counter[p.split('=')[0]] += 1
        for p, c in prob_counter.most_common():
            print(f"  {p}: {c}")
    if dup_flags:
        print()
        print('--- 7-day duplicate-touch flags ---')
        seen = set()
        for f in dup_flags:
            key = (f['email'], f['touch'])
            if key in seen:
                continue
            seen.add(key)
            print(
                f"  {f['email']:35} {f['touch']}  "
                f"rows {f['first_logical_row']}->{f['second_logical_row']}  "
                f"days_apart={f['days_apart']}  "
                f"{f['first_signal']} -> {f['second_signal']}"
            )
    print()
    print(f"Wrote: {STATE}")
    print(f"Wrote: {REPORT}")


if __name__ == '__main__':
    main()
