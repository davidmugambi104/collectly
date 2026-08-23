# Collectly Dependency Vulnerability Scan — 2026-08-18

**Run by:** `collectly-dependency-vulnerability-scanner` (weekly cron)
**Repo:** `/home/user/.openclaw/workspace/collectly`
**Time:** 2026-08-18 23:49 EAT (20:49 UTC)

## Summary

| Severity | 2026-08-04 (baseline) | 2026-08-10 (last week) | 2026-08-18 (this run) | Δ vs last week |
|---|---|---|---|---|
| Critical | 1 | 1 | 1 | 0 |
| High     | 23 | 24 | **27** | **+3** |
| Moderate | 18 | 19 | 19 | 0 |
| Low      | 6 | 6 | 6 | 0 |
| **Total**| **48** | **50** | **53** | **+3** |

**Verdict vs last week:** Critical unchanged (still the `tar` / `node-tar` advisory chain, no fix published this week). High rose by **+3**; moderate and low unchanged. Net **+3 vulnerabilities** vs 2026-08-10. The high column grew enough to cross the routine "new high appeared" alert threshold — **notifying Davie**.

## Critical (1) — unchanged vs last week

### `tar` ≤ 7.5.20 — critical (no fix available)

Same chain carried forward from 2026-08-04 and 2026-08-10. No patched version is published in npm as of this run; `npm audit fix` reports "no fix available" for the `tar` package itself. The 9 advisories in the chain:

- GHSA-83g3-92jg-28cx — Arbitrary file read/write via hardlink target escape through symlink chain (CVSS 7.1).
- GHSA-qffp-2rhf-9h96 — Hardlink path traversal via drive-relative linkpath.
- GHSA-9ppj-qmqm-q256 — Symlink path traversal via drive-relative linkpath.
- GHSA-vmf3-w455-68vh — PAX size override → tar parser differential (file smuggling).
- GHSA-w8wr-v893-vjvp — PAX numeric path type confusion → process crash.
- GHSA-23hp-3jrh-7fpw — Decompression/parse DoS via unlimited input.
- GHSA-8x88-c5mf-7j5w — Negative tar entry size → infinite loop.
- GHSA-gvwx-54wh-qm9j — NUL byte in PAX path/linkpath → uncaught exception DoS.
- GHSA-r292-9mhp-454m — Uncontrolled recursion in `mapHas`/`filesFilter` DoS.

**Status:** No upstream fix yet. The `tar` package is transitive (pulled in by Vercel build tooling / `@vercel/blob`). The non-breaking patch path `npm audit fix` will not touch this; it requires waiting on upstream or replacing the consumer.

## High-severity (27) — +3 vs last week

### New high advisories surfaced since 2026-08-10 (delta analysis)

The high column grew by 3. Specific newly-indexed items in the advisory DB this week (cluster is mostly in the `@vercel/*` family that the planned `vercel@50.41.0` semver-major upgrade is meant to collapse):

- **`@vercel/backends`** — high, transitive. Path-to-regexp ReDoS chain. Resolved by `vercel@50.41.0`.
- **`@vercel/cervel` ≥ 0.0.12** — high, transitive. Resolved by `vercel@50.41.0`.
- **`@vercel/express`** — high, transitive. Resolved by `vercel@50.41.0`.

(Note: npm does not provide a clean "new this week" diff in the audit JSON. The +3 delta vs the 2026-08-10 baseline is the authoritative number; the items above are the most likely drivers based on the `@vercel/*` family expansion pattern observed since 2026-08-04. A future improvement would be to diff advisory IDs (`source` field) against a stored snapshot.)

### Continuing direct highs (unchanged from 2026-08-10)

| Package | Severity | Fix | Breaking? |
|---|---|---|---|
| `vercel`        | high | `vercel@50.41.0`        | yes |
| `next`          | high | patch                    | no |
| `postcss`       | high | patch                    | no |
| `drizzle-orm`   | high | `drizzle-orm@0.45.2`     | yes (requires `drizzle-kit@0.31.10`) |

### Continuing transitive highs

- **`undici` ≤ 6.27.0** — smuggling, CRLF injection, desync, DoS, decompression exhaustion, WebSocket bugs. Only fixed via `vercel@50.41.0`.
- **`sharp` < 0.35.0** — libvips cluster (CVE-2026-33327/33328/35590/35591). Non-breaking patch via `npm audit fix`.
- **`brace-expansion`**, **`minimatch`**, **`nanoid`**, **`path-to-regexp`**, **`js-yaml`**, **`deepmerge-ts`**, **`html-to-text`**, **`ip-address`**, **`mailparser`** — ReDoS / prototype-pollution / parsing clusters. Mostly collapsed by either `npm audit fix` (non-breaking) or the `vercel@50.41.0` semver-major bump.
- **`next` 9.3.4-canary.0 – 16.3.0-preview.10** — direct; non-breaking patch available.

## Moderate (19) — unchanged vs last week

Carried forward from 2026-08-10: `ai` (escalated severity), `@esbuild-kit/core-utils`, `@esbuild-kit/esm-loader`, `@vercel/elysia`, `@vercel/fastify`, `@vercel/static-config`, `brace-expansion`, `dompurify`, `ip-address`, `js-yaml`, `jsondiffpatch`, `lazy-js-utils`, `minimatch`, `nanoid`, `sharp` (cross-listed), `smol-toml`, `tsup`, `ajv`. No new moderate advisories surfaced this week.

## Low (6) — unchanged

`@ai-sdk/provider-utils`, `@ai-sdk/react`, `@ai-sdk/ui-utils`, `@tootallnate/once`, plus two inherited platform low-severity items.

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

## Trend

| Date | Critical | High | Moderate | Low | Total |
|---|---|---|---|---|---|
| 2026-08-04 (baseline) | 1 | 23 | 18 | 6 | 48 |
| 2026-08-10           | 1 | 24 | 19 | 6 | 50 |
| 2026-08-18           | 1 | 27 | 19 | 6 | 53 |

High column has now grown +4 in 14 days. The expansion is concentrated in the `@vercel/*` package family — all collapsed by the planned `vercel@50.41.0` semver-major bump that has been on the open action list since 2026-08-10.

## Recommended actions (prioritized)

1. **Immediately safe (non-breaking) — still open since 2026-08-10:**
   - `npm audit fix` — patches `next`, `postcss`, `sharp`, `dompurify`, low-severity items.
   - Note: this **does not** close the critical `tar` chain (no upstream fix).
   - Run typecheck + smoke test before merging.
2. **Plan on preview branch (breaking) — still open since 2026-08-10:**
   - Bump `vercel` → `50.41.0` to clear the bulk of high + moderate cluster (`undici`, `path-to-regexp`, the entire `@vercel/*` family, `smol-toml`, `@tootallnate/once`, and likely most of this week's +3 high delta).
   - Bump `drizzle-orm` → `0.45.2` and `drizzle-kit` → `0.31.10` together (paired move).
   - Bump `ai` → `7.0.58` (major — `@ai-sdk/*` ecosystem) — assess prompt/streaming code for breakage.
3. **Decide whether to keep direct `anthropic-ai` and `vercel` CLIs in production deps** — sharp/libvips in particular pulls substantial native code.
4. **Re-audit immediately after each `npm audit fix` step** to confirm the column deltas collapse as expected.
5. **Keep the weekly cron running** — high column has now grown +4 in 14 days; the npm advisory DB is actively adding advisories faster than the weekly cadence can keep up if no remediation is applied.

## Next Steps

- [ ] OpenClaw: create preview branch `security/2026-08-patch-round`, apply `npm audit fix` only, push, run lint/typecheck/next build. (Carried from 2026-08-10 — still not actioned.)
- [ ] OpenClaw: separate plan for `vercel@50.41.0` upgrade on its own branch (test Vercel preview deploy before promoting). This is the highest-leverage move — closes the bulk of the +4 high growth over the last 14 days.
- [ ] OpenClaw: separate plan for `drizzle-orm@0.45.2` + `drizzle-kit@0.31.10` migration (schema/CLI impact).
- [ ] OpenClaw: separate plan for `ai@7.0.58` major upgrade (review prompt + streaming call sites).
- [ ] Davie: confirm the `vercel` CLI + `anthropic-ai` SDK need to remain direct (vs. dev-only).
- [ ] Davie: green-light at minimum the non-breaking patch wave (patches direct highs `next` + `postcss`; does not touch `tar`).
- [ ] OpenClaw: investigate whether the `tar` package is reachable at runtime in Vercel build vs. only at install — may be acceptable to defer until upstream patches.
- [ ] OpenClaw: in a future run, store the full advisory-ID set alongside each audit file so weekly diffs are computable. (Limitation observed this week: no clean diff vs last week's advisories.)

## Diff vs prior run

See `security/dependency-audit-2026-08-10.md` for the prior week. Material changes:

- **+3 high** (the `@vercel/*` family continues to expand advisories in the npm DB).
- 0 critical, 0 moderate, 0 low changes.
- No new direct-dependency high; the +3 is all transitive.
- The `tar` critical chain is still unpatched upstream; carried forward without remediation path.

## Alert

High count grew from 24 → 27 this week (+3). Routine escalation rule says notify Davie on new critical/high. Critical itself did not jump, but the high column grew and the surface area expanded for the second consecutive week. **Davie alerted via WhatsApp.**
