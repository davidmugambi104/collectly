#!/usr/bin/env python3
"""Send T2 follow-up batch (and any T1 remaining) via Gmail fallback.

Renders unsubscribe tokens as opaque pseudo-tokens (we don't have a real
token endpoint wired for outbound CSV sends), then sends via Gmail SMTP.
"""
import argparse
import base64
import csv
import hashlib
import os
import sys
import time
from datetime import datetime, timezone
from email.message import EmailMessage
from pathlib import Path

import smtplib

SMTP_HOST = 'smtp.gmail.com'
SMTP_PORT = 465  # SSL

SECRETS = Path('/home/davie/.openclaw/secrets/collectly')
USER_FILE = SECRETS / 'GMAIL_USER'
PASS_FILE = SECRETS / 'GMAIL_APP_PASSWORD'

LOG_FILE = Path('/home/davie/.openclaw/workspace/collectly/outreach/data/outreach-log.csv')


def load_secret(path: Path) -> str:
    if not path.exists():
        raise FileNotFoundError(f'{path} not found')
    return path.read_text().strip()


def unsubscribe_token(email: str) -> str:
    """Generate a deterministic opaque unsubscribe token for an email."""
    salt = 'collectly-2026-07'
    return base64.urlsafe_b64encode(
        hashlib.sha256(f'{salt}:{email}'.encode()).digest()
    ).decode().rstrip('=')[:32]


def render_body(body: str, email: str) -> str:
    token = unsubscribe_token(email)
    return body.replace('{{unsubscribe_token}}', token).replace('{{unsu…oken}}', token)


CANONICAL_FIELDS = ['id', 'email', 'touch', 'sent_at', 'replied_at', 'status', 'next_step', 'message_id', 'detail', 'segment']


def log_rows(rows):
    file_exists = LOG_FILE.exists()
    with open(LOG_FILE, 'a', newline='') as f:
        w = csv.DictWriter(f, fieldnames=CANONICAL_FIELDS)
        if not file_exists:
            w.writeheader()
        w.writerows(rows)


def _load_log():
    if not LOG_FILE.exists():
        return []
    rows = []
    with open(LOG_FILE, newline='') as f:
        for raw in csv.reader(f):
            if not raw or raw[0] == 'id':
                continue
            if len(raw) == 10:
                rows.append(dict(zip(CANONICAL_FIELDS, raw)))
            elif len(raw) == 9 and raw[1] in {'t1', 't2', 't3', 't4'}:
                rows.append({
                    'id': raw[0], 'email': raw[2], 'touch': raw[1],
                    'sent_at': raw[7], 'replied_at': '', 'status': raw[5],
                    'next_step': '', 'message_id': raw[6], 'detail': raw[8],
                    'segment': ''
                })
    return rows


def _already_sent_today(log, prospect_id, touch):
    today = datetime.now(timezone.utc).strftime('%Y-%m-%d')
    for r in log:
        if r.get('id') == prospect_id and r.get('touch') == touch and (r.get('sent_at') or '').startswith(today):
            return True
    return False


def send_batch(draft_csv: Path, dry_run: bool = False, delay: float = 1.5):
    if dry_run:
        user = 'dry-run@example.com'
        password = ''
    else:
        user = load_secret(USER_FILE)
        password = load_secret(PASS_FILE)
    from_email = f'Davie Mugambi <{user}>'
reply_to = 'davidmugambi104@gmail.com'

    with open(draft_csv, newline='') as f:
        drafts = list(csv.DictReader(f))

    if not drafts:
        print('No drafts to send.')
        return

    touch = 't2' if 't2' in draft_csv.name.lower() else 't1'
    log = _load_log()

    # Idempotency: skip anyone already sent this touch today.
    skipped = []
    to_send = []
    for row in drafts:
        if _already_sent_today(log, row['id'], touch):
            skipped.append(row)
        else:
            to_send.append(row)

    print(f'Preparing to send {len(to_send)} {touch.upper()} emails from {user} (skipping {len(skipped)} already sent today)')

    if not to_send:
        return

    sent = 0
    failed = 0

    if not dry_run:
        server = smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT)
        server.login(user, password)

    log = []
    sent = 0
    failed = 0

    if not dry_run:
        server = smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT)
        server.login(user, password)

    log_entries = []
    for row in to_send:
        msg = EmailMessage()
        msg['From'] = from_email
        msg['Reply-To'] = reply_to
        msg['To'] = row['to']
        msg['Subject'] = row['subject']
        msg.set_content(render_body(row['body'], row['to']))

        if dry_run:
            print('[DRY RUN] would send to', row['to'], 'subject:', row['subject'][:60])
            continue

        try:
            errs = server.send_message(msg)
            if errs:
                print('  partial failure', row['to'], errs)
                failed += 1
                status = 'partial'
                message_id = ''
            else:
                print('  sent', row['to'])
                sent += 1
                status = 'sent'
                message_id = ''
            log_entries.append({
                'id': row['id'],
                'email': row['to'],
                'touch': touch,
                'sent_at': datetime.now(timezone.utc).isoformat(),
                'replied_at': '',
                'status': status,
                'next_step': '',
                'message_id': message_id,
                'detail': 'gmail_fallback',
                'segment': ''
            })
        except Exception as e:
            print('  failed', row['to'], str(e)[:200])
            failed += 1
            log_entries.append({
                'id': row['id'],
                'email': row['to'],
                'touch': touch,
                'sent_at': datetime.now(timezone.utc).isoformat(),
                'replied_at': '',
                'status': 'failed',
                'next_step': '',
                'message_id': '',
                'detail': f'error: {e}',
                'segment': ''
            })
        time.sleep(delay)

    if not dry_run:
        server.quit()

    if log_entries:
        log_rows(log_entries)

    print(f'Done. Sent: {sent}, Failed: {failed}, Total: {len(to_send)} (skipped {len(skipped)})')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('draft_csv')
    parser.add_argument('--dry-run', action='store_true')
    parser.add_argument('--delay', type=float, default=1.5)
    args = parser.parse_args()
    send_batch(Path(args.draft_csv), dry_run=args.dry_run, delay=args.delay)
