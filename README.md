# Collectly

> **AI-native accounts-receivable automation for small businesses.**
> Get paid 3× faster, without chasing invoices.

[![CI](https://github.com/davidmugambi104/collectly/actions/workflows/ci.yml/badge.svg)](https://github.com/davidmugambi104/collectly/actions/workflows/ci.yml)
![Next.js 15](https://img.shields.io/badge/Next.js-15-black)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue)
![License](https://img.shields.io/badge/license-MIT-green)

**Built for:** US/UK/AU/CA B2B service businesses with 5–50 employees, $500K–$20M revenue, on QuickBooks Online or Xero, on net-30/net-60 terms.

**What it does:**
- 🤖 **AI dunning** — tone-aware email + SMS (friendly → firm → final), auto-pause on payment or reply
- 📈 **4-week cash-flow forecast** — based on customer payment history, invoice age, and risk
- 🎯 **Customer risk scoring** — see who's likely to pay late, prioritize the high-value ones
- 💳 **Branded payment portal** — card, ACH, SEPA, BACS, AU Direct Debit
- 🌍 **Multi-currency** — USD, GBP, AUD, CAD, EUR on day one

---

## Quick start

### 1. Install
```bash
git clone git@github.com:davidmugambi104/collectly.git
cd collectly
npm install
cp .env.example .env.local   # fill in your keys
```

### 2. Database
```bash
# Option A: Local Postgres
createdb collectly
npm run db:push

# Option B: PGlite (in-memory, dev only — no setup)
USE_PGLITE=1 USE_DEV_AUTH=1 npm run dev
```

### 3. Run
```bash
npm run dev   # http://localhost:3000
```

**Try the demo** with no setup: visit `http://localhost:3000/dashboard/integrations` and click **"Load sample data"**. You'll get 8 customers, 11 invoices, 1 paid invoice, and a default dunning sequence. The full AI insights panel lights up immediately.

---

## Architecture

```
Next.js 15 (App Router) ──┬── Server Components (dashboard, marketing)
                          └── Server Actions  (dunning, mark-paid, sequence editor)

Postgres (or PGlite in dev) ─── Drizzle ORM ─── 13-table schema
                                       │
                                       ├── customers, invoices, payments
                                       ├── dunning_sequences, dunning_runs
                                       ├── integrations (QBO, Xero, Stripe, …)
                                       ├── events, waitlist, subscriptions
                                       └── organizations, memberships

OpenAI gpt-4o-mini  ──┬── Dunning message generation
                      ├── Cash-flow forecast narrative
                      └── Customer payment likelihood

Clerk (auth)         ─── Organizations + users + memberships
Stripe               ─── Subscriptions + customer portal
Resend + Twilio      ─── Email + SMS delivery
PostHog              ─── Product analytics
```

See `src/lib/analytics.ts` for the AI insights engine (risk scoring, recommended actions, exec summary).

---

## Scripts

```bash
npm run dev         # Dev server (Turbopack)
npm run build       # Production build
npm run start       # Production server
npm run lint        # ESLint
npx tsc --noEmit    # Typecheck

# Database
npm run db:generate # Generate migration files
npm run db:push     # Push schema to DB
npm run db:migrate  # Apply migrations
npm run db:studio   # Drizzle Studio (DB browser)
```

---

## Environment variables

| Var | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | yes (prod) | Postgres connection string |
| `CLERK_SECRET_KEY` + `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | yes (prod) | Auth |
| `OPENAI_API_KEY` | recommended | Dunning + forecast (falls back to template if missing) |
| `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` | yes (prod billing) | Subscriptions |
| `RESEND_API_KEY` | yes (prod email) | Outbound email |
| `TWILIO_*` | yes (prod SMS) | Outbound SMS |
| `QUICKBOOKS_CLIENT_ID` + `QUICKBOOKS_CLIENT_SECRET` | yes (prod QBO) | QBO integration |
| `XERO_CLIENT_ID` + `XERO_CLIENT_SECRET` | yes (prod Xero) | Xero integration |
| `POSTHOG_API_KEY` + `POSTHOG_HOST` | optional | Product analytics |
| `LEAD_NOTIFY_EMAIL` | optional | Where to email on form fills |

In dev, all of the above are optional. PGlite + dev auth + template dunning gets you a fully functional demo.

---

## Deploying

Vercel-ready. Set the env vars in your Vercel project, provision Postgres (Neon, Supabase, or Vercel Postgres), and `git push`. The `vercel.json` configures a daily cron at 14:00 UTC to process the dunning queue.

```bash
# One-click deploy (Vercel)
vercel --prod
```

---

## Repo layout

```
src/
  app/                 Next.js App Router
    (marketing)/       Public site (home, pricing, features, blog, etc.)
    dashboard/         Authenticated app (overview, invoices, customers, …)
    api/               API routes (waitlist, dunning, exec-summary, …)
    pay/[id]/          Customer-facing payment portal
  components/
    marketing/         Public-site components
    dashboard/         App components
    dunning/           Dunning UI (send panel, preview, sequence editor)
    ui/                Primitives (button, copy-button)
  db/                  Drizzle schema + PGlite + node-postgres drivers
  lib/                 Analytics, auth helper, AI dunning, billing, infra
ops/                   Cold-outbound, customer-interview, content, listings
.github/workflows/ci.yml   CI: lint, typecheck, build, DB schema, secret scan
```

---

## License

MIT. See `LICENSE`.

## Built by

Davie. [davie@collectly.app](mailto:davie@collectly.app) · [@davidmugambi104](https://github.com/davidmugambi104)
