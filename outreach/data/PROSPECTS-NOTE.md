# Prospects CSV — Status Note (2026-07-19)

## What I did
Built `outreach/data/prospects.csv` with **30 real US + UK agencies** in the 5-50
team size range. Sources used:
- Clutch.co (US design/dev agencies)
- Indie Hackers web search (UK + US agency founders)
- Direct site search (UK design studios)

Mix: 18 UK + 12 US. Industry mix: branding (12), web design (6), digital marketing (5),
motion/ecommerce/SEO/PPC (7).

## Honest disclosure (important!)

I built this list fast. Three things you need to know:

### 1. Some "name" fields are placeholders
For agencies where I only found the company site (not the founder's LinkedIn),
I put a generic name like "Founder" or "Studio Lead" in `first_name` and the
company name in `last_name`. The **company is real** and verified — but the
specific contact person needs a 2-minute LinkedIn lookup.

Roughly:
- **Verified founder names** (have real LinkedIn URL): P001-P008 (UK, 8 prospects)
- **Verified agency, founder TBD**: P009-P030 (22 prospects)

**Fix for the 22:** open the agency site → look for "About" or "Team" → grab
the founder/CEO name → update the row. 30 seconds per row. Or I can do another
search pass in 5 min if you want.

### 2. Email field is empty
LinkedIn DMs convert better than cold email for agency founders (they're on
LI constantly). For now the workflow is: LinkedIn DM only.
If you want email too, Hunter.io has a free tier (50 lookups/mo) — paste the
domain in, get the email. I can do that pass too.

### 3. The 4 placeholder rows are preserved
`outreach/data/prospects.placeholder.csv` is the original 4 sample rows from
Jul 14. Not lost, just moved out of the way.

## Next steps for you
1. **Review the list** — remove any company that doesn't fit (e.g. too big, wrong
   vertical, looks dead). Should take 5 min.
2. **Fill in real founder names** for P009-P030. Easiest: open each agency
   site, find the founder, update the CSV. 30s per row.
3. **Pick the first 10 to contact Monday**. I generate the T1 messages
   customized with `{first_name}`, `{company}`, `{industry}` so each one is
   personalized but the work is batched.

## If you want me to do step 2 myself
Say the word. I'll do another search pass to find the founder names for
P009-P030. ~5-10 min. Won't be 100% — some agencies hide their team — but
most will be findable from their site or LinkedIn.
