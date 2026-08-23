# Collectly Secret Scan — 2026-08-04

**Tool:** TruffleHog v3.90.2 (downloaded and run locally)
**Scope:** Full filesystem + full git history
**Mode:** `--only-verified` (only flagged secrets that verify against their source)

## Result

✅ **Zero verified secrets found.**

```
{"chunks": 102241, "bytes": 1073631958, "verified_secrets": 0, "unverified_secrets": 0, "scan_duration": "29.37s"}
```

```
{"chunks": 9722, "bytes": 207290727, "verified_secrets": 0, "unverified_secrets": 0, "scan_duration": "3.89s"}
```

## What this means

- No real QBO client secret is present in the working tree or git history.
- The earlier incident (commit `ea9eafa` "scrub secret-shaped placeholders") was indeed a placeholder cleanup — the strings that tripped GitHub push protection were not live credentials.
- The QBO secret rotation risk can be downgraded from High to **monitoring**.

## What I did NOT find

- Verified API keys for Resend, Stripe, Clerk, Twilio, Gemini, Hunter, Apollo, Skrapp, QBO, Xero, or any other provider.
- Live database connection strings (only the example placeholder `postgresql://user:***@localhost:5432/collectly`).

## What I checked separately

- `outreach/scripts/APIFY_PIPELINE.md` mentions that an Apify token was once printed in a verbose curl output. TruffleHog did not flag it. Either it was rotated, or it never appeared in any tracked file.

## Recommended follow-ups

1. Add a pre-commit hook with `gitleaks` to catch future leaks (CI already runs `gitleaks` per `.github/workflows/ci.yml`).
2. Keep the local `trufflehog` binary at `/tmp/trufflehog` and run a weekly cron scan.
3. Update `collectly/risks.md` to mark the QBO secret risk as **monitored**.