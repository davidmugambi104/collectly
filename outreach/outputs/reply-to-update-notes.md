# Reply-To Update Notes

## What changed
All outbound scripts now set `Reply-To: davidmugambi104@gmail.com` so replies bypass Zoho (free plan has no IMAP/forwarding) and land directly in Gmail.

## Files updated
1. `collectly/outreach/scripts/daily_send.py` — Resend sends
2. `collectly/outreach/scripts/send_t1_t2.py` — Gmail fallback sends
3. `collectly/outreach/scripts/send-gmail.py` — Gmail sends

## Why this matters
- Zoho free plan supports SMTP sending (works).
- Zoho free plan does NOT support IMAP or email forwarding.
- Replies to `davie@getcollectly.app` would otherwise be trapped in Zoho webmail.
- With `Reply-To: davidmugambi104@gmail.com`, replies are routed to Gmail where the agent can poll via IMAP.

## Next steps
1. Verify DNS for `getcollectly.app` points MX/SPF to Zoho if using Zoho as primary sender.
2. Test a warmup send from Zoho and confirm reply lands in Gmail.
3. Run `poll_replies.py` against Gmail to log replies automatically.
