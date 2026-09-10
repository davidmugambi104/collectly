# Collectly Secret Scan — 2026-09-07

**Scan date:** Monday, September 7, 2026 — 12:36 PM EAT  
**Tool:** TruffleHog v3.97.4  
**Scope:** `collectly/` workspace directory + full git history  
**Mode:** `--only-verified`

---

## Results: ✅ No findings

| Scan type       | Chunks scanned | Bytes scanned  | Verified secrets | Unverified secrets | Duration     |
|-----------------|----------------|----------------|------------------|--------------------|--------------|
| Filesystem scan | 243,821        | ~2.66 GB       | 0                | 0                  | 1m 44s       |
| Git history     | 10,583         | ~103 MB        | 0                | 0                  | 28s          |

No verified secrets were detected in the working tree or in the full git commit history of the repository.

### Notes

- Filesystem scan includes `node_modules/` and other vendored dependencies — all clean.
- A non-fatal Redis detector timeout warning was observed on a `node_modules/keyv/README.md` file; this is a known TruffleHog behavior on dependency docs and does not indicate a real secret.
- TruffleHog was freshly installed for this run (previous binary not persisted in `/tmp`). Verification caching showed 174 hits / 158 misses.
- No action required. Next scan in 7 days.