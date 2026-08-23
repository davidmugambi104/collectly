# Collectly Dependency Vulnerability Scan — 2026-08-10

**Run by:** `collectly-dependency-vulnerability-scanner` (weekly cron)
**Repo:** `/home/user/.openclaw/workspace/collectly`
**Time:** 2026-08-10 17:11 EAT (14:11 UTC)

## Summary

| Severity | 2026-08-04 (baseline) | 2026-08-10 (this run) | Δ |
|---|---|---|---|
| Critical | 1 | 1 | 0 |
| High     | 23 | 24 | **+1** |
| Moderate | 18 | 19 | **+1** |
| Low      | 6 | 6 | 0 |
| **Total**| **48** | **50** | **+2** |

**Verdict vs baseline:** Critical count unchanged (still the `tar` / `node-tar` symlink-traversal chain). High count rose by 1 and a cluster of new transitive packages surfaced. **Notifying Davie** as the routine escalation rule says ("new critical/high appear"); critical itself did not jump, but the high column grew and the surface area of advisories materially expanded.

> The "REMOVED `node-tar`" line in the diff is just a package-name rename in the npm advisory DB — the underlying tar CVE chain is the same and is still 1 critical.

## Critical (1) — same as baseline

### `tar` ≤ 7.5.20 — critical

Multiple CRITICAL advisories inherited via the `tar` package (the `node-tar`/`tar` workhorses used by Vercel build tooling):

- GHSA-83g3-92jg-28cx — Arbitrary file read/write via hardlink target escape through symlink chain.
- GHSA-qffp-2rhf-9h96 — Hardlink path traversal via drive-relative linkpath.
- GHSA-9ppj-qmqm-q256 — Symlink path traversal via drive-relative linkpath.
- GHSA-vmf3-w455-68vh — PAX size override causing tar parser differential (file smuggling).
- GHSA-w8rf-vjvp-vjvp — PAX numeric path type confusion → process crash.
- GHSA-23hp-3jrh-7fpw — Decompression/parse DoS via unlimited input.
- GHSA-8x88-c5mf-7j5w — Negative tar entry size → infinite loop in archive replace.
- GHSA-gvwx-54wh-qm9j — NUL byte in PAX path/linkpath → uncaught exception DoS.
- GHSA-r292-9mhp-454m — Uncontrolled recursion in `mapHas`/`filesFilter` DoS via crafted long-path tar.

**Fix:** `npm audit fix` (non-breaking patch available). **Not yet applied.** From last week's audit we noted this was still open; carrying forward.

## High-severity (24) — +1 vs baseline

### New direct (4) — these were not surfaced as direct in last week's audit

1. **`drizzle-orm` < 0.45.2** — high (direct).
   - Fix: bump `drizzle-orm` to ≥ 0.45.2 (semver-major path: → `drizzle-kit@0.31.10`).
2. **`next` 9.3.4-canary.0 – 16.3.0-preview.10** — high (direct).
   - Fix: update `next` past the patch range; non-breaking patch route available.
3. **`postcss` ≤ 8.5.22** — high (direct).
   - Fix: non-breaking patch available.
4. **`vercel`** — high (direct).
   - Fix requires `vercel@50.41.0` (semver-major, breaking). Still on last week's "preview branch" recommendation.

### New transitive high (1) — net +1 in the high column

- **`sharp` < 0.35.0** — high. New advisory cluster (CVE-2026-33327, CVE-2026-33328, CVE-2026-35590, CVE-2026-35591) inherited from libvips (image-processing). Used transitively. Non-breaking patch via `npm audit fix`.

### Continuing transitive highs

- **`undici` ≤ 6.27.0** — multiple smuggling, CRLF injection, desync, DoS, decompression-chain exhaustion, WebSocket bugs. Only fixed via the `vercel@50.41.0` semver-major bump.
- **`path-to-regexp` — ReDoS** (via `@vercel/backends`).
- **`@vercel/build-utils`** — via `@vercel/python-analysis`.
- **`@vercel/backends`, `@vercel/cervel`, `@vercel/express`** — chained through `vercel@50.41.0` upgrade path.
- **`@vercel/gatsby-plugin-vercel-builder`, `@vercel/node`, `@vercel/h3`, `@vercel/hono`, `@vercel/hydrogen`, `@vercel/koa`, `@vercel/nestjs`, `@vercel/python`, `@vercel/python-analysis`, `@vercel/redwood`, `@vercel/remix-builder`, `@vercel/rust`, `@vercel/static-build`, `@vercel/static-config`, `@vercel/elysia`, `@vercel/fastify`, `@vercel/fun`** — cluster of new advisories surfaced since last week, all collapsed by the `vercel@50.41.0` semver-major upgrade.

## Moderate (19) — +1 vs baseline

- **`ai` `low → moderate`** (escalated severity in the npm DB this week) — inherited via `@ai-sdk/provider-utils` resource-consumption group.
- **`@esbuild-kit/core-utils`, `@esbuild-kit/esm-loader`** (via `drizzle-kit`).
- **`@vercel/elysia`, `@vercel/fastify`, `@vercel/static-config`** — moderate cluster, fixed by `vercel@50.41.0`.
- **`brace-expansion`** — new this week (ReDoS via minimatch patterns).
- **`dompurify`** — new this week (XSS sanitizer fixes).
- **`ip-address`, `js-yaml`, `jsondiffpatch`, `lazy-js-utils`, `minimatch`, `nanoid`, `sharp` (cross-listed), `smol-toml`, `tsup`, `ajv`** — surfaced since baseline; mostly transitive.

## Low (6) — unchanged

- `@ai-sdk/provider-utils`, `@ai-sdk/react`, `@ai-sdk/ui-utils`, `@tootallnate/once`, plus a couple of inherited platform low-severity items.

## Direct-dependency exposure (this run)

| Package | Severity | Fix available | Breaking? |
|---|---|---|---|
| `vercel`        | high     | `vercel@50.41.0`        | yes |
| `next`          | high     | patch                    | no |
| `postcss`       | high     | patch                    | no |
| `drizzle-orm`   | high     | `drizzle-orm@0.45.2`     | yes (requires `drizzle-kit@0.31.10`) |
| `drizzle-kit`   | moderate | `drizzle-kit@0.31.10`    | yes |
| `ai`            | moderate | `ai@7.0.58`              | yes |
| `anthropic-ai`  | low      | patch                    | no |

## Recommended actions (prioritized)

1. **Immediately safe (non-breaking):**
   - `npm audit fix` — patches `tar` (critical, 9 advisories), `next`, `postcss`, `sharp`, `dompurify`, low-severity items.
   - Run typecheck + smoke test before merging.
2. **Plan on preview branch (breaking):**
   - Bump `vercel` → `50.41.0` to clear the bulk of high + moderate cluster (`undici`, `path-to-regexp`, `@vercel/*` family, `smol-toml`, `@tootallnate/once`).
   - Bump `drizzle-orm` → `0.45.2` and `drizzle-kit` → `0.31.10` together (they move as a pair).
   - Bump `ai` → `7.0.58` (major — `@ai-sdk/*` ecosystem) — assess prompt/streaming code for breakage.
3. **Decide whether to keep direct `anthropic-ai` and `vercel` CLIs in production deps or move to devDependencies** — sharp/libvips in particular pulls substantial native code.
4. **Re-audit immediately after each `npm audit fix` step** to confirm the column deltas collapse as expected.
5. **Keep the weekly cron running** — the npm advisory DB added ≥10 new transitive advisories in 7 days; monthly cadence is no longer defensible.

## Next Steps

- [ ] OpenClaw: create preview branch `security/2026-08-patch-round`, apply `npm audit fix` only, push, run lint/typecheck/next build.
- [ ] OpenClaw: separate plan for `vercel@50.41.0` upgrade on its own branch (test Vercel preview deploy before promoting).
- [ ] OpenClaw: separate plan for `drizzle-orm@0.45.2` + `drizzle-kit@0.31.10` migration (schema/CLI impact).
- [ ] OpenClaw: separate plan for `ai@7.0.58` major upgrade (review prompt + streaming call sites).
- [ ] Davie: confirm the `vercel` CLI + `anthropic-ai` SDK need to remain direct (vs. dev-only).
- [ ] Davie: green-light at minimum the non-breaking patch wave (closes the critical `tar` chain).

## Diff vs prior run

See `security/audit-2026-08-04.md` for the prior baseline. Material changes:

- +1 high (the `sharp`/libvips cluster).
- +1 moderate (the `ai` severity escalation).
- ~30 newly indexed transitive advisories on `@vercel/*` packages — entirely collapsed by the planned `vercel@50.41.0` upgrade.
- 4 direct highs now visible: `next`, `postcss`, `drizzle-orm`, `vercel` — last week's run surfaced them only as transitive.
