"""Shared helpers for prospect discovery/enrichment scripts.

Kept dependency-free (stdlib only) so every discovery script can import
this without touching requirements.
"""
import csv
import os
import re
import socket
import struct
import random
from urllib.parse import urlparse

WS = f"{os.path.expanduser('~')}/.openclaw/workspace/collectly"
CSV_PATH = f"{WS}/outreach/data/prospects.csv"
SUPPRESSION_PATH = f"{WS}/outreach/data/suppression.csv"

FREE_WEBMAIL_DOMAINS = {
    "gmail.com", "yahoo.com", "hotmail.com", "outlook.com",
    "icloud.com", "aol.com", "live.com", "msn.com", "protonmail.com",
}
# Role addresses. These are never a prospect: they are a guess at a domain,
# not a person. Sending to them produced a 34.2% bounce rate (52/152 over 7
# days) against a 5% threshold — see decisions.md 2026-09-11. Widened from the
# original ten because `accounts@`/`billing@`/`ap@` were slipping through and
# are exactly the mailboxes an AR pitch gets ignored in anyway.
GENERIC_LOCALPARTS = {
    "info", "contact", "hello", "admin", "team", "support",
    "sales", "office", "enquiries", "enquiry",
    "accounts", "billing", "accounting", "finance", "ar", "ap",
    "mail", "email", "help", "service", "services", "general",
    "reception", "front desk", "frontdesk", "hi", "hey", "ask",
    "no-reply", "noreply", "donotreply", "marketing", "press", "media",
    "careers", "jobs", "recruitment", "privacy", "legal", "webmaster",
    "postmaster", "abuse", "newsletter", "subscribe", "bookings", "booking",
}

DOMAIN_IN_NOTES_RE = re.compile(r"domain=([a-zA-Z0-9.\-]+)")


def load_suppressed_emails():
    """Return a lowercase set of suppressed email addresses."""
    out = set()
    if not os.path.exists(SUPPRESSION_PATH):
        return out
    with open(SUPPRESSION_PATH, newline="") as f:
        for row in csv.DictReader(f):
            e = (row.get("email") or "").strip().lower()
            if e:
                out.add(e)
    return out


def load_existing_rows():
    if not os.path.exists(CSV_PATH):
        return []
    with open(CSV_PATH, newline="") as f:
        return list(csv.DictReader(f))


def csv_fieldnames():
    rows = load_existing_rows()
    if rows:
        return list(rows[0].keys())
    return [
        "id", "first_name", "last_name", "company", "role",
        "country", "team_size", "industry", "linkedin_url",
        "email", "source", "notes", "hook", "tier",
    ]


def extract_domain(row):
    """Best-effort domain extraction for a prospects.csv row.

    prospects.csv has no dedicated 'website' column -- discovery scripts
    encode `domain=<domain>` in the notes field instead (see
    discover_prospects_v2.py / discover_osm.py). Falls back to the
    email's domain, then a raw 'website' key if one is ever present.
    """
    website = (row.get("website") or "").strip()
    if website:
        d = urlparse(website if "://" in website else "https://" + website).netloc
        return d.replace("www.", "").lower()
    notes = row.get("notes") or ""
    m = DOMAIN_IN_NOTES_RE.search(notes)
    if m:
        return m.group(1).lower().replace("www.", "")
    email = (row.get("email") or "").strip().lower()
    if "@" in email:
        return email.split("@", 1)[1]
    return ""


def existing_domains_and_companies():
    """Domain set + lowercased-company-name set already present in prospects.csv."""
    domains, companies = set(), set()
    for r in load_existing_rows():
        d = extract_domain(r)
        if d:
            domains.add(d)
        c = (r.get("company") or "").strip().lower()
        if c:
            companies.add(c)
    return domains, companies


def score_email(email, domain):
    """Higher is better. name-pattern > generic > free-webmail."""
    if not email or "@" not in email:
        return -1
    local, _, edomain = email.partition("@")
    if edomain in FREE_WEBMAIL_DOMAINS:
        return 0
    if local in GENERIC_LOCALPARTS:
        return 1
    if "." in local or (len(local) > 2 and local.isalpha()):
        return 2
    return 1


def is_suppressed(email, suppressed_emails):
    return (email or "").strip().lower() in suppressed_emails


def atomic_write_rows(rows, fieldnames):
    tmp = CSV_PATH + ".tmp"
    with open(tmp, "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames)
        w.writeheader()
        for r in rows:
            w.writerow({k: r.get(k, "") for k in fieldnames})
    os.replace(tmp, CSV_PATH)


def append_new_rows(new_rows):
    """Append brand-new prospect rows (dedup is the caller's job)."""
    if not new_rows:
        return
    rows = load_existing_rows()
    fieldnames = csv_fieldnames()
    for r in new_rows:
        for k in fieldnames:
            r.setdefault(k, "")
    rows.extend(new_rows)
    atomic_write_rows(rows, fieldnames)


def _encode_dns_name(domain):
    out = b""
    for label in domain.strip(".").split("."):
        label = label.encode("idna") if any(ord(c) > 127 for c in label) else label.encode("ascii")
        out += bytes([len(label)]) + label
    return out + b"\x00"


def _parse_mx_records(resp):
    """Minimal DNS response parser -- just enough to pull MX preference +
    exchange hostnames out of the answer section (RFC 1035 message format,
    including compressed name pointers)."""
    def read_name(buf, offset):
        labels = []
        seen_pointer = False
        start = offset
        while True:
            length = buf[offset]
            if length == 0:
                offset += 1
                break
            if length & 0xC0 == 0xC0:
                pointer = ((length & 0x3F) << 8) | buf[offset + 1]
                if not seen_pointer:
                    start = offset + 2
                offset = pointer
                seen_pointer = True
                continue
            offset += 1
            labels.append(buf[offset:offset + length].decode("ascii", errors="ignore"))
            offset += length
        return ".".join(labels), (start if seen_pointer else offset)

    qdcount = struct.unpack(">H", resp[4:6])[0]
    ancount = struct.unpack(">H", resp[6:8])[0]
    offset = 12
    for _ in range(qdcount):
        _, offset = read_name(resp, offset)
        offset += 4  # qtype + qclass
    records = []
    for _ in range(ancount):
        _, offset = read_name(resp, offset)
        rtype, _rclass, _ttl, rdlength = struct.unpack(">HHIH", resp[offset:offset + 10])
        offset += 10
        rdata_start = offset
        if rtype == 15:  # MX
            preference = struct.unpack(">H", resp[rdata_start:rdata_start + 2])[0]
            exchange, _ = read_name(resp, rdata_start + 2)
            records.append((preference, exchange))
        offset += rdlength
    return records


def resolve_mx(domain, resolvers=("8.8.8.8", "1.1.1.1"), timeout=3):
    """Pure-stdlib MX lookup (no `dig`/`host`/dnspython dependency -- none
    of those are installed in this environment, and the previous scripts'
    subprocess.run(["dig", ...]) calls were silently failing with
    FileNotFoundError -> caught by a broad except -> always returned
    False, i.e. every domain looked MX-less. Hand-rolled minimal DNS
    query instead, since it only needs a UDP socket. Returns a
    (preference, hostname) list, sorted by preference, or []."""
    domain = (domain or "").strip().lower()
    if not domain:
        return []
    qid = random.randint(0, 65535)
    header = struct.pack(">HHHHHH", qid, 0x0100, 1, 0, 0, 0)
    question = _encode_dns_name(domain) + struct.pack(">HH", 15, 1)  # type=MX, class=IN
    packet = header + question
    for resolver in resolvers:
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
                s.settimeout(timeout)
                s.sendto(packet, (resolver, 53))
                resp, _ = s.recvfrom(512)
            rcode = resp[3] & 0x0F
            if rcode != 0:
                return []
            return sorted(_parse_mx_records(resp))
        except Exception:
            continue
    return []


def domain_has_mx(domain, **kw):
    return bool(resolve_mx(domain, **kw))


def update_rows_by_id(updates):
    """updates: dict of id -> {field: value} to merge into existing rows."""
    if not updates:
        return 0
    rows = load_existing_rows()
    fieldnames = csv_fieldnames()
    changed = 0
    for r in rows:
        u = updates.get(r.get("id"))
        if u:
            r.update(u)
            changed += 1
    atomic_write_rows(rows, fieldnames)
    return changed
