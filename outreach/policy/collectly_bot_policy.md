# Collectly Outreach Bot — Decision Policy
Purpose: this file is the bot's brain for every decision it currently stops to ask about. If it's about to ask a question, the answer should already be here. If it genuinely isn't here, it logs the gap and makes the *closest reasonable call itself* — it does not wait.

**STATUS AS OF THIS VERSION: pre-signal.** 105 agency sends produced 0 meaningful replies and 0 unsubscribes — deliverability is unconfirmed, not just messaging. Do not treat the experiment matrix below as active until Phase 0 is cleared. See Section 0.

**Version:** 2026-07-25-02

---

## 0. CURRENT PHASE — READ FIRST

**Do not send to more agency prospects until:**
1. A seed-inbox deliverability test (send to a Gmail + Outlook account you control, check inbox vs spam/promotions) confirms mail is landing in the primary inbox.
   - **Pass criteria:** 4/4 test emails land in Primary/Inbox.
   - **Conditional pass:** 3/4 with 1 in Promotions — fix subject/sender and retest.
   - **Fail:** 2+ in Spam/Junk/Promotions. Stop outreach. Fix domain/sender/content first.
2. The 8-prospect Resend pilot has had 72 hours to produce replies.

**Active tracks right now:**
- Agency channel: PAUSED (pending deliverability check above)
- Bookkeeper channel: START, manually, via Resend only (not Gmail — Gmail token is broken and was the channel for the unproven 105)
- Reply tracking: BUILD NOW (see webhook, delivered alongside this file) — this was the actual bottleneck, not volume

**Enrichment failure pivot rule:** if Apollo/Hunter return 403/429 or no emails, do not stall. Either (a) pivot to LinkedIn manual outreach if the target is high-value and within daily cap, or (b) proceed to the next active track (deliverability test, reply tracking, asset build). Never wait on enrichment.

**Hung process rule:** if a build/typecheck/test command produces no output for >120 seconds on WSL, kill it and report. Do not let processes hang indefinitely. Validate via smaller checks instead.

**Real sending caps (not the generic 30-50/day below — use these until infrastructure changes):**
- Resend (getcollectly.app): 100/day (raised from 15 on 2026-08-01 by founder override); monitor bounce/spam rate, pull back to 30 if either crosses 5%
- Gmail fallback: 0/day until `invalid_grant` is fixed — do not route new sends here
- LinkedIn: 5-10/day manual, not automated yet

---

## 1. WHO TO CONTACT (ICP — no asking, just filter)

**Tier 1 — send immediately, no confirmation needed:**
- Local-service marketing agencies (5–50 employees) in US/UK/AU/CA
- Fractional bookkeepers / bookkeeping firms serving multiple SMB clients
- Must show evidence of >5 active clients (agency site, LinkedIn "clients we serve" page, or Clutch/agency directory listing)

**Tier 2 — send, lower priority, half the daily volume allocation:**
- Solo B2B service founders (consultants, agencies <5 people) who'd use Collectly directly rather than as a partner channel

**Auto-reject, do not send:**
- B2C businesses
- Enterprise (>200 employees) — sales cycle mismatch for a solo founder
- Companies without any online presence to verify against

---

## 2. EXPERIMENT MATRIX (what to test instead of asking "which angle?")

Run these in parallel, track independently, don't wait for permission between them:

**Subject lines (rotate evenly across sends):**
- A: "Quick question about [Company]'s client AR follow-up"
- B: "How [Agency Name] could offer this to clients"
- C: "Chasing invoices for your clients yet?"
- D: "[First name] — 5 min on AR automation for your clients"

**Opening hooks (pair randomly with subject lines):**
- H1: Pain-first — "Most agencies I talk to have a client asking 'can you also chase invoices' at some point."
- H2: Partner-economics-first — "Collectly has a referral/white-label angle for agencies — wanted to see if it's relevant to how you work with clients."

**Niches (split volume evenly unless kill rule triggers):**
- N1: Local-service marketing agencies
- N2: Fractional bookkeepers

= 16 combinations. Bot rotates through all of them evenly across daily sends. No approval needed per combination.

---

## 3. KILL / SCALE RULES (the actual "scaling judgment," pre-decided)

- Any subject/hook/niche combo with **<2% reply rate after 50 sends** → auto-paused, logged, not sent again without manual review.
- Any combo with **>8% reply rate after 30 sends** → triple its share of daily volume immediately, no confirmation.
- Any niche (N1/N2) that hits **statistical lead** (≥2x reply rate of the other after 100 sends each) → shift 70% of volume to the winner, keep 30% on the loser to avoid false positives from small samples.
- Re-evaluate every 7 days. Bot reports the numbers; it does not ask what to do about them unless a rule above doesn't clearly apply.

---

## 4. DAILY OPERATING RULES (no asking, just execute)

- **Volume cap:** 100/day Resend, 0/day Gmail fallback, 5–10/day LinkedIn manual (total across all variants) — raised from 15 on 2026-08-01; pull back to 30 if bounce/spam crosses 5%
- **Send window:** 8am–11am recipient local time, Tue–Thu only (best B2B reply rates, avoid Mon/Fri)
- **Follow-up cadence:** 3 touches total. Touch 2 at day+4 (different angle, not "just following up"), touch 3 at day+9 (short breakup email). Then stop — mark as cold, don't re-add for 90 days.
- **Reply categorization (bot decides, doesn't ask):**
  - Positive/interested → flag URGENT, notify you immediately, draft reply for your approval
  - Question/objection → bot drafts a reply using the FAQ bank below, sends only after you approve the *first 5* of any new objection type, then autonomous after that
  - Negative/unsubscribe → auto-remove, no notification needed
  - Auto-reply/OOO → auto-reschedule follow-up +7 days, no notification

---

## 5. ESCALATE TO YOU — ONLY these cases (everything else, don't ask)

- A reply mentions legal threats, GDPR/compliance complaints, or press/media
- A recipient is flagged as a named target account (VIP list — currently empty, add names here as needed)
- A new objection type appears that isn't in the FAQ bank (bot logs it, drafts a suggested answer, waits for one-time approval, then adds it to the bank permanently)
- Deliverability drops >20% week-over-week (bounce/spam signal)
- Enrichment APIs are exhausted and no alternative path exists after trying Apollo + Hunter + one manual source
- A process hangs for >120 seconds with no output on WSL

Everything else: act, log, move on.

---

## 6. FAQ / OBJECTION BANK (starts empty — fill in as real objections come in)

| Objection | Approved response | Status |
|---|---|---|
| (none yet — bot logs new ones here for one-time approval) | | |

---

## 7. DAILY DIGEST FORMAT (replaces live questions)

Bot sends one summary/day, not mid-run pings:
- Sends today: X | Replies: X | Positive: X
- Current leaderboard: top 3 combos by reply rate
- Any auto-kills or auto-scales triggered today
- Anything escalated per Section 5
- Anything it wasn't sure about — logged here, decided anyway, flagged for your optional review

---

**Rule for the bot itself:** if you're about to generate a question for the founder, check this file first. If the answer isn't here, make the closest reasonable decision using Section 1–4 as precedent, log it under "uncertain calls" in the daily digest, and continue. Do not pause execution to ask.

---

## 8. SCHEDULE OVERRIDE — 2026-08-01 (Davie, explicit)

**Effective immediately and until further notice:**

- **No rest days.** Bot sends daily, every day, no exceptions.
- **No recipient-time-window gating.** Send at any hour that is operationally convenient; recipient-local time optimization is suspended.
- **No "ask first" before sending.** Bot picks the next eligible Tier 1/Tier 2 prospect, generates the email, and sends. Logs the decision; does not ask permission.
- **Per-day cap: 100/day Resend** (raised 2026-08-01 from 15; founder explicit instruction). Pull-back trigger: bounce rate or spam placement > 5% over rolling 7 days → revert to 30 and notify.
- **Gmail fallback remains at 0/day** (Gmail token broken, still).
- All other Section 0–7 rules still apply (ICP filtering, kill/scale, escalation list, FAQ bank, daily digest format).

**Logged by:** Davie, 2026-08-01 11:20 EAT. Decision basis: founder override, daily cadence requested. Re-evaluate at next policy review.
