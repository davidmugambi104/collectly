# Collectly Codebase Status — 2026-09-06

> Comprehensive inspection of the Collectly Next.js codebase.
> All data gathered from live file inspection, not memory.

---

## 1. Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Framework | Next.js (App Router) | 15.1.4 |
| Language | TypeScript (strict) | 5.7.3 |
| React | React | 19.0.0 |
| Auth | Clerk | 6.12.0 |
| Database | PostgreSQL + Drizzle ORM | drizzle-orm 0.36.4 |
| Dev DB | PGlite (in-memory) | @electric-sql/pglite 0.5.4 |
| ORM Kit | drizzle-kit | 0.30.1 |
| Email | Resend | 4.0.1 |
| SMS | Twilio | 5.4.0 |
| AI | Google Gemini (@google/generative-ai) | 0.24.1 |
| Payments | Stripe | 17.5.0 |
| Analytics | PostHog | posthog-js 1.205.0 |
| Rate Limiting | Upstash Redis + Ratelimit | — |
| Styling | Tailwind CSS | 3.4.17 |
| Animation | Framer Motion | 11.15.0 |
| Icons | Lucide React | 0.469.0 |
| Validation | Zod | 3.24.1 |
| Email Parsing | mailparser + imapflow | — |
| Browser Automation | Patchright (Playwright fork) | 1.61.1 |
| Webhooks | Svix | 1.99.1 |
| Deployment | Vercel | 54.17.3 |
| Linting | ESLint 9 + eslint-config-next | — |

**Key observations:**
- React 19 (latest), Next.js 15 with App Router and Server Actions
- PGlite for zero-setup dev; real Postgres for production
- Gemini (not OpenAI) is the actual AI model wired in, though README mentions OpenAI
- Stripe is installed but Connect is parked; billing is manual via upgrade-request flow
- Patchright (Playwright fork) is a dependency — likely for browser automation/testing

---

## 2. Next.js Configuration

- **React Strict Mode:** enabled
- **ESLint:** ignoreDuringBuilds=true (490 pre-existing findings, not blocking deploys)
- **Images:** all remote patterns allowed
- **Server Actions:** 2MB body size limit
- **Server External Packages:** @electric-sql/pglite (excluded from client bundle)
- **Security headers:** X-Content-Type-Options, Referrer-Policy on all routes
- **Cache headers:** Static assets (1y immutable), public pages (1h s-maxage + 24h SWR), auth/dashboard/api routes excluded from CDN caching
- **Webpack:** PGlite externalized on server side

---

## 3. Database Schema (18 Tables)

### Core Tables
| Table | Purpose | Key Fields |
|---|---|---|
| `users` | Clerk-authenticated users | clerkId, email, name |
| `organizations` | Tenant boundary | name, slug, baseCurrency, country, plan, trialEndsAt |
| `memberships` | User↔Org roles | userId, orgId, role (owner/admin/member/viewer) |
| `customers` | AR customers | orgId, externalId (QBO/Xero), name, email, phone, paymentBehavior (jsonb), dndAt |
| `invoices` | AR invoices | orgId, customerId, externalId, number, status, amount, amountPaid, currency, issueDate, dueDate, paidAt, lineItems (jsonb) |
| `payments` | Payment records | orgId, invoiceId, customerId, amount, method, reference, paidAt |

### Integration Tables
| Table | Purpose |
|---|---|
| `integrations` | OAuth tokens for QBO, Xero, Stripe, Square, Plaid (accessToken, refreshToken, expiresAt, realmId, tenantId, metadata) |

### Dunning Tables
| Table | Purpose |
|---|---|
| `dunning_sequences` | Reminder templates with steps (jsonb array: daysFromDue, channel, tone, template) |
| `dunning_runs` | Individual sent/scheduled reminders (status, scheduledFor, sentAt, body, externalMessageId) |

### Billing Tables
| Table | Purpose |
|---|---|
| `subscriptions` | Stripe subscription state (plan, status, currentPeriod) |
| `upgrade_requests` | Manual upgrade path (no Stripe needed) |

### Operational Tables
| Table | Purpose |
|---|---|
| `events` | Audit log (type, payload, actorId) |
| `inbox_poll_state` | IMAP cursor for inbox polling |
| `waitlist` | Marketing waitlist with unsubscribe support |
| `timeline_events` | Customer activity timeline |
| `promises_to_pay` | Promise tracking (promisedDate, promisedAmount, status) |
| `disputes` | Invoice dispute tracking (reason, status, customerMessage) |
| `inbox_messages` | AI Collections Inbox — inbound AR customer replies with AI classification |
| `customer_preferences` | Per-customer preferences (placeholder, no write paths yet) |
| `qbo_request_errors` | QBO API error logging (intuitTid, intuitErrorCode) |

### Enums
- `user_role`: owner, admin, member, viewer
- `integration_status`: connected, disconnected, error, pending
- `integration_provider`: quickbooks, xero, stripe, square, plaid
- `invoice_status`: draft, sent, viewed, partial, paid, overdue, disputed, written_off
- `dunning_channel`: email, sms, phone, letter
- `dunning_status`: scheduled, sent, delivered, opened, clicked, replied, paid, failed, cancelled
- `plan_tier`: starter, growth, scale, enterprise
- `sub_status`: trialing, active, past_due, cancelled, incomplete

---

## 4. All Routes & Pages

### Marketing Pages (public)
| Route | File |
|---|---|
| `/` | Homepage |
| `/about` | About page |
| `/features` | Features page |
| `/pricing` | Pricing page |
| `/contact` | Contact form |
| `/blog` | Blog index |
| `/blog/[slug]` | Blog post |
| `/changelog` | Changelog |
| `/compare` | Comparison page |
| `/integrations` | Integrations showcase |
| `/playbook` | Lead magnet (AR playbook download) |
| `/tour` | Product tour |
| `/security` | Security page |
| `/dpa` | Data Processing Agreement |
| `/privacy` | Privacy policy |
| `/terms` | Terms of service |
| `/ar-audit` | AR audit landing |
| `/ar-roi` | AR ROI landing |

### Audience-Specific Pages
| Route | Purpose |
|---|---|
| `/for/agencies` | Agencies landing |
| `/for/consultancies` | Consultancies landing |
| `/for/uk-agencies` | UK agencies landing |

### Competitor Comparison Pages (9)
| Route | Competitor |
|---|---|
| `/vs-bill` | vs BILL |
| `/vs-chaser` | vs Chaser |
| `/vs-freshbooks` | vs FreshBooks |
| `/vs-gaviti` | vs Gaviti |
| `/vs-growfin` | vs Growfin |
| `/vs-highradius` | vs HighRadius |
| `/vs-melio` | vs Melio |
| `/vs-quickbooks` | vs QuickBooks |
| `/vs-zohobooks` | vs ZohoBooks |

### Free Tools
| Route | Purpose |
|---|---|
| `/tools/ar-cost-calculator` | AR cost calculator |
| `/tools/ar-roi` | AR ROI calculator |
| `/tools/dispute-email-template` | Dispute email template generator |
| `/tools/dso-calculator` | DSO calculator |

### Auth Pages
| Route | Purpose |
|---|---|
| `/sign-in/[[...sign-in]]` | Clerk sign-in |
| `/sign-up/[[...sign-up]]` | Clerk sign-up |

### Dashboard Pages (authenticated)
| Route | Purpose |
|---|---|
| `/dashboard` | Overview |
| `/dashboard/customers` | Customer list |
| `/dashboard/customers/new` | New customer form |
| `/dashboard/customers/[id]` | Customer detail |
| `/dashboard/invoices` | Invoice list |
| `/dashboard/invoices/new` | New invoice form |
| `/dashboard/invoices/[id]` | Invoice detail |
| `/dashboard/dunning` | Dunning overview |
| `/dashboard/dunning/sequence` | Sequence editor |
| `/dashboard/dunning/performance` | Dunning performance analytics |
| `/dashboard/cash-flow` | Cash flow forecast |
| `/dashboard/payments` | Payments list |
| `/dashboard/integrations` | Integration management |
| `/dashboard/inbox` | AI Collections Inbox |
| `/dashboard/events` | Event log |
| `/dashboard/billing` | Billing/subscription |
| `/dashboard/settings` | Settings (with delete-account) |
| `/dashboard/admin/interviews` | Admin: interview data + tagging |

### Customer-Facing
| Route | Purpose |
|---|---|
| `/pay/[id]` | Branded payment portal |
| `/customers` | Customer portal (public) |

### Other Pages
| Route | Purpose |
|---|---|
| `/admin/upgrade-requests` | Admin: manual upgrade review |
| `/interview` | Customer interview form ($25 incentive) |

### Special Files
- `layout.tsx` — Root layout
- `error.tsx` — Error boundary
- `global-error.tsx` — Global error
- `loading.tsx` — Loading state
- `not-found.tsx` — 404 page
- `robots.ts` — Robots.txt
- `sitemap.ts` — Sitemap
- `rss.xml/route.ts` — RSS feed

---

## 5. API Routes (40+ endpoints)

### Dunning
- `POST /api/dunning/send` — Send dunning message
- `POST /api/dunning/preview` — Preview dunning message
- `POST /api/dunning/test` — Test dunning
- `GET /api/dunning/public-demo` — Public demo

### Customers & Invoices
- `GET/POST /api/customers` — Customer CRUD
- `GET/POST /api/invoices` — Invoice CRUD
- `POST /api/invoices/mark-paid` — Mark invoice paid
- `POST /api/invoices/write-off` — Write off invoice

### Payments
- `POST /api/payment/create-checkout` — Create Stripe checkout
- `POST /api/paystack/initialize` — Paystack payment init
- `GET /api/paystack/verify` — Paystack verification
- `POST /api/paystack/webhook` — Paystack webhook

### Disputes & Promises
- `GET/POST /api/disputes` — Dispute CRUD
- `PATCH/DELETE /api/disputes/[id]` — Dispute updates
- `GET/POST /api/promises` — Promise to pay CRUD
- `PATCH/DELETE /api/promises/[id]` — Promise updates

### Integrations
- `GET /api/quickbooks/connect` — QBO OAuth start
- `GET /api/quickbooks/callback` — QBO OAuth callback
- `GET /api/xero/connect` — Xero OAuth start
- `GET /api/xero/callback` — Xero OAuth callback
- `GET /api/stripe-connect/connect` — Stripe Connect OAuth start
- `GET /api/stripe-connect/callback` — Stripe Connect callback
- `GET /api/square/connect` — Square OAuth start
- `GET /api/square/callback` — Square OAuth callback
- `POST /api/plaid/connect` — Plaid Link token
- `POST /api/plaid/exchange` — Plaid public token exchange
- `POST /api/integrations/sync` — Trigger sync for all connected integrations

### Inbox & Timeline
- `GET/POST /api/inbox/[id]` — Inbox messages
- `GET /api/inbound` — Inbound messages
- `GET /api/timeline` — Customer timeline events

### AI & Analytics
- `GET /api/exec-summary` — AI executive summary
- `GET /api/forecast` — Cash flow forecast
- `GET /api/ar-audit` — AR audit report

### Cron Jobs
- `GET /api/cron/dunning` — Daily dunning queue processing
- `GET /api/cron/inbox-poll` — IMAP inbox polling
- `GET /api/cron/outreach-poll` — Outreach reply polling

### Webhooks
- `POST /api/webhooks/clerk` — Clerk user events
- `POST /api/webhooks/stripe` — Stripe events
- `POST /api/webhooks/resend-delivery` — Email delivery tracking
- `POST /api/webhooks/resend-inbound` — Inbound email via Resend
- `POST /api/webhooks/twilio-status` — SMS delivery status

### Marketing & Misc
- `POST /api/waitlist` — Waitlist signup
- `POST /api/lead-notify` — Lead notification email
- `POST /api/interview` — Interview form submission
- `POST /api/upgrade-request` — Manual upgrade request
- `GET /api/seed` — Seed database
- `GET /api/seed-sample` — Seed sample data
- `GET /api/healthcheck` — Health check
- `POST /api/unsubscribe` — Email unsubscribe
- `GET /api/playbook/download` — Lead magnet PDF download
- `GET/POST /api/sequences/[id]` — Dunning sequence CRUD
- `GET/POST /api/events` — Event log
- `POST /api/account/delete` — Account deletion

---

## 6. Integration Status

### QuickBooks Online (QBO) — ✅ FULLY IMPLEMENTED
**File:** `src/lib/integrations/quickbooks.ts` (~350 lines)
- OAuth 2.0 flow (connect, callback, token refresh with auto-rotation)
- Token management: auto-refresh within 5 min of expiry, refresh-token expiry tracking with 7-day warning
- Customer sync: QBO → local DB (batch insert, per-row update)
- Invoice sync: QBO → local DB (open invoices, auto-detect paid invoices)
- Payment pushback: record payments back to QBO via Payment object
- Disconnect: token revocation + local row deletion
- Error handling: integration status set to 'error' on failures
- Reconnect support: `QboReconnectRequiredError` class + reconnect URL helper
- API routes: `/api/quickbooks/connect`, `/api/quickbooks/callback`
- QBO error logging: separate `qboRequestErrors` table with intuitTid tracking

### Xero — ✅ FULLY IMPLEMENTED
**File:** `src/lib/integrations/xero.ts` (~400 lines)
- OAuth 2.0 flow with granular scopes (accounting.invoices.read, accounting.contacts, accounting.payments)
- Token management: auto-refresh, tenant resolution via /Connections endpoint (sorted by updatedDateUtc)
- Xero date parsing: handles legacy .NET `/Date(epochMs+offset)/` format
- Customer sync: contacts → customers (batch insert, per-row update)
- Invoice sync: AUTHORISED + PAID invoices → local DB (detects external payments)
- Payment pushback: create Payment object with invoice allocation
- Disconnect: local row deletion only (Xero has no token revoke endpoint)
- API routes: `/api/xero/connect`, `/api/xero/callback`

### Stripe Connect — 🟡 PARTIALLY IMPLEMENTED
**File:** `src/lib/integrations/stripe-connect.ts` (~60 lines)
- OAuth 2.0 flow implemented (authorize URL, token exchange, save connection)
- Read-only scope (scope: 'read_only')
- Purpose: pull charges/payouts for cash-flow forecasting
- **Missing:** No sync function, no payment pushback, no invoice matching
- **Status:** Parked per strategy doc — billing is manual via upgrade-request flow

### Square — 🟡 PARTIALLY IMPLEMENTED
**File:** `src/lib/integrations/square.ts` (extensive, 60+ lines just for interfaces)
- OAuth 2.0 with PKCE (S256 challenge)
- Token exchange and refresh
- Customer and invoice interfaces defined
- Sandbox/production environment support
- **Missing:** Sync function not fully visible (file truncated, but interfaces suggest it's further along than Stripe)

### Plaid — 🟡 BASIC IMPLEMENTATION
**File:** `src/lib/integrations/plaid.ts` (~60 lines)
- Link token creation (auth + transactions products, US/CA/GB)
- Public token exchange → access token storage
- **Missing:** No transaction sync, no balance retrieval, no account linking beyond token storage
- Dashboard has Plaid card component (`plaid-card.tsx`)

### Paystack — ✅ PAYMENT FLOW IMPLEMENTED
- Initialize payment, verify payment, webhook handler
- No integration library file — handled directly in API routes
- Active per context.json

---

## 7. Components

### UI Primitives
- `ui/button.tsx` — Button component
- `ui/copy-button.tsx` — Copy-to-clipboard button

### Marketing
- `marketing/header.tsx` — Site header/nav
- `marketing/footer.tsx` — Site footer
- `marketing/waitlist.tsx` — Waitlist signup form
- `marketing/audit-form.tsx` — Free audit form
- `marketing/comparison-section.tsx` — Competitor comparison section
- `marketing/comparison-table.tsx` — Competitor comparison table
- `marketing/dunning-demo.tsx` — Interactive dunning demo
- `marketing/interview-form.tsx` — Interview form

### Dashboard
- `dashboard/customers-table.tsx` — Customers data table
- `dashboard/invoices-table.tsx` — Invoices data table
- `dashboard/ai-insights-panel.tsx` — AI insights panel

### Dunning
- `dunning/preview.tsx` — Message preview
- `dunning/send-panel.tsx` — Send panel
- `dunning/sequence-editor.tsx` — Sequence editor
- `dunning/message-bubble.tsx` — Message display
- `dunning/recipient-card.tsx` — Recipient card
- `dunning/tour.tsx` — Dunning tour

### Customers
- `customers/new-form.tsx` — New customer form
- `customers/add-note-form.tsx` — Add note
- `customers/dispute-panel.tsx` — Dispute panel
- `customers/promise-panel.tsx` — Promise to pay panel

### Invoices
- `invoices/new-form.tsx` — New invoice form
- `invoices/mark-paid-button.tsx` — Mark paid button
- `invoices/write-off-button.tsx` — Write off button

### Other
- `app/shell.tsx` — App shell/layout
- `app/identify-user.tsx` — User identification
- `clerk-provider.tsx` — Clerk auth provider
- `posthog-provider.tsx` — PostHog analytics provider
- `dev-auth-form.tsx` — Dev auth shim
- `payment/payment-form.tsx` — Payment form
- `inbox/inbox-list.tsx` — Inbox message list
- `seo/structured-breadcrumbs.tsx` — SEO breadcrumbs
- `tools/dispute-template-list.tsx` — Dispute template list
- `brand/logo.tsx` — Logo component

---

## 8. Library / Business Logic

### AI
- `lib/ai/dunning.ts` — Gemini-powered dunning message generation (with test)
- `lib/ai/dunning-gemini.test.ts` — Gemini dunning tests
- `lib/ai/inbox.ts` — AI inbox reply classification

### Dunning
- `lib/dunning/scheduler.ts` — Dunning sequence scheduler

### Billing
- `lib/billing.ts` — Billing logic
- `lib/billing-math.ts` — Billing calculations (with test)

### Integrations
- `lib/integrations/quickbooks.ts` — QBO (full)
- `lib/integrations/xero.ts` — Xero (full)
- `lib/integrations/stripe-connect.ts` — Stripe Connect (partial)
- `lib/integrations/square.ts` — Square (partial)
- `lib/integrations/plaid.ts` — Plaid (basic)
- `lib/integrations/pushback.ts` — Payment pushback logic
- `lib/oauth-state.ts` — OAuth state management

### Inbox & Outreach
- `lib/inbox-imap-poll.ts` — IMAP polling for AR replies
- `lib/inbox-inbound.ts` — Inbound message processing
- `lib/outreach-imap-poll.ts` — IMAP polling for outreach replies
- `lib/outreach-inbound.ts` — Outreach reply processing

### Infrastructure
- `lib/infra.ts` — Infrastructure config (env vars, URLs)
- `lib/rate-limit.ts` — Upstash rate limiting
- `lib/analytics.ts` — Analytics + AI insights engine
- `lib/auth-helper.ts` — Auth utilities
- `lib/bootstrap-db.ts` — DB bootstrap
- `lib/events.ts` — Event logging
- `lib/account-deletion.ts` — Account deletion logic
- `lib/qbo-ensure-table.ts` — QBO table setup
- `lib/qbo-error-logger.ts` — QBO error logging
- `lib/seo.ts` — SEO utilities
- `lib/posts.ts` — Blog post utilities
- `lib/playbook-pdf.ts` — Lead magnet PDF generation
- `lib/query-params.ts` — Query param helpers
- `lib/utils.ts` — General utilities (nanoid, cn)

---

## 9. Content & Launch Assets

### Content Directory
| File | Purpose |
|---|---|
| `content/free-audit-landing-page-brief.md` | Free audit landing page brief |
| `content/linkedin-posts-weeks-1-4.md` | 4 weeks of LinkedIn posts |
| `content/metrics-week-2026-08-03.md` | Weekly metrics (Aug 3) |
| `content/organic-track-2-plan.md` | Organic growth plan |
| `content/drafts/` | Empty directory |

### Launch Directory
| File/Dir | Purpose |
|---|---|
| `launch/3-emails-to-send-now.md` | 3 launch emails |
| `launch/launch-day-playbook.md` | Launch day playbook |
| `launch/linkedin-post.txt` | LinkedIn launch post |
| `launch/supporter-email-monday.md` | Supporter email |
| `launch/g2/SUBMIT.md` | **G2 listing — fully drafted, copy-paste ready** |
| `launch/capterra/SUBMIT.md` | **Capterra listing — fully drafted, copy-paste ready** |
| `launch/producthunt/` | Product Hunt assets |
| `launch/hackernews/` | Hacker News post assets |
| `launch/tweets/` | Tweet drafts |
| `launch/postmortem/` | Postmortem template |

### G2 Listing Status
- ✅ Full submission payload ready (product info, categories, pricing, company info, imagery)
- ✅ Categories selected: Accounts Receivable (primary), Billing & Invoicing, Cash Flow Management, Small Business Accounting
- ✅ Pricing listed: $49/$99/$149/mo, 14-day free trial, no credit card
- ❌ Not yet submitted (drafted 2026-07-19)

### Capterra Listing Status
- ✅ Full submission payload ready (product info, categories, deployment, support, imagery)
- ✅ Categories selected: Accounts Receivable, Billing & Invoicing, Sales Performance, Business Management
- ✅ Pricing listed: $49/$99/$149/mo, 14-day free trial
- ❌ Not yet submitted (drafted 2026-07-19)

---

## 10. Environment Variables (33 variables)

### Required for Production
| Category | Variables |
|---|---|
| Core | `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_APP_NAME` |
| Database | `DATABASE_URL` |
| Auth | `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `CLERK_WEBHOOK_SECRET` |
| Email | `RESEND_API_KEY`, `RESEND_FROM_EMAIL` |
| SMS | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER` |
| AI | `GEMINI_API_KEY` |
| QBO | `QBO_CLIENT_ID`, `QBO_CLIENT_SECRET`, `QBO_REDIRECT_URI`, `QBO_ENVIRONMENT` |
| Xero | `XERO_CLIENT_ID`, `XERO_CLIENT_SECRET`, `XERO_REDIRECT_URI` |
| Square | `SQUARE_CLIENT_ID`, `SQUARE_CLIENT_SECRET`, `SQUARE_REDIRECT_URI`, `SQUARE_ENVIRONMENT` |
| Plaid | `PLAID_CLIENT_ID`, `PLAID_SECRET`, `PLAID_ENV`, `PLAID_WEBHOOK_URL` |
| Stripe | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_CONNECT_CLIENT_ID`, `STRIPE_CONNECT_REDIRECT_URI` |
| Paystack | `PAYSTACK_SECRET_KEY` |
| Rate Limiting | `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` |
| Analytics | `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST`, `POSTHOG_PROJECT_API_KEY` |
| Cron | `CRON_SECRET` |
| Webhooks | `RESEND_INBOUND_WEBHOOK_SECRET`, `RESEND_DELIVERY_WEBHOOK_SECRET` |
| IMAP (outreach) | `ZOHO_IMAP_USER`, `ZOHO_IMAP_APP_PASSWORD` |
| IMAP (AR dunning) | `AR_DUNNING_IMAP_USER`, `AR_DUNNING_IMAP_APP_PASSWORD` (dormant) |
| SEO | `NEXT_PUBLIC_GSC_TOKEN`, `NEXT_PUBLIC_BING_TOKEN` |

---

## 11. What's Built vs What's Missing

### ✅ Fully Built & Working
1. **Marketing site** — 16+ pages including homepage, pricing, features, 9 competitor comparison pages, 4 free tools, blog, about, contact, security, DPA, privacy, terms
2. **Dashboard** — 11 pages covering overview, customers (list/detail/new), invoices (list/detail/new), dunning (overview/sequence/performance), cash flow, payments, integrations, inbox, events, billing, settings, admin
3. **QBO integration** — Complete OAuth, token refresh, customer/invoice sync, payment pushback, disconnect, error logging
4. **Xero integration** — Complete OAuth, token refresh, tenant resolution, customer/invoice sync, payment pushback, disconnect
5. **Dunning engine** — AI-powered message generation (Gemini), sequence editor, scheduler, preview, send, performance tracking
6. **AI insights** — Risk scoring, recommended actions, executive summary
7. **Cash flow forecasting** — 4-week projection
8. **Customer management** — Full CRUD, notes, timeline, dispute tracking, promise to pay
9. **Payment portal** — Customer-facing payment page at /pay/[id]
10. **Paystack integration** — Payment init, verify, webhook
11. **Inbox** — AI Collections Inbox with reply classification
12. **Auth** — Clerk integration with dev shim fallback
13. **Database** — 18-table schema with Drizzle ORM, PGlite dev support
14. **Launch content** — G2/Capterra listings drafted, PH/HN posts, emails, tweets
15. **SEO** — Sitemap, robots, RSS feed, structured breadcrumbs, OG cards
16. **Security** — Headers, rate limiting, account deletion, unsubscribe
17. **Cron jobs** — Dunning, inbox poll, outreach poll
18. **Webhooks** — Clerk, Stripe, Resend (delivery + inbound), Twilio status

### 🟡 Partially Built / Parked
1. **Stripe Connect** — OAuth flow works, but no sync/pushback (parked, billing is manual)
2. **Square** — OAuth + interfaces defined, sync function exists but may be incomplete
3. **Plaid** — Link token + exchange only, no transaction/balance sync
4. **PostHog analytics** — Provider component exists, not wired with real keys
5. **Event log** — Table and API exist, but strategy doc says "audit table is empty"
6. **AR dunning IMAP** — Code exists but dormant (no dedicated mailbox set up)
7. **Customer preferences** — Table exists but no write paths

### ❌ Missing / Not Started
1. **Real Clerk production instance** — Still using dev shim
2. **Real Stripe live keys** — Billing is manual via upgrade requests
3. **Custom domain** — Still on collectly-ochre.vercel.app
4. **PostHog analytics** — Not wired
5. **Daily backup cron for Postgres** — Not set up
6. **G2 + Capterra listings submitted** — Drafted but not posted
7. **Lead magnet PDF** — Playbook PDF generation exists but needs the actual PDF content
8. **Formal privacy policy / ToS refresh** — Pages exist but may need legal review
9. **CI green** — Build fails due to Clerk test key
10. **First paying customer** — 0 customers
11. **Twilio A2P 10DLC registration** — Required for US SMS
12. **Secret scanner** — No trufflehog/git-secrets installed
13. **Content drafts** — Empty directory

---

## 12. What Can Be Done Immediately Without Davie's Input

Based on the escalation rules in context.json, the following can be done autonomously (no OAuth, no API keys, no legal, no financial decisions, no production deploys, no public messages):

### Code & Engineering
1. **Fix CI build** — The Clerk test key crashes production build. This is a 1-line fix.
2. **Code review & cleanup** — 490 ESLint findings to triage
3. **Improve Square integration** — Complete sync function if incomplete
4. **Complete Plaid integration** — Add transaction sync, balance retrieval
5. **Wire event logging** — Audit table is empty, write events for all key actions
6. **Build customer preferences write paths** — Table exists, no code writes to it
7. **Improve test coverage** — Only 3 test files exist (dunning.test.ts, dunning-gemini.test.ts, billing-math.test.ts)
8. **Security hardening** — Install secret scanner, scan full git history
9. **Dependency vulnerability patching** — node-tar critical, vercel/undici major update
10. **Complete Stripe Connect sync** — Add charge/payout sync and invoice matching
11. **Add more competitor comparison pages** — 9 exist, could add more
12. **Improve SEO** — More structured data, better meta tags
13. **Build out content/drafts/** — Currently empty

### Content & Marketing (drafting only, not posting)
14. **Write blog posts** — Blog infrastructure exists, only 6 posts currently
15. **Create lead magnet PDF content** — Playbook PDF generator exists
16. **Draft more LinkedIn posts** — 4 weeks exist, could extend
17. **Write support documentation** — Help center referenced but doesn't exist
18. **Create email sequences** — For onboarding, dunning education, etc.

### Research & Analysis
19. **Competitor research update** — Strategy doc says "not researched in this session"
20. **Analyze interview data** — Admin exists, CSV export exists, no analysis done
21. **SEO keyword research** — For content planning
22. **Competitor pricing/feature comparison** — Keep comparison tables current

### Operational
23. **Organize and update strategy docs** — Last updated 2026-07-15
24. **Update context.json** — Last updated 2026-08-04
25. **Review and update MEMORY.md** — With current codebase state
26. **Create help center / docs** — Referenced in Capterra listing but doesn't exist

### Requires Davie (DO NOT DO without asking)
- Real Clerk instance setup
- Stripe live keys
- Custom domain purchase/config
- PostHog project key
- Twilio A2P registration
- G2/Capterra submission (public listing)
- Any public social media posts
- QBO secret rotation
- Production deployments
- Pricing changes

---

## 13. Context & Strategy Summary

From `context.json` and `ops/strategy.md`:
- **Company:** Collectly, founded by Davie (Faith in context.json — likely same person)
- **Stage:** Pre-launch, 0 paying customers
- **Mission:** $2M ARR B2B SaaS
- **ICP:** 5-50 person B2B service businesses, $1M-$20M revenue, on QBO/Xero
- **Pricing:** $49/$99/$149/mo flat (vs competitors' 5-15% of recovered)
- **Live deploy:** https://collectly-ochre.vercel.app
- **Launch date:** Was proposed for Wed 22 July 2026 — that date has passed
- **Key risks:** QBO secret leak, CI red, no analytics, dev shim exposed, demo data visible to anyone
- **Next priorities:** Launch, get first paying customer, install analytics, lock down dev shim

---

_Generated 2026-09-06 from live file inspection of ~/.openclaw/workspace/collectly/_