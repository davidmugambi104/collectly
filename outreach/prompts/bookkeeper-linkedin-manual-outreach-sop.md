# Bookkeeper LinkedIn Manual Outreach SOP

## Goal
Turn 13 fractional bookkeepers/CFOs into referral partners or early customers for Collectly.

## Channel
LinkedIn manual DMs only. No automation. No connection request spam.

## Daily cap
3–5 bookkeepers per day. Max 5 to avoid LinkedIn flags.

## Sequence

### Step 1: Warmup (optional but recommended)
- Engage with their recent post: like + 1 thoughtful comment.
- Wait 24–48 hours before connection request.

### Step 2: Connection request
- Use the connection note from `bookkeeper-partnership-dm-plan.csv`.
- 1 sentence. No pitch. No link.

### Step 3: First DM (after they accept)
- Use `dm_1` from the plan.
- Short question about whether clients ask them to chase invoices.
- Goal: start conversation, not sell.

### Step 4: Second DM (if no reply after 3–4 days)
- Use `dm_2` from the plan.
- Soft pitch + ask for 10-min call.

### Step 5: No reply after DM 2
- Mark as cold. Do not message again for 90 days.

## Tracking
Log every action to `outreach/data/outreach-log.csv` with:
- `id`: BK001, BK002, ...
- `email`: LinkedIn profile URL
- `touch`: `li_connect`, `li_dm_1`, `li_dm_2`
- `sent_at`: ISO timestamp
- `status`: `sent`, `accepted`, `replied_positive`, `replied_not_interested`, `no_reply`
- `detail`: `bookkeeper_partnership_channel; [name]; [location]`
- `segment`: `bookkeeper`

## Success threshold
- 2+ positive replies / calls booked out of 13 = channel is viable.
- 0–1 = niche or channel is wrong; reassess.

## Safety
- Never send more than 5 LinkedIn actions/day from one account.
- Use real profile. No fake names.
- Stop if LinkedIn shows warning/captcha.
