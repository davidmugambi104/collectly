# Collectly Operational Status — 2026-08-04

**Run by:** `collectly-knowledge-curator` + manual inspection
**Source files:** `outreach/data/*`, `outreach/policy/collectly_bot_policy.md`, `ops/*`, git log, env files

## Outreach Pipeline State

### Last activity
- **Last send:** 2026-07-30 14:30 UTC — 5 bookkeeper prospects via Resend, all HTTP 200
- **Days since last send:** 5 (and counting)
- **Pipeline status:** STALLED

### Active channels
- **Agency channel:** PAUSED (per policy — pending deliverability check)
- **Bookkeeper channel:** Last batch sent 2026-07-30; no follow-up since

### Files inspected
- `outreach/data/prospects.csv` — 60+ rows with real prospects, mix of agencies and bookkeepers across GB/US
- `outreach/data/outbound-send-log-2026-07-30.csv` — 5 successful Resend sends
- `outreach/data/seed-inbox-test-log.csv` — 2/4 reported (Gmail Primary, Outlook Primary), 2 awaiting
- `outreach/data/suppression.csv` — warmup contacts + 1 real DNC (`lennart@stanley.nu`)
- `outreach/data/inbound-leads.csv` — 1 test entry, real inbound flow not yet active

### Reply state
- **Replies last 14 days:** 1 real reply (`replied_do_not_contact`)
- **Booked calls:** 0

### Reply ingestion
- Resend inbound webhook is implemented in `src/lib/outreach-inbound.ts`
- Zoho IMAP polling implemented in `src/lib/outreach-imap-poll.ts`
- `/api/cron/outreach-poll` runs daily at 12:00 UTC per `vercel.json`

## Operational Blockers

### Hard blockers (require Davie action)

1. **Outbound pipeline stalled** — no daily sequencer running. Policy says 100/day Resend; reality is 0/day.
2. **Deliverability test partial** — 2 of 4 seed inboxes reported, 2 pending.
3. **Gmail fallback broken** — OAuth token expired/revoked per policy Section 0.
4. **Launch blockers from 2026-07-15 still open:**
   - Real Clerk production instance
   - Live Stripe keys + Connect setup
   - Custom domain DNS configuration
   - PostHog wired
   - Twilio A2P 10DLC registration (1–7 day wait)

### Soft blockers (OpenClaw can resolve)

1. **No local secret scanner** — `trufflehog`/`git-secrets` not installed.
2. **48 npm vulnerabilities** — 1 critical (`node-tar`), 23 high (mostly `undici`/`path-to-regexp` via `vercel`).
3. **No dev/prod environment separation** documented.
4. **Reply triage not running** — Resend inbound webhook exists but triage rules not enforced in code.
5. **Follow-up cadence not enforced** — T2/T3 cadence exists in policy but no automated scheduler.

## App State (read-only inspection)

### What works
- App builds (`next build`) and deploys via Vercel
- Dev shim auth allows demo access
- Drizzle schema with 12 tables migrated
- Marketing site has 16 pages live
- Dashboard has 11 pages
- 19 API routes wired
- Daily dunning cron configured
- Daily outreach-poll cron configured
- CI runs lint + typecheck + build + DB smoke + gitleaks secret scan

### What's pending founder action
- Clerk production instance (real auth)
- Stripe live keys + Connect
- Custom domain
- PostHog
- Twilio A2P

### What OpenClaw can do now
- Build skills that wrap existing scripts (DONE for Launch Engine)
- Run audits and produce reports (DONE today)
- Track blockers and surface them
- Build follow-up and reply triage logic
- Schedule daily briefing
- Operate when secrets/keys are present

## Decisions Needed From Davie

1. **Resume outbound sends now?** Pipeline has been silent for 5 days. Policy says no rest days. Options:
   - (A) Resume Resend sends at 30/day (safer) and re-run full seed-inbox test
   - (B) Resume at 100/day per policy, run partial test, watch metrics
   - (C) Hold all sends until full 4/4 deliverability test passes
2. **Patch `node-tar` critical CVE now?** Low-risk auto-fix.
3. **Set up `vercel@54.17.3` major update on a preview branch?** Fixes many high-severity transitive deps.
4. **Run local secret scan now?** Install `trufflehog` and scan git history.
5. **Approve the launch checklist approach?** I can build a daily-updating checklist skill that tracks all launch blockers.

## What OpenClaw Has Done Today

| Action | Output |
|---|---|
| Created 4 foundational skill proposals and applied them | `collectly-knowledge-curator`, `collectly-prompt-library`, `collectly-new-skill-builder`, `collectly-sop-maintainer` |
| Created 5 Phase 0 skill proposals and applied them | `collectly-daily-briefing`, `collectly-automated-code-review`, `collectly-bug-triage`, `collectly-secret-rotation-auditor`, `collectly-dependency-vulnerability-scanner` |
| Created 8 Launch Engine skill proposals and applied them | `collectly-outreach-sequencer`, `collectly-deliverability-monitor`, `collectly-reply-classifier-router`, `collectly-follow-up-scheduler`, `collectly-crm-auto-logger`, `collectly-competitor-monitoring`, `collectly-icp-refinement-engine`, `collectly-launch-executor` |
| Initial security/infra audit | `collectly/security/audit-2026-08-04.md` |
| 4 SOPs created | `qbo-secret-rotation.md`, `dev-prod-isolation.md`, `dependency-audit.md`, `new-skill-activation.md` |
| Context and decisions updated with real system architecture | `collectly/context.md`, `collectly/decisions.md`, `collectly/risks.md`, `USER.md` |

## Next Steps

1. Davie decides on outreach resume strategy.
2. Davie decides on dependency patch priorities.
3. OpenClaw can build the daily briefing for tomorrow and set up a daily cron to run `collectly-outreach-sequencer` once unblocked.
4. OpenClaw can build the launch checklist skill body if Davie approves the approach.

_Last updated: 2026-08-04 16:30 EAT_
