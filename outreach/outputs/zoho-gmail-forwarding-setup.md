# Forward Zoho Replies to Gmail for Tracking

## Goal
Since Zoho Mail free plan doesn't include IMAP, forward incoming replies from `davie@getcollectly.app` to `davidmugambi104@gmail.com` so the agent can read and track them via Gmail IMAP.

## Step 1: Set up forwarding in Zoho Mail
1. Log into https://mail.zoho.com
2. Settings → Mail Accounts → Email Forwarding
3. Add forwarding address: `davidmugambi104@gmail.com`
4. Zoho will send a verification code to Gmail
5. Enter verification code in Zoho
6. Enable forwarding

## Step 2: Configure forwarding rule
- Forward **all emails** OR
- Forward only emails matching specific senders (if you want to filter)

For Collectly, forward all so we catch all replies.

## Step 3: Test
1. Send an email to `davie@getcollectly.app` from another account
2. Verify it appears in `davidmugambi104@gmail.com` within 1–2 minutes

## Step 4: Agent can now read replies via Gmail IMAP
The agent already has Gmail credentials. Once replies land in Gmail, we can run `poll_replies.py` against Gmail to log replies.

## Note
- Outgoing warmup sends still go through Zoho SMTP (works, tested).
- Incoming replies are forwarded to Gmail for tracking.
- This avoids paying for Zoho IMAP.
