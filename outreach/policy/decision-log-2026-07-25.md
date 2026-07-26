# Outreach Decision Log — 2026-07-25

## Decisions made today
1. Sent 8-email v2-opener pilot via Resend to P050/P051/P052/P041/P043/P045/P046/P048. Reason: previous 35 sends had 0 meaningful replies; deliverability was ruled out (scan.mx A/97); this isolates message performance on a narrow ICP.
2. Converted the 8-prospect A/B draft into a single-message pilot (all v2 opener). Reason: Apollo free search was blocked, so we couldn't expand the list cheaply; testing one clean angle beats a statistically weak A/B.
3. Did not bulk-expand prospect list via paid Apollo. Reason: $0 budget constraint and Apollo mixed_people/search returned 403 on free plan.
4. Created LinkedIn warmup plan for the same 8 pilot prospects. Reason: if email returns 0, we test channel next without losing time.
5. Identified 13 fractional bookkeeper/controller targets. Reason: bookkeeper/partner channel test for parallel validation.
6. Created `/tools/ar-cost-calculator` lead magnet page. Reason: compounding asset that qualifies visitors and captures emails independent of outreach replies.
7. Did not send LinkedIn DMs. Reason: policy requires explicit approval for outbound messages on third-party platforms (external communication + potential automation-policy risk on LinkedIn).
8. Killed long-running Next.js build/typecheck processes. Reason: resource constraints on WSL host; files were structurally validated against existing working patterns instead.
9. Updated `outreach-log.csv` schema with `delivered_at`, `bounced_at`, `opened_at`, `clicked_at`, `reply_snippet` columns. Reason: reply tracking was the actual bottleneck, not volume; needed columns for webhook + IMAP poller.
10. Verified reply tracking pipeline with `scripts/test_reply_tracking.py`. Reason: ensure webhook events and human reply matching update the log correctly before deployment.
11. Attempted Apollo bulk_match and Hunter domain search to find bookkeeper emails. Result: Apollo returned 403 (free tier blocked), Hunter returned 429 (rate-limited/credits exhausted). Decision: cannot autonomously enrich bookkeeper emails right now; will start seed-inbox deliverability test instead.
12. Paused new agency sends. Reason: policy Phase 0 requires seed-inbox deliverability test before more agency outreach.
13. Created seed-inbox deliverability test plan. Reason: next active track per policy; need to confirm Resend mail lands in Gmail/Outlook primary inbox before scaling.

## Escalations (none today)
- none

## Policy updates needed
- Add rule for handling long-running build/typecheck processes in resource-constrained environments.
- Add rule for when to stop a hung process vs wait.
- Add rule for seed-inbox deliverability test cadence and pass/fail criteria.
- Add rule for handling enrichment API failures (403/429) without stalling — pivot to next active track.
## Daily digest — 2026-07-25T10:35:05.923706+00:00

- **Total log rows:** 153
- **Sent:** 105 | **Replied:** 1 | **Positive:** 0 | **Negative:** 0 | **DNC:** 0
- **Overall reply rate:** 1.0%
- **Status breakdown:** {'sent': 104, 'replied_do_not_contact': 1, 'err': 3, 'duplicate_same_day': 43, 't2_drafts_queued': 1, 'delivered': 1}
- **Segments (by sends):** {'branding': 6, 'agency': 5, 'web_design': 4, 'digital_marketing': 3, 'unclear': 1}

### Auto-kill / auto-scale triggered
- none

### Escalations
- none

### Uncertain calls
- none

## Daily digest — 2026-07-25T18:01:28.761837+00:00

- **Total log rows:** 159
- **Sent:** 109 | **Replied:** 1 | **Positive:** 0 | **Negative:** 0 | **DNC:** 0
- **Overall reply rate:** 0.9%
- **Status breakdown:** {'sent': 108, 'replied_do_not_contact': 1, 'err': 5, 'duplicate_same_day': 43, 't2_drafts_queued': 1, 'delivered': 1}
- **Segments (by sends):** {'branding': 7, 'agency': 5, 'web_design': 5, 'seed_inbox_test': 4, 'digital_marketing': 3}

### Auto-kill / auto-scale triggered
- none

### Escalations
- none

### Uncertain calls
- none

