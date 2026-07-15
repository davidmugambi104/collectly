# Living Strategy — Collectly

> Last updated: 2026-07-15 16:20 EAT
> Mission: $2M ARR B2B SaaS

---

## Business stage

**Pre-launch.** The product works on demo data. There are 0 paying customers. The launch kit (PH, HN, G2, Capterra) is drafted. The marketing site is live at https://collectly-ochre.vercel.app.

## Product stage

**MVP, demo-grade.** 11 dashboard pages work with real data. Marketing site has 16 pages. Auth shim makes it accessible. Not production-grade (no real Clerk, no real Stripe, no real domain, no analytics).

## Market insights

- **Competitor landscape (last known from memory):** enterprise AR tools are $3-30K/mo, mid-market is $500-2K/mo, QBO/FreshBooks don't chase invoices. The 5-50 person segment is underserved.
- **Pricing benchmark:** most AR tools charge 5-15% of recovered. Collectly's flat $49-149/mo is a differentiator.
- **Unknown — needs research:** current state of Chaser, Upflow, Versapay, BILL, Melio for the small biz segment. Not researched in this session.

## Customer validation status

- **Interview pipeline:** form is live at /interview, $25 incentive. Has data (admin can export).
- **Number of interviews conducted:** unknown — admin exists, CSV export exists, but no analysis has been done.
- **Last review of interview data:** unknown.

## Revenue milestones (from 2026-07-13)

- Week 10-12: first paying customer ← **we are here, in week ~6 of build**
- Month 3: $3K MRR
- Month 12: $50K MRR ($600K ARR)
- Month 24: $167K MRR = $2M ARR ✓

## Risks

1. **Launch delay risk** — no domain, no real Clerk, no Stripe live. Without these, launch is fake.
2. **CI is red** — production build fails because the Clerk test key isn't valid. This is a 1-line fix but blocks proper CI.
3. **No analytics** — PostHog not wired. Can't measure launch success.
4. **First-customer UX risk** — the dev shim signs in anyone as "Dev User". If someone finds the deployed URL and signs in, they see your demo data.
5. **Demo data is your data** — 8 customers, 11 invoices, $218K outstanding. Anyone signing in sees this. Lock the dev shim or seed blank data on first real sign-up.

## Completed work (do not repeat)

- ✅ 16 marketing pages (homepage, pricing, features, about, contact, blog, customers, playbook, tools/ar-roi, changelog, interview, security, DPA, integrations, sign-in, sign-up)
- ✅ 11 dashboard pages (overview, invoices, customers, dunning, cash-flow, billing, integrations, payments, events, settings, admin)
- ✅ 19 API routes (waitlist, lead-notify, interview, dunning preview/send, exec-summary, forecast, seed, seed-sample, quickbooks, xero, stripe-connect, square, plaid, webhooks/stripe, cron, etc.)
- ✅ Drizzle schema (12 tables) migrated to DigitalOcean Postgres at 143.244.146.21
- ✅ Vercel production deploy at https://collectly-ochre.vercel.app
- ✅ Dev shim auth (anyone can sign in as "Dev User" — demo only)
- ✅ Launch copy: PH, HN, G2, Capterra drafts
- ✅ 5 PH screenshots, 1 GIF, 3 logos, 1 OG card
- ✅ 6 blog posts
- ✅ GitHub push, CI configured (but currently red)

## In progress / not yet done

- 🔴 Fix CI build (Clerk test key crashes production build) — 1 line
- 🔴 Real Clerk production instance
- 🔴 Real Stripe live keys
- 🔴 Custom domain + Resend domain verification
- 🔴 PostHog analytics wired
- 🟡 Event log writes (audit table is empty)
- 🟡 Daily backup cron for DO Postgres
- 🟡 OpenAI live key for dunning AI
- 🟡 Rate limiting public endpoints
- 🟡 Lead magnet PDF
- 🟡 Customer interview loop closed (analyze existing data, contact interviewees)
- 🟡 G2 + Capterra listings submitted (drafted, not posted)
- 🟡 7 "remaining work" items from Block 1.10 of 2026-07-13 memory

## Next priorities (ranked by impact on $2M ARR)

1. **Launch.** Everything else is moot without a launch date. Wed 22 July 2026 is the proposal.
2. **Get to first paying customer.** Whatever the path — own network, Reddit, Twitter, LinkedIn, cold outbound — one paying customer before launch proves the funnel works.
3. **Install analytics.** Without PostHog, you can't tell what's working.
4. **Lock down the dev shim before launch.** Either replace with real Clerk or seed blank data on first real sign-in.

## What I should NOT do next

- Do not start a new feature workstream until launch is locked.
- Do not refactor existing code unless it's actively blocking launch.
- Do not add new OAuth integrations for zero customers.
- Do not write more code without checking it against this list.

## Operating framework

See `memory/OPERATING-FRAMEWORK.md` for the 7 workstreams and decision rules.
