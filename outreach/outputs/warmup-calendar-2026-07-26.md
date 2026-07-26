# 14-Day Domain Warmup Calendar — getcollectly.app

## Goal
Build sender reputation for `davie@getcollectly.app` so cold emails stop landing in spam.

## Rules
- Send only personal/professional emails. No pitches, no links, no product mentions.
- Recipients must be real people likely to open and reply.
- If any email lands in spam, ask recipient to mark "Not spam" and move to Primary.
- Track sends and replies daily.
- No cold outreach until seed-inbox test passes at end of week 2.

## Daily routine (09:00 EAT)
1. Send warmup emails for the day.
2. Check Zoho inbox for replies.
3. Log replies in `outreach-log.csv`.
4. Run `python3 scripts/check_reply_stats.py`.
5. Run `python3 scripts/generate_daily_digest.py`.

---

## Week 1 — Foundation

### Day 1 — Sun 2026-07-26
- Volume: 3 emails
- Recipients: 3 closest warm contacts
- Subject line examples: "Quick catch up", "Checking in"
- Body: 2–3 sentences, personal question
- Track: opens/replies/placement

### Day 2 — Mon 2026-07-27
- Volume: 3 emails
- Recipients: 3 more warm contacts
- Subject: "Hey [name], quick question"
- Body: short personal ask

### Day 3 — Tue 2026-07-28
- Volume: 4 emails
- Recipients: mix of friends + past colleagues
- Subject: "Quick hello"
- Goal: first replies

### Day 4 — Wed 2026-07-29
- Volume: 4 emails
- Recipients: warm contacts + 1 light professional contact
- Subject: "How's [specific thing]?"

### Day 5 — Thu 2026-07-30
- Volume: 5 emails
- Recipients: expand to LinkedIn contacts you've messaged before
- Body: reference prior conversation

### Day 6 — Fri 2026-07-31
- Rest day. No sends.

### Day 7 — Sat 2026-08-01
- Rest day. No sends.

---

## Week 2 — Ramp

### Day 8 — Sun 2026-08-02
- Volume: 5 emails
- Recipients: warm + 1–2 agency founders you know personally
- Subject: slightly more business but still personal

### Day 9 — Mon 2026-08-03
- Volume: 7 emails
- Recipients: expand network
- Track placement in Gmail/Outlook test accounts

### Day 10 — Tue 2026-08-04
- Volume: 7 emails
- Recipients: include some existing prospects who didn't reply, but still no pitch

### Day 11 — Wed 2026-08-05
- Volume: 8 emails
- Recipients: mostly warm, 1–2 colder professional contacts

### Day 12 — Thu 2026-08-06
- Volume: 8 emails
- Goal: seed-inbox test #2 (send plain + slightly sales-tinged to Gmail/Outlook)

### Day 13 — Fri 2026-08-07
- Analyze results.

### Day 14 — Sat 2026-08-08
- Rest.

---

## Decision gate: Day 12
If seed-inbox test #2 passes (4/4 in Primary/Inbox):
- Resume cold outreach at 5/day with v4 deliverability template.
- Use Resend with `Davie Mugambi <davie@getcollectly.app>`.

If still spam:
- Continue warmup another week.
- Consider Zoho direct SMTP instead of Resend for cold sends.
- Re-evaluate domain reputation with mail-tester.com or GlockApps.
