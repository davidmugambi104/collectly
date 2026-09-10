# Collectly Dependency Vulnerability Scan — 2026-09-07

**Run by:** `collectly-dependency-vulnerability-scanner` (weekly cron)
**Repo:** `/home/user/.openclaw/workspace/collectly`
**Time:** 2026-09-07 13:04 EAT (10:04 UTC)

## Summary

| Severity | 2026-08-04 (baseline) | 2026-08-10 | 2026-08-18 | 2026-08-23 | 2026-08-24 | 2026-08-31 | 2026-09-07 (this run) | Δ vs last run |
|---|---|---|---|---|---|---|---|---|
| Critical | 1 | 1 | 1 | 1 | 1 | 1 | **1** | 0 |
| High     | 23 | 24 | 27 | 27 | 27 | 27 | **29** | **+2** |
| Moderate | 18 | 19 | 19 | 19 | 19 | 19 | **20** | **+1** |
| Low      | 6 | 6 | 6 | 6 | 6 | 6 | **6** | 0 |
| **Total**| **48** | **50** | **53** | **53** | **53** | **53** | **56** | **+3** |

**Verdict vs last run:** ⚠️ **+2 new high, +1 new moderate.** Escalation rule triggered — Davie alerted, `risks.md` updated.

**Dependencies:** 343 prod / 719 dev / 280 optional / 3 peer / 1,145 total.

## New vulnerabilities (Δ vs 2026-08-31)

### New high (+2)

1. **`postcss` — GHSA-r28c-9q8g-f849** (high, CVSS 7.5)
   - Title: PostCSS: Path Traversal in Previous Source Map Auto-Loading (`sourceMappingURL`) leads to Arbitrary `.map` File Disclosure
   - CWE-22 (Path Traversal)
   - Range: `<=8.5.17`
   - Direct dependency: yes
   - Fix available: yes (patch)
   - Note: This is a **new advisory** on an already-flagged package. The previous postcss advisories (GHSA-6g55-p6wh-862q high, GHSA-fxqj-rqcc-2cmp moderate, GHSA-qx2v-qp2m-jg93 moderate) remain.

2. **`undici` — GHSA-vxpw-j846-p89q** (high, CVSS 7.5)
   - Title: undici WebSocket client vulnerable to denial of service via fragment count bypass
   - CWE-400, CWE-770 (ReDoS / Resource Exhaustion)
   - Range: `<6.27.0`
   - Direct dependency: no (via `@vercel/node`)
   - Fix available: via `vercel@50.41.0` (breaking, SemVer major)

### New moderate (+1)

3. **`qs` — GHSA-x5fp-wj9c-mxmx + GHSA-4mjr-xmp4-gh2g** (moderate)
   - Title 1: qs array-limit bypass via bracket-key comma parsing (CVSS 3.7)
   - Title 2: qs Denial of Service via Attacker Controlled `isBuffer` (CVSS 5.3)
   - Range: `2.2.5 - 6.15.3`
   - Direct dependency: no
   - Fix available: yes (patch)
   - Note: `qs` was not flagged in any prior audit — entirely new entry.

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

## High (29) — +2 since last run

All previously flagged high packages remain. Full list:

| Package | Severity | Direct? | Fix | Breaking? | New? |
|---|---|---|---|---|---|
| `next`          | high | yes | patch                    | no | — |
| `postcss`       | high | yes | patch                    | no | **+1 new advisory** |
| `sharp`         | high | no  | patch                    | no | — |
| `nanoid`        | high | no  | patch                    | no | — |
| `brace-expansion`| high | no | patch                   | no | — |
| `ip-address`    | high | no  | patch                    | no | — |
| `js-yaml`       | high | no  | patch                    | no | — |
| `mailparser`    | high | yes | `mailparser@3.9.8`       | yes | — |
| `drizzle-orm`   | high | yes | `drizzle-orm@0.45.2`     | yes | — |
| `vercel`        | high | yes | `vercel@50.41.0`         | yes | — |
| `undici`        | high | no  | via `vercel@50.41.0`     | yes | **+1 new advisory** |
| `minimatch`     | high | no  | via `vercel@50.41.0`     | yes | — |
| `path-to-regexp`| high | no  | via `vercel@50.41.0`     | yes | — |

## Moderate (20) — +1 since last run

Same set as 2026-08-31 plus `qs` (new). Full list: `ai`, `@ai-sdk/*` family, `@esbuild-kit/*`, `@vercel/*` family (elysia, fastify, h3, hono, koa, nestjs, node, python, redwood, remix-builder, static-build, backends, express, hydrogen, rust), `ajv`, `dompurify`, `esbuild`, `jsondiffpatch`, `lazy-js-utils`, `smol-toml`, `tsup`, **`qs`** (new).

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
| 2026-08-31           | 1 | 27 | 19 | 6 | 53 | 0 |
| 2026-09-07           | 1 | 29 | 20 | 6 | 56 | **+3** |

First non-zero delta since 2026-08-18. The stable plateau has broken — 3 new advisories appeared this week.

## Recommended actions (prioritized — updated)

1. **Immediately safe (non-breaking):**
   - `npm audit fix` — patches `next`, `postcss` (incl. new GHSA-r28c-9q8g-f849), `sharp`, `dompurify`, `nanoid`, `brace-expansion`, `ip-address`, `js-yaml`, `qs`, low-severity items.
   - Does **not** close the critical `tar` chain (no upstream fix).
   - Run typecheck + smoke test before merging.
2. **Plan on preview branch (breaking):**
   - Bump `vercel` → `50.41.0` to clear the bulk of high + moderate cluster (`undici` incl. new GHSA-vxpw-j846-p89q, `path-to-regexp`, `@vercel/*` family, `smol-toml`, `minimatch`).
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

**⚠️ ESCALATION TRIGGERED.** +2 new high vulnerabilities detected (postcss path traversal, undici WebSocket DoS). Davie has been alerted. `risks.md` updated.

---

_Previous report: `security/dependency-audit-2026-08-31.md`_