#!/usr/bin/env python3
"""Send t2 followup to prospects who haven't replied to t1 (sent 2026-07-20).

T2 fires on day 3 (2026-07-23) for any prospect with no reply logged.
Reads the t1 log to know who was sent t1, reads outreach-log.csv for replies.
"""
import csv, subprocess, time, os
from datetime import datetime, timedelta

import os
YOUR_NAME = 'David Mugendi'

# Industry formatting
INDUSTRY_LABEL = {
    'branding': 'branding studio',
    'web_design': 'web design studio',
    'design': 'design studio',
    'motion': 'motion design studio',
    'digital_marketing': 'digital marketing agency',
    'ecommerce_agency': 'ecommerce marketing agency',
    'beauty_marketing': 'beauty marketing agency',
    'seo': 'SEO agency',
    'ppc': 'PPC agency',
}

def team_label(size_str):
    try:
        n = int(size_str.split('-')[1] if '-' in size_str else size_str)
    except:
        n = 0
    if n <= 5: return 'small'
    if n <= 15: return 'growing'
    if n <= 30: return 'mid-sized'
    return 'larger'

def load_template(path):
    with open(path) as f:
        return f.read()

def render(template, row):
    industry = INDUSTRY_LABEL.get(row['industry'], row['industry'])
    size = team_label(row.get('team_size', ''))
    body = template
    body = body.replace('{{first_name}}', row['first_name'])
    body = body.replace('{{company}}', row['company'])
    body = body.replace('{{industry}}', f"{size} {industry}")
    body = body.replace('{{team_size}}', row.get('team_size', '5-50'))
    body = body.replace('{{your_name}}', YOUR_NAME)
    body = body.replace("{{calendar_link}}", "Just reply with a time that works for you and I'll send a calendar invite.")
    return body

def split_subject(body, default_subject):
    lines = body.split('\n')
    subject = default_subject
    skip = 0
    for i, line in enumerate(lines):
        if line.strip().startswith('Subject:'):
            subject = line.replace('Subject:', '').strip()
            skip = i + 1
            break
    return subject, '\n'.join(lines[skip:]).strip()

def send(row, body_file, subject):
    cmd = [
        'gog', 'gmail', 'send',
        '--to', row['email'],
        '--subject', subject,
        '--body-file', body_file,
        '--account', 'davidmugambi104@gmail.com',
    ]
    return subprocess.run(cmd, capture_output=True, text=True, timeout=30)

def log_outreach(pid, touch, status, detail=''):
    log_path = f'{os.path.expanduser("~")}/.openclaw/workspace/collectly/outreach/data/outreach-log.csv'
    ts = datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ')
    with open(log_path, 'a', newline='') as f:
        w = csv.writer(f)
        w.writerow([pid, 'email', touch, ts, '', '', status, '', '', detail])

# Get replied prospects
replied = set()
log_path = f'{os.path.expanduser("~")}/.openclaw/workspace/collectly/outreach/data/outreach-log.csv'
if os.path.exists(log_path):
    with open(log_path, newline='') as f:
        for row in csv.DictReader(f):
            if row.get('status', '').lower() in ('replied', 'interview', 'won'):
                replied.add(row.get('id', '').strip())

# Read prospects
with open(f'{os.path.expanduser("~")}/.openclaw/workspace/collectly/outreach/data/prospects.csv', newline='') as f:
    prospects = list(csv.DictReader(f))

# Find who was sent t1 (from log)
t1_sent = set()
t1_log = f'{os.path.expanduser("~")}/.openclaw/workspace/collectly/outreach/queue/t1-sent-2026-07-20-gog.csv'
if os.path.exists(t1_log):
    with open(t1_log, newline='') as f:
        for row in csv.DictReader(f):
            if row.get('status') == 'OK':
                t1_sent.add(row['id'])

# Send t2 to those not replied
TOUCH = os.environ.get('OUTREACH_TOUCH', 't2')
TEMPLATE_PATH = '{os.path.expanduser("~")}/.openclaw/workspace/collectly/outreach/messages/{TOUCH}-{"followup" if TOUCH == "t2" else "final"}.md'
DEFAULT_SUBJ = {
    't2': 'Re: Quick question about your collections process',
    't3': 'closing the loop',
}[TOUCH]

template = load_template(TEMPLATE_PATH)
to_send = [p for p in prospects if p['id'] in t1_sent and p['id'] not in replied and '@' in p.get('email', '')]
print(f"sending {TOUCH} to {len(to_send)} prospects (t1 sent: {len(t1_sent)}, replied: {len(replied)})")

results = []
for p in to_send:
    body = render(template, p)
    subject, plain = split_subject(body, DEFAULT_SUBJ)
    body_file = f"/tmp/email-body-{p['id']}-{TOUCH}.txt"
    with open(body_file, 'w') as f:
        f.write(plain)
    try:
        result = send(p, body_file, subject)
        if result.returncode == 0:
            log_outreach(p['id'], TOUCH, 'sent')
            print(f"✅ {p['id']} {p['email']:40s} -> sent")
            results.append((p['id'], 'OK'))
        else:
            log_outreach(p['id'], TOUCH, 'err', f"{result.stderr[:200]}")
            print(f"❌ {p['id']} {p['email']:40s} -> {result.stderr[:200]}")
            results.append((p['id'], 'ERR'))
    except Exception as ex:
        log_outreach(p['id'], TOUCH, 'exc', str(ex)[:200])
        print(f"💥 {p['id']} {p['email']:40s} -> {ex}")
        results.append((p['id'], 'EXC'))
    finally:
        try: os.unlink(body_file)
        except: pass
    time.sleep(2)

sent = sum(1 for r in results if r[1] == 'OK')
print(f"\n=== {sent}/{len(results)} sent ===")
