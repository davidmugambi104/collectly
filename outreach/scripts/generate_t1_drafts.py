#!/usr/bin/env python3
"""Generate T1 cold-email draft CSV for unsent prospects using v3 industry variants."""
import csv, os, re
from datetime import datetime, timezone
from pathlib import Path

HERE = Path(__file__).resolve().parent
DATA = HERE.parent / "data"
MESSAGES = HERE.parent / "messages"
OUTPUT = HERE.parent / "outputs"
LOG_CSV = DATA / "outreach-log.csv"
PROSPECTS_CSV = DATA / "prospects.csv"
TEMPLATE_PATH = MESSAGES / "t1-cold-v3-industry-variants.md"

OUTPUT_CSV = OUTPUT / f"t1-drafts-remaining-{datetime.now(timezone.utc).strftime('%Y-%m-%dT%H%M')}.csv"


def load_log():
    """Load outreach log, normalizing mixed formats written by different scripts."""
    if not LOG_CSV.exists():
        return []
    rows = []
    with open(LOG_CSV, newline="") as f:
        for raw in csv.reader(f):
            if not raw or raw[0] == "id":
                continue
            # Detect format: canonical has 10 cols; new short format has 9 cols (id,touch,to,from,subject,status,message_id,sent_at,notes)
            if len(raw) == 10:
                row = dict(zip(
                    ["id", "email", "touch", "sent_at", "replied_at", "status", "next_step", "message_id", "detail", "segment"],
                    raw
                ))
            elif len(raw) == 9 and raw[1] in {"t1", "t2", "t3", "t4"}:
                # short format: id, touch, to, from, subject, status, message_id, sent_at, notes
                row = {
                    "id": raw[0],
                    "email": raw[2],
                    "touch": raw[1],
                    "sent_at": raw[7],
                    "replied_at": "",
                    "status": raw[5],
                    "next_step": "",
                    "message_id": raw[6],
                    "detail": raw[8],
                    "segment": "",
                }
            else:
                # Old format with shifted columns; try to detect touch in second column
                row = dict(zip(
                    ["id", "email", "touch", "sent_at", "replied_at", "status", "next_step", "message_id", "detail", "segment"],
                    raw + [""] * (10 - len(raw))
                ))
            rows.append(row)
    return rows


def blocked_ids(log):
    """Ids that should never be emailed again."""
    skip_statuses = {"replied_do_not_contact", "do_not_contact", "unsubscribed", "bounced"}
    return {r["id"] for r in log if r.get("status") in skip_statuses}


def sent_t1_ids(log):
    return {r["id"] for r in log if r.get("touch") == "t1" and r.get("status") == "sent"}


def load_prospects():
    with open(PROSPECTS_CSV, newline="") as f:
        return list(csv.DictReader(f))


def load_template():
    return TEMPLATE_PATH.read_text()


def select_variant_block(template: str, industry: str) -> str:
    mapping = {
        "branding": "Branding",
        "design": "Design",
        "web_design": "Design",
        "digital_marketing": "Digital marketing",
        "seo": "Digital marketing",
        "ppc": "Digital marketing",
        "motion": "Design",
        "ecommerce_agency": "Ecommerce agency",
        "beauty_marketing": "Ecommerce agency",
    }
    target = mapping.get((industry or "").lower().strip(), "Branding")
    lines = template.splitlines()
    for i, line in enumerate(lines):
        if line.strip().startswith("###") and target.lower() in line.lower():
            for j in range(i + 1, min(i + 10, len(lines))):
                if lines[j].strip().startswith("```"):
                    block = []
                    for k in range(j + 1, len(lines)):
                        if lines[k].strip().startswith("```"):
                            return "\n".join(block)
                        block.append(lines[k])
                    return "\n".join(block)
    return ""


def render(template: str, prospect: dict) -> dict:
    industry = (prospect.get("industry") or "").lower().strip()
    body = select_variant_block(template, industry)
    if not body:
        body = select_variant_block(template, "branding")

    first = prospect.get("first_name", "")
    company = prospect.get("company", "")
    hook = prospect.get("hook") or prospect.get("notes") or ""

    body = (
        body.replace("{{first_name}}", first)
        .replace("{{last_name}}", prospect.get("last_name", ""))
        .replace("{{company}}", company)
        .replace("{{hook}}", hook)
    )

    subject = ""
    lines = template.splitlines()
    for i, line in enumerate(lines):
        if line.strip().startswith("## Subject"):
            for j in range(i + 1, min(i + 5, len(lines))):
                nxt = lines[j].strip()
                if not nxt:
                    continue
                if nxt.startswith("`") and nxt.endswith("`"):
                    nxt = nxt[1:-1].strip()
                subject = nxt
                break
            break

    subject = subject.replace("{{first_name}}", first).replace("{{company}}", company)
    return {"subject": subject, "body": body}


def main():
    log = load_log()
    sent = sent_t1_ids(log)
    prospects = load_prospects()
    template = load_template()

    blocked = blocked_ids(log)
    unsent = [p for p in prospects if p.get("email") and p["id"] not in sent and p["id"] not in blocked]
    # stable order
    unsent.sort(key=lambda p: p["id"])

    drafts = []
    for p in unsent:
        rendered = render(template, p)
        drafts.append({
            "id": p["id"],
            "to": p["email"],
            "first_name": p.get("first_name", ""),
            "company": p.get("company", ""),
            "subject": rendered["subject"],
            "body": rendered["body"],
            "scheduled_send": "",
            "unsent_reason": "",
        })

    OUTPUT.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_CSV, "w", newline="") as f:
        writer = csv.DictWriter(
            f, fieldnames=["id", "to", "first_name", "company", "subject", "body", "scheduled_send", "unsent_reason"]
        )
        writer.writeheader()
        writer.writerows(drafts)

    print(f"Wrote {len(drafts)} drafts to {OUTPUT_CSV}")
    for d in drafts:
        print(f"  {d['id']} -> {d['to']}: {d['subject']}")


if __name__ == "__main__":
    main()
