# Changelog

All notable changes to Collectly. Updated as we ship.

## 2026-07-23

### Integration hardening + launch retrospective fixes (audit-driven)

- **Stripe webhook endpoint registered** (`we_1Tw85JJlrsJQtG43bmCya4as`) and webhook secret rotated in Vercel. No webhooks were reaching the app before this — real customer payments would have silently dropped.
- **Resend FROM email** changed from `davidmugambi104@gmail.com` to `Collectly <noreply@getcollectly.app>` in Vercel. Gmail address was unverified; first real send would have failed.
- **Dev auth shim guarded** with `NODE_ENV === 'production'` checks in `src/middleware.ts` and `src/lib/auth-helper.ts`. Both throw at module load if the shim is enabled in production.
- **OAuth state plaintext→HMAC-scheduled** for QBO/Xero/Square/Stripe Connect: high-priority follow-up. Currently the connect routes accept any `?orgId=` and write tokens to that org; HMAC signing is on the progressive plan.

### Dunning + AI fixes

- `getEventsByType` (`src/lib/events.ts:73`) was using JS `&&` instead of drizzle's `and()`, silently dropping the `type` and time-window filters. Fixed.
- `api/dunning/send` would 500 on first manual send (`sequenceId: 'manual'` violated FK to `dunning_sequences.id`). Fixed by auto-provisioning a "Manual" sequence.
- `markInvoicePaidInDb` (`src/lib/billing.ts`) and `api/invoices/mark-paid` were doing insert+update without a transaction. Wrapped in `db.transaction()` so a partial failure can't leave a phantom payment or double-charge.
- Dunning email sends now include a CAN-SPAM/PECR-compliant unsubscribe footer + RFC 8058 `List-Unsubscribe` headers pointing at the new `/api/unsubscribe` endpoint.
- `customers.dnd_at` column added; the dunning scheduler and manual send endpoint now skip customers who have opted out.
- Marketing copy on `/features`, `/dashboard/dunning`, homepage, and changelog updated from "GPT-4o" to "Gemini" (we switched to Gemini 2026-07-23).

### Compliance + privacy

- New `/api/unsubscribe` endpoint with one-click POST + confirmation page. Wired to `waitlist.unsubscribed_at` and (optionally) `customers.dnd_at`.
- Privacy page placeholder warning removed; OpenAI mention updated to Gemini.
- Outreach email templates (5 files) updated with `{{unsubscribe_token}}` footer; `send_touch_v2.py` now substitutes the token per recipient.
- Favicon added (`src/app/icon.svg`).

### Outreach + docs

- `outreach-log.csv` deduplicated (P006 was double-counted).
- `outreach/messages/t1-cold-v3-industry-variants.md`: "12 prospects in tier 2" corrected to "12 prospects total".
- Email template sign-offs changed from "David" to "Davie Mugambi" for consistency.
- `launch/postmortem/2026-07-22.md` written (scaffolded with agent-observable items; numeric cells marked `[FILL]` for Davie).
- README.md updated: Stripe Connect "parked" note, env table updated, "OpenAI gpt-4o-mini" → "Gemini Flash Lite".

### Dead code

- `src/lib/auth-helpers.ts` (plural) deleted — 3 exports, 0 callers, duplicate of `auth-helper.ts`.

## 2026-07-22 — Launch day

- Product Hunt, Hacker News, G2, Capterra, LinkedIn, Twitter launch surface activated
- Supporter email batch sent (3 emails)
- 8 deployment iterations on Vercel during launch window
- First paid conversion via manual upgrade flow (Davie invoiced via Wise)

## 2026-07-21

- Launch assets finalized: `launch-day-playbook.md`, `3-emails-to-send-now.md`, `supporter-email-monday.md`, tweets (3), HN/PH/G2/Capterra submission docs
- Resend domain `getcollectly.app` verified (capabilities.sending=enabled)
- Final code freeze for launch

## 2026-07-20

- Outreach pipeline v2 went live: 9 Python scripts, 6 message templates, 14 helper files
- First 30-prospect batch sent via gog (30 sends, 1 DNC, 0 replies positive yet)
- ICP mix locked: 18 UK + 12 US, 12 industries, 2 channels (email + LinkedIn)
- Hunter.io integration for email enrichment

## 2026-07-19

- Skills audit: 45/59 skills eligible (up from 18/59 baseline). 25+ CLI binaries installed. See `memory/2026-07-19-skills-audit.md`.

## 2026-07-15

- Launch plan, strategy, and setup-keys docs written (`ops/launch-plan.md`, `ops/strategy.md`, `ops/setup-keys.md`)

## 2026-07-13

### Initial public build (17 commits, day 1)

**AI finance assistant:**
- Real DSO computed from paid invoices (not hardcoded)
- Real outstanding/collection trends (% change vs 30d ago / vs last month)
- AI insights panel on dashboard: 4 prioritized recommendations
- Per-customer risk score, risk level, recommended action, 7d payment probability
- AI-recommended dunning tone on invoice detail (auto-selects friendly/firm/final by risk)
- Executive summary export (JSON + Markdown) at `/api/exec-summary?format=md`

**Customer experience:**
- Empty-state first-run checklist on dashboard (3 steps to first value)
- "Load sample data" button on integrations page (idempotent: 8 customers, 11 invoices)
- Invoice search + filter (all/overdue/paid) with query preservation
- Working search across invoice #, customer name, email, company
- Dunning preview: generates real messages with tone-aware fallback (works without OpenAI)
- Public AI dunning demo widget on homepage (no signup, real output)

**Public surface:**
- A/R ROI calculator at `/tools/ar-roi` (7-input, live compute, default $24,720/yr savings)
- 9 marketing pages + 3 blog posts (5,500+ words)
- Lead-notify endpoint: emails Davie on every form fill
- 5 ops docs: cold-outbound, customer-interviews, founder-content, G2/Capterra, Product Hunt

**Production hardening:**
- Global + per-page error boundaries
- Skeleton loaders (dashboard, global)
- 404 page with branded design
- Clipboard copy-button with check state
- TypeScript strict, all routes 200 OK
- Drizzle schema validated against real Postgres in CI

**Infrastructure:**
- PGlite in-memory dev mode (zero setup)
- Lazy init for OpenAI/Stripe/Resend/Twilio (don't crash on missing env)
- Clerk middleware no-op when keys missing
- 13-table Drizzle schema, all enums typed
- Vercel cron config (14:00 UTC daily)
- GitHub Actions CI (lint, typecheck, build, DB schema, gitleaks)
