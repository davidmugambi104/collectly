# Phase 0 — Stabilize & Foundation

**Goal:** Zero known critical security/infra gaps; every future decision has a memory substrate.

## Week 1-2 Tasks

### Security / Infra (P0)
- [x] Initial secret scan and dependency audit — `security/audit-2026-08-04.md` created
- [ ] Rotate leaked QBO client secret
  - [ ] Davie logs into QBO developer console
  - [ ] Generate new client secret
  - [ ] Update `.env` files (dev, prod, CI/CD)
  - [ ] Revoke old secret
  - [ ] Verify QBO OAuth flow still works
  - [x] SOP created by `collectly-sop-maintainer`
- [ ] Separate dev/prod environments
  - [ ] Audit current env files and deployment config
  - [ ] Create isolated secret stores
  - [ ] Update deployment pipeline to target correct env
  - [x] SOP created by `collectly-sop-maintainer`

### Foundation Skills (P0)
- [x] `collectly-knowledge-curator` — applied
- [x] `collectly-prompt-library` — applied
- [x] `collectly-new-skill-builder` — applied
- [x] `collectly-sop-maintainer` — applied
- [x] `collectly-daily-briefing` — applied
- [x] `collectly-automated-code-review` — applied
- [x] `collectly-bug-triage` — applied
- [x] `collectly-secret-rotation-auditor` — applied
- [x] `collectly-dependency-vulnerability-scanner` — applied

### Context / Memory
- [x] `collectly/context.md` created
- [x] `collectly/context.json` created
- [x] `collectly/decisions.md` created
- [x] `collectly/risks.md` created
- [ ] Keep context files updated as skills are built

### SOPs to create during Phase 0
- [x] QBO client secret rotation — created
- [x] Dev/prod environment separation — created
- [x] Dependency vulnerability audit — created
- [x] New skill creation and activation — created
- [ ] Daily briefing review process — pending

## Milestone

Zero known critical security/infra gaps; every future decision has a memory substrate.

## Blockers requiring Davie action

- QBO developer console login for secret rotation
- Confirmation of hosting provider and deployment tooling for dev/prod isolation
