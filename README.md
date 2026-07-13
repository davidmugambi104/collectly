# Collectly

**AI-native accounts-receivable automation for small businesses.**

Get paid 3× faster. Connect QuickBooks or Xero, and Collectly chases your invoices with tone-aware AI dunning, predicts your cash flow, and helps you collect — in days, not months.

## Stack

- **Framework:** Next.js 15 (App Router, Server Actions, Server Components)
- **Database:** PostgreSQL + Drizzle ORM
- **Auth:** Clerk (multi-tenant via Clerk Organizations)
- **Payments:** Stripe (subscriptions + customer portal)
- **AI:** OpenAI GPT-4o-mini (dunning generation, cash-flow forecast, risk scoring)
- **Email:** Resend
- **SMS:** Twilio
- **Integrations:** QuickBooks Online (OAuth2), Xero (OAuth2), Stripe, Square, Plaid
- **Analytics:** PostHog
- **Caching / Rate Limiting:** Upstash Redis
- **Styling:** Tailwind CSS 3
- **Hosting:** Vercel (recommended)
- **Cron:** Vercel Cron (daily) → /api/cron/dunning

## Getting started

```bash
pnpm install
cp .env.example .env
# fill in DATABASE_URL, Clerk keys, Stripe, OpenAI, Resend, Twilio, QBO, Xero
pnpm db:push
pnpm dev
```

App runs at http://localhost:3000.

## Project structure

```
src/
  app/                # Next.js routes (marketing + dashboard + API)
    (marketing)       # public marketing site
    dashboard/        # authed dashboard
    api/              # API routes (waitlist, webhooks, integrations, cron)
  components/         # UI components (ui, marketing, app, brand)
  db/                 # Drizzle schema + connection
  lib/                # Business logic
    ai/               # AI prompts (dunning, forecasting, risk)
    integrations/     # QuickBooks, Xero, Stripe
    dunning/          # Scheduler
    analytics.ts      # AR aging + cash flow
    billing.ts        # Stripe checkout + portal
    infra.ts          # Email/SMS/Stripe clients
    utils.ts          # Currency, dates, plans
```

## Development

- `pnpm dev` — dev server with HMR
- `pnpm build` — production build
- `pnpm lint` — ESLint
- `pnpm db:push` — sync schema to DB
- `pnpm db:studio` — Drizzle Studio

## Roadmap (current sprint)

- [x] Marketing site (homepage, pricing, features, blog, customers, about, contact)
- [x] Waitlist capture with PostHog analytics
- [x] Auth (Clerk) + multi-tenant orgs
- [x] Dashboard (overview, invoices, customers, dunning, cash-flow, payments, integrations, billing, settings)
- [x] AI dunning engine (tone-aware, GPT-4o, pause-on-reply/payment)
- [x] AR aging dashboard + cash-flow forecast
- [x] QuickBooks OAuth scaffold (callback, fetch, save)
- [x] Xero OAuth scaffold
- [x] Stripe subscriptions + customer portal
- [x] Email (Resend) + SMS (Twilio) send infrastructure
- [x] Cron endpoint for daily dunning
- [ ] Xero full invoice sync
- [ ] Customer risk scoring
- [ ] Public API
- [ ] SOC 2 Type I

## Founders

Built in Nairobi. Used globally.
