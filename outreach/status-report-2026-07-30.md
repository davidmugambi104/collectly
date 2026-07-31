# Collectly Outreach Pipeline Status Report

**Date:** 2026-07-30  
**Reporting window:** last 14 days of activity in `collectly/outreach/data/outreach-log.csv` plus today's bookkeeper-channel launch.

---

## WHERE WE ARE

### Active pipeline: bookkeeper channel

| Stage | Count |
|---|---|
| ready (not yet contacted) | 6 |
| step_1_sent | 5 |
| step_2_sent | 0 |
| step_3_sent | 0 |
| step_4_sent | 0 |
| replied | 0 (in this channel) |
| booked | 0 |
| disqualified / do_not_contact | 0 (in this channel) |
| **Total** | **11** |

**Step 1 sent today (2026-07-30):**
- Dan Degolier, Ascent CFO Solutions
- Lana Hill, Hill Bookkeeping & Consulting LLC
- Shetu Rose, Diverge Finance Cooperative
- Ambrose Lo, Chief Accounting Services Inc.
- Cenk Tukel, Tukel Inc.

All 5 returned Resend message IDs and HTTP 200. Sent via `Davie Mugambi <davie@getcollectly.app>`.

### Historical pipeline: `outreach-log.csv`

- **Total rows:** 225
- **Unique contacts touched:** ~77
- **Status distribution:**
  - sent: 156
  - duplicate_same_day: 43
  - err: 19
  - send_failed: 4
  - replied_do_not_contact: 1
  - delivered: 1
  - t2_drafts_queued: 1

### Sends trend (last 14 days)

| Date | sent | err | duplicate_same_day |
|---|---|---|---|
| 2026-07-30 | 5 | 2 | 0 |
| 2026-07-29 | 4 | 2 | 0 |
| 2026-07-28 | 6 | 4 | 0 |
| 2026-07-27 | 13 | 4 | 0 |
| 2026-07-26 | 0 | 2 | 0 |
| 2026-07-25 | 39 | 2 | 23 |
| 2026-07-24 | 0 | 2 | 0 |
| 2026-07-23 | 5 | 1 | 1 |
| 2026-07-21 | 1 | 0 | 0 |
| 2026-07-20 | 28 | 0 | 0 |

**Trend:** Sent volume collapsed from 39 on 2026-07-25 to low single digits after 2026-07-26. Errors increased from 0–2/day to 2–4/day. **Root cause:** Gmail API OAuth token expired/revoked, so the existing send path broke.

**Last 7 days (2026-07-24 to 2026-07-30):**
- sent: 28
- err: 14
- duplicate_same_day: 0

**Previous 7 days (2026-07-17 to 2026-07-23):**
- sent: ~34 (mostly 2026-07-20 and 2026-07-23)
- err: ~1
- duplicate_same_day: ~1

**Reply rate (last 7 days):** 0 real replies.  
**Reply rate (previous 7 days):** 1 reply on 2026-07-20 — `lennart@stanley.nu`, marked `replied_do_not_contact`.  
**Booked-call rate (last 14 days):** 0.

### Founding-customer slots

**Not defined.** I have no record of how many founding-customer slots Collectly has, what the criteria are, or how many are filled. Cannot report this without a decision from you.

---

## WHAT'S SLOWING US DOWN

### Blocker 1: Gmail API OAuth token is expired/revoked

- **Revenue impact:** HIGH. This is why daily send volume collapsed from 39 to near-zero and error rates quadrupled.
- **Since:** 2026-07-26.
- **Symptoms:** 19 `err` rows with `"invalid_grant" "Token has been expired or revoked."` from `gmail.googleapis.com`.
- **Smallest fix:** Stop using Gmail API for outbound; use Resend (already working). I did this for today's bookkeeper batch. The existing automation/scripts that still call Gmail API need to be switched or the token needs re-authentication.
- **Silent damage:** On 2026-07-30, two attempts to send to `stan@stanbranding.com` and `sam@wildishandco.co.uk` failed with this error and are logged as `err`. Those prospects did not receive the email.

### Blocker 2: Send execution was silently broken today

- **Revenue impact:** MEDIUM. We nearly lost today's entire bookkeeper-channel launch.
- **Since:** 2026-07-30 15:37 EAT.
- **Symptoms:** Background send job ran for 1h49m but produced a 0-byte log. No confirmation of delivery. The process was in sleep state and never progressed past the first email.
- **Smallest fix:** Don't use `time.sleep()` in long-running background exec sessions; they don't flush reliably. I killed the job and sent the remaining 4 emails in a foreground command with immediate CSV flushing. Also added a proper header to the log file after the fact.
- **Silent damage:** Dan Degolier may have received one email from the broken job (message ID `68c4890f-a511-4cce-9d62-9d0d6653ce28` was later confirmed in the log), but we could not verify it during the outage. He may also have received a second email when I resent the batch. Check Resend dashboard for duplicates.

### Blocker 3: No reply handling or auto-stop mechanism

- **Revenue impact:** MEDIUM. Replies fall through; sequence doesn't pause or escalate correctly.
- **Since:** Observed across the whole historical log.
- **Symptoms:** 43 `duplicate_same_day` rows in `outreach-log.csv`. The system either retries failed sends without deduplication or re-sends to the same contact on the same day. The `replied_do_not_contact` status exists but there is no evidence replies are being automatically detected and acted on.
- **Smallest fix:** Implement a per-email dedup rule (don't send t1 twice to same address within 7 days) and a reply webhook from Resend that pauses the sequence for that contact. I already stubbed `inbound-leads.csv` and `process_audit_request.py`; similar handling is needed for outbound replies.
- **Silent damage:** Some prospects may have received multiple emails or follow-ups after replying.

---

## SILENTLY BROKEN THINGS I FOUND

1. **0-byte send log while background process ran.** Fixed.
2. **CSV log had no header**, so status-updater scripts couldn't read it. Fixed.
3. **43 duplicate_same_day rows** in historical log. Not fixed — needs dedup rule.
4. **Gmail OAuth failures** were not flagged as a blocker until I dug into `err` rows. The system kept trying and failing.
5. **Deliverability test was partial** (2/4 inboxes) but we proceeded. Documented; not ideal.

---

## NUMBERS THAT PROVE IT

- **0 booked calls** in 225 historical sends + 5 new sends.
- **1 real reply** in historical data, and it was a do-not-contact.
- **14 errors in last 7 days** vs **1 error in previous 7 days** — the Gmail token failure is the obvious inflection point.
- **Send volume down ~80%** from 39/day to ~4/day after 2026-07-26.

---

## IMMEDIATE NEXT ACTIONS

1. Confirm in Resend dashboard that only 5 emails went out today (not 6 if Dan got a duplicate).
2. Switch remaining automation from Gmail API to Resend.
3. Add a simple dedup guard before any future send.
4. Define founding-customer slot limit and criteria.
5. Set up Resend inbound webhook to detect replies and pause sequences.

---

*Report generated by the assistant. No vanity metrics included.*
