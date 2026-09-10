# Collectly Active Risks

| Risk | Severity | Owner | Next Action | Status |
|---|---|---|---|---|
| QBO client secret leak risk | ~~High~~ Monitored | Davie / OpenClaw | TruffleHog scan 2026-09-07: zero verified secrets in filesystem or git history. Risk closed; keep weekly scanner running. See `security/secret-scan-2026-09-07.md` | Closed |
| Dependency vulnerabilities | High | OpenClaw | 2026-09-07 audit: **56 vulns** (1 critical, **29 high**, 20 moderate, 6 low). **+2 new high, +1 new moderate** since 2026-08-31 — first non-zero delta in 3 weeks. New: postcss path traversal (GHSA-r28c-9q8g-f849), undici WebSocket DoS (GHSA-vxpw-j846-p89q), qs DoS (new package). Critical `tar` chain still no upstream fix. Non-breaking `npm audit fix` still unactioned since 2026-08-10. See `security/dependency-audit-2026-09-07.md` | Open |
| Dev/prod environment isolation gap | High | Davie / OpenClaw | Separate secret stores, env files, and deployment targets | Open |
| Outreach pipeline stalled | High | OpenClaw / Davie | No sends since 2026-07-30; deliverability test was partial; Gmail fallback broken; needs decision to resume or fix first | Open |
| No formal privacy policy / ToS refresh | Medium | OpenClaw (draft) / Davie (approve) | Draft legal pages for QBO Partner Program compliance | Open |
| Launch blockers | ~~Medium~~ Mostly closed 2026-08-04 | Davie | Domain, Clerk, Stripe, Resend DNS, PostHog, Twilio A2P, QBO rotation all confirmed done | Closed |
| Manual support ticket handling | Medium | OpenClaw | Build support triage skill before first customers | Open |
| No secret scanner in local env | ~~Medium~~ Closed 2026-08-04 | OpenClaw | TruffleHog v3.90.2 installed at `/tmp/trufflehog`; weekly cron to be set up | Closed |

_Last updated: 2026-09-07 13:04 EAT (weekly dependency audit — +2 high, +1 moderate; escalation triggered, Davie alerted)_