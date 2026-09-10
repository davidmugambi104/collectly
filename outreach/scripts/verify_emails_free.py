#!/usr/bin/env python3
"""
Free email verification via MX record lookup + SMTP RCPT TO checks.
No external APIs, no paid services. Uses only system DNS (resolv) and smtplib.

Usage:
    python3 verify_emails_free.py [--input prospects.csv] [--output prospects.csv] [--suppression suppression.csv] [--delay 2] [--timeout 10]
"""

import csv
import ctypes
import ctypes.util
import struct
import smtplib
import socket
import sys
import os
import time
import shutil
from datetime import datetime, timezone

# --- DNS MX Lookup via libresolv ---

_lib = ctypes.CDLL(ctypes.util.find_library('resolv') or 'libresolv.so.2')
NS_T_MX = 15
NS_C_IN = 1


def mx_lookup(domain):
    """Return list of MX hostnames for domain. Empty list if no MX records."""
    buf = ctypes.create_string_buffer(4096)
    n = _lib.res_query(domain.encode(), NS_C_IN, NS_T_MX, buf, 4096)
    if n < 12:
        return []
    raw = buf.raw[:n]

    qdcount = struct.unpack('!H', raw[4:6])[0]
    ancount = struct.unpack('!H', raw[6:8])[0]

    pos = 12

    # Skip question section
    for _ in range(qdcount):
        while pos < n:
            if (raw[pos] & 0xC0) == 0xC0:
                pos += 2
                break
            elif raw[pos] == 0:
                pos += 1
                break
            else:
                pos += raw[pos] + 1
        pos += 4  # QTYPE + QCLASS

    mx_records = []
    for _ in range(ancount):
        # Parse name (could be compressed)
        if (raw[pos] & 0xC0) == 0xC0:
            pos += 2
        else:
            while pos < n:
                if raw[pos] == 0:
                    pos += 1
                    break
                pos += raw[pos] + 1

        rtype = struct.unpack('!H', raw[pos:pos+2])[0]
        pos += 2
        rclass = struct.unpack('!H', raw[pos:pos+2])[0]
        pos += 2
        ttl = struct.unpack('!I', raw[pos:pos+4])[0]
        pos += 4
        rdlen = struct.unpack('!H', raw[pos:pos+2])[0]
        pos += 2

        if rtype == NS_T_MX and rdlen > 3:
            rdata_start = pos
            rdata_pos = pos + 2  # skip preference
            name_parts = []
            end = rdata_start + rdlen
            while rdata_pos < end:
                label_len = raw[rdata_pos]
                if label_len == 0:
                    break
                if (label_len & 0xC0) == 0xC0:
                    ptr = struct.unpack('!H', raw[rdata_pos:rdata_pos+2])[0] & 0x3FFF
                    while ptr < n:
                        if (raw[ptr] & 0xC0) == 0xC0:
                            ptr2 = struct.unpack('!H', raw[ptr:ptr+2])[0] & 0x3FFF
                            while ptr2 < n:
                                if (raw[ptr2] & 0xC0) == 0xC0:
                                    break
                                if raw[ptr2] == 0:
                                    break
                                llen = raw[ptr2]
                                name_parts.append(raw[ptr2+1:ptr2+1+llen].decode('ascii', errors='replace'))
                                ptr2 += llen + 1
                            break
                        if raw[ptr] == 0:
                            break
                        llen = raw[ptr]
                        name_parts.append(raw[ptr+1:ptr+1+llen].decode('ascii', errors='replace'))
                        ptr += llen + 1
                    rdata_pos += 2
                    break
                name_parts.append(raw[rdata_pos+1:rdata_pos+1+label_len].decode('ascii', errors='replace'))
                rdata_pos += label_len + 1
            mx_records.append('.'.join(name_parts))

        pos += rdlen

    return mx_records


def smtp_verify(email_addr, mx_hosts, timeout=10):
    """
    Attempt SMTP RCPT TO verification.
    Returns (status, detail) where status is one of:
      smtp_valid, smtp_invalid, smtp_unknown, smtp_unverifiable
    """
    helo_domain = 'getcollectly.app'
    mail_from = 'test@getcollectly.app'

    for mx in mx_hosts:
        try:
            s = smtplib.SMTP(timeout=timeout)
            s.connect(mx, 25)
            s.helo(helo_domain)
            s.mail(mail_from)
            code, msg = s.rcpt(email_addr)
            s.quit()

            msg_str = msg.decode() if isinstance(msg, bytes) else str(msg)
            # Check for IP blocklists (Spamhaus, etc.) - these are NOT invalid emails, they're unverifiable
            full_str = f'{code} {msg_str}'.lower()
            if 'spamhaus' in full_str or 'blocked using' in full_str or 'client host' in full_str or 'block list' in full_str or 'blocklist' in full_str or 'rbl' in full_str:
                return ('smtp_unverifiable', f'{code} {msg_str}')
            if code == 250:
                return ('smtp_valid', f'{code} {msg_str}')
            elif code == 251:
                return ('smtp_unknown', f'{code} {msg_str}')
            elif code == 550 or code == 551 or code == 552 or code == 553:
                return ('smtp_invalid', f'{code} {msg_str}')
            elif code >= 250 and code < 400:
                return ('smtp_valid', f'{code} {msg_str}')
            elif code >= 400 and code < 500:
                return ('smtp_unknown', f'{code} {msg_str}')
            elif code >= 500:
                return ('smtp_invalid', f'{code} {msg_str}')
            else:
                return ('smtp_unknown', f'{code} {msg_str}')
        except smtplib.SMTPRecipientsRefused as e:
            # e.recipients is a dict: {addr: (code, msg)}
            for addr, (code, msg) in e.recipients.items():
                msg_str = msg.decode() if isinstance(msg, bytes) else str(msg)
                full_str = f'{code} {msg_str}'.lower()
                if 'spamhaus' in full_str or 'blocked using' in full_str or 'client host' in full_str or 'block list' in full_str or 'blocklist' in full_str:
                    return ('smtp_unverifiable', f'{code} {msg_str}')
                if code == 550 or code == 551 or code == 552 or code == 553 or code >= 500:
                    return ('smtp_invalid', f'{code} {msg_str}')
                return ('smtp_unknown', f'{code} {msg_str}')
            continue  # try next MX
        except smtplib.SMTPConnectError as e:
            continue  # try next MX
        except smtplib.SMTPServerDisconnected as e:
            continue  # try next MX
        except smtplib.SMTPHeloError as e:
            continue  # try next MX
        except smtplib.SMTPSenderRefused as e:
            # Check if it's a blocklist issue
            err_str = str(e).lower()
            if 'spamhaus' in err_str or 'blocked using' in err_str or 'block list' in err_str or 'blocklist' in err_str:
                return ('smtp_unverifiable', str(e))
            continue  # try next MX
        except smtplib.SMTPDataError as e:
            err_str = str(e).lower()
            if 'spamhaus' in err_str or 'blocked using' in err_str or 'block list' in err_str or 'blocklist' in err_str:
                return ('smtp_unverifiable', str(e))
            continue  # try next MX
        except socket.timeout:
            continue  # try next MX
        except ConnectionRefusedError:
            continue  # try next MX
        except OSError as e:
            continue  # try next MX
        except Exception as e:
            err_str = str(e).lower()
            if 'spamhaus' in err_str or 'blocked using' in err_str or 'block list' in err_str or 'blocklist' in err_str:
                return ('smtp_unverifiable', str(e))
            continue  # try next MX

    return ('smtp_unverifiable', 'All MX servers unreachable or refused connection')


def verify_email(email_addr, timeout=10):
    """
    Full verification: MX check + SMTP RCPT TO.
    Returns (status, detail)
    """
    domain = email_addr.split('@')[-1] if '@' in email_addr else ''
    if not domain:
        return ('no_mx_invalid', 'No domain in email address')

    mx_hosts = mx_lookup(domain)
    if not mx_hosts:
        return ('no_mx_invalid', f'No MX records for {domain}')

    return smtp_verify(email_addr, mx_hosts, timeout=timeout)


def main():
    import argparse
    parser = argparse.ArgumentParser(description='Free email verification via MX + SMTP')
    parser.add_argument('--input', default='prospects.csv', help='Input CSV file')
    parser.add_argument('--output', default='prospects.csv', help='Output CSV file (can be same as input)')
    parser.add_argument('--suppression', default='suppression.csv', help='Suppression CSV file')
    parser.add_argument('--delay', type=float, default=2.0, help='Delay between checks in seconds')
    parser.add_argument('--timeout', type=int, default=10, help='SMTP timeout in seconds')
    parser.add_argument('--data-dir', default='.', help='Directory containing CSV files')
    parser.add_argument('--dry-run', action='store_true', help='Only check MX records, no SMTP')
    parser.add_argument('--limit', type=int, default=0, help='Limit number of emails to check (0 = all)')
    args = parser.parse_args()

    data_dir = args.data_dir
    input_path = os.path.join(data_dir, args.input)
    output_path = os.path.join(data_dir, args.output)
    supp_path = os.path.join(data_dir, args.suppression)

    # Backup files
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    backup_input = f'{input_path}.bak_{timestamp}'
    backup_supp = f'{supp_path}.bak_{timestamp}'
    shutil.copy2(input_path, backup_input)
    if os.path.exists(supp_path):
        shutil.copy2(supp_path, backup_supp)
    print(f'Backed up: {backup_input}, {backup_supp}')

    # Read prospects
    with open(input_path, 'r', newline='') as f:
        reader = csv.DictReader(f)
        fieldnames = reader.fieldnames
        rows = list(reader)

    # Read suppression emails
    supp_emails = set()
    supp_rows = []
    if os.path.exists(supp_path):
        with open(supp_path, 'r', newline='') as f:
            reader = csv.DictReader(f)
            supp_fieldnames = reader.fieldnames
            supp_rows = list(reader)
            for r in supp_rows:
                supp_emails.add(r['email'].strip().lower())
    else:
        supp_fieldnames = ['email', 'reason', 'source_row_id', 'added_at', 'note']

    # Find unverified emails
    verified_markers = ['hunter_valid', 'hunter_invalid', 'hunter_accept_all', 'email_hunter_conf', 'smtp_', 'no_mx_invalid']
    to_verify = []
    for row in rows:
        notes = row.get('notes', '') or ''
        email = row.get('email', '').strip()
        if not email:
            continue
        is_verified = any(marker in notes.lower() for marker in verified_markers)
        if not is_verified and email.lower() not in supp_emails:
            to_verify.append(row)

    if args.limit > 0:
        to_verify = to_verify[:args.limit]

    print(f'Total prospects: {len(rows)}')
    print(f'Unverified to check: {len(to_verify)}')
    print(f'Suppression list size: {len(supp_emails)}')
    print()

    # Verify each email
    results = {
        'smtp_valid': 0,
        'smtp_invalid': 0,
        'no_mx_invalid': 0,
        'smtp_unknown': 0,
        'smtp_unverifiable': 0,
    }

    new_supp_entries = []
    now_iso = datetime.now(timezone.utc).isoformat()

    for i, row in enumerate(to_verify):
        email = row['email'].strip()
        prospect_id = row['id']

        status, detail = verify_email(email, timeout=args.timeout)
        results[status] += 1

        print(f'[{i+1}/{len(to_verify)}] {prospect_id} | {email} | {status} | {detail}')

        # Update notes
        existing_notes = row.get('notes', '') or ''
        # Append verification result to notes
        ver_note = f' | smtp_check={status} ({detail})'
        if existing_notes:
            row['notes'] = existing_notes + ver_note
        else:
            row['notes'] = ver_note.strip(' |')

        # Add invalid emails to suppression
        if status in ('no_mx_invalid', 'smtp_invalid'):
            new_supp_entries.append({
                'email': email,
                'reason': 'smtp_verification_failed',
                'source_row_id': prospect_id,
                'added_at': now_iso,
                'note': f'Free SMTP verification: {status} ({detail})'
            })

        # Delay between checks to avoid rate limiting
        if i < len(to_verify) - 1:
            time.sleep(args.delay)

    # Write updated prospects
    with open(output_path, 'w', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    # Write updated suppression list
    if new_supp_entries:
        all_supp = supp_rows + new_supp_entries
        with open(supp_path, 'w', newline='') as f:
            writer = csv.DictWriter(f, fieldnames=supp_fieldnames)
            writer.writeheader()
            writer.writerows(all_supp)

    # Report
    print()
    print('=' * 60)
    print('VERIFICATION REPORT')
    print('=' * 60)
    print(f'Total checked:       {len(to_verify)}')
    print(f'Valid (smtp_valid):  {results["smtp_valid"]}')
    print(f'Invalid (no_mx):     {results["no_mx_invalid"]}')
    print(f'Invalid (smtp_550):  {results["smtp_invalid"]}')
    print(f'Unknown (251/other): {results["smtp_unknown"]}')
    print(f'Unverifiable:        {results["smtp_unverifiable"]}')
    print(f'Newly suppressed:    {len(new_supp_entries)}')
    print(f'Backups: {backup_input}, {backup_supp}')
    print('=' * 60)


if __name__ == '__main__':
    main()