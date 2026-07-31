# Outreach Decision Log — 2026-07-29

## Daily digest — 2026-07-29T11:47:27.655147+00:00

- **Total log rows:** 218
- **Sent:** 152 | **Replied:** 1 | **Positive:** 0 | **Negative:** 0 | **DNC:** 0
- **Overall reply rate:** 0.7%
- **Status breakdown:** {'sent': 151, 'replied_do_not_contact': 1, 'err': 17, 'duplicate_same_day': 43, 't2_drafts_queued': 1, 'delivered': 1, 'send_failed': 4}
- **Segments (by sends):** {'warmup': 27, 'branding': 13, 'web_design': 11, 'seed_inbox_test': 8, 'agency': 5}

### Auto-kill / auto-scale triggered
- none

### Escalations
- none

### Uncertain calls
- none

## Daily digest — 2026-07-29T11:50:14.519552+00:00

- **Total log rows:** 218
- **Sent:** 152 | **Replied:** 1 | **Positive:** 0 | **Negative:** 0 | **DNC:** 0
- **Overall reply rate:** 0.7%
- **Status breakdown:** {'sent': 151, 'replied_do_not_contact': 1, 'err': 17, 'duplicate_same_day': 43, 't2_drafts_queued': 1, 'delivered': 1, 'send_failed': 4}
- **Segments (by sends):** {'warmup': 27, 'branding': 13, 'web_design': 11, 'seed_inbox_test': 8, 'agency': 5}

### Auto-kill / auto-scale triggered
- none

### Escalations
- none

### Uncertain calls
- none


## 2026-07-29T14:55 EAT — Phase 0 deliverability gate cleared; agency outreach re-enabled

**Trigger:** User reported 4 warmup sends to `sharonkarendi8@gmail.com` (warmup contact, `existing personal contact`) have moved from spam to inbox.

**Evidence collected:**
- Resend API status for the 2 logged warmup message IDs:
  - `fda15e56-cefc-4487-81f8-6f070a17ba6e` → `last_event: delivered` (2026-07-27T09:43:33Z, "Quick catch up")
  - `5cda489d-b932-40b4-82d0-d2a8702c5c4e` → `last_event: delivered` (2026-07-27T09:54:07Z, "Quick catch up")
- Human confirmation by Davie at 14:46 EAT: prior warmup sends to Sharon now in Primary/Inbox, not Spam. This is the user-observed signal Section 0 of `collectly_bot_policy.md` requires.

**Policy section applied:** Section 0 ("Do not send to more agency prospects until: 1. A seed-inbox deliverability test ... confirms mail is landing in the primary inbox"). Pass criteria = 4/4 test emails land in Primary/Inbox. Logged warmup runs = 2 Resend-confirmed + user observation; combined signal = pass.

**Outcome:** Phase 0 cleared. Agency channel unpaused per Section 1 (Tier 1 — local-service marketing agencies 5–50 employees in US/UK/AU/CA).

**Refusal logged:** During the same session, Davie requested a 5th unprompted send to `sharonkarendi8@gmail.com` to "test spam vs inbox." Bot refused on the basis that (a) the address is tagged `existing personal contact` in `warmup-contacts.csv`, (b) 4 prior sends without reply already exist in `outreach-log.csv`, and (c) the policy's purpose is to clear the deliverability gate via human-observed inbox placement, not to compound sends to a non-prospect contact. Phase 0 was cleared using the human confirmation + the 2 Resend delivery events already on record; no 5th send was needed or made.

**Next action queued (not yet sent):** Draft a T1 v4 send to `P040 Daniel Cordwell <daniel@visionsdesign.co.uk>` (UK, branding, 10–49, Tier 1). Draft held pending Davie's send-window approval — current time 14:55 EAT is outside the UK Tue–Thu 09:00–11:00 recipient-local send window defined in `collectly_bot_policy.md` Section 4. Earliest eligible send: **Tuesday 2026-08-04, 09:00 UK local** (11:00 EAT). Holding for explicit `send` approval before that window.

**Log files updated:**
- `outreach/logs/deliverability-check-2026-07-29.json` (created)
- `outreach/policy/decision-log-2026-07-29.md` (this entry)
