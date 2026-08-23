#!/usr/bin/env python3
"""Collectly daily outreach sender.

Sends up to MAX_PER_RUN (currently 100) t1 emails to prospects that:
  - Have a verified email in the CSV
  - Are NOT in a skip-status (sent/replied/bounced/do_not_contact/unsubscribed/wrong_person_forward)
  - Match one of the 3 segments (web_design, marketing, branding)

Respects the 100 emails/day hard cap (raised 2026-08-01 from 40 by founder override). Pull-back trigger: bounce or spam > 5% over rolling 7 days → revert to 30.
"""
import csv, os, subprocess, time, random, json
from datetime import datetime, date

# Allow imports from same dir
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from state import (
    load_prospects, load_log, append_log,
    SKIP_STATUSES,
)

YOUR_NAME = 'David Mugambi'
MAX_PER_RUN = 100  # hard cap per spec (raised 2026-08-01 from 40 by founder override)
TODAY = date.today().isoformat()

# Industry label map (matches the v2 template)
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

# The 3 target segments
TARGET_SEGMENTS = {
    'web_design': ['web_design', 'design', 'motion'],
    'marketing': ['digital_marketing', 'ppc', 'seo', 'ecommerce_agency', 'beauty_marketing'],
    'branding': ['branding'],
}


def render_template(row):
    """Render the v2 t1-cold template with prospect fields."""
    with open(f'{os.path.expanduser("~")}/.openclaw/workspace/collectly/outreach/messages/t1-cold.md') as f:
        template = f.read()
    industry = row.get('industry', '')
    segment_label = SEGMENT_LABEL.get(industry, 'agency')
    body = template
    body = body.replace('{{first_name}}', row.get('first_name', ''))
    body = body.replace('{{company}}', row.get('company', ''))
    body = body.replace('{{industry}}', segment_label)
    body = body.replace('{{segment_label}}', segment_label)
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


def count_sent_today(log_rows):
    today_count = 0
    for r in log_rows:
        sent_at = r.get('sent_at', '')
        status = r.get('status', '').lower()
        if sent_at.startswith(TODAY) and status in ('sent', 'pending'):
            today_count += 1
    return today_count


def main():
    prospects = load_prospects()
    log = load_log()

    # Build skip-set
    skip_ids = {r['id'] for r in log if r.get('status', '').lower() in SKIP_STATUSES}

    # Count today's sends for the 40/day cap
    sent_today = count_sent_today(log)
    capacity = max(0, MAX_PER_RUN - sent_today)
    print(f"=== Daily outreach {TODAY} ===")
    print(f"sent today: {sent_today}, capacity remaining: {capacity}")

    # Filter candidates: emailable, not skipped, in target segment
    candidates = []
    for p in prospects:
        if p['id'] in skip_ids:
            continue
        if '@' not in p.get('email', ''):
            continue
        if p.get('industry') not in sum(TARGET_SEGMENTS.values(), []):
            continue
        candidates.append(p)

    # Shuffle for fair segment distribution
    random.shuffle(candidates)
    batch = candidates[:capacity]

    print(f"candidates: {len(candidates)}, sending: {len(batch)}")

    sent = 0
    errors = 0
    by_segment = {'web_design': 0, 'marketing': 0, 'branding': 0}
    for p in batch:
        # Map industry to top-level segment
        industry = p.get('industry', '')
        segment = 'other'
        for top, subs in TARGET_SEGMENTS.items():
            if industry in subs:
                segment = top
                break

        body = render_template(p)
        subject, plain = split_subject(body, 'Who chases invoices?')
        ok, detail = send_via_gog(p['email'], subject, plain)
        if ok:
            append_log(p['id'], p['email'], 't1', 'sent', detail, segment)
            by_segment[segment] = by_segment.get(segment, 0) + 1
            sent += 1
            print(f"✅ {p['id']} {p['email']:40s} -> sent [{segment}]")
        else:
            append_log(p['id'], p['email'], 't1', 'err', detail, segment)
            errors += 1
            print(f"❌ {p['id']} {p['email']:40s} -> {detail[:100]}")
        time.sleep(2)

    # Best-performing segment so far
    all_log = load_log()
    by_segment_total = {}
    for r in all_log:
        if r.get('status') == 'sent':
            seg = r.get('segment', 'other')
            by_segment_total[seg] = by_segment_total.get(seg, 0) + 1
    best = max(by_segment_total.items(), key=lambda x: x[1])[0] if by_segment_total else 'none'

    report = {
        'date': TODAY,
        'sent_this_run': sent,
        'errors': errors,
        'sent_today_total': sent_today + sent,
        'capacity_remaining': max(0, MAX_PER_RUN - (sent_today + sent)),
        'by_segment_this_run': by_segment,
        'best_segment_overall': best,
        'recommendation': (
            f"Best segment is {best}. Add more prospects to this segment for next run."
            if best != 'none' else
            "Need more prospects. Add 50-100 to top-performing segment."
        ),
    }
    print(f"\n=== REPORT ===")
    print(json.dumps(report, indent=2))
    return report


if __name__ == '__main__':
    main()
