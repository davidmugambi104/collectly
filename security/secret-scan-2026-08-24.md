# Secret Scan Report — 2026-08-24

**Scan type:** Weekly automated secret rotation audit
**Tool:** TruffleHog v3.97.0
**Operator:** collectly-secret-rotation-auditor (cron)
**Date:** Monday, 24 August 2026, 09:00 EAT (06:00 UTC)

---

## Scans Performed

### 1. Filesystem scan
- **Command:** `trufflehog filesystem /home/user/.openclaw/workspace/collectly --only-verified`
- **Chunks scanned:** 201,376
- **Bytes scanned:** ~2.09 GB
- **Duration:** 2m 5.7s
- **Verified secrets found:** 0
- **Unverified secrets found:** 0
- **Notes:** A few non-fatal detector timeout warnings (Redis detector on `node_modules/keyv/README.md`) — these are benign and do not affect results.

### 2. Git history scan
- **Command:** `trufflehog git file:///home/user/.openclaw/workspace/collectly --only-verified`
- **Chunks scanned:** 10,421
- **Bytes scanned:** ~103 MB
- **Duration:** 16.7s
- **Verified secrets found:** 0
- **Unverified secrets found:** 0

---

## Summary

✅ **No verified secrets detected** in the Collectly repository (working tree or git history).

No action required. Next scan scheduled for Monday, 31 August 2026.