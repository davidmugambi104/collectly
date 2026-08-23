#!/usr/bin/env python3
"""Send warmup emails from davie@getcollectly.app via Resend.

Reads collectly/outreach/data/warmup-contacts.csv and sends the requested
template for the given day. Logs to outreach-log.csv with touch=warmup.

Usage:
    python3 outreach/scripts/send_warmup.py --day 1 --dry-run
"""
import argparse
import csv
import json
import os
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

HERE = Path(__file__).resolve().parent
WORKSPACE = HERE.parent
CONTACTS = WORKSPACE / "data" / "warmup-contacts.csv"
TEMPLATES = WORKSPACE / "outputs" / "warmup-templates-v2.md"
LOG = WORKSPACE / "data" / "outreach-log.csv"
LOG_DIR = WORKSPACE / "logs"
ENV_PATH = Path(f"{os.path.expanduser('~')}/.openclaw/workspace/collectly/.env.local")

LOG_FIELDS = ["id", "email", "touch", "sent_at", "replied_at", "status", "next_step", "message_id", "detail", "segment"]

# Daily volume cap from warmup-calendar-2026-07-26.md
DAY_VOLUME = {
    1: 3,
    2: 3,
    3: 4,
    4: 4,
    5: 5,
    6: 0,
    7: 0,
    8: 5,
    9: 7,
    10: 7,
    11: 8,
    12: 8,
    13: 0,
    14: 0,
}


def load_env():
    env = {}
    if not ENV_PATH.exists():
        return env
    for line in ENV_PATH.read_text().splitlines():
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        env[k.strip()] = v.strip().strip('"').strip("'")
    return env


def load_templates():
    text = TEMPLATES.read_text()
    blocks = {}
    current = None
    in_code = False
    for line in text.splitlines():
        if line.startswith("## Template"):
            # Handle template names like "Template P1" or "Template A1"
            parts = line.split()
            current = f"template_{parts[2].lower()}"
            blocks[current] = {"subject": "", "body": []}
            in_code = False
            continue
        if not current:
            continue
        if line.strip() == "```":
            if in_code:
                current = None
                in_code = False
            else:
                in_code = True
            continue
        if not in_code:
            if line.startswith("Subject:"):
                blocks[current]["subject"] = line.split(":", 1)[1].strip()
            continue
        blocks[current]["body"].append(line)
    # trim trailing blank lines inside each body
    for k in blocks:
        while blocks[k]["body"] and blocks[k]["body"][-1].strip() == "":
            blocks[k]["body"].pop()
        # Templates have the subject line inside the code block, e.g. "Subject: ..."
        if blocks[k]["body"] and blocks[k]["body"][0].lower().startswith("subject:"):
            blocks[k]["subject"] = blocks[k]["body"].pop(0).split(":", 1)[1].strip()
        # remove any blank line that was between subject and body
        while blocks[k]["body"] and blocks[k]["body"][0].strip() == "":
            blocks[k]["body"].pop(0)
    return blocks


def extract_company(notes):
    """Pull company name from notes field like 'Company Name | website | country'."""
    if not notes:
        return "your shop"
    parts = notes.split("|")
    if parts:
        return parts[0].strip() or "your shop"
    return "your shop"


def render(template, contact):
    first = contact.get("first_name", "").strip()
    notes = contact.get("notes", "")
    tpl = contact.get("template", "").lower()
    company = extract_company(notes)
    subject = template["subject"]
    body = "\n".join(template["body"])
    # Personal templates use [Name]
    subject = subject.replace("[Name]", first).replace("[name]", first)
    body = body.replace("[Name]", first).replace("[name]", first)
    # Agency templates use [company/project] and [company]
    if tpl.startswith("template_a"):
        subject = subject.replace("[company/project]", company).replace("[company]", company)
        body = body.replace("[company/project]", company).replace("[company]", company)
        body = body.replace("[specific thing]", f"{company}'s recent work")
    else:
        # Personal templates: replace company placeholders with generic phrasing
        subject = subject.replace("[company/project]", "things").replace("[company]", "things")
        body = body.replace("[company/project]", "things").replace("[company]", "things")
        body = body.replace("[specific thing]", "what you've been up to")
    return subject, body


def send_one(env, to, subject, body):
    import urllib.request
    payload = json.dumps({
        "from": env.get("RESEND_FROM_EMAIL", "Davie Mugambi <davie@getcollectly.app>"),
        "to": [to],
        "subject": subject,
        "text": body,
        "reply_to": env.get("GMAIL_USER", "davidmugambi104@gmail.com"),
    }).encode()
    req = urllib.request.Request(
        "https://api.resend.com/emails",
        data=payload,
        headers={
            "Authorization": f"Bearer {env.get('RESEND_API_KEY', '')}",
            "Content-Type": "application/json",
            "User-Agent": "collectly-warmup/1.0",
        },
        method="POST",
    )
    resp = urllib.request.urlopen(req, timeout=30)
    return json.loads(resp.read().decode())


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--day", type=int, required=True)
    p.add_argument("--dry-run", action="store_true")
    args = p.parse_args()

    if not CONTACTS.exists():
        print(f"ERROR: {CONTACTS} not found. Create it first.")
        return 1
    if not TEMPLATES.exists():
        print(f"ERROR: {TEMPLATES} not found.")
        return 1

    env = load_env()
    if not env.get("RESEND_API_KEY") or not env.get("RESEND_FROM_EMAIL"):
        print("ERROR: RESEND_API_KEY or RESEND_FROM_EMAIL missing from .env.local")
        return 1

    templates = load_templates()

    with open(CONTACTS, newline="", encoding="utf-8") as f:
        contacts = [r for r in csv.DictReader(f) if int(r.get("day", 0)) == args.day and r.get("email")]

    if not contacts:
        print(f"No contacts configured for warmup day {args.day}. Fill {CONTACTS}.")
        return 1

    volume = DAY_VOLUME.get(args.day, len(contacts))
    if volume == 0:
        print(f"Day {args.day} is a rest day. No emails sent.")
        return 0
    contacts = contacts[:volume]

    # Build next available warmup IDs based on existing log
    existing_ids = set()
    if LOG.exists():
        with open(LOG, newline="", encoding="utf-8") as lf:
            existing_ids = {r.get("id", "") for r in csv.DictReader(lf)}

    sent_at = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    results = []
    used_ids = set(existing_ids)
    LOG_DIR.mkdir(parents=True, exist_ok=True)

    for i, c in enumerate(contacts, 1):
        tpl_name = c.get("template", "template_1").lower()
        template = templates.get(tpl_name)
        if not template:
            print(f"  SKIP {c['email']}: unknown template {tpl_name}")
            continue
        subject, body = render(template, c)
        # Use deterministic ID if free, otherwise pick next free one
        test_id = f"W{args.day:02d}{i:02d}"
        if test_id in used_ids:
            for j in range(1, 100):
                candidate = f"W{args.day:02d}{j:02d}"
                if candidate not in used_ids:
                    test_id = candidate
                    break
        used_ids.add(test_id)

        if args.dry_run:
            print(f"[DRY] {test_id} -> {c['email']} | subject: {subject}")
            print(f"       body preview: {body[:120].replace(chr(10), ' ')}")
            results.append({"id": test_id, "email": c["email"], "ok": True, "dry_run": True})
            continue

        try:
            data = send_one(env, c["email"], subject, body)
            mid = data.get("id", "")
            row = {
                "id": test_id,
                "email": c["email"],
                "touch": "warmup",
                "sent_at": sent_at,
                "replied_at": "",
                "status": "sent",
                "next_step": "",
                "message_id": mid,
                "detail": f"day{args.day}; {tpl_name}; {c.get('relationship','')}; {c.get('notes','')[:60]}",
                "segment": "warmup",
            }
            with open(LOG, "a", newline="", encoding="utf-8") as f:
                csv.DictWriter(f, fieldnames=LOG_FIELDS).writerow(row)
            results.append({"id": test_id, "email": c["email"], "ok": True, "message_id": mid})
            print(f"  sent {test_id} -> {c['email']} message_id={mid}")
        except Exception as e:
            results.append({"id": test_id, "email": c["email"], "ok": False, "error": str(e)})
            print(f"  FAILED {test_id} -> {c['email']}: {e}")
        time.sleep(1.5)

    ts = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    with open(LOG_DIR / f"warmup-{ts}.json", "w") as f:
        json.dump(results, f, indent=2)

    ok = sum(1 for r in results if r.get("ok"))
    print(f"\n=== Warmup day {args.day}: {ok}/{len(results)} sent ===")
    return 0 if ok == len(results) else 1


if __name__ == "__main__":
    sys.exit(main())
