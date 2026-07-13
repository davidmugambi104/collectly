# Changelog

All notable changes to Collectly. Updated as we ship.

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
