# Collectly SOP Library

| SOP | Department | Status | Last Verified | Owner |
|---|---|---|---|---|
| [Rotating the QBO Client Secret](qbo-secret-rotation.md) | Security | draft | 2026-08-04 | Davie / OpenClaw |
| [Dev/Prod Environment Isolation](dev-prod-isolation.md) | DevOps / Security | draft | 2026-08-04 | Davie / OpenClaw |
| [Dependency Vulnerability Audit](dependency-audit.md) | Security | draft | 2026-08-04 | OpenClaw |
| [Creating and Activating a New Skill](new-skill-activation.md) | AI Operations | draft | 2026-08-04 | OpenClaw / Davie |

## Template

- [SOP template](templates/sop-template.md)

## Rules

- All SOPs live in `collectly/sops/`.
- Mark any human-only step with `[HUMAN REQUIRED]`.
- Never include real secrets or API keys.
- Update `last verified` whenever a SOP is exercised.
