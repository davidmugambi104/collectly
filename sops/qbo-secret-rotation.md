# SOP: Rotating the QuickBooks Online (QBO) Client Secret

**Department:** Security
**Owner:** Davie (human action) / OpenClaw (documentation + verification)
**Status:** draft
**Last verified:** 2026-08-04

## Purpose

Ensure the QBO OAuth client secret can be rotated safely without breaking the Collectly integration.

## Trigger

- The secret may have been exposed in git history, chat logs, screenshots, or operational docs.
- Routine rotation every 90 days.
- Any hint of unauthorized use of the QBO client credentials.

## Inputs

- Access to the QBO developer console for the Collectly app
- Access to all environments where `QBO_CLIENT_SECRET` is set (local `.env`, Vercel/env file, CI/CD secrets)

## Steps

1. `[HUMAN REQUIRED]` Log into the QBO developer console.
2. `[HUMAN REQUIRED]` Generate a new client secret for the Collectly app.
3. `[HUMAN REQUIRED]` Immediately update `QBO_CLIENT_SECRET` in every environment:
   - Local development `.env`
   - Production / hosting provider secret store
   - CI/CD secrets if used
4. `[HUMAN REQUIRED]` Revoke the old client secret in the QBO console.
5. OpenClaw verifies the old secret is no longer referenced in repo, git history, or local files.
6. OpenClaw updates `collectly/risks.md` and `collectly/context.json` to reflect the rotation.
7. Run a test QBO OAuth flow to confirm the integration still works.

## Decision points

- If QBO OAuth test fails after rotation: re-check all environments for stale secret; escalate to Davie.
- If old secret is found in git history: consider rotating again and evaluating whether the commit needs removal.

## Outputs

- All environments use the new QBO client secret.
- Old secret is revoked and inactive.
- `collectly/risks.md` updated.

## Success metric

`QBO_ENVIRONMENT` in the app still works for connect + sync after rotation, and no old secret remains in code or history.
