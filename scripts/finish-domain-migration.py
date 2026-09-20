#!/usr/bin/env python3
"""Move the sender identity from getcollectly.app to mugavi.com.

Run this ONLY after Resend has verified mugavi.com and its DKIM records are
live. Everything here is held back from the main rebrand commit on purpose: the
brand name and the web URLs moved immediately, but anything that determines
where mail comes FROM breaks sending the moment it is changed ahead of Resend.

Dry run by default. Pass --apply to write.

What it does NOT do, because they are not files:
  1. RESEND_FROM_EMAIL in Vercel (production) and in .env.local
  2. Resend domain verification itself
  3. The five OAuth redirect URIs (Xero, QuickBooks, Square, Stripe, Clerk)
It prints a reminder for each.

Note on unsubscribe URLs: NEW sends move to mugavi.com, but the ~415 links
already in people's inboxes point at getcollectly.app/api/unsubscribe and keep
working -- src/lib/legacy-domain.ts carves /api/ out of the 301 for exactly
this reason. Do not "tidy" that carve-out away.
"""
import argparse
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OLD_DOMAIN = "getcollectly.app"
NEW_DOMAIN = "mugavi.com"

MAILBOX_RE = re.compile(r"([a-zA-Z0-9._-]+)@" + re.escape(OLD_DOMAIN))
SIGNATURE_RE = re.compile(r"Collectly · " + re.escape(OLD_DOMAIN))
UNSUB_RE = re.compile(r"https://" + re.escape(OLD_DOMAIN) + r"/api/unsubscribe")


def walk(rel, exts):
    base = os.path.join(ROOT, rel)
    for dp, dirs, fs in os.walk(base):
        dirs[:] = [d for d in dirs if d not in {"node_modules", ".next", ".git"}]
        for f in fs:
            if f.endswith(exts):
                yield os.path.join(dp, f)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true", help="write changes (default: dry run)")
    args = ap.parse_args()

    edits = []  # (path, label, count, newtext)

    for p in walk("src", (".ts", ".tsx")):
        s = open(p, encoding="utf-8").read()
        n = len(MAILBOX_RE.findall(s))
        if n:
            edits.append((p, f"{n} mailbox(es)", n, MAILBOX_RE.sub(r"\1@" + NEW_DOMAIN, s)))

    for p in walk("outreach/messages", (".md",)):
        s = open(p, encoding="utf-8").read()
        n = len(SIGNATURE_RE.findall(s)) + len(UNSUB_RE.findall(s))
        if n:
            t = SIGNATURE_RE.sub("Mugavi · " + NEW_DOMAIN, s)
            t = UNSUB_RE.sub("https://" + NEW_DOMAIN + "/api/unsubscribe", t)
            edits.append((p, f"{n} signature/unsub ref(s)", n, t))

    sender = os.path.join(ROOT, "outreach/scripts/daily_send.py")
    s = open(sender, encoding="utf-8").read()
    n = len(UNSUB_RE.findall(s))
    if n:
        edits.append((sender, f"{n} footer unsubscribe URL", n,
                      UNSUB_RE.sub("https://" + NEW_DOMAIN + "/api/unsubscribe", s)))

    if not edits:
        print("Nothing left to migrate.")
    total = sum(e[2] for e in edits)
    print(f"{'APPLYING' if args.apply else 'DRY RUN'} — {len(edits)} files, {total} replacements\n")
    for p, label, _n, new in edits:
        print(f"  {os.path.relpath(p, ROOT):<56} {label}")
        if args.apply:
            open(p, "w", encoding="utf-8").write(new)

    print("\n" + "=" * 68)
    print("BLOCKER: mugavi.com HAS NO WORKING EMAIL AS OF 2026-09-20")
    print("=" * 68)
    print("  Namecheap reports EmailType=FWD and the eforward MX records resolve,")
    print("  but getEmailForwarding returns ZERO rules. Mail to anything@mugavi.com")
    print("  is accepted by the MX and then goes nowhere.")
    print()
    print("  Do NOT run this script until that is fixed. It publishes privacy@,")
    print("  dpa@ and security@ addresses on the site. A DPA contact that silently")
    print("  drops mail is worse than one pointing at a domain you still read.")
    print()
    print("  getcollectly.app runs Zoho Mail. To reproduce that on mugavi.com:")
    print("    MX   10 mx.zoho.com / 20 mx2.zoho.com / 50 mx3.zoho.com")
    print("    TXT  zoho-verification=<from Zoho when you add the domain>")
    print("    TXT  v=spf1 include:zohomail.com include:resend.com ~all")
    print("         ^ ONE record covering both. The current mugavi.com SPF is")
    print("           'v=spf1 include:spf.efwd.registrar-servers.com ~all' and must")
    print("           be REPLACED, not joined by a second SPF record.")
    print("    TXT  google-site-verification=<from Search Console>")
    print("    CNAME <selector>._domainkey -> Resend DKIM")
    print()
    print("  Setting Zoho MX means dropping Namecheap forwarding (EmailType). Do not")
    print("  run both -- they compete for the same MX records.")
    print()
    print("STILL MANUAL — these are not files:")
    print("  1. Resend: verify mugavi.com. Its SPF include must be MERGED into the")
    print("     existing 'v=spf1 include:spf.efwd.registrar-servers.com ~all' record.")
    print("     Two SPF records is a hard fail, not a soft one.")
    print("  2. RESEND_FROM_EMAIL -> davie@mugavi.com, in Vercel production AND .env.local")
    print("  3. OAuth redirect URIs: Xero, QuickBooks, Square, Stripe, Clerk")
    print("  4. Namecheap email forwarding for the new mailboxes (EmailType=FWD is on)")
    print("  5. Google Search Console: add mugavi.com, then Change of Address")
    print("  6. Twitter/X handle: twitter:site and twitter:creator are still")
    print("     '@getcollectly' (src/lib/seo.ts, src/app/layout.tsx). Point them at")
    print("     the new handle ONLY once it is registered to us -- otherwise the tags")
    print("     credit this site's content to whoever owns it. If no handle is")
    print("     registered, delete the two tags rather than guessing.")
    if not args.apply:
        print("\nRe-run with --apply to write.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
