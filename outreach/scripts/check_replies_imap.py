#!/usr/bin/env python3
"""Check Gmail via IMAP for replies to Collectly T1 outreach, triage, and auto-send follow-ups."""
import csv
import email
import email.mime.text
import imaplib
import json
import os
import re
import smtplib
import subprocess
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

def _load_env_local():
    env_path = Path(__file__).resolve().parent.parent.parent / '.env.local'
    if not env_path.exists():
        return
    with open(env_path, encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith('#') or '=' not in line:
                continue
            k, v = line.split('=', 1)
            os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))

_load_env_local()

IMAP_HOST = 'imap.gmail.com'
SMTP_HOST = 'smtp.gmail.com'
SMTP_PORT = 587
USER = os.environ.get('GMAIL_USER', 'davidmugambi104@gmail.com')
if not os.environ.get('GMAIL_APP_PASSWORD'):
    sys.exit('Missing GMAIL_APP_PASSWORD in .env.local — see .env.example')
APP_PASSWORD = os.environ['GMAIL_APP_PASSWORD']
SENDERS = [
    'jon.burdon@bertagency.co.uk',
    'jason@madebyshape.co.uk',
    'sam@buckleycreative.co.uk',
    'matt@yeahnice.studio',
    'rosa@weareflow.uk',
    'josh@geist.studio',
    'andy@ninesixty.co.uk',
    'angela@loveandlogic.co.uk',
    'andy@o8.agency',
    'chad@bebolddigital.com',
    'nikki@pennock.co',
    'devin@fluencyfirm.com',
    'max@akornmedia.com',
    'goran@artversion.com',
    'jason@foundrybend.org',
    'lennart@stanley.nu',
    'bev@brandbritain.co.uk',
    'shijo@silverpointprint.com',
    'morgan@workshopdigital.com',
    'jessie@bopdesign.com',
    'courtney.dodds@edna.studio',
    'ilyass@carbon.studio',
    'hello@underlineagency.com',
    'joe@aperitif.agency',
    'anjelika@dd.nyc',
    'info@flamingoagency.com',
    'graham.hearfield@edna.studio',
    'mellor@duo.at',
    'eleanor@oslo.agency',
]
_SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
_OUTREACH = os.path.dirname(_SCRIPT_DIR)
_COLLECTLY = os.path.dirname(_OUTREACH)
_WORKSPACE = os.path.dirname(_COLLECTLY)
_DATA = os.path.join(_OUTREACH, 'data')
_SCRIPTS = _SCRIPT_DIR
PROSPECTS_CSV = os.path.join(_DATA, 'prospects.csv')
LOG_CSV = os.path.join(_DATA, 'outreach-log.csv')
TRIAGE_SCRIPT = os.path.join(_SCRIPTS, 'triage_reply.py')
_MEMORY_DIR = os.path.join(_WORKSPACE, 'memory')
MEMORY_FILE = os.path.join(_MEMORY_DIR, '2026-07-20-collectly-launch.md')
SINCE_HOURS = 6
SUBJECT_FILTER = re.compile(r'Re:\s*Who chases invoices\?', re.I)

def load_prospects(path):
    by_email = {}
    with open(path, newline='', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            by_email[row['email'].lower()] = row
    return by_email

def fetch_replies():
    since = (datetime.now(timezone.utc) - timedelta(hours=SINCE_HOURS)).strftime('%d-%b-%Y')
    mail = imaplib.IMAP4_SSL(IMAP_HOST)
    mail.login(USER, APP_PASSWORD)
    mail.select('inbox')
    since_query = f'SINCE "{since}"'
    # IMAP requires OR (FROM a) (OR (FROM b) (FROM c)) nesting
    or_query = f'(FROM "{SENDERS[-1]}")'
    for s in reversed(SENDERS[:-1]):
        or_query = f'OR (FROM "{s}") {or_query}'
    query = f'({since_query} {or_query})'
    status, data = mail.search(None, query)
    ids = data[0].split()
    results = []
    for mid in ids:
        status, data = mail.fetch(mid, '(RFC822)')
        raw = data[0][1]
        msg = email.message_from_bytes(raw)
        subj = msg['Subject'] or ''
        if not SUBJECT_FILTER.search(subj):
            continue
        body = ''
        if msg.is_multipart():
            for part in msg.walk():
                ctype = part.get_content_type()
                cdisp = str(part.get('Content-Disposition', ''))
                if ctype == 'text/plain' and 'attachment' not in cdisp:
                    payload = part.get_payload(decode=True)
                    if payload:
                        try:
                            body = payload.decode('utf-8', errors='replace')
                        except Exception:
                            body = payload.decode('latin-1', errors='replace')
                        break
        else:
            payload = msg.get_payload(decode=True)
            if payload:
                try:
                    body = payload.decode('utf-8', errors='replace')
                except Exception:
                    body = payload.decode('latin-1', errors='replace')
        # Strip quoted sections and common signatures loosely
        body = re.sub(r'\n-+>?\s*\n.*', '', body, flags=re.S)
        body = re.sub(r'On .* wrote:.*', '', body, flags=re.S)
        body = re.sub(r'\r\n', '\n', body)
        body = body.strip()
        results.append({
            'message_id': msg['Message-ID'] or str(mid),
            'gmail_id': mid.decode(),
            'from': msg['From'],
            'to': msg['To'],
            'subject': subj,
            'date': msg['Date'],
            'body': body,
        })
    mail.logout()
    return results

def classify_reply(pid, from_addr, body):
    proc = subprocess.run(
        [sys.executable, TRIAGE_SCRIPT, '--id', pid, '--email', from_addr, '--reply', body],
        capture_output=True, text=True
    )
    return json.loads(proc.stdout)

def send_followup(to_addr, subject, body_text, in_reply_to=None):
    msg = email.mime.text.MIMEText(body_text, 'plain', 'utf-8')
    msg['Subject'] = subject
    msg['From'] = USER
    msg['To'] = to_addr
    if in_reply_to:
        msg['In-Reply-To'] = in_reply_to
        msg['References'] = in_reply_to
    server = smtplib.SMTP(SMTP_HOST, SMTP_PORT)
    server.starttls()
    server.login(USER, APP_PASSWORD)
    server.send_message(msg)
    server.quit()
    return msg['Message-ID']

def append_log(row):
    exists = os.path.exists(LOG_CSV)
    with open(LOG_CSV, 'a', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        if not exists:
            writer.writerow(['id', 'email', 'touch', 'timestamp', 'replied', 'signal', 'message_id', 'signal_details'])
        writer.writerow(row)

def touch_for_signal(signal):
    if signal == 'unsubscribe':
        return 'do_not_contact'
    return 't2_followup'

def update_memory(summary):
    with open(MEMORY_FILE, 'a', encoding='utf-8') as f:
        f.write('\n\n## Collectly reply check — ' + datetime.now(timezone.utc).isoformat() + '\n')
        f.write(summary)

def main():
    prospects = load_prospects(PROSPECTS_CSV)
    replies = fetch_replies()
    if not replies:
        print('no replies in last 6h')
        return

    sent_ids = []
    signal_counts = {}
    summaries = []
    for r in replies:
        addr_match = re.search(r'<?([^\s>]+@[^\s>]+)>?', r['from'])
        email_addr = (addr_match.group(1) if addr_match else r['from']).lower()
        prospect = prospects.get(email_addr)
        if not prospect:
            summaries.append(f"Unknown sender {email_addr} — skipped")
            continue
        pid = prospect['id']
        classification = classify_reply(pid, email_addr, r['body'])
        signal = classification['signal']
        followup = classification['followup_draft']
        signal_counts[signal] = signal_counts.get(signal, 0) + 1

        details = f"reply_len={len(r['body'])}; subject={r['subject']}"
        if signal == 'unsubscribe':
            append_log([pid, email_addr, 'do_not_contact', datetime.now(timezone.utc).isoformat(), 'yes', signal, r['message_id'], details])
            summaries.append(f"{pid} {email_addr}: {signal} — no send (do_not_contact logged)")
            continue

        sent_msg_id = send_followup(email_addr, 'Re: Who chases invoices?', followup, in_reply_to=r['message_id'])
        sent_ids.append(sent_msg_id)
        touch = touch_for_signal(signal)
        append_log([pid, email_addr, touch, datetime.now(timezone.utc).isoformat(), 'yes', signal, sent_msg_id, details])
        summaries.append(f"{pid} {email_addr}: {signal} — sent {sent_msg_id}")

    summary_text = '\n'.join([
        f"New replies: {len(replies)}",
        f"Signals: {json.dumps(signal_counts)}",
        f"Message IDs sent: {json.dumps(sent_ids)}",
        "Details:",
    ] + summaries)
    update_memory(summary_text)

    # Count totals for report
    total_pos = sum(1 for _ in open(LOG_CSV) if 'positive_' in _) if os.path.exists(LOG_CSV) else 0
    total_sent = sum(1 for row in csv.reader(open(LOG_CSV)) if row and row[0] != 'id') if os.path.exists(LOG_CSV) else 0

    print(json.dumps({
        'replies': len(replies),
        'signals': signal_counts,
        'sent_message_ids': sent_ids,
        'summary_lines': summaries,
        'total_positive_so_far': total_pos,
        'total_log_rows': total_sent,
    }, indent=2))

if __name__ == '__main__':
    main()
