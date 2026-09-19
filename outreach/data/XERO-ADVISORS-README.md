# xero-advisors-cleaned-2026-09-19.csv

255 New Zealand and Australian accounting and bookkeeping firms, cleaned from
two Apify `xero-advisor-scraper` exports dated 2026-09-16.

## NOT A SEND LIST

The `consent` column reads `NONE — scraped directory` on every row, and that is
the operative fact about this file.

New Zealand's Unsolicited Electronic Messages Act 2007 prohibits sending
unsolicited commercial electronic messages with a New Zealand link, and
separately prohibits using address-harvesting software or a list produced by
one. A scraped advisor directory is both. 251 of these 255 firms are in New
Zealand; the remaining 4 are Australian and covered by the equivalent Spam Act
2003.

`daily_send.py` will not be pointed at this file. It is here so the research is
not lost and so the same directory can be approached through a route that
produces consent — a Xero App Store listing, a signup path, LinkedIn, or a
partner introduction.

## What the cleaning removed

| | |
|---|---|
| Raw records across both exports | 1,000 |
| Records carrying no email at all | 534 |
| Email addresses found | 2,207 |
| Duplicates | 425 |
| Role addresses (`info@`, `accounts@`, …) | 353 |
| Collapsed to one contact per firm | 1,174 |
| **Firms remaining** | **255** |

Two things worth noticing in that table.

**"891 prospects" was never 891 prospects.** Over half the scraped records
carry no email, and most of the rest are several addresses at the same firm.
The real reach of this list is 255 organisations.

**353 role addresses were stripped**, and that is the same category that took
the sending domain from 1.2% to 18.2% bounce between 2026-08-30 and
2026-09-18 — role mailboxes bounced at 39.1% against 1.8% for personal ones.
Had this list gone out raw it would have been 353 of those in one batch.

Of the 255 kept, 215 local parts are a single name (`jane@`), 23 are
`first.last@`, 9 are an initial plus name. Only 2 sit on free mail providers,
so these are genuine firm addresses rather than personal accounts.

## Fields

`email, domain, firm, city, country, website, source, consent`

One row per firm domain. Where a firm listed several people, the first address
was kept and the rest dropped — nobody needs the same pitch from five
colleagues.

## If this audience is wanted

The Xero App Store is the direct route: these firms are Xero advisors by
definition, a listing puts the product in front of them with consent built into
the install, and it does not depend on anyone's mailbox. LinkedIn outreach to
the same firms is outside the Act entirely. Both are slower than a send and
both survive contact with a regulator.
