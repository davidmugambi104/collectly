#!/usr/bin/env python3
"""Send t2/t3/t4 to prospects at the right cadence intervals.

Cadence (per spec):
  t1: day 0
  t2: day 3 (short bump, same one-line question)
  t3: day 7 (ask if someone else owns billing)
  t4: day 14 (close the loop)

Skips anyone whose status is in SKIP_STATUSES (replied/positive/booked/bounced/etc).
"""
import csv, os, subprocess, time, sys
from datetime import datetime, timedelta

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from state import load_prospects, load_log, append_log, SKIP_STATUSES

YOUR_NAME = 'David Mugambi'
SEGMENT_LABEL = {
    'web_design': 'web design studio',
    'design': 'design studio',
    'branding': 'branding studio',
    'motion': 'motion design studio',
    'digital_marketing': 'marketing agency',
    'ppc': 'PPC agency',
    'seo': 'SEO agency',
    'ecommerce_agency': 'ecommerce agency',
    'beauty_marketing': 'beauty marketing agency',
}

CADENCE = {
    't2': 3,   # days after t1
    't3': 7,
    't4': 14,
}


def render(template_path, row):
    with open(template_path) as f:
        template = f.read()
    body = template
    body = body.replace('{{first_name}}', row.get('first_name', ''))
    body = body.replace('{{company}}', row.get('company', ''))
    body = body.replace('{{segment_label}}', SEGMENT_LABEL.get(row.get('industry', ''), 'agency'))
    body = body.replace('{{your_name}}', YOUR_NAME)
    # Build a per-recipient unsubscribe token (base64url of email).
    # The /api/unsubscribe endpoint will mark this address as unsubscribed
    # from Collectly marketing emails (CAN-SPAM / UK PECR / AU Spam Act).
    import base64
    email = (row.get('email') or '').lower().strip().encode('utf-8')
    token = base64.urlsafe_b64encode(email).decode('utf-8').rstrip('=')
    body = body.replace('{{unsubscribe_token}}', token)
    return body


def split_subject(body, default):
    lines = body.split('\n')
    subject = default
    skip = 0
    for i, line in enumerate(lines):
        if line.strip().startswith('Subject:'):
            subject = line.replace('Subject:', '').strip()
            skip = i + 1
            break
    return subject, '\n'.join(lines[skip:]).strip()


def send_via_gog(to, subject, body, account='davidmugambi104@gmail.com'):
    body_file = f'/tmp/email-body-{int(time.time()*1000000)}.txt'
    with open(body_file, 'w') as f:
        f.write(body)
    try:
        result = subprocess.run([
            'gog', 'gmail', 'send',
            '--to', to,
            '--subject', subject,
            '--body-file', body_file,
            '--account', account,
        ], capture_output=True, text=True, timeout=30)
        return result.returncode == 0, (result.stdout + result.stderr)[:300]
    finally:
        try: os.unlink(body_file)
        except: pass


def find_touch_targets(touch, log):
    """For each prospect who got t{N-1} and is not in skip-status, return list if cadence allows."""
    targets = []
    prev_touch = f't{int(touch[1:]) - 1}'
    interval = CADENCE[touch]
    now = datetime.utcnow()
    for r in log:
        if r.get('touch') != prev_touch:
            continue
        if r.get('status', '').lower() not in ('sent',):
            continue
        sent_at = r.get('sent_at', '')
        if not sent_at:
            continue
        try:
            sent_dt = datetime.strptime(sent_at, '%Y-%m-%dT%H:%M:%SZ')
        except ValueError:
            continue
        # Was it sent interval days ago or more?
        if (now - sent_dt) >= timedelta(days=interval):
            pid = r.get('id')
            email = r.get('email')
            targets.append((pid, email, r.get('segment', '')))
    return targets


def find_skipped_ids(log):
    skip = set()
    for r in log:
        if r.get('status', '').lower() in SKIP_STATUSES:
            skip.add(r.get('id'))
    return skip


def main():
    touch = os.environ.get('OUTREACH_TOUCH', 't2')
    if touch not in CADENCE:
        print(f"unknown touch: {touch}")
        return

    prospects = {p['id']: p for p in load_prospects()}
    log = load_log()
    skip = find_skipped_ids(log)
    targets = find_touch_targets(touch, log)
    targets = [(pid, email, seg) for pid, email, seg in targets if pid not in skip]

    print(f"=== {touch} run ===")
    print(f"targets: {len(targets)}")

    template_path = f'/home/davie/.openclaw/workspace/collectly/outreach/messages/{touch}-{"followup" if touch == "t2" else "final" if touch == "t3" else "close"}.md'
    default_subject = f'Re: Who chases invoices?'

    sent = 0
    errors = 0
    for pid, email, segment in targets:
        row = prospects.get(pid, {})
        body = render(template_path, row)
        subject, plain = split_subject(body, default_subject)
        ok, detail = send_via_gog(email, subject, plain)
        if ok:
            append_log(pid, email, touch, 'sent', detail, segment)
            sent += 1
            print(f"✅ {pid} {email}")
        else:
            append_log(pid, email, touch, 'err', detail, segment)
            errors += 1
            print(f"❌ {pid} {email}: {detail[:100]}")
        time.sleep(2)

    print(f"\n=== {sent} sent, {errors} errors ===")
    return {'touch': touch, 'sent': sent, 'errors': errors}


if __name__ == '__main__':
    main()
