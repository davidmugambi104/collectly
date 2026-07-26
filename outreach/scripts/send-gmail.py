#!/usr/bin/env python3
"""Send outreach emails via Gmail SMTP using app-password."""
import csv, os, sys, time, smtplib, json
from email.message import EmailMessage
from pathlib import Path
from datetime import datetime, timezone

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


CANONICAL_FIELDS = ['id','email','touch','sent_at','replied_at','status','next_step','message_id','detail','segment']

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
        user = load_secret(USER_FILE)
        password = load_secret(PASS_FILE)
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
            log.append({
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
