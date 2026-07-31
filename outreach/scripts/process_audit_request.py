#!/usr/bin/env python3
"""Handler for free audit landing-page form submissions.

Usage:
    CLI: process_audit_request.py <first_name> <email> <company> <accounting_software> [estimated_revenue] [pain_point] [source]
    HTTP: import add_lead() from your app route at POST /api/audit-request
"""
import csv
import os
import re
import smtplib
import sys
import uuid
from datetime import datetime, timezone
from email.mime.text import MIMEText
from pathlib import Path

HERE = Path(__file__).resolve().parent
DATA = HERE.parent / "data"
LEADS_CSV = DATA / "inbound-leads.csv"

FIELDNAMES = [
    "id", "requested_at", "first_name", "email", "company",
    "accounting_software", "estimated_revenue", "pain_point", "source",
    "qbo_connected", "xero_connected", "status", "audit_sent_at",
    "audit_video_url", "next_step", "notes"
]

RE_EMAIL = re.compile(r"^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$")


def load_existing():
    if not LEADS_CSV.exists():
        return []
    with open(LEADS_CSV, newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))


def _notify_founders(subject, body):
    """Send a simple email notification to the founder when a lead arrives."""
    smtp_host = os.environ.get("SMTP_HOST", "")
    smtp_port = int(os.environ.get("SMTP_PORT", "0") or 0)
    smtp_user = os.environ.get("SMTP_USER", "")
    smtp_pass = os.environ.get("SMTP_PASS", "")
    notify_to = os.environ.get("AUDIT_NOTIFY_EMAIL", "")
    notify_from = os.environ.get("AUDIT_NOTIFY_FROM", smtp_user)

    if not all([smtp_host, smtp_port, smtp_user, smtp_pass, notify_to]):
        return False

    try:
        msg = MIMEText(body)
        msg["Subject"] = subject
        msg["From"] = notify_from
        msg["To"] = notify_to
        with smtplib.SMTP(smtp_host, smtp_port) as server:
            server.starttls()
            server.login(smtp_user, smtp_pass)
            server.sendmail(notify_from, [notify_to], msg.as_string())
        return True
    except Exception as e:
        print(f"Notification failed: {e}", file=sys.stderr)
        return False


def _build_notification(lead):
    lines = [
        f"New Collectly audit request",
        f"",
        f"Lead ID: {lead['id']}",
        f"Name: {lead['first_name']}",
        f"Email: {lead['email']}",
        f"Company: {lead['company']}",
        f"Accounting software: {lead['accounting_software']}",
        f"Estimated revenue: {lead['estimated_revenue'] or 'not provided'}",
        f"Pain point: {lead['pain_point'] or 'not provided'}",
        f"Source: {lead['source']}",
        f"Requested at: {lead['requested_at']}",
        f"Next step: {lead['next_step']}",
    ]
    return "\n".join(lines)


def validate(email, accounting_software):
    errors = []
    if not RE_EMAIL.match(email):
        errors.append("invalid_email")
    allowed = {"QBO", "Xero", "Other"}
    if accounting_software not in allowed:
        errors.append("invalid_accounting_software")
    return errors


def add_lead(first_name, email, company, accounting_software,
             estimated_revenue="", pain_point="", source="landing_page",
             qbo_connected="false", xero_connected="false",
             notes=""):
    email = (email or "").strip().lower()
    first_name = (first_name or "").strip()
    company = (company or "").strip()
    accounting_software = (accounting_software or "").strip()

    errors = validate(email, accounting_software)
    if errors:
        raise ValueError(f"Validation failed: {', '.join(errors)}")

    DATA.mkdir(parents=True, exist_ok=True)
    file_exists = LEADS_CSV.exists()

    lead = {
        "id": f"INB-{uuid.uuid4().hex[:8].upper()}",
        "requested_at": datetime.now(timezone.utc).isoformat(),
        "first_name": first_name,
        "email": email,
        "company": company,
        "accounting_software": accounting_software,
        "estimated_revenue": estimated_revenue,
        "pain_point": pain_point,
        "source": source,
        "qbo_connected": qbo_connected,
        "xero_connected": xero_connected,
        "status": "new",
        "audit_sent_at": "",
        "audit_video_url": "",
        "next_step": "record audit video",
        "notes": notes,
    }

    with open(LEADS_CSV, "a", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=FIELDNAMES)
        if not file_exists:
            writer.writeheader()
        writer.writerow(lead)

    _notify_founders(
        f"New audit request: {lead['company']}",
        _build_notification(lead)
    )

    return lead


def main():
    if len(sys.argv) < 5:
        print("Usage: process_audit_request.py <first_name> <email> <company> <accounting_software> [estimated_revenue] [pain_point] [source]")
        sys.exit(1)

    lead = add_lead(*sys.argv[1:])
    print(f"Lead saved: {lead['id']} -> {lead['email']}")
    print(f"File: {LEADS_CSV}")


if __name__ == "__main__":
    main()
