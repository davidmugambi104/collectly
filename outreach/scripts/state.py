#!/usr/bin/env python3
"""Collectly outreach state machine.

Each prospect has a status. The sender skips prospects whose status is in:
  sent, replied, positive_reply, booked_chat, bounced, do_not_contact, unsubscribed

Transitions are written to a separate log (not the master CSV) so the
master list stays clean for re-runs.
"""
import csv
import os
from datetime import datetime

CSV_PATH = f'{os.path.expanduser("~")}/.openclaw/workspace/collectly/outreach/data/prospects.csv'
LOG_PATH = f'{os.path.expanduser("~")}/.openclaw/workspace/collectly/outreach/data/outreach-log.csv'

# Statuses that mean "do not contact again"
SKIP_STATUSES = {
    'sent', 'replied', 'replied_do_not_contact', 'positive_reply',
    'booked_chat', 'bounced', 'do_not_contact', 'unsubscribed',
    'wrong_person_forward',
}

# Statuses that mean "still in the queue, ok to send"
OPEN_STATUSES = {'new', 'pending', None, ''}


def load_prospects():
    with open(CSV_PATH, newline='') as f:
        return list(csv.DictReader(f))


def save_prospects(rows):
    if not rows:
        return
    fieldnames = list(rows[0].keys())
    with open(CSV_PATH, 'w', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def load_log():
    if not os.path.exists(LOG_PATH):
        return []
    with open(LOG_PATH, newline='') as f:
        return list(csv.DictReader(f))


def append_log(pid, email, touch, status, detail='', segment='', sent_at=None):
    sent_at = sent_at or datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ')
    file_exists = os.path.exists(LOG_PATH)
    with open(LOG_PATH, 'a', newline='') as f:
        writer = csv.writer(f)
        if not file_exists:
            writer.writerow(['id', 'email', 'touch', 'sent_at', 'replied_at', 'status', 'next_step', 'message_id', 'detail', 'segment'])
        writer.writerow([pid, email, touch, sent_at, '', status, '', '', detail, segment])


def is_skipped(pid, log_rows):
    """A prospect is skipped if any log row for them has a SKIP_STATUS."""
    for row in log_rows:
        if row.get('id') == pid and row.get('status', '').lower() in SKIP_STATUSES:
            return True
    return False


def is_in_open_status(pid, log_rows):
    """Open = new or pending. Skipped if any prior skip-status exists."""
    prior = [r for r in log_rows if r.get('id') == pid]
    if not prior:
        return True  # never contacted
    for r in prior:
        if r.get('status', '').lower() in SKIP_STATUSES:
            return False
    return False
