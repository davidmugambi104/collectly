# Collectly Dependency Vulnerability Scan — 2026-08-24

**Run by:** `collectly-dependency-vulnerability-scanner` (weekly cron)
**Repo:** `/home/user/.openclaw/workspace/collectly`
**Time:** 2026-08-24 09:30 EAT (06:30 UTC)

## Summary

| Severity | 2026-08-04 (baseline) | 2026-08-10 | 2026-08-18 | 2026-08-23 | 2026-08-24 (this run) | Δ vs last run |
|---|---|---|---|---|---|---|
| Critical | 1 | 1 | 1 | 1 | **1** | 0 |
| High     | 23 | 24 | 27 | 27 | **27** | 0 |
| Moderate | 18 | 19 | 19 | 19 | **19** | 0 |
| Low      | 6 | 6 | 6 | 6 | **6** | 0 |
| **Total**| **48** | **50** | **53** | **53** | **53** | **0** |

**Verdict vs last run:** No change across all severity bands. Critical unchanged (1), high unchanged (27), moderate unchanged (19), low unchanged (6). **No new critical or high vulnerabilities appeared.** Per the escalation rule, Davie is **not** alerted and `risks.md` is **not** updated.

## Baseline comparison

The vulnerability surface has now been stable for 6 consecutive days (since 2026-08-18). The +3 high growth observed on 2026-08-18 has not continued, but nothing has been remediated either — the same 53 advisories persist. The non-breaking patch wave and breaking upgrades recommended since 2026-08-10 remain unactioned.

This is the **second consecutive zero-delta run**. The advisory DB indexed no new vulnerabilities affecting this dependency tree in the last 24 hours, and no remediation has been applied.

## Critical (1) — unchanged

### `tar` ≤ 7.5.20 — critical (no upstream fix)

Same chain carried forward from 2026-08-04. 9 advisories in the chain:
- GHSA-83g3-92jg-28cx (Arbitrary File Read/Write via Hardlink Target Escape)
- GHSA-qffp-2rhf-9h96 (Hardlink Path Traversal via Drive-Relative Linkpath)
- GHSA-9ppj-qmqm-q256 (Symlink Path Traversal via Drive-Relative Linkpath)
- GHSA-vmf3-w455-68vh (PAX size override / GNU long-name interpretation differential)
- GHSA-w8wr-v893-vjvp (Process crash via PAX numeric path type confusion)
- GHSA-23hp-3jrh-7fpw (Decompression/parse DoS via unlimited input)
- GHSA-8x88-c5mf-7j5w (Negative tar entry size → infinite loop)
- GHSA-gvwx-54wh-qm9j (Uncaught Exception DoS via NUL byte in PAX records)
- GHSA-r292-9mhp-454m (Uncontrolled recursion → stack-overflow DoS)

No upstream fix published. Transitive via Vercel build tooling / `@vercel/blob`.

## High (27) — unchanged

Same set as 2026-08-23. Key packages:

| Package | Severity | Direct? | Fix | Breaking? |
|---|---|---|---|---|
| `next`          | high | yes | patch                    | no |
| `postcss`       | high | yes | patch                    | no |
| `sharp`         | high | no  | patch                    | no |
| `nanoid`        | high | no  | patch                    | no |
| `brace-expansion`| high | no | patch                   | no |
| `ip-address`    | high | no  | patch                    | no |
| `js-yaml`       | high | no  | patch                    | no |
| `drizzle-orm`   | high | yes | `drizzle-orm@0.45.2`     | yes |
| `mailparser`    | high | yes | `mailparser@3.9.8`       | yes |
| `vercel`        | high | yes | `vercel@50.41.0`         | yes |
| `undici`        | high | no  | via `vercel@50.41.0`     | yes |
| `minimatch`     | high | no  | via `vercel@50.41.0`     | yes |
| `path-to-regexp`| high | no  | via `vercel@50.41.0`     | yes |

## Moderate (19) — unchanged

Same set as 2026-08-23: `ai`, `@ai-sdk/*` family, `@esbuild-kit/*`, `@vercel/*` family (elysia, fastify, h3, hono, koa, nestjs, node, python, redwood, remix-builder, static-build, static-config, backends, cervel, gatsby-plugin, express, hydrogen, rust), `ajv`, `brace-expansion` (cross-listed), `dompurify`, `esbuild`, `ip-address` (cross-listed), `js-yaml` (cross-listed), `jsondiffpatch`, `lazy-js-utils`, `smol-toml`, `tsup`.

## Low (6) — unchanged

`@ai-sdk/provider-utils`, `@ai-sdk/react`, `@ai-sdk/ui-utils`, `@tootallnate/once`, plus two inherited platform low-severity items.

## Trend

| Date | Critical | High | Moderate | Low | Total | Δ |
|---|---|---|---|---|---|---|
| 2026-08-04 (baseline) | 1 | 23 | 18 | 6 | 48 | — |
| 2026-08-10           | 1 | 24 | 19 | 6 | 50 | +2 |
| 2026-08-18           | 1 | 27 | 19 | 6 | 53 | +3 |
| 2026-08-23           | 1 | 27 | 19 | 6 | 53 | 0 |
| 2026-08-24           | 1 | 27 | 19 | 6 | 53 | 0 |

Second consecutive zero-delta run. Advisory surface stable for 6 days.

## Recommended actions (prioritized — carried from 2026-08-18, still open)

1. **Immediately safe (non-breaking):**
   - `npm audit fix` — patches `next`, `postcss`, `sharp`, `dompurify`, `nanoid`, `brace-expansion`, `ip-address`, `js-yaml`, low-severity items.
   - Does **not** close the critical `tar` chain (no upstream fix).
   - Run typecheck + smoke test before merging.
2. **Plan on preview branch (breaking):**
   - Bump `vercel` → `50.41.0` to clear the bulk of high + moderate cluster (`undici`, `path-to-regexp`, `@vercel/*` family, `smol-toml`, `minimatch`).
   - Bump `drizzle-orm` → `0.45.2` and `drizzle-kit` → `0.31.10` together.
   - Bump `ai` → `7.0.77` (`@ai-sdk/*` ecosystem).
   - Bump `mailparser` → `3.9.8`.
3. **Decide whether to keep `vercel` CLI + `anthropic-ai` SDK as production deps.**
4. **Re-audit after each remediation step.**
5. **Investigate whether `tar` is reachable at runtime** (Vercel build only) — may be acceptable to defer.

## Open action items (carried forward)

- [ ] OpenClaw: create preview branch `security/2026-08-patch-round`, apply `npm audit fix`, push, run lint/typecheck/next build. (Open since 2026-08-10.)
- [ ] OpenClaw: plan `vercel@50.41.0` upgrade on its own branch.
- [ ] OpenClaw: plan `drizzle-orm@0.45.2` + `drizzle-kit@0.31.10` migration.
- [ ] OpenClaw: plan `ai@7.0.77` major upgrade.
- [ ] Davie: confirm `vercel` CLI + `anthropic-ai` SDK as direct deps.
- [ ] Davie: green-light non-breaking patch wave.
- [ ] OpenClaw: investigate `tar` runtime reachability.
- [ ] OpenClaw: store advisory-ID set alongside future audit files for computable weekly diffs.

## Alert

**None.** No new critical or high vulnerabilities this run. Davie not alerted. `risks.md` not updated.

---

_Previous report: `security/dependency-audit-2026-08-23.md`_