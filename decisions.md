# Collectly Approved Decisions Log

## 2026-08-04 — OpenClaw AI Workforce Operating Design

- **Decision:** Adopt the OpenClaw AI workforce operating design for Collectly.
- **Approver:** Davie
- **Rationale:** Need to automate operations across departments; OpenClaw acts as Chief of Staff while Davie retains control of vision, pricing, legal, financial approval, OAuth, and API keys.
- **Status:** Approved
- **Source:** WhatsApp conversation 2026-08-04

## 2026-08-04 — Foundational Skill Set

- **Decision:** Create and activate four foundational skills:
  - `collectly-knowledge-curator`
  - `collectly-prompt-library`
  - `collectly-new-skill-builder`
  - `collectly-sop-maintainer`
- **Approver:** Davie
- **Rationale:** These skills enable building, versioning, and documenting all other Collectly skills.
- **Status:** Applied

## 2026-08-04 — Phase 0 Skills

- **Decision:** Create and activate the Phase 0 skills: `collectly-daily-briefing`, `collectly-automated-code-review`, `collectly-bug-triage`, `collectly-secret-rotation-auditor`, `collectly-dependency-vulnerability-scanner`.
- **Approver:** Davie
- **Rationale:** Stabilize the foundation before the launch engine runs.
- **Status:** Applied

## 2026-08-04 — Launch Engine Skills

- **Decision:** Create and activate the Launch Engine skills: `collectly-outreach-sequencer`, `collectly-deliverability-monitor`, `collectly-reply-classifier-router`, `collectly-follow-up-scheduler`, `collectly-crm-auto-logger`, `collectly-competitor-monitoring`, `collectly-icp-refinement-engine`, `collectly-launch-executor`.
- **Approver:** Davie
- **Rationale:** Wrap existing outreach scripts and operational automation into durable OpenClaw skills.
- **Status:** Applied

## 2026-08-04 — Founder's Rule

- **Decision:** Any repetitive task that doesn't require OAuth, API key, legal/financial sign-off, vision judgment, or physical presence should be a skill by the time it's needed a second time.
- **Approver:** Davie
- **Rationale:** Prevents founder bottlenecks and captures institutional memory from day one.
- **Status:** Active

## 2026-08-04 — Preferred Name

- **Decision:** Davie prefers to be called "Davie" (not "Faith").
- **Approver:** Davie
- **Source:** WhatsApp conversation 2026-08-04
- **Status:** Active

## 2026-08-19 — Growth/Scaling Autonomy Carve-Out

- **Decision:** Product-vision judgment no longer requires Davie approval for growth/scaling strategy calls (ICP segment targeting, positioning/messaging, channel mix, outreach targeting), as long as the change costs $0 and stays within existing send caps/policies. Live pricing changes remain a gated Financial decision.
- **Approver:** Requested via direct instruction, 2026-08-19 (fmugendi@udel.edu)
- **Rationale:** Founder wants the agent making and iterating on growth next-steps continuously (heartbeat-driven) instead of waiting for per-decision approval, provided it's free and reversible.
- **Status:** Active
- **Source:** `context.md` § Escalation Rules (Founder's Rule)

## 2026-08-04 — Launch Blockers Closed

- **Decision:** Confirmed that all P0 launch prerequisites are complete: domain bought, Clerk production live, Stripe live keys + Connect, Resend domain DNS verified, PostHog wired, Twilio + A2P registered, QBO client secret rotated.
- **Source:** Davie, WhatsApp conversation 2026-08-04
- **Status:** Closed

## 2026-08-04 — QBO Secret Risk Closed

- **Decision:** TruffleHog scan ran on 2026-08-04 against full filesystem and git history: zero verified secrets. Prior QBO secret concern was placeholder cleanup, not a real leak.
- **Owner:** OpenClaw
- **Status:** Closed (monitoring weekly)
- **Evidence:** `security/secret-scan-2026-08-04.md`

## 2026-08-04 — TruffleHog Installed Locally

- **Decision:** Install `trufflehog` v3.90.2 binary at `/tmp/trufflehog` for local secret scanning.
- **Owner:** OpenClaw
- **Status:** Done
- **Next:** Schedule weekly cron via `collectly-secret-rotation-auditor`