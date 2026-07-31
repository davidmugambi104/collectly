# Agent 9: Outreach policy

## Tests run (with verbatim output)

### 1. Decision log files (last 5 days)

```
$ ls -la /home/davie/.openclaw/workspace/collectly/outreach/policy/decision-log-*.md
-rw-rw-r-- 1 davie davie 3938 Jul 25 21:01 /home/davie/.openclaw/workspace/collectly/outreach/policy/decision-log-2026-07-25.md
-rw-rw-r-- 1 davie davie  900 Jul 26 21:20 /home/davie/.openclaw/workspace/collectly/outreach/policy/decision-log-2026-07-26.md
-rw-rw-r-- 1 davie davie  592 Jul 27 11:47 /home/davie/.openclaw/workspace/collectly/outreach/policy/decision-log-2026-07-27.md
-rw-rw-r-- 1 davie davie  584 Jul 28 17:15 /home/davie/.openclaw/workspace/collectly/outreach/policy/decision-log-2026-07-28.md
-rw-rw-r-- 1 davie davie 3584 Jul 29 14:54 /home/davie/.openclaw/workspace/collectly/outreach/policy/decision-log-2026-07-29.md
-rw-rw-r-- 1 davie davie  603 Jul 30 11:32 /home/davie/.openclaw/workspace/collectly/outreach/policy/decision-log-2026-07-30.md
-rw-rw-r-- 1 davie davie  603 Jul 31 15:13 /home/davie/.openclaw/workspace/collectly/outreach/policy/decision-log-2026-07-31.md
```

### 2. Most recent decision in decision-log-2026-07-31.md (full quote)

```
# Outreach Decision Log — 2026-07-31

## Daily digest — 2026-07-31T12:13:50.270291+00:00

- **Total log rows:** 227
- **Sent:** 157 | **Replied:** 1 | **Positive:** 0 | **Negative:** 0 | **DNC:** 0
- **Overall reply rate:** 0.6%
- **Status breakdown:** {'sent': 156, 'replied_do_not_contact': 1, 'err': 21, 'duplicate_same_day': 43, 't2_drafts_queued': 1, 'delivered': 1, 'send_failed': 4}
- **Segments (by sends):** {'warmup': 32, 'branding': 15, 'web_design': 13, 'seed_inbox_test': 8, 'agency': 5}

### Auto-kill / auto-scale triggered
- none

### Escalations
- none

### Uncertain calls
- none
```

### 3. Active policy sections from collectly_bot_policy.md

**Current phase (Section 0):**

> **Do not send to more agency prospects until:**
> 1. A seed-inbox deliverability test (send to a Gmail + Outlook account you control, check inbox vs spam/promotions) confirms mail is landing in the primary inbox.
>    - **Pass criteria:** 4/4 test emails land in Primary/Inbox.
>    - **Conditional pass:** 3/4 with 1 in Promotions — fix subject/sender and retest.
>    - **Fail:** 2+ in Spam/Junk/Promotions. Stop outreach. Fix domain/sender/content first.
> 2. The 8-prospect Resend pilot has had 72 hours to produce replies.
>
> **Active tracks right now:**
> - Agency channel: PAUSED (pending deliverability check above)
> - Bookkeeper channel: START, manually, via Resend only (not Gmail — Gmail token is broken and was the channel for the unproven 105)
> - Reply tracking: BUILD NOW (see webhook, delivered alongside this file) — this was the actual bottleneck, not volume

**Daily send cap and logic (Section 0 + Section 4):**

> **Real sending caps (not the generic 30-50/day below — use these until infrastructure changes):**
> - Resend (getcollectly.app): ~15/day while reputation is unproven on a new domain-send pattern; raise after the pilot clears with clean bounce/spam rates
> - Gmail fallback: 0/day and **deprecated as of 2026-07-31** — the `invalid_grant` token has been dead since 2026-07-28 with no working re-auth flow. Do not route new sends or reply-checks through `gog gmail`. The `collectly-daily-outreach-v2` cron was disabled on 2026-07-31 to stop it writing err rows against the dead token.
> - LinkedIn: 5-10/day manual, not automated yet

> - **Volume cap:** 15/day Resend, 0/day Gmail fallback, 5–10/day LinkedIn manual (total across all variants)

### 4. Gmail path status

**Deprecation quote from Section 0:**

> - Gmail fallback: 0/day and **deprecated as of 2026-07-31** — the `invalid_grant` token has been dead since 2026-07-28 with no working re-auth flow. Do not route new sends or reply-checks through `gog gmail`. The `collectly-daily-outreach-v2` cron was disabled on 2026-07-31 to stop it writing err rows against the dead token.

**Scripts still containing `gog` or `gmail` references:**

```
$ grep -rln 'gog\|gmail' /home/davie/.openclaw/workspace/collectly/outreach/scripts/ | head -10
/home/davie/.openclaw/workspace/collectly/outreach/scripts/daily_outreach_v2.py
/home/davie/.openclaw/workspace/collectly/outreach/scripts/check_replies_imap.py
/home/davie/.openclaw/workspace/collectly/outreach/scripts/daily_outreach.py
/home/davie/.openclaw/workspace/collectly/outreach/scripts/send-gmail.py
/home/davie/.openclaw/workspace/collectly/outreach/scripts/send_touch_v2.py
/home/davie/.openclaw/workspacE/collectly/outreach/scripts/poll_replies.py
/home/davie/.openclaw/workspace/collectly/outreach/scripts/send_t1_t2.py
/home/davie/.openclaw/workspace/collectly/outreach/scripts/resend_webhook.py
/home/davie/.openclaw/workspace/collectly/outreach/scripts/__pycache__/run_seed_inbox_test.cpython-312.pyc
```

## Best-practice search findings

- **Gmail app password / IMAP auth issues (2026):** Google continues to tighten IMAP/App Password authentication; `invalid_grant` and `Invalid Credentials (Failure)` errors are commonly caused by revoked or expired app passwords, security events, or Google account policy changes rather than wrong passwords.
  - https://github.com/nextcloud/mail/issues/12268
  - https://email-tools.me/posts/gmail-app-passwords/
  - https://devanswers.net/gmail-and-outlook-issue-your-imap-server-wants-to-alert-you-of-the-following-invalid-credentials-failure/
  - https://discuss.python.org/t/app-password-fails-to-connect-to-imap/75541

- **Outreach ops / governance best practice for SaaS:** emphasizes role-based access, suppression lists, sequence governance, QA audits, and clear escalation rules. A live policy file should be versioned, be the single source of truth, and include kill/scale rules, channel caps, and reply handling.
  - https://handbook.gitlab.com/handbook/marketing/marketing-operations/outreach/
  - https://prospectingmanual.com/engagement-crm/workflows/enterprise-governance/
  - https://www.octavehq.com/post/outreach-governance-admin-controls-scale
  - https://talantir.ai/en/knowledge/sops/clay-outbound-personalization-sop-69c844438f7c4b007056e79e
  - https://prospectingmanual.com/ai-automation/scaling/signals-driven-outbound-at-scale/

## What I found

1. **Policy coherence is mixed.** The active policy (`collectly_bot_policy.md`) is well-structured with phase gates, caps, kill/scale rules, and clear escalation thresholds. However, `outreach-policy.yaml` is **superseded** as of 2026-07-25 and explicitly says "Do not use this file as the active policy." It still sits in the same directory, which creates a stale-source risk.

2. **Contradiction / stale rule:** The superseded YAML still lists `channel_priority: resend via verified domain (getcollectly.app)` then `gmail fallback only if resend is down or unconfigured`. The active MD policy says Gmail fallback is **deprecated at 0/day**. If any script or operator reads the YAML by mistake, it could re-enable a dead channel.

3. **Decision log vs policy mismatch:** The 2026-07-29 log records "Phase 0 deliverability gate cleared; agency outreach re-enabled." But the active policy (2026-07-31-01) says **Agency channel: PAUSED** and "Do not send to more agency prospects until" the deliverability test + 72-hour Resend pilot conditions are met. The 2026-07-31 digest shows `agency: 5` sends, plus `warmup: 32`, `seed_inbox_test: 8`. This suggests agency sends did resume after 07-29, but the policy as of 07-31 re-paused the agency channel. The relationship between the 07-29 clearance and the 07-31 pause is not explained in the logs.

4. **High error/duplicate rate not triggering action:** The 07-31 digest shows `err: 21`, `duplicate_same_day: 43`, `send_failed: 4`. The policy's kill/scale rules are framed around reply rates, not error/dup rates. There is no explicit rule for "stop if duplicates or errors exceed X%." This is a gap.

5. **Gmail deprecated in policy but still present in code.** Nine scripts still reference `gog` or `gmail`. Even if the cron was disabled, the code paths remain and could be invoked manually or by another cron. This is a live risk given the token has been dead since 2026-07-28.

6. **No uncertain calls / escalations recorded:** Last three daily digests report zero escalations and zero uncertain calls. With 21 errors and 43 duplicates on 07-31, it is unlikely there was truly nothing uncertain. This may indicate the bot is not logging near-misses, or the policy does not define what counts as uncertain for operational errors.

## What should change

1. **Archive or delete `outreach-policy.yaml`.** It is superseded and contradicts the active policy on Gmail fallback. Remove stale source of truth.
2. **Add an error/dup/bounce kill rule.** E.g., if `err + send_failed > 10% of attempted sends for 2 consecutive days`, pause the channel and escalate. Right now the policy only watches reply rates.
3. **Clarify Phase 0 state.** Reconcile the 07-29 "gate cleared" entry with the 07-31 "agency channel PAUSED" rule. Add a dated status line explaining why the channel re-paused (e.g., 105 agency sends produced 0 replies, deliverability still unconfirmed).
4. **Gmail cleanup.** Either remove `gog`/`gmail` references from the nine scripts or add prominent deprecation guards that exit early and log. Do not rely only on the cron being disabled.
5. **Enforce reply-source filtering in code, not just policy.** The 2026-07-31 rule to skip `source: "manual_test"` is in the policy; verify the reply-check script actually implements it (not in scope, but recommend agent reviewing `check_replies_imap.py` / `poll_replies.py` confirm).
6. **Log uncertain calls for operational errors.** Add a rule: any day with `err > 0` or `duplicate_same_day > 10` must be listed under Uncertain calls with a brief decision (e.g., "continued because below X% threshold").

## Source / evidence

- `/home/davie/.openclaw/workspace/collectly/outreach/policy/collectly_bot_policy.md` (active policy, version 2026-07-31-01)
- `/home/davie/.openclaw/workspace/collectly/outreach/policy/outreach-policy.yaml` (superseded, dated 2026-07-25-01)
- `/home/davie/.openclaw/workspace/collectly/outreach/policy/decision-log-2026-07-31.md`
- `/home/davie/.openclaw/workspace/collectly/outreach/policy/decision-log-2026-07-30.md`
- `/home/davie/.openclaw/workspace/collectly/outreach/policy/decision-log-2026-07-29.md`
- `grep -rln 'gog\|gmail'` output above
