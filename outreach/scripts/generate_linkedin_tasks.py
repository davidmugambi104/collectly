#!/usr/bin/env python3
"""Generate LinkedIn task list for high-fit prospects with no email.

Per spec:
- No auto-DM, no scraping
- For no-email prospects, create a manual task with profile URL + suggested message
- Output: a Markdown file in outreach/queue/linkedin-tasks.md
"""
import csv, os
from collections import defaultdict
from datetime import datetime

CSV_PATH = '/home/davie/.openclaw/workspace/collectly/outreach/data/prospects.csv'
LOG_PATH = '/home/davie/.openclaw/workspace/collectly/outreach/data/outreach-log.csv'
OUTPUT_PATH = '/home/davie/.openclaw/workspace/collectly/outreach/queue/linkedin-tasks.md'

os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)


def load_log():
    if not os.path.exists(LOG_PATH):
        return []
    with open(LOG_PATH, newline='') as f:
        return list(csv.DictReader(f))


def main():
    with open(CSV_PATH, newline='') as f:
        prospects = list(csv.DictReader(f))

    log = load_log()
    skip = {r['id'] for r in log if r.get('status', '').lower() in (
        'sent', 'replied', 'positive_reply', 'booked_chat', 'bounced',
        'do_not_contact', 'unsubscribed', 'wrong_person_forward',
    )}

    no_email = [
        p for p in prospects
        if '@' not in p.get('email', '')
        and p['id'] not in skip
    ]

    by_segment = defaultdict(list)
    for p in no_email:
        by_segment[p.get('industry', 'other')].append(p)

    with open(OUTPUT_PATH, 'w') as f:
        f.write(f"# LinkedIn Manual Tasks — {datetime.utcnow().strftime('%Y-%m-%d')}\n\n")
        f.write(f"**{len(no_email)} high-fit prospects with no email.**\n\n")
        f.write("For each: open the LinkedIn URL → verify the person is the founder/lead → connect with a personalized request → if accepted, send the suggested DM.\n\n")
        f.write("---\n\n")

        for seg, plist in sorted(by_segment.items()):
            f.write(f"## Segment: {seg} ({len(plist)})\n\n")
            for p in plist:
                company = p['company']
                first = p.get('first_name', '')
                last = p.get('last_name', '')
                country = p.get('country', '')
                li_url = p.get('linkedin_url', '')
                team = p.get('team_size', '')
                industry = p.get('industry', '')

                f.write(f"### {p['id']} — {company} ({country})\n")
                f.write(f"- **Team size:** {team}\n")
                f.write(f"- **Industry:** {industry}\n")
                if li_url:
                    f.write(f"- **LinkedIn URL:** {li_url}\n")
                else:
                    f.write(f"- **LinkedIn URL:** _search: [{first} {last} {company} founder](https://www.linkedin.com/search/results/people/?keywords={'%20'.join([first, last, company, 'founder'])})_\n")
                f.write("\n**Connection request** (under 300 chars):\n\n")
                f.write(f"> Hi {first or 'there'} — saw your work at {company} and had a quick question about how you handle client invoicing. Would love to connect.\n\n")
                f.write("**After they accept — DM:**\n\n")
                f.write(f"> Hi {first} — quick one. When a client invoice goes overdue at {company}, who usually owns the follow-up: you, the project lead, or whoever handles billing?\n>\n")
                f.write("> I'm building Collectly around this workflow, so even a one-liner would be genuinely helpful.\n>\n")
                f.write("> David\n\n")
                f.write("---\n\n")

    print(f"wrote {OUTPUT_PATH}")
    print(f"{len(no_email)} no-email prospects")
    return len(no_email)


if __name__ == '__main__':
    main()
