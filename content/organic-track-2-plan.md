# Collectly Track 2 — Organic Growth Engine

**Owner:** Davie Mugambi, Founder, Collectly  
**Channel:** LinkedIn founder content + free overdue-invoice audit landing page  
**Goal:** Generate inbound leads from US service agencies and fractional finance partners with $0 ad spend and $0 paid data.  
**Timeline:** 4 weeks to baseline; 12 weeks to judge viability.

---

## Why Track 2 first

- Zero budget rules out paid data (Apollo/Hunter credits) and paid LinkedIn (Sales Navigator).
- Cold email from a new domain with pattern-guessed addresses will burn `getcollectly.app` reputation.
- Organic content compounds: one good post can keep producing leads for months.
- Prospects who engage with content already trust the point of view; no verification needed.
- Agency and bookkeeper networks are tight — one good case study creates referrals.

---

## Core offer

**Free overdue-invoice audit for agencies**

> "Connect your QBO or Xero in 2 minutes. I'll show you which invoices are overdue, which clients are slowest to pay, and what Collectly could recover automatically. No sales call required — you get a short video walkthrough."

---

## Two assets to build

### Asset 1: LinkedIn content system

**Posting cadence:** 3 posts/week (Tue, Thu, Sat 8am ET)
**Format:** Text-only founder posts, 150–250 words
**Voice:** direct, practical, no filler; founder talking to founder; no AI buzzwords
**CTA:** soft — "DM me 'audit' if you want me to look at your AR" or link in comments

**Post types (rotate):**

| Day | Type | Example hook |
|-----|------|--------------|
| Tue | **Pain post** | "The invoice I didn't chase cost me $14,000." |
| Thu | **Framework post** | "The 3-email sequence that actually gets agencies paid." |
| Sat | **Story/result post** | "I helped a 12-person agency find $38k sitting in overdue invoices." |

**Rules:**
- Never pitch Collectly in the first line.
- One clear insight per post.
- Always include a specific number, client type, or time frame.
- Reply to every comment within 2 hours during US morning.

### Asset 2: Free audit landing page

**URL:** `https://getcollectly.app/free-audit`
**Sections:**
1. Headline: "Find the money your agency already earned"
2. Subhead: "Free 2-minute audit of your QBO or Xero receivables."
3. Form fields: first name, work email, company name, accounting software (QBO/Xero/Other)
4. Connection step: secure read-only QBO/Xero OAuth (existing Collectly integration)
5. Promise: short Loom/video walkthrough within 24 hours
6. Trust line: "No credit card. No sales call unless you want one."

**Integrations:**
- Store leads in `collectly/outreach/data/inbound-leads.csv`
- Trigger Slack/Discord notification or email to founder
- Auto-create draft reply in outreach system

---

## 4-week content calendar

### Week 1 — Establish the problem

**Post 1 (Tue):** "The invoice I didn't chase cost me $14,000."  
Share a real or anonymized story about a delayed payment that taught you why manual AR follow-up fails.

**Post 2 (Thu):** "Net-30 is a lie."  
Why payment terms drift and what that means for agency cash flow.

**Post 3 (Sat):** "3 emails that get invoices paid (without sounding desperate)."  
Give away the actual sequence; end with "I built this into Collectly."

### Week 2 — Show the system

**Post 4 (Tue):** "The 15-minute weekly AR review every agency should run."  
Process post; CTA = free audit.

**Post 5 (Thu):** "Why your bookkeeper shouldn't be the one chasing clients."  
Role post; tags fractional CFOs/bookkeepers.

**Post 6 (Sat):** "I looked at 10 agency QBO files. Here's what I found."  
Pattern post with aggregate insight.

### Week 3 — Social proof + product

**Post 7 (Tue):** "A 12-person branding agency found $38k in overdue invoices in 2 minutes."  
Case study post.

**Post 8 (Thu):** "The difference between an invoice reminder and a payment request."  
Tactical post.

**Post 9 (Sat):** "Building Collectly from Kenya for US agencies — what I've learned."  
Founder journey post; humanizes the remote/outsider angle.

### Week 4 — Loop + convert

**Post 10 (Tue):** "The real cost of 'I'll pay next week.'"  
On delayed payments and cash flow drag.

**Post 11 (Thu):** "I will audit your overdue invoices for free this week."  
Direct CTA post; limited time creates soft urgency.

**Post 12 (Sat):** "One month of posting about AR: here's what founders asked."  
Round-up post; invite DMs.

---

## Distribution and conversion mechanics

1. **Post on LinkedIn personal profile** (not company page at first; people buy from founders).
2. **Cross-post to relevant groups/communities** if you are a member:
   - Agency owner communities (Slack/Discord/Facebook)
   - Bookkeeper/fractional CFO groups
   - QuickBooks/Xero user groups
3. **Reply to every comment** with a follow-up question or the audit link.
4. **DM warm engagers** within 24 hours: "Saw your comment on the AR post — happy to run the free audit for [Company] if useful."
5. **Landing page visitors** get an automated email confirming the audit request + next steps.
6. **Every audit delivered** ends with: "If this was useful, I'm happy to do the same for one agency owner in your network."

---

## Measurement

Track weekly in `collectly/content/metrics-week-YYYY-MM-DD.md`:

| Metric | Week 1 target | Week 4 target |
|---|---|---|
| LinkedIn posts | 3 | 12 total |
| Profile views | baseline | +50% |
| Inbound DMs/comments | 2 | 10+ |
| Audit requests | 1 | 5+ |
| Completed audits | 1 | 3+ |
| Positive replies / demos | 0 | 1+ |

---

## What I will build next

1. Draft all 12 LinkedIn posts as ready-to-copy text.
2. Write the landing page copy and form spec.
3. Add the new `inbound-leads.csv` schema and ingestion script.

---

## Risks

- Slow to produce results (4–8 weeks).
- Requires Davie's consistent participation (3 posts/week).
- LinkedIn algorithm may suppress links; use link-in-comments strategy.
- Time-zone mismatch (Kenya → US) means scheduling posts for US morning.

## Why this is the right zero-budget move

It is the only channel that:
- costs $0,
- builds trust before the pitch,
- creates reusable assets (posts, case studies, audit videos),
- turns one customer into referrals,
- does not depend on purchased data or platform automation risk.
