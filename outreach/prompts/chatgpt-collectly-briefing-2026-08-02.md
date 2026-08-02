# Collectly — Briefing for Strategic Planning Session

> **Purpose:** Give ChatGPT enough context to think with us about how to reach our first paying customers.
> **Author:** Davie Mugambi (founder, solo, Kenya-based)
> **Date prepared:** 2026-08-02 (EAT)
> **Reading time for ChatGPT:** ~10 minutes
> **What we want from ChatGPT after you read this:** a critique of our current outreach system, gaps we haven't seen, and concrete next moves for the next 14–30 days. Not generic "build in public" advice — be specific to a 1-person pre-revenue B2B SaaS with a working product and a 30-prospect cold-email pipeline that has produced 0 replies in 105+ agency sends.

---

## 1. The product in one paragraph

**Collectly** is an AI-native accounts-receivable (A/R) automation tool for small B2B service businesses. It connects to their accounting software (QuickBooks Online or Xero), reads overdue invoices, and sends **tone-aware, AI-generated follow-up emails and SMS** (friendly → firm → final), automatically pausing when the customer pays or replies. It also surfaces a **4-week cash-flow forecast**, a **customer risk score** (likelihood to pay late), and a **branded payment portal** (card, ACH, SEPA, BACS, AU Direct Debit). Multi-currency day one: USD, GBP, AUD, CAD, EUR.

**Tagline:** *"Get paid 3× faster, without chasing invoices."*

---

## 2. The customer (ICP — be specific, not "any SMB")

- **Who:** 5–50 person B2B service businesses. Project-based or retainer-based. Founder/CEO/COO/CFO/Head of Finance is the buyer.
- **Where:** US, UK, AU, CA (English-speaking, invoice-able). IE and NZ are stretch.
- **What they sell:** branding, web design, digital marketing, SEO/PPC, motion, creative, IT services, consulting, accounting, legal, freelance collectives. **Not** product companies, not B2C/e-commerce, not enterprise.
- **Stack:** Already on QuickBooks Online or Xero (explicit or strongly inferred). On net-30 or net-60 terms.
- **Pain signal:** >$10k outstanding A/R at any time. Founder personally chases invoices, hates it, loses 5–15 hours/month to it.
- **Sweet spot:** 10–25 employees.

**Two outreach channels split this ICP:**
- **Agency channel:** 5–50 person marketing/branding/web agencies. They could use Collectly directly *or* white-label it to their clients.
- **Bookkeeper channel:** Fractional bookkeepers / bookkeeping firms. They manage A/R for many clients, so each one is a 5–20× multiplier.

---

## 3. What's actually built (not vaporware)

**Repo:** `github.com/davidmugambi104/collectly` (public). Production app at `collectly.app`. Local demo with no setup: visit `/dashboard/integrations` → "Load sample data" → 8 customers, 11 invoices, 1 paid, default dunning sequence, full AI panel lights up.

**Stack:**
- **Frontend/backend:** Next.js 15 (App Router), TypeScript strict, Server Components + Server Actions
- **DB:** Postgres (Neon/Supabase/Vercel Postgres in prod) or PGlite in dev. Drizzle ORM. 13-table schema.
- **Auth:** Clerk (orgs + users + memberships)
- **AI:** Gemini Flash Lite (dunning generation, cashflow narrative, customer payment likelihood)
- **Delivery:** Resend (email) + Twilio (SMS)
- **Analytics:** PostHog
- **Integrations:** QuickBooks Online (working), Xero (working), Plaid + Square (planned). Stripe Connect is **parked** — see §6.

**What works today (in dev/demo):**
- 13-table schema fully wired
- Dunning sequence engine: friendly → firm → final, auto-pause on payment or reply
- AI-generated messages per step (Gemini, with template fallback)
- Risk scoring per customer
- 4-week cashflow forecast
- Branded payment portal at `/pay/[id]`
- QBO + Xero OAuth and invoice sync
- Marketing site, blog, pricing
- Demo data loader

**What's blocked before real customers can use it (5 user-owned actions):**
1. **Vercel deploy** — code is ready, project not pushed/deployed
2. **Resend domain verify** — DNS records in GoDaddy not set
3. **Stripe webhook secret** — moot, see §6
4. **OpenAI key** — currently using Gemini Flash Lite; OpenAI optional
5. **Twilio triplet** — credentials not provided

**Overall production-readiness:** ~38%. Code is there; the launch gates are config.

---

## 4. Pricing & business model (be honest about it)

- **Subscription tiers:** Hobby / Pro / Agency (tiers defined in code, not yet published with hard numbers — currently showing ranges on pricing page)
- **Active billing path:** **Manual upgrade-request flow.** Customer clicks "Upgrade" → fills form → Davie sends invoice via **Wise / PayPal / bank transfer** → Davie enables account. Scales to ~10 customers.
- **Stripe Connect is parked.** Stripe requires a US LLC + EIN + US bank (Stripe Atlas, $500, 2–4 weeks). Davie is Kenya-based and chose not to use Stripe.
- **Bridge to scale (3+ paying customers):** Paddle or LemonSqueezy as Merchant of Record (5–10% per txn, 1–2 days setup, pays out to M-Pesa/Wise/Payoneer).
- **Path to owned payments:** Stripe Atlas only when monthly revenue > 5× the $500 Atlas cost and bridge can't keep up. Not in 90-day plan.

**Implication for outreach:** we cannot accept self-serve payment today. The pitch to a prospect is: "Try it free, I'll manually set you up, and we'll figure out billing once you've validated it works." This is a real friction in the funnel and we know it.

---

## 5. Current state of customer acquisition (this is the part that matters most for planning)

### 5.1 The system that's in place

```
collectly/outreach/
├── data/
│   ├── prospects.csv                    # 30 master prospects (agencies + bookkeepers)
│   ├── bookkeeper-channel-prospects.csv # ~11 bookkeeper leads
│   ├── outreach-log.csv                 # every touch ever sent (229 rows)
│   ├── outreach-state.json              # bot's current state
│   ├── suppression.csv                  # do-not-contact list
│   ├── warmup-contacts.csv              # 32 warmup sends
│   └── apollo-contacts-export.csv       # 52k contacts available for enrichment
├── messages/
│   ├── t1-cold-v4-deliverability.md     # CURRENT T1 (founder tone, no product name)
│   ├── t2-followup.md
│   ├── t3-final.md                      # breakup
│   ├── t4-close.md
│   ├── sequences-v2.md
│   ├── linkedin-scripts-v1.md
│   └── bookkeeper-channel-outbound-v1.md
├── policy/
│   ├── collectly_bot_policy.md          # AUTONOMOUS BOT POLICY (v 2026-07-25-02, overridden 2026-08-01)
│   ├── founding-customer-slots.md
│   └── decision-log-YYYY-MM-DD.md       # daily log
├── scripts/
│   └── daily_outreach_v2.py             # autonomous send bot
├── prompts/                             # where this file lives
└── queue/                               # pending sends
```

### 5.2 The current T1 email (exactly what goes out — copy-paste ready)

```
From: Davie Mugambi <davie@getcollectly.app>
Subject: Quick question

Hi [FirstName],

Quick question — when an invoice goes 2–3 weeks overdue at [Company], who's the person who actually follows up?

I've been talking to a few agency founders who say it's usually them, and it's the part of the job they like least. I'm working on something to take that off their plate.

Worth a 2-minute call?

Davie

If this isn't relevant, you can unsubscribe here:
https://getcollectly.app/api/unsubscribe?token=***
```

Rules in the template: one question first line, no product name, no AI/jargon, no links except unsubscribe, signed as a person.

### 5.3 Hard numbers from the last 30 days (read carefully)

| Metric | Value |
|---|---|
| Total sends (all time, in `outreach-log.csv`) | 229 |
| Unique contacts touched | ~77 |
| **Real positive replies** | **0** |
| Negative replies (DNC) | 1 |
| Booked calls | 0 |
| Bookkeeper-channel sends (2026-07-30) | 5 (all delivered) |
| Agency-channel warmup sends | 32 |
| Agency-channel actual prospect sends | ~73 |
| Reply rate | 0.6% overall, 0% from real prospects |
| Days with active sending | ~12 of last 30 |
| Recent daily cap | 100/day (raised from 15 on 2026-08-01 by founder override) |
| Active infra | Resend via `getcollectly.app` (verified) |
| Broken infra | Gmail API (token revoked 2026-07-26, 19+ `invalid_grant` errors) |

**Trend:** Sends collapsed from 39 on 2026-07-25 to low single digits after 2026-07-26 when the Gmail token died. Switched to Resend 2026-07-30. Cap raised to 100/day 2026-08-01. 6 sends executed 2026-08-01 (1 to Daniel Cordwell + 5 batch after switching egress to mobile data to dodge a Cloudflare 1010 WAF block on the WSL2 NAT IP).

### 5.4 The known problems

1. **0 positive replies in 105+ agency sends.** Could be: (a) deliverability (unproven — never ran a 4-inbox seed test to completion), (b) ICP mismatch, (c) message angle, (d) offer/CTA weakness, (e) list quality, (f) all of the above.
2. **Gmail API is dead.** Token revoked 2026-07-26, 19+ failed sends. All new sends go through Resend on `getcollectly.app`.
3. **Cloudflare WAF blocked the WSL2 egress IP** for bursty patterns. Workaround: route through mobile data. Fragile.
4. **No reply webhook** wired. Resend inbound → pause sequence isn't built. So even if someone replies, the sequence doesn't auto-stop.
5. **43 duplicate_same_day rows** in historical log. Dedup logic was missing.
6. **0-byte log file** happened once when a background `time.sleep()` loop didn't flush. Killed and fixed by foreground execution.
7. **The 5 launch gates are still un-done** (Vercel deploy, Resend domain in GoDaddy, etc.). The product isn't actually live at `collectly.app` for a stranger to use.
8. **No founding-customer slot definition.** I have no criteria for how many founding customers to take, what they get, when slots close.

### 5.5 The bot policy (current rules of the road)

`collectly/outreach/policy/collectly_bot_policy.md` is the source of truth. Key live rules:
- **Cap:** 100/day Resend, 0/day Gmail fallback, 5–10/day LinkedIn manual
- **Cadence:** T1 → T2 at day+4 → T3 at day+9 → cold, no re-add for 90 days
- **Kill rule:** any subject/hook/niche combo with <2% reply rate after 50 sends is auto-paused
- **Scale rule:** any combo with >8% reply rate after 30 sends is auto-tripled
- **No rest days, no time-window gating, no per-send approval** (founder override 2026-08-01)
- **Pull-back trigger:** bounce or spam-placement > 5% over rolling 7 days → revert cap to 30
- **Re-evaluation:** next policy review, or if bounce rate crosses 5%, or a second Cloudflare 1010, or founder says stop

### 5.6 The Operating Directive (meta-rules)

`memory/OPERATING-DIRECTIVE.md` owns the phase-1 acquisition strategy. Key rules:
- **Email is the primary lane** (LinkedIn is rerouted to research, not send, because of ToS)
- **Reroute, don't escalate** — when a channel blocks, switch channel, don't ask the founder
- **Track conversations started and trial signups.** Not sends, not followers.
- **Permitted channels only:** official APIs for email, TikTok, Instagram Graph, X, Pinterest, YouTube, Telegram, Discord, Google Business Profile, own website, Zapier/Make
- **Prohibited:** UI-scripting LinkedIn/IG consumer, overstating what Collectly does, scraped cold lists in jurisdictions that prohibit

---

## 6. What we want from you (ChatGPT)

Be specific. Don't write a generic "build in public" or "do SEO" essay. We have working code, a working cold-email pipeline, 0 replies, a founder with limited time, and a hard 90-day window before manual billing breaks. Specifically, help us with:

### A. Diagnose the 0-reply problem
- Is the most likely culprit message angle, list quality, deliverability, offer, or something else? Rank them.
- Is the T1 above the right email? What would you test as variants, and which would you cut first?
- The T1 is "founder-tone, no product name, no links." For a 1-person pre-revenue SaaS targeting agencies, is this the right register, or should we name the product earlier?

### B. Fix the funnel gap
- We have a 30-prospect list and a 52k Apollo export. We have 0 replies. Should we be sending to more people, or fixing the message/ICP first? What's the smallest experiment that would tell us which axis is broken?
- The bookkeeper channel is theoretically a 5–20× multiplier. Should we go all-in on bookkeepers and deprioritize agencies? Or run them in parallel?

### C. Choose the next 14-day move
- We can do **one** of these well in 14 days, not all. Which?
  1. Push harder on cold email (more variants, more volume, more list building)
  2. Build a "Powered by Collectly" white-label angle for agencies (different pitch, different deck)
  3. Convert at least 1 of the 5 launch gates (Vercel deploy, Resend domain, etc.) so strangers can actually use the product
  4. Run a 4-inbox deliverability test to find out if the 0 replies is a deliverability problem
  5. Something else

### D. Find the channel we haven't tried
- We've focused on cold email. What channel, available to a 1-person team with $0 ad budget, is most underused for this ICP? Be concrete (e.g., "post 1 specific thing in r/agencies," "leave 5 Clutch reviews on competitor profiles," "DM 10 agency owners who recently tweeted about chasing invoices"). Not "do content marketing."

### E. Pressure-test the offer
- "Try it free, I'll manually set you up" is the current offer. Is this enough friction to kill the funnel, or is the bigger problem upstream (no one is opening, no one is replying)? Be honest.

### F. Identify the assumption most likely to be wrong
- We have many working assumptions (ICP, message angle, channel, offer, pricing, etc.). Which single assumption, if wrong, would most invalidate our plan? How would we test it in ≤7 days for ≤$0?

---

## 7. What we will and won't do based on your response

**Will do (no approval needed, autonomous):**
- Edit the bot policy if you suggest a new rule
- Add new T1/T2/T3 variants and run them through the bot
- Enrich the prospect list (Apollo/Hunter/manual)
- Fix the reply webhook
- Run a deliverability test

**Will not do without explicit founder approval:**
- Change the daily cap
- Spend money (no ad budget allocated)
- Touch the 5 launch gates (DNS, deploy, secrets) — those are user-owned
- Change the ICP definition
- Send to any list that hasn't been through the suppression filter

**Will defer to you (the founder) for:**
- Pricing tier numbers
- Founding-customer slot count and benefits
- Whether to abandon agency channel and go all-in on bookkeepers (or vice versa)
- Anything that creates a real-world commitment (contracts, refunds, legal)

---

## 8. Key files for you to skim if you want depth

- `collectly/README.md` — product overview
- `collectly/launch/launch-day-playbook.md` — launch plan (incomplete)
- `collectly/outreach/policy/collectly_bot_policy.md` — autonomous bot policy (active)
- `collectly/outreach/policy/decision-log-2026-08-01.md` — most recent decisions
- `collectly/outreach/messages/t1-cold-v4-deliverability.md` — current T1
- `collectly/outreach/status-report-2026-07-30.md` — honest funnel report
- `memory/OPERATING-DIRECTIVE.md` — phase-1 strategy and meta-rules

---

## 9. TL;DR for the time-constrained

- 1-person B2B SaaS, A/R dunning for 5–50 person service businesses on QBO/Xero
- Product is built, demo works, but the production app is gated on 5 user-owned config actions
- Cold email is the active channel. 105+ agency sends, 0 replies, no booked calls
- Just raised cap to 100/day Resend. 6 sends on 2026-08-01
- Largest unknown: is the 0-reply problem deliverability, list quality, or message?
- 90-day window before manual billing breaks. Need first paying customer(s) before then
- Founder is in Kenya, $0 ad budget, ships code, manages infra, writes copy, does outreach

**What we need from you:** diagnose the 0-reply problem, pick the highest-leverage 14-day move, name the assumption most likely wrong, and suggest a channel we haven't tried.
