# Collectly Customer-Interview Outbound Pipeline

## What this is
A file-driven, zero-API-key outbound workflow for collecting 10 customer interviews
with founders / finance leads at 5-50 person B2B service businesses.

## Why file-based (v1)
- No Apollo/Clay/Instantly spend. Uses free LinkedIn, free directories, manual enrichment.
- All artifacts in git. You can review every message before it goes out.
- Swappable: when we have budget, replace the `scripts/build-list.ts` enrichment
  step with Apollo/Clay API calls. The rest stays the same.

## Directory layout
```
outreach/
  data/
    prospects.csv          # Master prospect list. One row per lead.
    outreach-log.csv       # What was sent, when, response, next-step.
  messages/
    t1-cold.md             # Touch 1: cold LinkedIn or email (request interview)
    t2-followup.md         # Touch 2: +3 days if no reply
    t3-final.md            # Touch 3: +7 days if no reply (breakup)
  scripts/
    build-list.sh          # Seed the prospects.csv from scratch
    add-prospect.sh        # One-off: append a single prospect
    log-outreach.sh        # Record a sent message / reply
    pipeline-status.sh     # Pretty-print KPIs from outreach-log.csv
    generate-messages.sh   # Print ready-to-paste copy for a given prospect
```

## Workflow
1. **Find 30 prospects** (10 interviews expected at ~33% conversion).
   Run `./scripts/build-list.sh` to see the 5 source categories, then fill `data/prospects.csv`.
2. **For each prospect, generate copy** with `./scripts/generate-messages.sh <id>`.
   It prints T1/T2/T3 customized with their company name + industry.
3. **Send T1 manually** via LinkedIn DM or email. Then immediately
   `./scripts/log-outreach.sh sent <id> t1` so we have a record.
4. **Wait 3 days.** If no reply, run `./scripts/log-outreach.sh noreply <id> t1`,
   then send T2. Same for T3 at +7 days.
5. **If they reply** positively, book the interview. Log the outcome:
   `./scripts/log-outreach.sh interview <id>` — it moves them to "won".
6. **Run** `./scripts/pipeline-status.sh` to see funnel health.

## Target ICP (so we don't waste time on bad leads)
- 5-50 person B2B service business
- US, UK, AU, CA, IE, NZ (English-speaking, invoice-able)
- Recurring A/R > $10k outstanding at any given time
- Industries: agency, consulting, IT services, accounting, legal, freelance collectives
- Founder/CEO/COO/CFO/Head of Finance is the right person to contact

## Source list (free, manual enrichment)
- LinkedIn Sales Navigator free trail (5 seats/month possible, or just use free search)
- YC Work at a Startup, Wellfound, AngelList Talent
- Clutch.co, G2.com (look for agencies/consultancies without established AR tools)
- Crunchbase (recently funded service businesses)
- Twitter / X (search "agency owner" + invoice pain)
- Indie Hackers (people with $5k-50k MRR agencies)
- Local Chamber of Commerce directories
- Your own past clients / referrals (highest conversion — start here)
