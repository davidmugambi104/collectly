# Zoho SMTP/IMAP Setup Instructions

## Goal
Let the agent send and read emails from `davie@getcollectly.app` via Zoho Mail.

## Step 1: Enable IMAP in Zoho Mail
1. Log into https://mail.zoho.com
2. Settings → Mail Accounts → IMAP Access
3. Enable IMAP
4. Note the IMAP server: `imap.zoho.com:993` (SSL)

## Step 2: Enable SMTP in Zoho Mail
1. Settings → Mail Accounts → SMTP
2. Enable SMTP
3. Note the SMTP server: `smtp.zoho.com:465` (SSL) or `587` (TLS)

## Step 3: Create app-specific password
1. Go to https://accounts.zoho.com → Security → App Passwords
2. Generate app password for "Mail Agent" or similar
3. Copy the password (it shows once)

## Step 4: Share credentials with agent
Send the agent:
- Zoho username: `davie@getcollectly.app`
- App password
- Confirm IMAP/SMTP enabled

The agent will save these to `.env.local` as:
```
ZOHO_USER="davie@getcollectly.app"
ZOHO_APP_PASSWORD="..."
ZOHO_IMAP_SERVER="imap.zoho.com"
ZOHO_SMTP_SERVER="smtp.zoho.com"
```

## Step 5: Update DNS
Point MX + SPF to Zoho if not already done:
- MX: `10 mx.zoho.com`, `20 mx2.zoho.com`, `50 mx3.zoho.com`
- SPF: `v=spf1 include:zoho.com ~all`

This is required for Zoho sending reputation.

## Step 6: Agent verifies
Agent will test SMTP send + IMAP read from a small script.
