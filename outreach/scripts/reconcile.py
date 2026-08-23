#!/usr/bin/env python3
"""
Collectly CRM Auto-Logger — daily reconciliation.

Per collectly-crm-auto-logger/SKILL.md:
  1. Normalize and append to outreach-log.csv (append-only; never overwrite)
  2. Update prospect state per reply classification
  3. Rebuild outreach/prospect-states.json
  4. Detect duplicates: flag (do not silently fix) any address touched twice
     within 7 days — same bug class as the 43 duplicate_same_day rows.

Behavior:
  - Idempotent: only overwrites derived artifacts (prospect-states.json + a
    reconciliation report). Never rewrites the canonical log.
  - On schema-drift rows, flags for manual review (per skill failure mode:
    'If CSV is malformed, stop appends and report; do not corrupt the log').
"""
import csv
import io
import json
import re
import sys
from datetime import datetime, timezone, timedelta
from collections import defaultdict, Counter, OrderedDict

LOG = 'outreach/data/outreach-log.test.csv'
STATE = 'outreach/prospect-states.json'
REPORT = 'outreach/data/crm-reconciliation-2026-08-07.json'

CANON = ['id', 'email', 'touch', 'sent_at', 'replied_at', 'status',
         'next_step', 'message_id', 'detail', 'segment', 'delivered_at',
         'bounced_at', 'opened_at', 'clicked_at', 'reply_snippet']
VALID_TOUCH = {'t1', 't2', 't3', ''}
EMAIL_RE = re.compile(r'^[^@\s]+@[^@\s]+\.[^@\s]+$')
ISO_RE = re.compile(r'^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}')
ISO_INLINE_RE = re.compile(
    r'(20\d{2}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:[\.\d]*)?(?:Z|[+-]\d{2}:?\d{2})?)')


def parse_log(path):
    """Multi-line-aware csv parse of the canonical outreach log."""
    with open(path, 'r', encoding='utf-8') as f:
        raw = f.read()
    reader = csv.reader(io.StringIO(raw))
    header = next(reader)
    if header != CANON:
        raise SystemExit(f'unexpected header: {header}')
    return list(reader)


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


def normalize(rec):
    """Return dict with corrected fields where the row was schema-shifted."""
    out = dict(rec)  # shallow copy
    # Schema-drift signature: 'email' is t1/t2/t3, 'touch' looks like an email.
    if rec.get('touch') not in VALID_TOUCH and rec.get('email') in VALID_TOUCH:
        out['email'] = rec['touch']          # the actual email
        out['touch'] = rec['email']          # the actual touch
        # sent_at is actually the sender_account; recover ISO from message_id
        out['_iso_source'] = 'message_id_or_detail'
    elif rec.get('touch') in VALID_TOUCH and EMAIL_RE.match(rec.get('email', '')):
        out['_iso_source'] = 'sent_at'
    iso = parse_iso(rec.get('sent_at') or '') \
        or parse_iso(rec.get('message_id') or '') \
        or parse_iso(rec.get('detail') or '')
    if iso:
        out['_iso'] = iso.isoformat()
    return out


def validate(rec):
    """Return list of problem strings, or empty list if clean."""
    problems = []
    if rec['touch'] not in VALID_TOUCH:
        problems.append(f"touch_field={rec['touch']!r}_not_in_{sorted(VALID_TOUCH)}")
    if rec['email'] and not EMAIL_RE.match(rec['email']):
        problems.append(f"email_field={rec['email']!r}_not_email")
    if rec['sent_at'] and not ISO_RE.match(rec['sent_at']) and '@' not in rec['sent_at']:
        problems.append(f"sent_at_field={rec['sent_at']!r}_not_iso")
    if rec['id'] and not (re.match(r'^P\d{3}$', rec['id']) or rec['id'] == 'META'):
        problems.append(f"id_field={rec['id']!r}_not_prospect_id")
    return problems


def main():
    rows = parse_log(LOG)
    records = []           # clean canonical
    malformed = []         # schema-drift rows

    for idx, fields in enumerate(rows, 1):
        rec = dict(zip(CANON, fields))
        problems = validate(rec)
        if problems:
            malformed.append({
                'logical_row': idx,
                'rec': rec,
                'problems': problems,
            })
        else:
            records.append(rec)

    # Normalize all rows (clean + malformed) for duplicate-touch detection.
    normalized_all = [normalize(dict(zip(CANON, fields))) for fields in rows]

    # 7-day duplicate-touch detection (skill rule)
    timeline = defaultdict(list)
    for idx, rec in enumerate(normalized_all, 1):
        email = (rec.get('email') or '').strip().lower()
        touch = (rec.get('touch') or '').strip()
        iso = rec.get('_iso')
        if email and touch in {'t1', 't2', 't3'} and iso:
            timeline[(email, touch)].append((datetime.fromisoformat(iso), idx, rec))

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
                        'first_sent_at': t_i.isoformat(),
                        'second_logical_row': idx_j,
                        'second_sent_at': t_j.isoformat(),
                        'days_apart': round(delta.total_seconds() / 86400.0, 3),
                        'first_status': rec_i.get('status') or '',
                        'second_status': rec_j.get('status') or '',
                    })

    # Build per-prospect state from CLEAN records only.
    by_email = defaultdict(list)
    for rec in records:
        by_email[rec['email']].append(rec)

    def state_for(recs):
        statuses = [r['status'] for r in recs if r['status']]
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
        recs_sorted = sorted(recs, key=lambda r: r['sent_at'] or r['message_id'] or '')
        last = recs_sorted[-1]
        sent_history = []
        replies = []
        for r in recs_sorted:
            if r['sent_at']:
                sent_history.append({
                    'touch': r['touch'],
                    'sent_at': r['sent_at'],
                    'message_id': r['message_id'] or None,
                    'status': r['status'] or None,
                    'detail': r['detail'] or None,
                })
            if r['replied_at']:
                replies.append({
                    'received_at': r['replied_at'],
                    'source': 'log',
                    'reply_snippet': r['reply_snippet'] or None,
                })
        prospect_states[email] = {
            'prospect_id': last['id'],
            'state': state_for(recs_sorted),
            'last_contact': last['sent_at'] or last['message_id'] or None,
            'touch_count': len(sent_history),
            'sent_history': sent_history,
            'replies': replies,
            'next_step': last.get('next_step') or '',
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
    new_state['source_log'] = 'outreach/data/outreach-log.test.csv'
    new_state['contacts'] = dict(prospect_states)
    if existing.get('notes') is not None:
        new_state['notes'] = existing['notes']
    if existing.get('emails') is not None:
        new_state['emails'] = existing['emails']

    with open(STATE, 'w') as f:
        json.dump(new_state, f, indent=2)

    # Reconciliation report
    report = {
        'generated_at': datetime.now(timezone.utc).isoformat(),
        'source_log': LOG,
        'totals': {
            'logical_rows': len(rows),
            'clean_records': len(records),
            'malformed_records': len(malformed),
            'duplicate_touch_flags_7day': len(dup_flags),
            'prospect_states_emitted': len(prospect_states),
        },
        'status_distribution_clean': dict(Counter(r['status'] for r in records)),
        'touch_distribution_clean': dict(Counter(r['touch'] for r in records)),
        'malformed': malformed,
        'duplicate_touch_flags': dup_flags,
    }
    with open(REPORT, 'w') as f:
        json.dump(report, f, indent=2)

    # Human-friendly summary to stdout
    print('=== Reconciliation summary ===')
    print(f"Logical rows parsed:        {len(rows)}")
    print(f"Clean canonical records:    {len(records)}")
    print(f"Malformed (schema-drift):   {len(malformed)}")
    print(f"7-day duplicate-touch flags: {len(dup_flags)}")
    print(f"Prospect states emitted:    {len(prospect_states)}")
    print()
    print('--- Status distribution (clean) ---')
    for s, c in Counter(r['status'] for r in records).most_common():
        print(f"  {s or '(empty)':30} {c}")
    print()
    print('--- Touch distribution (clean) ---')
    for t, c in Counter(r['touch'] for r in records).most_common():
        print(f"  {t or '(empty)':20} {c}")
    print()
    print('--- Malformed row signatures (count by problem) ---')
    prob_counter = Counter()
    for m in malformed:
        for p in m['problems']:
            prob_counter[p.split('=')[0]] += 1
    for p, c in prob_counter.most_common():
        print(f"  {p}: {c}")
    print()
    print('--- 7-day duplicate-touch flags (unique email/touch) ---')
    seen = set()
    for f in dup_flags:
        key = (f['email'], f['touch'])
        if key in seen:
            continue
        seen.add(key)
        print(f"  {f['email']:35} {f['touch']}  rows {f['first_logical_row']}->{f['second_logical_row']}  days_apart={f['days_apart']}  {f['first_status']} -> {f['second_status']}")
    print()
    print(f"Wrote: {STATE}")
    print(f"Wrote: {REPORT}")


if __name__ == '__main__':
    main()
