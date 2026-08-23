# Collectly Dependency Vulnerability Scan — 2026-08-23

**Run by:** `collectly-dependency-vulnerability-scanner` (weekly cron)
**Repo:** `/home/user/.openclaw/workspace/collectly`
**Time:** 2026-08-23 21:27 EAT (18:27 UTC)

## Summary

| Severity | 2026-08-04 (baseline) | 2026-08-10 | 2026-08-18 | 2026-08-23 (this run) | Δ vs last week |
|---|---|---|---|---|---|
| Critical | 1 | 1 | 1 | **1** | 0 |
| High     | 23 | 24 | 27 | **27** | 0 |
| Moderate | 18 | 19 | 19 | **19** | 0 |
| Low      | 6 | 6 | 6 | **6** | 0 |
| **Total**| **48** | **50** | **53** | **53** | **0** |

**Verdict vs last week:** No change across all severity bands. Critical unchanged (1), high unchanged (27), moderate unchanged (19), low unchanged (6). **No new critical or high vulnerabilities appeared this week.** Per the escalation rule, Davie is **not** alerted and `risks.md` is **not** updated.

## Baseline comparison

The vulnerability surface has been stable for 5 days (since 2026-08-18). The +3 high growth observed two weeks ago (2026-08-10 → 2026-08-18) has not continued. However, nothing has been remediated either — the same 53 advisories persist. The non-breaking patch wave and breaking upgrades recommended since 2026-08-10 remain unactioned.

## Critical (1) — unchanged

### `tar` ≤ 7.5.20 — critical (no fix available)

Same chain carried forward from 2026-08-04. 9 advisories in the chain (GHSA-83g3-92jg-28cx, GHSA-qffp-2rhf-9h96, GHSA-9ppj-qmqm-q256, GHSA-vmf3-w455-68vh, GHSA-w8wr-v893-vjvp, GHSA-23hp-3jrh-7fpw, GHSA-8x88-c5mf-7j5w, GHSA-gvwx-54wh-qm9j, GHSA-r292-9mhp-454m). No upstream fix published. Transitive via Vercel build tooling / `@vercel/blob`.

## High (27) — unchanged

Same set as 2026-08-18. Key packages:

| Package | Severity | Direct? | Fix | Breaking? |
|---|---|---|---|---|
| `vercel`        | high | yes | `vercel@50.41.0`        | yes |
| `next`          | high | yes | patch                    | no |
| `postcss`       | high | yes | patch                    | no |
| `drizzle-orm`   | high | yes | `drizzle-orm@0.45.2`     | yes |
| `undici`        | high | no  | via `vercel@50.41.0`     | yes |
| `sharp`         | high | no  | patch                    | no |
| `minimatch`     | high | no  | via `vercel@50.41.0`     | yes |
| `path-to-regexp`| high | no  | via `vercel@50.41.0`     | yes |
| `nanoid`        | high | no  | patch                    | no |
| `mailparser`    | high | yes | `mailparser@3.9.8`       | yes |
| `tar`           | high (cross-listed) | no | no fix | — |

## Moderate (19) — unchanged

Same set as 2026-08-18: `ai`, `@esbuild-kit/core-utils`, `@esbuild-kit/esm-loader`, `@vercel/elysia`, `@vercel/fastify`, `@vercel/static-config`, `brace-expansion`, `dompurify`, `ip-address`, `js-yaml`, `jsondiffpatch`, `lazy-js-utils`, `minimatch`, `nanoid`, `smol-toml`, `tsup`, `ajv`, `undici` (cross-listed), `postcss` (cross-listed).

## Low (6) — unchanged

`@ai-sdk/provider-utils`, `@ai-sdk/react`, `@ai-sdk/ui-utils`, `@tootallnate/once`, plus two inherited platform low-severity items.

## Trend

| Date | Critical | High | Moderate | Low | Total |
|---|---|---|---|---|---|
| 2026-08-04 (baseline) | 1 | 23 | 18 | 6 | 48 |
| 2026-08-10           | 1 | 24 | 19 | 6 | 50 |
| 2026-08-18           | 1 | 27 | 19 | 6 | 53 |
| 2026-08-23           | 1 | 27 | 19 | 6 | 53 |

First week with zero delta since tracking began. The advisory DB did not index new vulnerabilities affecting this dependency tree in the last 5 days, and no remediation has been applied.

## Recommended actions (prioritized — carried from 2026-08-18, still open)

1. **Immediately safe (non-breaking):**
   - `npm audit fix` — patches `next`, `postcss`, `sharp`, `dompurify`, low-severity items.
   - Does **not** close the critical `tar` chain (no upstream fix).
   - Run typecheck + smoke test before merging.
2. **Plan on preview branch (breaking):**
   - Bump `vercel` → `50.41.0` to clear the bulk of high + moderate cluster (`undici`, `path-to-regexp`, `@vercel/*` family, `smol-toml`, `minimatch`).
   - Bump `drizzle-orm` → `0.45.2` and `drizzle-kit` → `0.31.10` together.
   - Bump `ai` → `7.0.58` (major — `@ai-sdk/*` ecosystem).
3. **Decide whether to keep `vercel` CLI + `anthropic-ai` SDK as production deps.**
4. **Re-audit after each remediation step.**
5. **Investigate whether `tar` is reachable at runtime** (Vercel build only) — may be acceptable to defer.

## Open action items (carried forward)

- [ ] OpenClaw: create preview branch `security/2026-08-patch-round`, apply `npm audit fix`, push, run lint/typecheck/next build. (Open since 2026-08-10.)
- [ ] OpenClaw: plan `vercel@50.41.0` upgrade on its own branch.
- [ ] OpenClaw: plan `drizzle-orm@0.45.2` + `drizzle-kit@0.31.10` migration.
- [ ] OpenClaw: plan `ai@7.0.58` major upgrade.
- [ ] Davie: confirm `vercel` CLI + `anthropic-ai` SDK as direct deps.
- [ ] Davie: green-light non-breaking patch wave.
- [ ] OpenClaw: investigate `tar` runtime reachability.
- [ ] OpenClaw: store advisory-ID set alongside future audit files for computable weekly diffs.

## Alert

**None.** No new critical or high vulnerabilities this week. Davie not alerted. `risks.md` not updated.

---

_Previous report: `security/dependency-audit-2026-08-18.md`_