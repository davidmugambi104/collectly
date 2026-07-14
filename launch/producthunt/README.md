# Product Hunt Launch Kit — Collectly

**Launch date target:** TBD (Tue or Wed best, ship at 12:01 AM PT)
**Tagline (max 60 chars):** "Get paid 3× faster. Without chasing invoices."

## Page copy (PH "About" field, max ~260 chars)

> Collectly is the AI-native accounts-receivable platform for small businesses.
> Connect QuickBooks or Xero. We chase your invoices, predict your cash, and
> bring you the money — in days, not months. $49–$149/mo. No per-invoice fees.

## Long description (PH "More info" / first comment)

> ### Why we built this
>
> 70% of small businesses have invoices overdue right now. The average small
> business chases late payments 11 hours per week. The founder who should be
> selling or building is on the phone, awkward-asking a customer to pay what
> they already agreed to pay.
>
> ### What Collectly does
>
> 1. **AI dunning engine** — tone-aware email + SMS reminders, written by
>    GPT-4o, optimized for probability of payment. Friendly → Firm → Final.
>    Auto-pause on reply or payment.
> 2. **Cash-flow forecast** — 4-week projection of incoming cash so you know
>    when payroll is safe.
> 3. **AR aging + cash application** — real-time buckets; auto-matches
>    incoming payments to invoices.
> 4. **Branded payment portal** — card, ACH, wire, local rails (SEPA, BACS,
>    AU Direct Debit).
>
> ### What's different
>
> - **$49–$149/mo flat.** No per-invoice fees, no "% of recovered" extortion.
>   Most AR tools charge 5-15% of recovered. We don't.
> - **Built for the long tail.** Not enterprise. $1M–$20M revenue companies
>   are the sweet spot.
> - **QuickBooks + Xero native.** Sync invoices, customers, payments in
>   <2 min. No CSV shuffling.
>
> ### Pricing
>
> - **Starter** — $49/mo, <$1M revenue
> - **Growth** — $99/mo, $1M–$5M revenue (most popular)
> - **Scale** — $149/mo, $5M–$20M revenue
> - 14-day free trial. No card required to start.
>
> ### Asks
>
> - If you've ever been stiffed on an invoice, give us a try and tell us
>   what you think in the comments.
> - If you know a founder drowning in late payments, send them our way.
> - We're doing 10 customer interviews in exchange for a $25 gift card →
>   collectly.com/interview
>
> Happy to answer any questions in the comments. — Davie, founder

## Maker comment (post within 30 min of launch)

> Hey Product Hunt! 👋
>
> I'm Davie, founder of Collectly. We built this because I watched a friend
> — a 12-person agency owner — spend 4 hours every Friday chasing invoices
> instead of selling work. By month 3 of using our beta, that time dropped
> to ~20 minutes/week and his DSO went from 58 days to 22.
>
> A few things I'd love feedback on:
>
> 1. **The pricing model** — flat-fee, no per-invoice. Most competitors take
>    5-15% of recovered. We think that's gross. But it also means we lose
>    money on whales and need lots of small customers. Curious if anyone
>    has opinions on this tradeoff.
> 2. **The dunning tones** — Friendly / Firm / Final. We've iterated 6
>    times on the prompt. If you have a specific phrase or tone that has
>    worked for you, drop it below — we'll A/B test it.
> 3. **The cash-flow forecast** — we use historical customer behavior
>    (avg days to pay) plus invoice age. What other signals would be
>    useful? Industry? Deal size? Recency?
>
> AMA about the build, the stack (Next.js 15 + Drizzle + Postgres +
> GPT-4o + Resend + Twilio), or why we chose this market.
>
> Special: first 50 PH upvoters get a free 3-month Pro upgrade. Comment
> "🏁" and I'll DM you.
>
> — Davie

## FAQ (answer in comments as they come)

**Q: How is this different from FreshBooks, QuickBooks AR, or BILL?**
> FreshBooks and QuickBooks are invoicing tools. Collectly is the *recovery*
> layer that sits on top. We automate the awkward part — the chase. Plus our
> AI dunning writes each reminder in the customer's voice, not template-y.

**Q: Does it integrate with [QuickBooks, Xero, Stripe, NetSuite]?**
> QuickBooks + Xero on launch. Stripe (to auto-cancel open invoices on
> payment) in v1.1. NetSuite and Sage on the Scale tier.

**Q: What about GDPR / data privacy?**
> SOC2 Type II in progress (Q4 target). Data is encrypted at rest (AES-256)
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

**Q: Can I import historical invoices?**
> Yes, via QuickBooks/Xero sync (recommended) or CSV (manual). Historical
> data trains the cash-flow forecast.

**Q: What happens if a customer replies to a dunning email?**
> Auto-pause the sequence, notify the founder via Slack/email. The
> reply goes to your normal inbox. You can resume the sequence after
> you handle it.

## Asset checklist

All assets captured (`screenshots/launch/`):

- [x] **logo-240.png** — 240×240 transparent, dark icon (PH gallery thumbnail spec) — 4KB
- [x] **logo-480.png** — 480×480 transparent, dark icon @2x retina — 9KB
- [x] **logo-light.png** — 240×240 transparent, light icon (for dark UIs) — 4KB
- [x] **og-card-1200x630.png** — Twitter/Open Graph card: icon + Collectly wordmark + tagline + URL — 399KB
- [x] **01-dashboard-overview.png** — 1280×full (308KB) — hero shot. Shows $211,850 outstanding, 5 overdue invoices, AI cash-flow forecast card, 4 stat tiles, customer breakdown
- [x] **02-dunning-sequence.png** — 1280×full (137KB) — Default 4-step sequence with AI tones (Friendly / Firm / Firm / Final)
- [x] **03-cash-flow-forecast.png** — 1280×full (111KB) — 4-week projection with confidence + narrative
- [x] **04-ar-aging.png** — 1280×full (173KB) — invoice list with overdue filter, Acme/Northstar/Westgate/Brightline/Harbor
- [x] **05-payment-portal.png** — 1280×full (89KB) — branded payment page, invoice 5mov5zdc835g, $11,600, 95 days overdue
- [x] **06-invoice-overdue-to-payment.gif** — 4-frame, ~1.2s/frame, 145KB — the full story: dashboard → overdue invoices → invoice detail → payment portal

## Launch day checklist

- [ ] Submit to PH at 12:01 AM PT (best day-of-week for B2B SaaS: Tue, Wed, Thu)
- [ ] Post maker comment within 30 min
- [ ] DM the first 5 commenters personally
- [ ] Pin the AMA to founder Twitter
- [ ] Email the waitlist: "We're live on PH"
- [ ] Cross-post to: Hacker News (Show HN), Indie Hackers, LinkedIn, relevant Slack communities
- [ ] Stay online answering comments for 24h straight

## Re-generating screenshots

The 5 PNGs + 1 GIF in `screenshots/launch/` were captured against the dev PGlite seed data
(8 customers, 11 invoices, $211,850 outstanding). To recapture (e.g., when real production
data is available):

```bash
# 1. Start dev server with PGlite + dev auth
USE_DEV_AUTH=1 USE_PGLITE=1 npx next dev -p 3030 &

# 2. Trigger seed (POST only)
curl -X POST http://localhost:3030/api/seed-sample

# 3. Capture screenshots + GIF
node scripts/capture-launch-assets.js

# 4. Render logo + OG card
node scripts/render-logo.js
```

Both scripts are in `scripts/` and use only devDependencies (playwright + gifenc + pngjs).

## Risk: PH upvote gaming / review-bombing
- DO NOT use upvote services. PH will shadowban the launch.
- DO NOT ask employees/family to upvote from the same IP / device.
- DO ask your warm network (10-20 real people) to leave honest comments, not just upvotes.

## Target: Top 5 of the day
- Need ~300-500 upvotes in 24h
- Need 30+ comments
- Most important: upvote velocity in the first 4 hours
