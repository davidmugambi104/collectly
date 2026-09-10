# Collectly Secret Scan — 2026-09-03

**Scan date:** Thursday, September 3, 2026 — 1:30 PM EAT  
**Tool:** TruffleHog v3.97.2  
**Scope:** `collectly/` workspace directory + full git history  
**Mode:** `--only-verified`

---

## Results: ✅ No findings

| Scan type       | Chunks scanned | Bytes scanned  | Verified secrets | Unverified secrets | Duration    |
|-----------------|----------------|----------------|------------------|--------------------|-------------|
| Filesystem scan | 202,884        | ~2.11 GB       | 0                | 0                  | 1m 3s       |
| Git history     | 10,559         | ~103 MB        | 0                | 0                  | 11s         |

No verified secrets were detected in the working tree or in the full git commit history of the repository.

### Notes

- Filesystem scan includes `node_modules/` and other vendored dependencies — all clean.
- A non-fatal Redis detector timeout warning was observed on a `node_modules/keyv/README.md` file; this is a known TruffleHog behavior on dependency docs and does not indicate a real secret.
- No action required. Next scan in 7 days.