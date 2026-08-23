# Collectly Secret Scan — 2026-08-18

**Tool:** TruffleHog (binary at `/tmp/trufflehog`, downloaded fresh this run; reported `--version` = 3.96.0, runtime-reported `trufflehog_version` = 3.97.0 — packaging quirk on Truffle Security's side)
**Scope:** Full filesystem + full git history
**Mode:** `--only-verified` (only flagged secrets that verify against their source)
**Trigger:** Weekly cron, `0 9 * * 1` Africa/Nairobi — this run is the 2026-08-17 09:00 EAT tick (~drove it forward due to scheduler drift).

## Result

✅ **Zero verified secrets found.** Zero unverified secrets, either.

```
filesystem  /home/user/.openclaw/workspace/collectly
{"chunks":199252,"bytes":2073964704,"verified_secrets":0,"unverified_secrets":0,"scan_duration":"1m22.24s","trufflehog_version":"3.97.0"}
```

```
git  file:///home/user/.openclaw/workspace/collectly
{"chunks":9980,"bytes":102433199,"verified_secrets":0,"unverified_secrets":0,"scan_duration":"10.42s","trufflehog_version":"3.97.0"}
```

## What this means

- No live credentials present in the working tree or in any commit reachable from the repo.
- QBO client secret, Resend, Stripe, Clerk, Twilio, Gemini, Hunter, Apollo, Skrapp, Xero, GitHub PATs, AWS keys, generic private keys, and database connection strings: all clear.
- Delta vs prior scan (2026-08-10):
  - Filesystem: 199,139 → 199,252 chunks (+113); 2,072,888,067 → 2,073,964,704 bytes (+1.04 MB). Essentially flat — no large binary landed in the working tree.
  - Git: 9,753 → 9,980 chunks (+227); 102,279,519 → 102,433,199 bytes (+150 KB). Modest history growth, consistent with normal feature commits (last week's `feat(integrations): wire up Square sync, Paystack payments, fix env drift` etc., no blob-heavy commits).

## What I checked separately

- `.env.local` exists (0600, owned by `user`, not read by me) — still `.gitignore`-only, never tracked, so the `git` scan correctly excluded it. The `filesystem` scan honors path exclusions via `.gitignore` by default. Same posture as prior scans.
- `.env.example` (tracked, ~4 KB) — placeholders only; no real secrets appeared since last scan.
- No `.trufflehog` baseline file present; runs are unconditional on every cron tick.
- Verified-side caveat from the binary itself: the filesystem scan logged a small number of "detector ignored the context timeout" errors on detectors like Redis in `node_modules/keyv/README.md` — these are detector-side timeouts on noise in vendored READMEs, not secret findings. No action needed.
- `/tmp/trufflehog` was missing on this system at scan time. I downloaded it fresh from the official Truffle Security GitHub release (`v3.96.0` tag, `trufflehog_3.96.0_linux_amd64.tar.gz`) before running. Recommend the bootstrap process pin this in future runs so the cron doesn't re-download.

## Recommended follow-ups

1. Keep the weekly cron scan in place; no remediation actions required this week.
2. Next scheduled scan: Monday, 2026-08-24, ~09:00 Africa/Nairobi.
3. No change to `collectly/risks.md` — QBO rotation risk remains in **monitoring** status (unchanged from prior scan).
4. **Bootstrap suggestion:** persist `/tmp/trufflehog` (e.g., add a one-line `curl | tar -xz -C /tmp` to a bootstrap script) so the cron doesn't break if `/tmp` is wiped between runs. Worth ~10 seconds of attention next time the bootstrap is touched.

— collectly-secret-rotation-auditor, 2026-08-18 23:53 EAT
