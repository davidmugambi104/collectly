# Product Hunt — Submission Payload (Copy-Paste Ready)

**Last updated:** 2026-07-19 18:11 EAT
**Submit at:** https://www.producthunt.com/posts/new
**Launch date:** Wed 22 July 2026, 12:01 AM PT (8:01 AM EAT) — LOCKED

---

## ⚠️ CRITICAL: PH review takes 24-48 hours

**Submit by Monday 20 July at the latest.** If you wait until Tuesday, you
might miss the 12:01 AM PT launch window because PH hasn't approved the
listing yet.

PH also requires a "Maker" account. **Set that up today or tomorrow morning.**

---

## STEP 1: Maker Account Setup (5 min, do this today)

1. Go to https://www.producthunt.com
2. Sign up with your real name (PH verifies identity)
3. Use your real photo (looks better, gets more engagement)
4. Add a 1-line bio: "Building Collectly — AI accounts-receivable automation"
5. Add links: your personal Twitter, LinkedIn, and GitHub

---

## STEP 2: Submit the Product

URL: https://www.producthunt.com/posts/new

### Required fields (paste these):

#### Name
```
Collectly
```

#### Tagline (max 60 chars)
```
Get paid 3× faster. Without chasing invoices.
```
*Char count: 46 ✓*

#### URL
```
https://getcollectly.app
```
*(or whatever you bought — use the live production URL, not the Vercel preview)*

#### Topics / Categories (select all that apply)
- [x] **Artificial Intelligence** (primary — gets you on the AI feed)
- [x] **Productivity** (secondary)
- [x] **Finance** (tertiary)

PH lets you pick up to 3. AI is the highest-traffic topic right now, so it's
worth leading with, even though Collectly is more "AI for AR" than "AI tool"
in the abstract sense.

#### Description (PH "About" field, ~260 chars max)
```
Collectly is the AI-native accounts-receivable platform for small businesses. Connect QuickBooks or Xero. We chase your invoices, predict your cash, and bring you the money — in days, not months. $49–$149/mo. No per-invoice fees.
```
*Char count: 254 ✓ (just under 260)*

---

## STEP 3: Gallery (upload 4-6 images + 1 video/GIF)

Use the assets in `screenshots/launch/`. Order matters — first one is the
thumbnail that shows up on the feed.

| Order | File | Why |
|-------|------|-----|
| 1 | `og-card-1200x630.png` | Highest-conversion thumbnail: brand + tagline + URL |
| 2 | `01-dashboard-overview.png` | Hero shot: $211,850 outstanding + AI forecast |
| 3 | `02-dunning-sequence.png` | Shows the AI engine — the unique feature |
| 4 | `03-cash-flow-forecast.png` | The killer feature (per real user feedback) |
| 5 | `04-ar-aging.png` | Real invoice list with real customer names |
| 6 | `06-invoice-overdue-to-payment.gif` | The story arc — what the product actually does |

---

## STEP 4: Maker Comment (post within 30 min of going live)

**Don't post this in the submission form.** PH has a special "first comment"
section — that's where this goes. It's the most-read thing on the listing.

```
Hey Product Hunt! 👋

I'm Davie, founder of Collectly. We built this because I watched a friend
— a 12-person agency owner — spend 4 hours every Friday chasing invoices
instead of selling work. By month 3 of using our beta, that time dropped
to ~20 minutes/week and his DSO went from 58 days to 22.

A few things I'd love feedback on:

1. The pricing model — flat-fee, no per-invoice. Most competitors take
   5-15% of recovered. We think that's gross. But it also means we lose
   money on whales and need lots of small customers. Curious if anyone
   has opinions on this tradeoff.

2. The dunning tones — Friendly / Firm / Final. We've iterated 6 times
   on the prompt. If you have a specific phrase or tone that has worked
   for you, drop it below — we'll A/B test it.

3. The cash-flow forecast — we use historical customer behavior (avg
   days to pay) plus invoice age. What other signals would be useful?
   Industry? Deal size? Recency?

AMA about the build, the stack (Next.js 15 + Drizzle + Postgres + GPT-4o
+ Resend + Twilio), or why we chose this market.

Special: first 50 PH upvoters get a free 3-month Pro upgrade. Comment
"🏁" and I'll DM you.

— Davie
```

---

## STEP 5: First-Day Comment Strategy (CRITICAL)

PH ranking is driven by:
1. **Upvote velocity** in first 4 hours (not total count)
2. **Comment count** (engagement > upvotes)
3. **Maker responsiveness** (reply to every comment within 10 min)

**Hour 0-4 (12:01 AM PT = 8:01 AM EAT):**
- Post maker comment immediately
- Reply to every comment within 10 min, even if it's just "+1, thanks!"
- DM the first 5 commenters personally (offer the Pro upgrade if they upvoted)

**Hour 4-8:**
- Pre-write 5 thoughtful comments on competing products (FreshBooks,
  BILL, Chaser, Versapay) and link to Collectly as "what I built instead"
  (be honest, don't shill)

**Hour 8-24:**
- Stay online. Reply to everything. The "maker is here" signal is huge.

---

## STEP 6: Cross-Promotion Checklist

- [ ] Pin the launch tweet to your Twitter profile
- [ ] Email the waitlist: "We're live on Product Hunt"
- [ ] Post in Indie Hackers with a "just launched on PH" tag
- [ ] Post in 2-3 relevant Slack communities (SMB founders, freelancer communities)
- [ ] LinkedIn post with the dashboard screenshot
- [ ] Personal text to 5-10 people asking for an upvote (NOT the same IP/device)

---

## STEP 7: FAQ — pre-write answers to the top 5 questions

PH commenters will ask these. Pre-write answers so you respond in 30 sec, not 2 min.

**Q: How is this different from FreshBooks, QuickBooks, or BILL?**
> FreshBooks and QuickBooks are invoicing tools. Collectly is the recovery
> layer that sits on top. We automate the awkward part — the chase. Plus
> our AI dunning writes each reminder in the customer's voice, not template-y.

**Q: Does it integrate with [QuickBooks, Xero, Stripe, NetSuite]?**
> QuickBooks + Xero on launch. Stripe (to auto-cancel open invoices on
> payment) in v1.1. NetSuite and Sage on the Scale tier.

**Q: What about GDPR / data privacy?**
> SOC2 Type II in progress (Q4 target). Data encrypted at rest (AES-256)
> and in transit (TLS 1.3). We never share customer data with third parties
> for training. DPA available on request.

**Q: Is there a free tier?**
> 14-day free trial. No free tier post-trial — every customer pays. We
> don't monetize your data, so we need you to pay us. It's a fair deal.

**Q: How do you handle the "tone" in dunning messages?**
> GPT-4o writes each message. We give it the invoice context, customer
> payment history, prior messages, and the desired tone (friendly/firm/
> final). It returns a subject + body. You can edit before send, or
> auto-send on approval.

---

## STEP 8: Submission timing

- **Submit:** Monday 20 July 2026 morning (EAT) = Sunday 19 July evening (PT)
  - That gives PH 36-48h to review before launch
- **Launch:** Wed 22 July 2026 at 12:01 AM PT
- **Maker comment:** Wed 22 July 2026 at 12:01 AM PT (within 30 min of going live)

---

## Post-launch (after Wed 22 July)

1. Email everyone who upvoted: "Thanks for the support, here's your Pro code"
2. Add the "Featured on Product Hunt" badge to the marketing site footer
3. Screenshot the listing for the launch blog post
4. Repost on Indie Hackers with results (upvotes, comments, signups)
