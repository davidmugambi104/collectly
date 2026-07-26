# Seed Inbox Deliverability Test Plan

## Goal
Confirm that emails sent via Resend from `noreply@getcollectly.app` land in the **Primary** inbox of Gmail and Outlook test accounts — not Promotions, Spam, or Junk.

## Why this matters
105 previous sends produced 0 meaningful replies and 0 unsubscribes. Two possible explanations:
1. Message/targeting is wrong.
2. Emails are not reaching the primary inbox.

Before sending to more prospects, we need to rule out #2.

## Test accounts needed
- 1 Gmail account (personal or dedicated test)
- 1 Outlook / Microsoft 365 account (personal or dedicated test)

Davie must provide these or run the test himself if he does not want to share credentials.

## Test messages to send
Send 2 variants to each provider, 1 message each:

1. **Plain text, v2 opener style**
   - From: `Collectly <noreply@getcollectly.app>`
   - Subject: `Quick QBO collections question for [FirstName]`
   - Body: same as pilot v2 opener, with working unsubscribe token

2. **Partner-economics angle** (test for bookkeeper channel)
   - From: `Collectly <noreply@getcollectly.app>`
   - Subject: `How [Test Account] could offer this to clients`
   - Body: short founder-to-founder message about referral/white-label angle

## Steps
1. Create or identify test accounts.
2. Send 4 test emails total (2 to Gmail, 2 to Outlook) via Resend using `scripts/send_t1_t2.py` or a small ad-hoc script.
3. Wait 5–10 minutes.
4. Check inbox placement:
   - Gmail: Primary vs Promotions vs Spam
   - Outlook: Inbox vs Junk / Other
5. Screenshot or record placement for each.
6. If all 4 land in Primary/Inbox: deliverability is confirmed, agency channel can resume.
7. If any land in Spam/Junk/Promotions: diagnose (subject, sender name, domain warmup, content) and fix before sending more.

## Pass/fail criteria
- **Pass**: 4/4 in Primary/Inbox.
- **Conditional pass**: 3/4 in Primary/Inbox, 1 in Promotions (fix subject/sender and retest).
- **Fail**: 2 or more in Spam/Junk/Promotions. Stop outreach. Fix domain/sender/content first.

## Automation note
This is a one-time manual test. Do not automate it — we need human eyes on inbox placement, not open/click tracking.
