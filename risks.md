# Collectly Active Risks

| Risk | Severity | Owner | Next Action | Status |
|---|---|---|---|---|
| QBO client secret leak risk | ~~High~~ Monitored | Davie / OpenClaw | TruffleHog scan 2026-08-04: zero verified secrets in filesystem or git history. Risk closed; keep weekly scanner running. See `security/secret-scan-2026-08-04.md` | Closed |
| Dependency vulnerabilities | High | OpenClaw | 2026-08-18 audit: 53 vulns (1 critical, 27 high, 19 moderate, 6 low). +3 high since 2026-08-10 (continued `@vercel/*` family expansion; collapsed by planned `vercel@50.41.0` upgrade). Critical `tar` chain still has no upstream fix. Patch `next` + `postcss` direct highs (non-breaking); plan breaking upgrades for `vercel@50.41.0`, `drizzle-orm@0.45.2`+`drizzle-kit@0.31.10`, `ai@7.0.58` on separate preview branches. See `security/dependency-audit-2026-08-18.md` | Open |
| Dev/prod environment isolation gap | High | Davie / OpenClaw | Separate secret stores, env files, and deployment targets | Open |
| Outreach pipeline stalled | High | OpenClaw / Davie | No sends since 2026-07-30; deliverability test was partial; Gmail fallback broken; needs decision to resume or fix first | Open |
| No formal privacy policy / ToS refresh | Medium | OpenClaw (draft) / Davie (approve) | Draft legal pages for QBO Partner Program compliance | Open |
| Launch blockers | ~~Medium~~ Mostly closed 2026-08-04 | Davie | Domain, Clerk, Stripe, Resend DNS, PostHog, Twilio A2P, QBO rotation all confirmed done | Closed |
| Manual support ticket handling | Medium | OpenClaw | Build support triage skill before first customers | Open |
| No secret scanner in local env | ~~Medium~~ Closed 2026-08-04 | OpenClaw | TruffleHog v3.90.2 installed at `/tmp/trufflehog`; weekly cron to be set up | Closed |

_Last updated: 2026-08-18 23:49 EAT (weekly dependency scan)_