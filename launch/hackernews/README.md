# Show HN — Collectly

**Title (max 80 chars):** Show HN: Collectly – AI-native accounts receivable for small businesses (Next.js 15)

## Post body

Hey HN,

I've been building Collectly for the last few months — an AI-native accounts-receivable
platform for 5-50 person B2B service businesses (agencies, consultancies, IT services,
legal, accounting). This is the first public Show HN, although I posted a brief
teaser on the A/R state-of-market piece a few weeks ago.

## What it does

Three things, in order of importance:

1. **AI dunning.** Tone-aware reminder emails and SMS, written by GPT-4o, sent on a
   schedule (default: day 1, 7, 14, 30 past due). Friendly → Firm → Firm → Final.
   Auto-pauses on customer reply or payment. Each message is editable before send.
2. **Cash-flow forecast.** 4-week rolling projection of incoming cash, based on
   per-customer payment history (avg days to pay) and invoice age. Tells the
   founder whether they can make payroll next Friday.
3. **AR aging + cash application.** Real-time aging buckets; auto-matches incoming
   payments to the right invoice by amount, reference, and customer. Kills the
   month-end reconciliation grind.

The whole product sits on top of QuickBooks or Xero — 2-minute OAuth, no CSV shuffling.

## Why I built it

70% of small businesses have unpaid invoices. Average $17,500 per business. 11 hours
per week of founder time spent chasing them. The 5-50 person segment is the most
underserved part of the $4-6B AR automation market — enterprise tools are $3-30K/mo,
mid-market is $500-2K/mo, and the invoicing tools (QBO, FreshBooks) don't actually
chase anything. The gap is "small enough to be ignored by enterprise, big enough
to feel the pain." We charge $49-149/mo flat (no per-invoice fees), which I think
is the only honest pricing for this segment.

## The stack

This is the part HN will probably care about most:

- **Next.js 15** (App Router) + **React 19**. Server components by default, client
  components only where needed (filter bar, search inputs).
- **Postgres** in production, **PGlite** in dev. Same Drizzle schema, same queries.
  PGlite-in-memory + bootstrap-on-first-use means zero-setup local dev — restart the
  server, get fresh seed data.
- **Drizzle ORM**. No migrations hell. `drizzle-kit push` against real Postgres in
  prod, runtime CREATE TABLE IF NOT EXISTS against PGlite in dev.
- **Clerk** for auth. Gotcha I hit: Clerk middleware needs the keys at build time, so
  I made middleware skip auth when keys are missing, plus a dev auth helper that
  returns a synthetic org. App runs without Clerk keys in dev.
- **OpenAI** (GPT-4o) for dunning copy + cash-flow narrative. Lazy-init the client
  to avoid build crashes when OPENAI_API_KEY is missing.
- **Resend** for email, **Twilio** for SMS. Same lazy-init pattern.
- **Stripe** for subscriptions. 3 tiers: Starter $49, Growth $99, Scale $149.
- **PostHog** for analytics. **Tailwind** for styling. **Zod** for input validation.
- **GitHub Actions** for CI: lint, typecheck, build, DB schema check, secret scan.
- **Vercel** for hosting (ready, not deployed yet).

Total: 24 routes, 13 DB tables, 8 enums, all compiling. About 100 minutes of actual
build time across two long sessions.

## Things I learned that might save someone else time

1. **Webpack inlines `process.env.USE_PGLITE` at build time** and tree-shakes the
   branch that doesn't match. If you conditionally require a module based on an
   env var, the conditional import gets stripped. Solution: static-import both
   DB drivers, switch at runtime.
2. **Next.js 15 made `searchParams` async.** `searchParams: Promise<{...}>`,
   must `await` before reading. Type error caught this.
3. **`'use client'` must be at the top of a file**, can't be mid-file in App
   Router. Extract client components to their own files.
4. **Pure-JS GIF encoding works fine.** I needed a 4-frame "invoice → payment"
   GIF for the launch kit. No ffmpeg on the dev box, no sudo. `gifenc` + `pngjs`
   (both pure JS, both tiny) gave me a 145KB GIF in about 50 lines of node.
5. **CSVs are not what you think.** If your CSV has any quoted fields, awk
   parsers will lie to you. Use python's csv module in a heredoc — 5 lines,
   handles all the edge cases.
6. **Drizzle + jsonb + Drizzle queries** is finicky. The `steps` jsonb column
   on `dunning_sequences` is typed as `Array<{...}>` via Drizzle's `$type<>`
   helper, which gives you typed reads but you still cast on write. The
   type is correct; the experience is "fine, not great."

## What I'd love feedback on

- **The cash-flow forecast model.** Right now it's a weighted blend of (a) per-
  customer historical avg days to pay, (b) invoice age, (c) amount ×
  payment-rate. I'm considering adding: deal-size relative to customer's
  typical invoice, recency of first invoice, industry. What's worked for you
  in similar problems?
- **The dunning tone prompt.** I have a system prompt that's been iterated
  maybe 6 times. The Friendly tone is the trickiest — too warm and customers
  ignore it, too firm and the "first touch" feels aggressive. Curious if
  anyone has production-tested tone prompts they like.
- **The flat-fee pricing.** We don't take a cut of recovered. Most AR tools
  charge 5-15% of recovered, which I think is gross. The tradeoff is we lose
  money on whales and need lots of small customers. Is there a smarter model?

## What's next

- Wire real 3rd-party keys (Clerk, Stripe, OpenAI, Resend, Twilio, QuickBooks)
- 10-20 design partners from the cold-outbound pipeline
- Product Hunt launch (probably next week)
- 2-3 more blog posts (we're at 5 now)

The repo is public: github.com/davidmugambi104/collectly. Demo at collectly.com
(landing page + blog + /playbook lead magnet are live; the app itself is in
beta). I can answer anything about the build, the stack, the market, or the
dunning prompts.

— Davie
