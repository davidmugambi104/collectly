# Collectly Shared Context

Canonical source of truth for all Collectly skills.

## Company

- **Name:** Collectly
- **Founder:** Davie
- **Timezone:** Africa/Nairobi (GMT+3)
- **Market:** Accounts receivable / dunning automation for SMBs
- **Primary integrations:** QuickBooks Online (QBO), Xero, Stripe, Square, Plaid, Paystack, Twilio, Clerk
- **Stage:** Pre-launch / early customers
- **AI workforce:** OpenClaw acting as Chief of Staff; skills organized by department
- **App framework:** Next.js 15 + TypeScript + Drizzle ORM + Postgres/PGlite
- **Live deploy:** https://collectly-ochre.vercel.app
- **Repo:** /home/user/.openclaw/workspace/collectly

## Value Proposition

Help small businesses collect overdue invoices automatically with polite, persistent follow-ups, payment reminders, and reconciliation against accounting and payment systems.

## Ideal Customer Profile (ICP)

- **Industries:** Local service agencies, bookkeeping firms, small consultancies
- **Signals:** Uses QBO or Xero, has recurring invoices, currently chasing payments manually
- **Pain points:** Late payments hurting cash flow, manual follow-up is awkward and time-consuming
- **Decision maker:** Founder, finance lead, or bookkeeper
- **Tech stack signal:** QBO/Xero connected; Paystack for payments
- **Target geos:** US, UK, AU, CA

## Product Facts

- Core loop: pull invoices from accounting system → send scheduled reminders → track replies/payments → reconcile
- AI dunning: Google Gemini generates tone-aware email + SMS messages
- Auth: Clerk (production instance pending)
- Payment processing: Stripe (live keys pending), Square, Paystack, Plaid
- Cron jobs:
  - `/api/cron/dunning` daily at 14:00 UTC
  - `/api/cron/outreach-poll` daily at 12:00 UTC
- Known risk: A QBO client secret was previously leaked and must be rotated
- Known infra gap: dev/prod environments currently share credentials or lack isolation
- Launch date: locked to 2026-07-22 in prior plan; currently past due

## Positioning & Brand Voice

- Clear, practical, human. No corporate fluff.
- Customer-first: we make getting paid less awkward for SMBs.
- Avoid: "revolutionary," "AI-powered," "synergy."

## Escalation Rules (Founder's Rule)

As of 2026-08-09, `tools.exec` runs in full autonomous mode (no per-command approval prompts). This list is therefore the *only* thing that still requires pausing for Davie -- do not ask for approval on anything outside it, and do not treat this list as a starting point to extend on your own judgment call in the moment.

The following require Davie approval or direct action:
- OAuth logins
- API key acquisition or rotation
- Legal sign-off (contracts, ToS, privacy policy)
- Financial decisions (pricing, spending, refunds) -- this means decisions about budget/policy (setting or raising a cap, an unbudgeted purchase); executing an already-approved recurring spend within an existing cap (e.g. the Apify daily lead-enrichment budget) does not require per-run approval
- Product-vision judgment, EXCEPT growth/scaling strategy calls at $0 spend (see "Growth/Scaling Autonomy" below)
- Physical presence or real-world identity verification
- Public messages (email sequences, social posts, newsletters)
- Production deployments

**Growth/Scaling Autonomy (added 2026-08-19):** Which ICP segment to push, positioning/messaging emphasis, channel mix, and outreach targeting are pre-approved -- decide and act without waiting for Davie, as long as the change costs $0 (no new ad spend, no new paid tools/tiers/budget) and stays within existing send caps and policies (`outreach/policy/collectly_bot_policy.md`). Log each change and its rationale in `decisions.md` so it's auditable, and mention it in the next heartbeat/status update rather than pinging Davie in real time. This does NOT cover changing what customers are actually charged (live pricing) -- that stays a Financial decision above and still requires approval.

On any tool or job failure outside this list: diagnose the root cause and attempt an autonomous fix or retry before giving up. Only report-and-stop without attempting a fix if the fix itself would require something on this list (e.g. a missing credential only Davie can provide).

## Active Risks

| Risk | Severity | Owner | Next Action | Status |
|---|---|---|---|---|
| QBO client secret leak risk | High | Davie / OpenClaw | Confirm rotation status; rotate via QBO developer console if any real value was exposed. See `security/audit-2026-08-04.md` | Open |
| Dependency vulnerabilities | High | OpenClaw | Patch `node-tar` (critical); plan `vercel`/`undici` major update on preview branch | Open |
| Dev/prod environment isolation gap | High | Davie / OpenClaw | Separate secret stores, env files, and deployment targets | Open |
| Outreach pipeline stalled | High | OpenClaw / Davie | No sends since 2026-07-30; deliverability test was partial; Gmail fallback broken; needs decision to resume or fix first | Open |
| No formal privacy policy / ToS refresh | Medium | OpenClaw (draft) / Davie (approve) | Draft legal pages for QBO Partner Program compliance | Open |
| Launch blockers unresolved | Medium | Davie | Real Clerk, Stripe live, custom domain, PostHog, Twilio A2P still pending from 2026-07-15 plan | Open |
| Manual support ticket handling | Medium | OpenClaw | Build support triage skill before first customers | Open |
| No secret scanner in local env | Medium | OpenClaw | Install `trufflehog` or `git-secrets` and scan full git history | Open |

_Last updated: 2026-08-19_

## Approved Decisions

- Source: conversation 2026-08-04 — Davie approved creation of foundational OpenClaw skill infrastructure for Collectly.
- Source: operating-design.md — AI workforce organized by department with OpenClaw as Chief of Staff.
- Source: outreach/policy/collectly_bot_policy.md — Daily send cap 100/day Resend, 0 Gmail fallback, no rest days, no ask-before-send.
- Source: conversation 2026-08-04 — Davie prefers to be called "Davie" (not Davie).

## Tooling Map

| Tool | Status | Owner | Notes |
|---|---|---|---|
| Resend | Active | OpenClaw | For outbound email sequences; free-tier limits may apply; domain getcollectly.app verified |
| Gmail API fallback | Broken | Davie / OpenClaw | OAuth token expired/revoked; policy says 0/day until fixed |
| Hunter.io | Key not present in this env | Davie | Stored in `/home/davie/.openclaw/secrets/collectly/HUNTER_API_KEY` |
| Apollo.io | Key not present in this env | Davie | Stored in `/home/davie/.openclaw/secrets/collectly/APOLLO_API_KEY` |
| Skrapp.io | Key not present in this env | Davie | Stored in `/home/davie/.openclaw/secrets/collectly/SKRAPP_API_KEY` |
| Zoho IMAP | Active | OpenClaw | For cold-outreach reply ingestion |
| QBO OAuth | Pending founder action | Davie | Secret rotation required |
| Xero OAuth | Not yet acquired | Davie | Needed for integration |
| Paystack | Active/pending | OpenClaw | Webhook monitoring needed |
| Twilio | Placeholder/pending | Davie | Account SID, auth token, from number needed; A2P 10DLC registration required for US SMS |
| Clerk | Test/dev only | Davie | Production Clerk instance needed for real launch |
| Stripe | Test/legacy | Davie | Live keys and Connect setup pending; billing currently manual |
| PostHog | Not wired | Davie | Analytics project key needed |
| GitHub | Active | OpenClaw | Code review, bug triage, CI with gitleaks secret scan |

## Outreach File Conventions

- `outreach/data/prospects.csv` — master lead list
- `outreach/data/outbound-send-log-YYYY-MM-DD.csv` — send log (one file per day of activity)
- `outreach/data/seed-inbox-test-log.csv` — deliverability test results
- `outreach/data/inbound-leads.csv` — leads from landing pages/forms
- `outreach/data/suppression.csv` — do-not-contact and warmup contacts
- `outreach/policy/collectly_bot_policy.md` — active decision policy
- `outreach/status-report-YYYY-MM-DD.md` — periodic status reports

## Sources

- `USER.md`
- `operating-design.md`
- Conversation 2026-08-04 with Davie
- `ops/strategy.md`, `ops/launch-plan.md`, `ops/cold-outbound.md`
- `outreach/README.md`, `outreach/SETUP.md`, `outreach/policy/collectly_bot_policy.md`
- `outreach/data/*.csv` as inspected on 2026-08-04

_Last updated: 2026-08-04_
