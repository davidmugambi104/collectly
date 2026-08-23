#!/usr/bin/env python3
"""Daily outreach sender.

For each run, sends 5 t1 cold emails to prospects that haven't been contacted
yet and have a verified email. Picks from the uncontacted pool. Marks the
prospect as 'sent' in outreach-log.csv.

Designed to be run by cron daily. Self-throttling (max 5/day to keep volume
sane and avoid spam-flagging).
"""
import csv, os, subprocess, time, random
from datetime import datetime

import os
YOUR_NAME = 'David Mugambi'
MAX_PER_RUN = 5  # keep daily volume conservative

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
    body = body.replace('{{industry}}', industry)
    body = body.replace('{{your_name}}', YOUR_NAME)
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

def send_via_gog(to, subject, body):
    body_file = f"/tmp/email-body-{int(time.time()*1000)}.txt"
    with open(body_file, 'w') as f:
        f.write(body)
    try:
        result = subprocess.run([
            'gog', 'gmail', 'send',
            '--to', to,
            '--subject', subject,
            '--body-file', body_file,
            '--account', 'davidmugambi104@gmail.com',
        ], capture_output=True, text=True, timeout=30)
        return result.returncode == 0, result.stdout + result.stderr
    finally:
        try: os.unlink(body_file)
        except: pass

def get_contacted_ids():
    """Get IDs of prospects that have received any touch."""
    log_path = f'{os.path.expanduser("~")}/.openclaw/workspace/collectly/outreach/data/outreach-log.csv'
    contacted = set()
    if os.path.exists(log_path):
        with open(log_path, newline='') as f:
            for row in csv.DictReader(f):
                pid = row.get('id', '').strip()
                touch = row.get('touch', '').strip()
                status = row.get('status', '').strip().lower()
                if pid and touch and status in ('sent', 'replied', 'bounced'):
                    contacted.add(pid)
    return contacted

def log_outreach(pid, email, touch, status, detail=''):
    log_path = f'{os.path.expanduser("~")}/.openclaw/workspace/collectly/outreach/data/outreach-log.csv'
    ts = datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ')
    file_exists = os.path.exists(log_path)
    with open(log_path, 'a', newline='') as f:
        w = csv.writer(f)
        if not file_exists:
            w.writerow(['id','email','touch','sent_at','replied_at','status','next_step','message_id','detail'])
        w.writerow([pid, email, touch, ts, '', status, '', '', detail])

# Read prospects
with open(f'{os.path.expanduser("~")}/.openclaw/workspace/collectly/outreach/data/prospects.csv', newline='') as f:
    prospects = list(csv.DictReader(f))

# Find uncontacted, emailable prospects
contacted = get_contacted_ids()
candidates = [p for p in prospects if '@' in p.get('email', '') and p['id'] not in contacted]
random.shuffle(candidates)
batch = candidates[:MAX_PER_RUN]

print(f"daily outreach run: {len(candidates)} candidates, sending {len(batch)}")

if not batch:
    print("no uncontacted emailable prospects left")
else:
    template = load_template(f'{os.path.expanduser("~")}/.openclaw/workspace/collectly/outreach/messages/t1-cold.md')
    sent = 0
    for p in batch:
        body = render(template, p)
        subject, plain = split_subject(body, 'Quick question, ' + p['first_name'])
        ok, detail = send_via_gog(p['email'], subject, plain)
        if ok:
            log_outreach(p['id'], p['email'], 't1', 'sent', detail[:200])
            print(f"✅ {p['id']} {p['email']:40s} -> sent")
            sent += 1
        else:
            log_outreach(p['id'], p['email'], 't1', 'err', detail[:200])
            print(f"❌ {p['id']} {p['email']:40s} -> {detail[:200]}")
        time.sleep(3)  # polite spacing
    print(f"\n=== {sent}/{len(batch)} sent ===")
