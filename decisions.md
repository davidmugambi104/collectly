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
## 2026-09-11 — Stop sending to guessed role addresses; list rebuilt

- **Decision:** Role/generic addresses (`hello@`, `info@`, `contact@`, `admin@`,
  `support@`, `sales@`, …) are no longer a valid prospect. 198 were moved out of
  tiers 1–3 to `tier=quarantined_role_address`, and the 38 addresses that had
  bounced inside the live 7-day Resend window without ever reaching the
  suppression list were suppressed.
- **Approver:** Davie, 2026-09-11 — asked Claude to own outreach *strategy*
  while OpenClaw keeps execution; sends remain gated on Davie's approval.
- **Why:** Bounce rate was 34.2% (52/152 over 7d), 6.8× the 5% policy threshold,
  and the gate had been in `pullback` for 8 days. 65% of the pool (253/385) was
  guessed role addresses; 37 of the 38 unsuppressed bounces were role addresses;
  the most recent batch on 2026-09-10 was still sending to `hello@`/`info@`
  eight days into a crisis those addresses caused. The loop was not
  self-correcting because nothing in `pick_prospects()` filters on address
  shape — it checks tier, presence of an email, suppression and a 14-day
  cooldown, and a guessed address passes all four.
- **Effect:** genuinely sendable pool is **112**, not 385. Zero role addresses
  remain in tiers 1–3.
- **Standing rule:** an address is only sendable if it belongs to a named person.
  Pattern-guessed addresses may be *collected*, but must sit in
  `quarantined_role_address` until verified against a real individual.

## 2026-09-11 — Cold-email experiment declared dead, not restarted

- **Decision:** Stop running the A/B/C/D subject-line matrix. Do not start a new
  copy test until the list is rebuilt and the bounce rate is back under 5%.
- **Why:** 313 sends produced 1 reply (0.32%). All four variants are past the
  50-send kill threshold. The result is not evidence that the copy is bad —
  with two-thirds of the list undeliverable there was never enough signal for
  the test to measure anything. Testing message wording against addresses that
  do not exist burns domain reputation to learn nothing.
- **Next:** rebuild the list against named contacts, re-establish deliverability,
  then test copy on a list that can actually receive it.

## 2026-09-11 — Sends held to zero until the Hunter reset (2026-09-20)

- **Decision:** `daily_send_cap` set to **0** via `task_runner.py set-cap 0 --yes`.
  No outbound cold email until 2026-09-20 at the earliest. The v5 sequence
  (`outreach/messages/t1-v5-restart.md`) starts its ramp after that date, not
  before.
- **Approver:** Davie, 2026-09-11 ("start the ramp after the hunter reset").
- **Why the cap and not the gate:** the gate recomputes itself from live bounce
  data on every run. As the Sept 2–10 bounces age out of the rolling 7-day
  window, bounce rate falls, the gate flips `pullback` → `allow`, and sends
  resume on their own — the opposite of what was asked for. `task_runner.py`
  uses `effective_cap = min(daily_send_cap, gate_cap())`, so a configured cap
  of 0 is stricter than any gate state and survives the recomputation.
  Verified against all three gate caps (100/30/0): first send blocked in each.
- **Side effect, and it is the point:** nine days of zero sends empties the
  rolling 7-day bounce window. Bounce rate is computed over sends in that
  window, so with no sends the denominator and numerator both go to zero and
  the metric resets rather than decays. Deliverability recovery here is a
  function of *time not sending*, which is why holding costs nothing.
- **To resume:** `python3 outreach/scripts/task_runner.py set-cap 5 --yes`
  — 5, not 100. The v5 ramp is 5 → 8 → 12 → 15 over ten days; the old default
  of 100 was never a sane starting point after a 34% bounce rate.

**Before the first v5 batch, in order:**
1. Reconcile `suppression.csv` against the live Resend bounce list.
2. Confirm the 7-day bounce rate and that the gate reads `allow`.
3. Segment the 112 on `first_name != ""` — 65 have no first name and the
   sender substitutes an empty string, so a `Hi {{first_name}},` template
   renders `Hi ,` for them. v5 bodies anchor on `{{company}}` to avoid this.
4. Set the cap to 5.
