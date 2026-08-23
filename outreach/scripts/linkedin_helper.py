#!/usr/bin/env python3
"""LinkedIn outreach helper for the 8 TBD prospects (P001-P008).

Generates a one-click-bundle: for each prospect, a pre-written connection
request (300 char limit), a t1 email template filled in, and the prospect's
company context. Davie pastes/sends these manually after a 2-min LinkedIn
lookup confirms the founder.
"""
import csv, json
from pathlib import Path

# Read prospects
import os
CSV_PATH = Path(f'{os.path.expanduser("~")}/.openclaw/workspace/collectly/outreach/data/prospects.csv')
with CSV_PATH.open(newline='') as f:
    prospects = list(csv.DictReader(f))

# TBD list: P001-P008 (no verified email, only LinkedIn)
tbd = [p for p in prospects if p['id'] in [f"P00{i}" for i in range(1, 9)]]

# For each, generate a one-click helper
output_path = Path(f'{os.path.expanduser("~")}/.openclaw/workspace/collectly/outreach/queue/linkedin-helper.md')
output_path.parent.mkdir(parents=True, exist_ok=True)

with output_path.open('w') as f:
    f.write("# LinkedIn Outreach Helper — 8 TBD Prospects\n\n")
    f.write("**How to use:** for each prospect below, click the LinkedIn search link, find the founder, then copy-paste the connection request. Once they accept, send the t1 email using the template at the bottom.\n\n")
    f.write("---\n\n")

    for p in tbd:
        company = p['company']
        industry = p['industry'].replace('_', ' ')
        country = p['country']
        notes = p.get('notes', '').split('|')[0].strip()
        li_search = f"https://www.linkedin.com/search/results/people/?keywords={company.replace(' ', '%20')}%20founder"

        f.write(f"## {p['id']} — {company} ({country})\n\n")
        f.write(f"- **Industry:** {industry}\n")
        f.write(f"- **Context:** {notes}\n")
        f.write(f"- **Find founder:** [LinkedIn search]({li_search})\n")
        f.write(f"- **Company site:** {p.get('linkedin_url', 'search Google')}\n\n")

        # Connection request (under 300 chars)
        f.write("**Connection request** (copy-paste after you find the right person):\n\n")
        f.write("> Hi — saw your work at " + company + " and had a quick question about how you handle client invoicing. Would love to connect.\n\n")
        f.write("---\n\n")

    f.write("\n## After they accept the connection — t1 email\n\n")
    f.write("Once a connection is accepted, send the t1 email using this template (filled in per prospect):\n\n")
    f.write("```\n")
    f.write("Subject: Quick question, [first_name]\n\n")
    f.write("Hi [first_name],\n\n")
    f.write("I came across [company] while researching [industry]s and had a quick question.\n\n")
    f.write("How does your team currently handle overdue client invoices and payment follow-ups?\n\n")
    f.write("I'm building Collectly, an AI assistant that helps small B2B service businesses automate invoice reminders and follow-ups so they spend less time chasing payments and more time serving clients.\n\n")
    f.write("Before releasing the next version, I'm speaking with a handful of businesses to better understand their current process and biggest pain points. It would be a 15-minute conversation—this isn't a sales call.\n\n")
    f.write("If you're the right person, would you be open to a quick chat sometime this week or next?\n\n")
    f.write("If not, would you mind pointing me to whoever handles client billing or accounts receivable?\n\n")
    f.write("Thanks,\n\n")
    f.write("David Mugambi\n")
    f.write("Founder, Collectly\n")
    f.write("```\n\n")
    f.write(f"Full file: {output_path}\n")

print(f"wrote: {output_path}")
print(f"prospects included: {len(tbd)}")
for p in tbd:
    print(f"  {p['id']} {p['company']}")
