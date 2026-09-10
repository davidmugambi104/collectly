# Secret Scan Report — 2026-08-31

**Scan type:** Weekly automated secret rotation audit
**Tool:** TruffleHog v3.97.1 (target) → fallback ripgrep/grep-based scan (see note below)
**Operator:** collectly-secret-rotation-auditor (cron)
**Date:** Monday, 31 August 2026, 22:15 EAT (19:15 UTC)

---

## Scanner Note

TruffleHog v3.97.1 binary download was attempted via the official install script (`curl -sSfL ...install.sh | sh -s -- -b /tmp`) and direct `curl`/`wget` of the GitHub release tarball. All attempts were killed by the sandbox environment (SIGKILL during download, likely memory constraints). As a fallback, a thorough ripgrep + grep-based scan was performed covering:

- Filesystem: all source files, config files, env files, and hidden files (excluding `node_modules/`, `.next/`, `.venv/`, `.git/`)
- Git history: `git log --all -p -S` for known secret prefixes (`sk_live_`, `pk_live_`, `rk_live_`, `sk_test_`, `pk_test_`, `ghp_`, `gho_`, `ghs_`, `xox[bpoas]-`, `AKIA...`, JWT patterns, `re_` Resend API keys, `clff` Gmail app passwords)
- Env file tracking: confirmed `.env.local` is gitignored and never committed

This fallback is less comprehensive than TruffleHog's verified-detector approach. If environment constraints resolve, re-run with TruffleHog for full coverage.

---

## Scans Performed

### 1. Filesystem scan (fallback)

- **Method:** `rg` + `grep` for secret patterns across all non-vendored files
- **Files scanned:** All tracked + untracked files excluding `node_modules/`, `.next/`, `.venv/`, `.git/`
- **Verified secrets found:** 0
- **Findings:**
  - `.env.local` contains live secrets (RESEND_API_KEY, GMAIL_APP_PASSWORD) — **expected and correct**: file is gitignored, not tracked, never committed
  - All source code references use `process.env.*` lookups (no hardcoded secrets in `.ts`/`.tsx`/`.js` files)
  - `.env.example` contains only empty placeholder values

### 2. Git history scan (fallback)

- **Method:** `git log --all -p -S '<pattern>'` for all known secret prefixes
- **Commits since last scan (2026-08-24):** 4
  - `e113d09` fix(outreach): fail closed in deliverability gate
  - `6ea6ee5` fix(outreach): raise pace cap
  - `4605cf6` fix(outreach): add dollar circuit breaker
  - `51222cd` outreach: backfill Thomson Cooper's email
- **Verified secrets found:** 0
- **Findings:**
  - All `sk_live_` matches in git history are in documentation/audit files with redacted values (`xxxxx`, `<REDACTED>`, `...`)
  - No GitHub PATs (`ghp_`), AWS keys (`AKIA`), Slack tokens (`xox`), or JWT tokens found in history
  - `.env.local` and `.env` files never committed to git history

---

## Summary

✅ **No verified secrets detected** in the Collectly repository (working tree or git history).

No action required. Next scan scheduled for Monday, 7 September 2026.

---

## Environment issue to resolve

TruffleHog binary download failed in this run. If this recurs next week, consider:
1. Pre-building a trufflehog binary in a persistent location (outside `/tmp`)
2. Increasing sandbox memory limits
3. Using `gitleaks` (smaller binary) as an alternative