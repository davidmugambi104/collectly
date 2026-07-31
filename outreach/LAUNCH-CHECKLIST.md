# Collectly Launch — Key Acquisition Checklist

**For:** Davie
**When:** Tomorrow morning, after reading the 09:00 EAT tier-1 reply data
**Time budget:** 30-45 min total

---

## What's already wired (don't touch)

- ✅ CLERK (auth) — works
- ✅ RESEND (email) — 5 sends went out today, working
- ✅ STRIPE (test mode) — webhook secret set
- ✅ QBO_CLIENT_ID + QBO_CLIENT_SECRET + QBO_REDIRECT_URI — QuickBooks OAuth ready
- ✅ XERO_CLIENT_SECRET + XERO_REDIRECT_URI — Xero OAuth half-set
- ✅ PLAID — for bank linking, working
- ✅ SQUARE — for payments, working
- ✅ GEMINI_API_KEY — AI features working
- ✅ DATABASE_URL — Postgres live on 143.244.146.21
- ✅ APOLLO_API_KEY + HUNTER_API_KEY — outreach enrichment (just added)

**The app can launch with what you have.** Everything below is improvement, not blocker.

---

## Tier 1: Required for production with real customers (do these)

### Twilio (SMS dunning) — 10 min
**Why:** SMS dunning is half the product. Email-only cuts response rate by ~30% per 2025 benchmarks.

1. Go to **https://console.twilio.com/** and sign up
2. Verify your phone (they SMS you a code)
3. On the Console dashboard, copy:
   - **Account SID** (starts with `AC...`)
   - **Auth Token** (click "Show")
4. Get a phone number: **Phone Numbers → Manage → Buy a number** (US: $1.15/mo, or use the free trial number)
5. Drop the 3 values into the secrets file:
   ```bash
   cat > /home/davie/.openclaw/secrets/collectly/TWILIO_CREDS << 'EOF'
   TWILIO_ACCOUNT_SID=ACxxxxx
   TWILIO_AUTH_TOKEN=***
   TWILIO_FROM_NUMBER=+1xxxxxxxxxx
   EOF
   chmod 600 /home/davie/.openclaw/secrets/collectly/TWILIO_CREDS
   ```
6. Ping me. I add to `.env.local`, send you a test SMS to your phone.

### Stripe Connect (customer pays Collectly) — 15 min
**Why:** Without this, customers can't pay you through the platform. Email + QBO are configured but money doesn't flow.

1. Go to **https://dashboard.stripe.com/connect/overview**
2. Click "Create application" or "Get started with Connect"
3. Fill in business details (sole proprietor / individual works)
4. Copy the **Client ID** (starts with `ca_...`)
5. Add to `.env.local`: `STRIPE_CONNECT_CLIENT_ID="ca_..."`
6. Configure redirect URIs in Stripe dashboard: `https://getcollectly.app/api/stripe-connect/callback`

---

## Tier 2: Quality-of-life improvements (do this week if time)

### Upstash Redis (rate limiting, caching) — 5 min, free
**Why:** Currently the rate limiter is broken (no Redis = no rate limit = can be abused).

1. Go to **https://console.upstash.com/** and sign up (Google sign-in works)
2. Click "Create Database"
3. Pick the free tier (10k commands/day)
4. Pick region close to your Vercel deployment
5. Copy **REST URL** and **REST Token**
6. Add to `.env.local`:
   ```
   UPSTASH_REDIS_REST_URL="https://..."
   UPSTASH_REDIS_REST_TOKEN="***"
   ```

### Xero (for the Xero-using half of the market) — 5 min
**Why:** You have the secret but not the client ID. Without it, Xero users can't connect.

1. Go to **https://developer.xero.com/** and sign in
2. **My Apps → New app**
3. App name: "Collectly"
4. OAuth redirect URI: `https://getcollectly.app/api/xero/callback`
5. Copy the **Client ID**
6. Add to `.env.local`: `XERO_CLIENT_ID="..."`

### PostHog (product analytics) — 3 min, free
**Why:** Currently no usage analytics. Won't ship without knowing what users do.

1. Go to **https://posthog.com/** and sign up
2. Create a project (US or EU region)
3. **Project Settings → Project API Key** (the one starting with `phc_...`)
4. Add to `.env.local`: `NEXT_PUBLIC_POSTHOG_KEY="phc_..."`

---

## Tier 3: Optional, only if you have a reason

_(Empty — Gemini is the only AI provider. Revisit if you add a second.)_

---

## What I do after each one is in

1. Wire to `.env.local`
2. Restart the dev server / redeploy to Vercel
3. Run a smoke test (for Twilio: test SMS; for Stripe Connect: test OAuth flow; for Redis: hit a rate-limited endpoint)
4. Confirm working

---

## Tomorrow morning (before all this)

**09:00 EAT:** Read replies from the 10 tier-1 sends. Log them. Send 5 t2 followups to Send-1 non-repliers. This is the highest-leverage 30 min of the day.

**10:00 EAT:** Start the key work, Tier 1 first.

**11:00 EAT:** Tier 2 (Upstash + Xero + PostHog) — 15 min total.

**Afternoon:** With keys wired, do a real Apollo export from your Windows browser (5-7 CSVs of 25 leads = 125-175 leads). Run through `enrich_pipeline.py`. Send to tier 2/3 prospects.

---

## The honest reality

You can **launch Collectly tomorrow** with what you have:
- Email dunning via Resend: ✅
- QuickBooks OAuth: ✅
- Stripe test payments: ✅
- Postgres database: ✅
- AI features via Gemini: ✅
- 5/30 prospects contacted, 0 replies so far

What's missing for **real production**:
- Twilio (SMS) — recommended, blocks the second half of the product
- Stripe Connect — required for actual revenue
- Upstash — required before public launch (rate limiting is a security concern)

What's **purely improvement**:
- Xero, PostHog, more Apollo credits

**Don't let perfect block good.** Ship with email-only if you have to, add SMS in week 2.
