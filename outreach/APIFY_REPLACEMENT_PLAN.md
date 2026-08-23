# Collectly Marketing Push — Apify Replacement + Zero-Budget Sprint
_Drafted: 2026-08-18 23:50 EAT (Davie live chat)_

## TL;DR

Apify is dead at the account cap. We don't need it. Prospect research is just:
1. A targeted directory (free, public, structured)
2. A website + team-page crawl (free, no API)
3. A pattern-match for "we do dunning" / "AR" / "fractional" signal
4. A free/cheap email-guess step

The plan below does that with **$0 spend** and beats Apify on quality (Apify was giving us geographic-skewed bookkeeping lists; we want fractional-CFO + small-firm-bookkeeper, US/CA-heavy, 5–50 employees, founder-led).

---

## Part 1 — Apify Replacement: 4-Source Research Stack

**Source A — Clutch.co (web design / accounting / financial services slugs)**
- Free, no API key needed. `discover_prospects.py` already has the pattern — just swap slugs.
- New slugs: `accounting-services`, `bookkeeping`, `financial-services`, `fractional-cfo`.
- 50 listings/slug × 4 slugs = ~200 raw records. Dedup by domain → ~120 unique.
- Hook: each Clutch profile has min project size, employee count, location, services.

**Source B — LinkedIn Sales Navigator free tricks**
- Free: Google site:linkedin.com/in "<title>" "<city>" patterns.
  Example: `site:linkedin.com/in "Founder" "fractional CFO" "Denver"`.
- Scrape the **public profile page** with `web_fetch` (already available) — pull name, current title, company, location, snippet.
- 30–60 leads/hour per query. No API key, no Apify.

**Source C — Firm-specific websites (the "AR pain signal" layer)**
- For each company from A or B, hit their website with `web_fetch`. Look for:
  - "We handle invoicing" / "cash flow management" / "monthly close"
  - Team page → founder name + email pattern
  - Careers page → "AR clerk" or "billing" job posts = SIGN (means AR is manual and painful)
- This is the *research quality* layer Apify never gave us. Hand-curated by me, in parallel.

**Source D — Free email-guess cascade** (when Hunter/Apollo aren't set)
1. `web_fetch` the company's team / about / contact page → look for the founder email.
2. Pattern-match: scrape the website MX, guess `{first}.{last}@domain`, `{first}@domain`, `info@domain`, `founder@domain`.
3. DNS MX lookup via `dig +short MX domain` (free, native shell).
4. SMTP RCPT TO probe with `swaks` or a tiny Python `smtplib` script to validate the mailbox exists. (Optional, max 50/day to stay polite.)
5. Fallback: LinkedIn InMail-style outreach (no email needed if we get warm intro from an investor/community contact).

**Result:** ~30–60 qualified leads/week with verified founder email, on $0.

---

## Part 2 — Zero-Budget Marketing Sprint (in parallel)

Wired already, just needed a green light:

| Track | What | Cadence | Owner |
|---|---|---|---|
| Re-warm the 81 frozen prospects | Hand-craft T2/T3 follow-ups referencing their original T1 (Lana Hill is now 13+ days cold) | Today | me |
| New cold list (via Sources A–D above) | Personalize T1 with the AR-pain-signal hook we found | 10/day | me |
| LinkedIn DMs to founders we find | Short, value-first, link to getcollectly.app/demo | 5/day | me |
| Content SEO | One short post/week: "AR dunning mistakes 5-50 person firms make" → cross-post Indie Hackers + LinkedIn | weekly | me (drafts) |
| Indie Hackers / Reddit / Slack communities | r/bookkeeping, r/Accounting, IndieHackers "Show IH", Xero/QuickBooks community boards | 3 posts/week | me (drafts) |
| Beta-directory listings | Product Hunt "upcoming", BetaList, F6S, Launching Next — fill profiles, schedule for Aug | This week | I need your accounts |

---

## Part 3 — What I Need From You (sequenced)

1. **Tonight:** confirm I can spin up the new `discover_prospects_v2.py` with the new slugs and the website-signal layer. (I have full file write + web_fetch.)
2. **This week:** add **one** enrichment key under `~/.openclaw/secrets/collectly/` so I can stop guessing emails. Cheapest: Hunter.io free tier (25 lookups/mo) or Snov.io free tier. **Even free trial beats SMTP-probe.**
3. **Optional but high-ROI:** raise the Apify monthly cap (or just leave it off — the new stack replaces it).

---

## Part 4 — Success Metrics (so we know it's working)

- Lead-flow rate: ≥ 30 fresh qualified prospects/week into `prospects.csv` (vs current 0).
- Email-confidence: ≥ 70% of new leads have a verified-pattern email (vs the 6-step guess we did before).
- Personalization hook: every T1 references one of {website AR-signal, recent founder LinkedIn post, Clutch mini-bio, industry-vertical pain} — no more generic blasts.
- Kill switch: if 30 new leads in 2 weeks produce < 2 replies, we re-tighten ICP, not just copy.

---

## Part 5 — Immediate Action (next 60 min, if you greenlight)

1. Write `discover_prospects_v2.py` — Clutch slugs `accounting-services` + `bookkeeping` + `fractional-cfo` + `financial-services`, US/CA filter, fetch team pages, extract founder email patterns.
2. Spin it for 1 segment as a smoke test. Expect ~15–25 leads in the first run.
3. Draft T1 copy for the first 5 leads with their actual pain signal embedded.
4. Queue everything behind the deliverability gate — won't actually send until your gate flips.

**Say "go" and I'll start writing the script.** Or if you want me to tweak the slugs/segments first, holler.
