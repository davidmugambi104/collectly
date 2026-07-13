# Collectly

AI-native accounts-receivable automation for small businesses. Get paid 3× faster.

## What this is

Collectly is a B2B SaaS product for small businesses (5–50 person teams) that:
- Connects to QuickBooks, Xero, Stripe, and Square
- Runs AI-powered dunning sequences (tone-aware email + SMS)
- Provides a 4-week cash-flow forecast
- Tracks AR aging with auto-categorization
- Handles multi-currency (USD, GBP, AUD, CAD, EUR)
- Cashes out via Stripe

## Quick start

```bash
npm install
cp .env.example .env.local
# fill in DATABASE_URL (Postgres), Clerk keys, Stripe, OpenAI, Resend, Twilio
npm run db:push
npm run dev
```

For dev without a Postgres, set `USE_PGLITE=1` to use an in-process WASM Postgres (data lives in `.pglite/`).

## Tech stack

- **Next.js 15** (App Router, Server Actions, RSC)
- **Postgres + Drizzle ORM** (PGlite for dev)
- **Clerk** for auth + multi-tenant orgs
- **Stripe** for subscriptions + customer portal
- **OpenAI GPT-4o-mini** for dunning generation, cash-flow forecasting, risk scoring
- **Resend** for email, **Twilio** for SMS
- **QuickBooks Online + Xero** OAuth integrations
- **PostHog** for analytics
- **Tailwind CSS 3** for styling
- **Vercel** for hosting + cron

## Project structure

```
src/
  app/
    (marketing)/         # public marketing site
    dashboard/           # authed dashboard
    api/                 # API routes
  components/            # UI components
  db/                    # Drizzle schema + connection
  lib/                   # Business logic
    ai/                  # GPT-4o prompts
    integrations/        # QuickBooks, Xero
    dunning/             # Scheduler
    analytics.ts         # AR aging + cash flow
    billing.ts           # Stripe checkout + portal
    infra.ts             # Email/SMS/Stripe clients
    utils.ts             # Currency, dates, plans
```

## Development

```bash
npm run dev          # dev server with HMR
npm run build        # production build
npm start            # start production server
npm run db:generate  # generate migrations from schema
npm run db:push      # apply schema to db
npm run db:studio    # Drizzle Studio
```

## Environment

See `.env.example` for the full list of required environment variables.

## License

Proprietary. © 2026 Collectly, Inc. Built in Nairobi, used globally.
