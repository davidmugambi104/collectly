# SOP: Creating and Activating a New Collectly Skill

**Department:** AI Operations
**Owner:** OpenClaw (draft) / Davie (approve)
**Status:** draft
**Last verified:** 2026-08-04

## Purpose

Ensure new OpenClaw skills are built consistently, reviewed, and activated safely.

## Trigger

- Operating design calls for a new skill.
- Founder's Rule identifies a repeated task that should be automated.
- Davie asks for a new capability.

## Inputs

- Skill name or described need
- Department from `collectly/operating-design.md`
- Autonomy level, priority, complexity, and requirements
- `collectly/context.md` and `collectly/prompts/` for grounding

## Steps

1. Read `collectly/operating-design.md` and `collectly/context.md`.
2. Check for duplicate or overlapping skills.
3. Draft a `SKILL.md` following the `skill-creator` conventions:
   - Frontmatter with `name` and `description`
   - Lean body with workflow, rules, inputs/outputs, failure mode, success metric
4. Submit the proposal via `skill_workshop(action="create", ...)`.
5. Report back to Davie with:
   - What the skill does
   - Autonomy level and why
   - Risks or dependencies
   - Approval request
6. `[HUMAN REQUIRED]` Davie reviews and approves.
7. Apply via `skill_workshop(action="apply", ...)`.
8. Update `collectly/context.md` and `collectly/tasks/phase-*.md` to reflect the new skill.
9. If the skill needs a prompt or policy, create/update it via `collectly-prompt-library`.

## Decision points

- Gated autonomy for skills that spend money, send public messages, deploy code, or handle legal/financial actions.
- Full autonomy only for internal read-only or low-risk automations.
- Semi autonomy for skills that act but flag edge cases.

## Outputs

- A live skill in the OpenClaw skill workshop
- Updated task tracker
- Related prompt/policy file if needed

## Success metric

Every new skill is approved by Davie, documented, and integrated into the operating design.
