# Collectly Infrastructure Unblock Brief

## 1. Resend (Primary Email Provider) — KEY VALID, PLAN BLOCKED

**Status 2026-07-24 19:05:**
- New API key works: HTTP 200 on `/api-keys` and `/domains`.
- Domain `getcollectly.app` is already verified (status: `verified`, sending enabled).
- **Outbound to non-owner still returns 403** with message: "You can only send testing emails to your own email address (`davidmugambi104@gmail.com`)."
- Test to account owner succeeded. Test to `test-bounce@resend.dev` failed with `error code: 1010`.

**Root cause:** Resend free plan is in test mode; arbitrary outbound sending requires Pro.

### Your 60-second action
Pick one:

**Option A — Upgrade Resend Pro (recommended, fastest)**
1. Go to https://resend.com/pricing and upgrade to Pro ($20/mo, 50k emails).
2. No DNS changes needed — domain is already verified.
3. I will immediately dispatch:
   - 23 queued T2 follow-ups
   - 17 new T1 cold emails

**Option B — Gmail fallback (zero extra cost)**
1. Open https://myaccount.google.com/apppasswords for a Gmail/Google Workspace account.
2. Generate App Password.
3. Save:
   ```bash
   echo 'your@gmail.com' > /home/davie/.openclaw/secrets/collectly/GMAIL_USER
   echo 'xxxx xxxx xxxx xxxx' > /home/davie/.openclaw/secrets/collectly/GMAIL_APP_PASSWORD
   ```
4. I will route sends through Gmail until you upgrade Resend.

### Current send queues
- 23 T2 follow-ups: `collectly/outreach/outputs/t2-drafts-2026-07-24T1524.csv`
- 17 new T1 cold emails: `collectly/outreach/outputs/t1-drafts-2026-07-24T1558.csv`

Both are loaded and ready to fire the moment outbound sending is unblocked.

---

## 1. Resend (Primary Email Provider) — KEY VALID, FREE PLAN BLOCKED

**Status 2026-07-24 19:15:**
- New API key works: HTTP 200 on `/api-keys` and `/domains`.
- Domain `getcollectly.app` is verified.
- Free plan prevents outbound to non-owner; requires Pro for production sends.
- **Mitigation:** Using Gmail app-password fallback until Resend is upgraded.
- 23 T2 follow-ups + 17 T1 cold emails already sent via Gmail fallback.

### Recommended action when ready
Upgrade to Resend Pro ($20/mo) at https://resend.com/pricing for branded sending from `davie@getcollectly.app` and better deliverability.

## 2. Gmail SMTP (Fallback / Active)

**Status 2026-07-24 19:15:** ACTIVE.
- App password configured for `davidmugambi104@gmail.com`.
- 40 emails sent successfully (23 T2 + 17 T1).
- Logs in `collectly/outreach/data/outreach-log.csv`.

### Send queues dispatched
- ✅ T2: 23 follow-ups from `outputs/t2-drafts-2026-07-24T1524.csv`
- ✅ T1: 17 cold emails from `outputs/t1-drafts-2026-07-24T1558.csv`

### Note
Gmail fallback sends from `davidmugambi104@gmail.com`. Works as bridge, but branded `getcollectly.app` domain is preferable for trust/deliverability.


---

## 3. Hunter (Email Finder) — Low Credits

**Status:** Free plan, 2 searches left this month, then rate-limited.

### Options
A. Upgrade to Hunter Starter ($49/mo) at https://hunter.io/pricing — gives 500 searches/mo.
B. Switch to Apollo paid enrichment (needs paid plan).
C. Manual founder email lookup via LinkedIn + company website contact pages.

### Your 60-second action
Pick A or B. If A:
```bash
echo 'new_hunter_api_key' > /home/davie/.openclaw/secrets/collectly/HUNTER_API_KEY
```

---

## 4. Apollo (List Source) — Search API Inaccessible

**Status:** People Search API not on free plan.

### Your 60-second action
- Upgrade Apollo to any paid plan at https://www.apollo.io/pricing, or
- Skip Apollo for now — I will keep building lists via public directory research.

---

## 5. Twilio (SMS Dunning)

**Status:** Account SID / auth token / from number are placeholders in secrets.

### Your 60-second action
1. Buy/verify a US number at https://console.twilio.com.
2. Update:
   ```bash
   echo 'ACxxxxxxxx' > /home/davie/.openclaw/secrets/collectly/TWILIO_ACCOUNT_SID
   echo 'yyyyyyyy' > /home/davie/.openclaw/secrets/collectly/TWILIO_AUTH_TOKEN
   echo '+1xxxxxxxxxx' > /home/davie/.openclaw/secrets/collectly/TWILIO_FROM_NUMBER
   ```

---

## Summary Priority
1. **Resend API key + domain verification** — unblocks email sending (highest impact).
2. **Hunter upgrade** — unblocks bulk email enrichment.
3. **Twilio number** — enables SMS dunning.
4. **Apollo upgrade** — optional, list research already proceeding without it.
