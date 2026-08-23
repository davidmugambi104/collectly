# Secret Scan — 2026-08-23

**Tool:** trufflehog 3.97.0 (freshly installed via official install script)
**Trigger:** Weekly cron (`collectly-secret-rotation-auditor`)
**Scope:** `/home/user/.openclaw/workspace/collectly`

## Result: ✅ No findings

No verified secrets and no unverified secrets detected across either scan.

## Scans run

### 1. Filesystem scan
- **Command:** `/tmp/trufflehog filesystem /home/user/.openclaw/workspace/collectly --only-verified`
- **Duration:** 57.99 s
- **Chunks scanned:** 200,091
- **Bytes scanned:** 2,081,534,958 (~1.94 GiB)
- **Verified secrets:** 0
- **Unverified secrets:** 0
- **Exit code:** 0

### 2. Git history scan
- **Command:** `/tmp/trufflehog git file:///home/user/.openclaw/workspace/collectly --only-verified`
- **Duration:** 5.22 s
- **Chunks scanned:** 9,999
- **Bytes scanned:** 102,391,988 (~97.6 MiB)
- **Verified secrets:** 0
- **Unverified secrets:** 0
- **Exit code:** 0

## Notes
- `--only-verified` was passed per policy; trufflehog still reports unverified counts in its log output (both zero).
- A handful of detector timeouts on `node_modules/keyv/README.md` (Redis detector) were logged but produced no findings — these are noisy third-party README files in `node_modules`, not source-of-truth secrets, and are excluded from concern.
- Filesystem scan covered ~1.94 GiB of data (including `node_modules`, `.next` build artifacts, `.venv`); git scan covers tracked history.
- Next scheduled scan: 2026-08-30 (weekly cadence).
