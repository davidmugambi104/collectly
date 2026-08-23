# SOP: Dev/Prod Environment Isolation

**Department:** DevOps / Security
**Owner:** Davie (hosting decisions) / OpenClaw (documentation + verification)
**Status:** draft
**Last verified:** 2026-08-04

## Purpose

Prevent dev/test secrets and config from leaking into production or being shared across environments.

## Trigger

- Initial setup of deployment pipeline.
- Adding a new third-party integration.
- Suspected cross-environment secret reuse.

## Inputs

- Hosting provider access (Vercel or other)
- Local secret storage path (e.g., `/home/davie/.openclaw/secrets/collectly/`)
- `.env.example` as the canonical key list

## Steps

1. Define environment names: `development`, `preview`, `production`.
2. Create one secret store per environment. Do not share `production` secrets with `development`.
3. Create per-environment env files only on local machines / secure stores. Do not commit real env files.
4. Ensure `.env.example` lists every key but contains only placeholder values.
5. Configure the deployment pipeline to target the correct environment based on branch (`main` → production, `develop`/PR → preview).
6. Document which keys differ by environment (e.g., `QBO_ENVIRONMENT`, `SQUARE_ENVIRONMENT`, `PLAID_ENV`).
7. OpenClaw verifies no real secrets are committed and that CI uses test-only values.

## Decision points

- If a secret is needed in both dev and prod, use separate values — never the same production secret in dev.
- If the hosting provider doesn't support preview envs, use a staging deployment target.

## Outputs

- `.env.example` is the only committed env file.
- Each environment has its own isolated secret store.
- Deployment pipeline routes correctly per branch.

## Success metric

A change to a development secret cannot affect production.
