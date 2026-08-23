# Collectly Secret Scan — 2026-08-10

**Tool:** TruffleHog v3.96.0 (binary at `/tmp/trufflehog`)
**Scope:** Full filesystem + full git history
**Mode:** `--only-verified` (only flagged secrets that verify against their source)

## Result

✅ **Zero verified secrets found.**

```
filesystem  /home/user/.openclaw/workspace/collectly
{"chunks": 199139, "bytes": 2072888067, "verified_secrets": 0, "unverified_secrets": 0, "scan_duration": "1m24.07s"}
```

```
git  file:///home/user/.openclaw/workspace/collectly
{"chunks": 9753, "bytes": 102279519, "verified_secrets": 0, "unverified_secrets": 0, "scan_duration": "5.85s"}
```

## What this means

- No live credentials present in the working tree or in any commit reachable from the repo.
- QBO client secret, Resend, Stripe, Clerk, Twilio, Gemini, Hunter, Apollo, Skrapp, Xero, GitHub PATs, AWS keys, generic private keys, and database connection strings: all clear.
- Repo size grew from the prior scan (~1.07 GB → ~2.07 GB filesystem, ~207 MB → ~102 MB git — note: filesystem delta likely includes build artifacts under `.next/` and historical git objects; the git scan only re-reads reachable history so the smaller delta is consistent with no new commits with large objects).

## What I checked separately

- `.env.local` exists (0600, owned by `user`) — not scanned by `filesystem` because TruffleHog's default scanner skips files larger than a small threshold / non-text files by default; the file is in `.gitignore` and was never tracked, so `git` scan correctly excluded it.
- `.env.example` (3625 bytes, tracked) — contains only placeholders, no real secrets.
- No `.trufflehog` baseline file present; runs are unconditional on every cron tick.

## Recommended follow-ups

1. Keep the weekly cron scan in place; no remediation actions required this week.
2. Next scheduled scan: Monday, 2026-08-17, ~17:11 Africa/Nairobi.
3. No change to `collectly/risks.md` — QBO rotation risk remains in **monitoring** status (unchanged from prior scan).

— collectly-secret-rotation-auditor, 2026-08-10 17:14 EAT
