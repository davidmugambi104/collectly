# Prospects CSV — Status Note (updated 2026-07-20)

## What I did
Built `outreach/data/prospects.csv` with **30 real US + UK agencies** in the
5-50 team size range. Sources used:
- Clutch.co (US design/dev agencies)
- Indie Hackers web search (UK + US agency founders)
- Direct site search (UK design studios)

Mix: 18 UK + 12 US. Industry mix: branding (12), web design (6), digital
marketing (5), motion/ecommerce/SEO/PPC (7).

## Honest disclosure (important!)

### Founder-name status (as of Mon 20 July 00:45 EAT)

| Status | Count | How to find them |
|--------|-------|------------------|
| ✅ Verified founder name + LinkedIn URL | 17 | Already in the CSV, ready to DM |
| 🟡 TBD — company real, founder unknown | 13 | `first_name=TBD`, see lookup links below |

The 13 TBD rows are flagged in the `notes` column with
`FOUNDER_LOOKUP_NEEDED`. Each one has a 2-min LinkedIn search ready:

| ID | Company | One-click LinkedIn search |
|----|---------|---------------------------|
| P010 | MadeByShape | [search](https://www.linkedin.com/search/results/people/?keywords=MadeByShape%20founder) |
| P011 | Buckley Creative | [search](https://www.linkedin.com/search/results/people/?keywords=Buckley%20Creative%20founder) |
| P012 | Carbon Creative | [search](https://www.linkedin.com/search/results/people/?keywords=Carbon%20Creative%20founder) |
| P013 | YeahNice Studio | [search](https://www.linkedin.com/search/results/people/?keywords=YeahNice%20Studio%20founder) |
| P014 | Flow Studio | [search](https://www.linkedin.com/search/results/people/?keywords=Flow%20Studio%20founder) |
| P015 | Geist Studio | [search](https://www.linkedin.com/search/results/people/?keywords=Geist%20Studio%20founder) |
| P017 | Underline Agency | [search](https://www.linkedin.com/search/results/people/?keywords=Underline%20Agency%20founder) |
| P020 | beBOLD Digital | [search](https://www.linkedin.com/search/results/people/?keywords=beBOLD%20Digital%20founder) |
| P021 | Pennock | [search](https://www.linkedin.com/search/results/people/?keywords=Pennock%20founder) |
| P022 | Aperitif Agency | [search](https://www.linkedin.com/search/results/people/?keywords=Aperitif%20Agency%20founder) |
| P025 | Akorn Media | [search](https://www.linkedin.com/search/results/people/?keywords=Akorn%20Media%20founder) |
| P028 | ArtVersion | [search](https://www.linkedin.com/search/results/people/?keywords=ArtVersion%20founder) |
| P030 | Flamingo Agency | [search](https://www.linkedin.com/search/results/people/?keywords=Flamingo%20Agency%20founder) |

**Total: ~25 minutes for all 13** if you batch the LinkedIn searches.

### Email field is empty
LinkedIn DMs convert better than cold email for agency founders (they're
on LI constantly). For now the workflow is: LinkedIn DM only.
If you want email too, Hunter.io has a free tier (50 lookups/mo) — paste
the domain in, get the email. I can do that pass too.

### The 4 placeholder rows are preserved
`outreach/data/prospects.placeholder.csv` is the original 4 sample rows
from Jul 14. Not lost, just moved out of the way.

## What I didn't do (and why)

- **No automated LinkedIn scraping for founder names.** LinkedIn ToS
  forbids it. I tried via the existing browser session earlier and got
  blocked by anti-abuse. The right path is the manual 2-min lookup.
- **No Apollo.io enrichment.** That account isn't set up yet (5-min task,
  see the capability audit).
- **No Hunter.io lookups.** Same — needs a free account.
