# Claude Code Task: Rebuild Collectly Lead Generation Pipeline for 1,000+ Verified Emails at Minimum Cost

## Context

Collectly is a SaaS startup doing cold email outreach. We need **1,000+ verified prospect emails** in `outreach/data/prospects.csv` as fast as possible, at near-zero cost. 

**Current state (pathetic):**
- 180 prospects total after spending $15.68 on Apify ($9.35 on the old FREE plan + $6.33 on the new $29/mo STARTER plan)
- 108 came from Apify (paid, ~$0.15/prospect — unacceptable)
- 72 came from free sources (Clutch, LinkedIn X-ray, IndieHackers, web search — $0)
- We have 60 suppressed, only ~120 actually emailable
- 0.53% reply rate — need way more volume to get meaningful replies

**What we have (infrastructure):**
- Working directory: `~/.openclaw/workspace/collectly/`
- Prospect CSV: `outreach/data/prospects.csv` (columns: id,first_name,last_name,company,role,country,team_size,industry,linkedin_url,email,source,notes,hook,tier)
- Outreach state: `outreach/data/outreach-state.json`
- Task queue: `outreach/data/task-queue.json`
- Suppression list: `outreach/data/suppression.csv`
- Deliverability gate: `outreach/data/gate-status.json` (currently "allow", 100/day send cap)
- Resend API for sending (key at `~/.openclaw/secrets/collectly/RESEND_API_KEY`)
- Hunter API key at `~/.openclaw/secrets/collectly/HUNTER_API_KEY` (free tier, 50/mo)
- Apify token at `~/.openclaw/secrets/collectly/APIFY_CREDS` (STARTER $29/mo, $22.67 remaining this cycle)
- NO Apollo API key, NO Skrapp key

**Existing scripts (read these before rewriting anything):**
- `outreach/scripts/discover_prospects_v2.py` — Clutch.co scraper, free, gets company websites + founder emails. Currently capped at 25/segment, 3 pages/segment. THIS IS THE BEST FREE SOURCE.
- `outreach/scripts/discover_prospects.py` — older version of Clutch scraper, also uses Hunter for email finding
- `outreach/scripts/free_email_finder.py` — pattern-based email guessing + web search verification, no API needed
- `outreach/scripts/scrape_agency_websites.py` — scrapes team/about/contact pages for founder emails from company domains
- `outreach/scripts/enrich_pipeline.py` — Apollo/Hunter/Skrapp pipeline (keys not set, currently non-functional)
- `outreach/scripts/apify_lead_source.js` — Apify B2B lead scraper (costs money per event)
- `outreach/scripts/apify_daily_pace_guard.py` — pace/dollar guard for Apify
- `outreach/scripts/lib/apify_runner.js` — thin Apify API wrapper
- `outreach/scripts/clients/` — Apollo, Hunter, Skrapp client modules
- `outreach/scripts/task_runner.py` — the sequencer that picks up QUEUED tasks and sends emails

## The Problem

1. **Apify per-event pricing is bleeding us.** Paid actors charge $0.10-0.15 per result. At 1,000 prospects that's $100-150. Not viable.
2. **Free sources are underutilized.** `discover_prospects_v2.py` is capped at 25/segment × 4 segments = 100 max. It could do way more.
3. **No email verification strategy.** We're paying Hunter $0 for free tier (50/mo) but could verify emails for free using MX + pattern + SMTP checks.
4. **Small batch runs waste Apify credits.** Running the scraper 15+ times for 3-25 results each time burns overhead.
5. **No diversification.** We're not using Google Maps scraping, Yelp, Yellow Pages, industry directories, or other free sources.

## The Goal

**1,000+ verified, deduplicated prospect emails in `prospects.csv` ready for outreach, spending $0 or close to it.**

## What to Build

### 1. Audit existing scripts FIRST
Read every script in `outreach/scripts/`. Understand what works, what's broken, what's redundant. Don't rewrite working code — fix and scale it.

### 2. Scale up free sources (PRIORITY)

**A. Clutch.co scraper (`discover_prospects_v2.py`)**
- Remove the `MAX_PER_SEGMENT = 25` and `MAX_PAGES_PER_SEGMENT = 3` caps
- Add MORE segments: accounting, bookkeeping, fractional-cfo, financial-services, web-developers, digital-marketing, branding, design, consulting, marketing-agency, seo, ppc, ecommerce
- Expand geography: US, Canada, UK, Australia, New Zealand, Ireland, Singapore, South Africa
- Target: 300-500 raw company profiles from Clutch alone

**B. Company website email scraper (`scrape_agency_websites.py`)**
- Run it on ALL company domains found by the Clutch scraper
- It already finds founder emails from /team, /about, /contact pages
- Target: 200-300 emails from website scraping

**C. Free email pattern generator (`free_email_finder.py`)**
- For every company where we have a founder name + domain but no email found by scraping
- Generate email patterns (first@domain, first.last@domain, etc.)
- Verify via web search (DuckDuckGo exact match) — already implemented
- Target: 100-200 additional emails

**D. NEW: Google Maps / business directory scraper**
- Write a new script that scrapes Google Maps results for "bookkeeping services", "accounting firm", "marketing agency", etc. across major US/UK/AU/CA cities
- Google Maps listings are free and public — company name, website, phone, address
- Then run the website email scraper on each domain
- Target: 200-400 additional companies → 100-200 emails

**E. NEW: Industry directory scrapers**
- Sortlist.com, GoodFirms.co, Bark.com, UpCity.com — all free public directories
- Same flow: scrape company listings → get domains → scrape websites for emails
- Target: 100-200 additional companies

### 3. Email verification (FREE, no paid APIs)
- MX record lookup via `dig` (already used in discover_prospects_v2.py)
- Pattern confidence scoring (first.last@domain > info@domain > random)
- Web search verification (DuckDuckGo exact match — already in free_email_finder.py)
- Optional: SMTP RCPT TO check (but many servers block this — make it opt-in)
- Do NOT rely on Hunter (50/mo free tier is too small for 1,000+)

### 4. Deduplication and quality
- Dedup by email AND by domain (one contact per company)
- Skip generic emails (info@, contact@, hello@) UNLESS no founder email found
- Skip free webmail (gmail.com, yahoo.com, hotmail.com, outlook.com) UNLESS it's the only option
- Tag each prospect with source, verification method, and confidence score
- Auto-assign tier based on ICP fit (bookkeeping/accounting = tier 1, marketing/branding = tier 2, other = tier 3)

### 5. Don't break existing infrastructure
- `prospects.csv` format MUST stay the same (same columns)
- `outreach-state.json` format MUST stay the same
- `task-queue.json` format MUST stay the same (tasks with id, prospect_id, email, touch, tier, segment, state, approval_level, approval_reason, etc.)
- `suppression.csv` must be respected — never add a suppressed email/domain
- The sequencer (`task_runner.py`) must be able to pick up new prospects and create QUEUED tasks for them
- The deliverability gate must not be affected

### 6. Apify — use ONLY for gap-filling, and ONLY free-tier actors
- Do NOT use paid per-event actors (logiover/b2b-lead-scraper, compass/crawler-google-places)
- Only use free actors if any (check the Apify store for free email finders / scrapers)
- Cap Apify spend at $5 total for the rest of this cycle
- Prefer the free sources above — they should get us to 1,000+ without Apify

### 7. Output
- All new prospects appended to `outreach/data/prospects.csv`
- New tasks created in `outreach/data/task-queue.json` with state=QUEUED, approval_level=auto (for existing segments) or flag_for_review (for new segments)
- A summary report: how many prospects from each source, how many verified, how many per segment, how many per country, total cost

## Constraints
- Python 3.14 + Node.js available, stdlib preferred (no pip install needed for core scraping)
- Hunter API key available but only 50/mo — use sparingly
- Apify token available but budget capped at $5 more this cycle
- No paid APIs beyond what's listed above
- Run on Linux (WSL2), bash shell
- Be polite with rate limits (0.5-1s sleep between requests)
- Don't get IP-banned — use realistic user agents, respect robots.txt where reasonable

## Verification
After running, verify:
1. `wc -l outreach/data/prospects.csv` shows 1,000+ data rows
2. Email column is populated for 90%+ of rows
3. No duplicates by email or domain
4. No suppressed emails/domains included
5. `task-queue.json` has QUEUED tasks for all new prospects
6. Total spend < $5

## Execution
Start by reading ALL the existing scripts, then build a plan, then execute it. Fix broken code. Scale up what works. Add what's missing. Run it. Verify the output. Report the numbers.