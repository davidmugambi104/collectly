# SOP: Dependency Vulnerability Audit

**Department:** Security
**Owner:** OpenClaw
**Status:** draft
**Last verified:** 2026-08-04

## Purpose

Keep Collectly's dependency tree free of known critical/high CVEs.

## Trigger

- Weekly automated scan.
- Before any production deploy.
- When `package.json` or `package-lock.json` changes.

## Inputs

- `package.json`
- `package-lock.json`
- `collectly/context.md`

## Steps

1. Run `npm audit`.
2. Parse results by severity: critical, high, moderate, low.
3. For critical/high issues, identify the fix version and breaking-risk note.
4. Apply non-breaking patches with `npm audit fix`.
5. For breaking fixes (e.g., major version bumps), create a preview branch and run the test suite.
6. Write findings to `collectly/security/dependency-audit-YYYY-MM-DD.md`.
7. Update `collectly/risks.md` if any critical/high issues remain unpatched.
8. Notify Davie if any critical issue cannot be auto-patched.

## Decision points

- If a fix is a breaking change, test on preview before merging to main.
- If no fix is available, add a compensating control and note the risk.

## Outputs

- Dependency audit report
- Updated `collectly/risks.md`
- Patched lockfile (when fixes applied)

## Success metric

Zero unpatched critical or high-severity CVEs in production dependencies.
