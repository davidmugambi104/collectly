#!/usr/bin/env python3
"""Send outreach emails via Gmail SMTP using app-password."""
import csv, os, sys, time, smtplib, json
from email.message import EmailMessage
from pathlib import Path
from datetime import datetime, timezone

import os
SMTP_HOST = 'smtp.gmail.com'
SMTP_PORT = 465  # SSL

# GMAIL_USER / GMAIL_APP_PASSWORD live in .env.local (not a dedicated secrets
# file -- ~/.openclaw/secrets/collectly/GMAIL_USER never actually existed,
# which made non-dry-run sends crash with FileNotFoundError). Read the same
# way daily_send.py reads RESEND_API_KEY, so there's one source of truth.
ENV_PATH = Path(f'{os.path.expanduser("~")}/.openclaw/workspace/collectly/.env.local')

LOG_FILE = Path(f'{os.path.expanduser("~")}/.openclaw/workspace/collectly/outreach/data/outreach-log.csv')


def load_env() -> dict:
    env = {}
    if not ENV_PATH.exists():
        return env
    for line in ENV_PATH.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith('#') or '=' not in line:
            continue
        k, v = line.split('=', 1)
        env[k.strip()] = v.strip().strip('"').strip("'")
    return env


def load_secret(env: dict, key: str) -> str:
    val = env.get(key, '')
    if not val:
        raise FileNotFoundError(f'{key} not set in {ENV_PATH}')
    return val


# Must match reconcile_live.py:LIVE_CANON / daily_send.py:LOG_FIELDS — this
# script appends to the same outreach-log.csv, so column order and names have
# to agree exactly or rows silently misalign under the wrong header labels.
CANONICAL_FIELDS = ['id', 'email', 'touch', 'timestamp', 'replied', 'signal', 'next_step', 'message_id', 'signal_details', 'segment']

def log_rows(rows):
    file_exists = LOG_FILE.exists()
    with open(LOG_FILE, 'a', newline='') as f:
        w = csv.DictWriter(f, fieldnames=CANONICAL_FIELDS)
        if not file_exists:
            w.writeheader()
        w.writerows(rows)


def send_batch(draft_csv: Path, dry_run: bool = False, delay: float = 1.5):
    if dry_run:
        user = 'dry-run@example.com'
        password = ''
    else:
        env = load_env()
        user = load_secret(env, 'GMAIL_USER')
        password = load_secret(env, 'GMAIL_APP_PASSWORD')
    from_email = f'Davie Mugambi <{user}>'
    reply_to = 'davidmugambi104@gmail.com'

    with open(draft_csv, newline='') as f:
        drafts = list(csv.DictReader(f))

    if not drafts:
        print('No drafts to send.')
        return

    # Identify touch type from filename
    touch = 't2' if 't2' in draft_csv.name.lower() else 't1'

    print(f'Preparing to send {len(drafts)} {touch.upper()} emails from {user}')

    log = []
    sent = 0
    failed = 0

    if not dry_run:
        server = smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT)
        server.login(user, password)

    for row in drafts:
        msg = EmailMessage()
        msg['From'] = from_email
        msg['Reply-To'] = reply_to
        msg['To'] = row['to']
        msg['Subject'] = row['subject']
        msg.set_content(row['body'])

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
            log.append({
                'id': row['id'],
                'email': row['to'],
                'touch': touch,
                'timestamp': datetime.now(timezone.utc).isoformat(),
                'replied': '',
                'signal': status,
                'next_step': '',
                'message_id': message_id,
                'signal_details': 'gmail_fallback',
                'segment': ''
            })
        except Exception as e:
            print('  failed', row['to'], str(e)[:200])
            failed += 1
            log.append({
                'id': row['id'],
                'email': row['to'],
                'touch': touch,
                'timestamp': datetime.now(timezone.utc).isoformat(),
                'replied': '',
                'signal': 'failed',
                'next_step': '',
                'message_id': '',
                'signal_details': f'error: {e}',
                'segment': ''
            })
        time.sleep(delay)

    if not dry_run:
        server.quit()

    if log:
        log_rows(log)

    print(f'Done. Sent: {sent}, Failed: {failed}, Total: {len(drafts)}')


if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('draft_csv')
    parser.add_argument('--dry-run', action='store_true')
    parser.add_argument('--delay', type=float, default=1.5)
    args = parser.parse_args()
    send_batch(Path(args.draft_csv), dry_run=args.dry_run, delay=args.delay)
