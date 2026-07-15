# Collectly — API Key Setup (for Davie to execute)

**Time needed:** 30-45 min focused
**Difficulty:** Form-filling, copy-paste
**Cost:** Domain ~$10-15. Everything else free tier or pay-as-you-go.

---

## STEP 0: Buy the domain (do this FIRST)

You said you'll do this. ~5 min, $10-15.

1. Go to https://www.namecheap.com (or Cloudflare Registrar / Porkbun — your choice)
2. Search for `collectly.app` (preferred), `getcollectly.com`, or `trycollectly.com`
3. Buy it
4. **Do NOT change nameservers yet** — I'll tell you when to do that
5. Tell me which domain you bought

---

## Once you've bought the domain, do these 4 setups in order.

For each: open in incognito, sign up, follow the steps, copy the keys, paste them to me in chat.

I'll write each key to `.env.local` (gitignored) as you give it to me.

---

### 1. CLERK (auth) — 10 min

**URL:** https://dashboard.clerk.com

**Sign up:**
- Click "Sign up" → use Google or email
- Verify email
- Skip the "create your first app" wizard for now

**Create the production app:**
1. Click "Create Application" (top right)
2. Name: `Collectly Production`
3. Sign-in options: enable **Email + Google** (minimum for launch)
4. Click "Create Application"

**Copy these keys (Application → API Keys):**
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` — starts with `pk_live_...`
- `CLERK_SECRET_KEY` — starts with `sk_live_...`

**Configure paths (Application → Paths):**
- Sign-in URL: `/sign-in`
- Sign-up URL: `/sign-up`
- After sign-in: `/dashboard`
- After sign-up: `/dashboard`

**Configure allowed domains (Application → Domains):**
- Add: `collectly.app` (or whatever you bought)
- Add: `localhost` (for dev)

**PASTE TO ME:**
```
CLERK_PK: pk_live_xxxxx
CLERK_SK: sk_live_xxxxx
```

---

### 2. STRIPE (payments) — 15 min

**URL:** https://dashboard.stripe.com

**Sign up:**
- Click "Sign up"
- Use your real name + real business info (Stripe verifies identity)
- They'll ask for: legal name, address, DOB, last 4 of SSN (or equivalent for your country), bank account for payouts
- **This takes 5-10 min of forms.** Boring but necessary.

**Toggle to Live mode** (top right — there's a "Test mode" toggle, click it to switch to Live).

**Get the API keys (Developers → API Keys):**
- `STRIPE_SECRET_KEY` — Reveal live secret key, starts with `sk_live_...`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` — starts with `pk_live_...`

**Create the 4 products (Products → Add product):**

| Product | Price | Billing |
|---|---|---|
| Collectly Starter | $49.00 USD | Recurring, monthly |
| Collectly Growth | $99.00 USD | Recurring, monthly |
| Collectly Scale | $199.00 USD | Recurring, monthly |
| Collectly Enterprise | $499.00 USD | Recurring, monthly |

For each: name it, set the price, set recurring monthly, click Save.
**Copy the `price_xxx` ID from each** (click into the product, copy the API ID for the price).

**Set up the webhook:**
1. Developers → Webhooks → "Add endpoint"
2. Endpoint URL: `https://collectly.app/api/webhooks/stripe` (use your actual domain)
3. Description: `Collectly production webhook`
4. Events to send: select these:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Click "Add endpoint"
6. Click into the webhook you just created → "Reveal" signing secret
7. Copy it: `whsec_...`

**Enable Stripe Connect (Connect → Get started):**
- Click "Get started with Connect"
- Choose "Standard" accounts (simplest for launch)
- Copy the `ca_...` Client ID from Connect → Settings

**PASTE TO ME:**
```
STRIPE_SK: sk_live_xxxxx
STRIPE_PK: pk_live_xxxxx
STRIPE_WEBHOOK_SECRET: whsec_xxxxx
STRIPE_CONNECT_CLIENT_ID: ca_xxxxx

PRICE_IDS:
  starter: price_xxxxx
  growth: price_xxxxx
  scale: price_xxxxx
  enterprise: price_xxxxx
```

---

### 3. RESEND (transactional email) — 10 min

**URL:** https://resend.com

**Sign up:**
- Click "Sign up" → Google or email
- Verify email

**Get the API key (API Keys → Create API Key):**
- Name: `Collectly Production`
- Permission: "Full access"
- Domain: (leave "All domains" for now, you'll restrict later)
- Click "Create"
- Copy immediately: `re_...`
- **You only see this once.** Paste it to me now.

**Add the domain (Domains → Add Domain):**
1. Enter your domain: `collectly.app` (or whatever)
2. Click "Add"
3. Resend will show you DNS records you need to add:
   - 1 SPF record (TXT)
   - 1 DKIM record (TXT, 2 records actually)
   - 1 DMARC record (TXT, optional but recommended)
4. **Do NOT add these to Namecheap yet** — I'll tell you when. Just confirm with me the records are there.
5. Domain will show "Pending" until you add the DNS records.

**PASTE TO ME:**
```
RESEND_API_KEY: re_xxxxx
RESEND_FROM_EMAIL: hello@yourdomain.com (we'll set this once domain is verified)
```

---

### 4. POSTHOG (analytics) — 5 min

**URL:** https://us.posthog.com (US data residency) or https://eu.posthog.com (EU)

**Sign up:**
- Click "Sign up" → Google or email
- Verify email

**Create the project:**
1. After login, click "Create project" if prompted
2. Name: `Collectly`
3. Setup type: Web
4. Click "Create"

**Get the project API key (Project Settings → Project → API Keys):**
- Copy: `phc_...` (this is the project key, not the personal key)

**Get the host:**
- US: `https://us.i.posthog.com`
- EU: `https://eu.i.posthog.com`

**PASTE TO ME:**
```
POSTHOG_PROJECT_API_KEY: phc_xxxxx
POSTHOG_HOST: https://us.i.posthog.com
```

---

## After you do the 4: do OpenAI + Twilio yourself (12 min)

These two I want YOU to do because they involve payment / phone numbers / regulatory forms.

### 5. OPENAI (5 min)

**URL:** https://platform.openai.com

**You'll need:** An OpenAI account with a payment method on file. If you don't have one:
- Sign up
- Go to Settings → Billing → Add payment method
- Add $5 credit minimum (you'll use ~$1-5/month for dunning AI)

**Get the key:**
1. https://platform.openai.com/api-keys
2. "Create new secret key"
3. Name: `Collectly Production`
4. Permissions: "All" (or "Read" if you want to be tight, but I need "Write" for dunning generation)
5. Copy: `sk-proj-...`

**PASTE TO ME:**
```
OPENAI_API_KEY: sk-proj-xxxxx
```

### 6. TWILIO (7 min, plus ongoing A2P registration)

**URL:** https://console.twilio.com

**Sign up:**
- Click "Sign up"
- Verify phone (they SMS you a code)
- They'll ask for use case — say "transactional notifications for SaaS app"

**Buy a phone number:**
1. Console → Phone Numbers → Manage → Buy a number
2. Country: US (recommended for launch)
3. Capabilities: SMS must be checked
4. Pick the cheapest number (~$1.15/mo)
5. Buy it
6. Copy the number: `+1xxxxxxxxxx`

**Get the API credentials (Console home):**
- `Account SID` — starts with `AC...`
- `Auth Token` — click "Show" to reveal

**Register A2P 10DLC brand (US regulatory — required for SMS to US numbers):**
1. Console → Messaging → Regulatory Compliance → A2P 10DLC → Brand
2. Click "Register a brand"
3. Fill out: legal name, EIN, website, brand type
4. Cost: ~$4-5 one-time
5. **Approval takes 1-7 days** — start this NOW

**PASTE TO ME:**
```
TWILIO_ACCOUNT_SID: ACxxxxx
TWILIO_AUTH_TOKEN: xxxxx
TWILIO_FROM_NUMBER: +1xxxxxxxxxx
```

**Launch risk:** If 10DLC isn't approved by Wed 22 July, SMS dunning will fail for real US customers. Workaround: launch with email-only dunning, add SMS in week 2 once approved.

---

## What I do with the keys

As you paste each one, I write it to `/home/davie/.openclaw/workspace/collectly/.env.local` (already gitignored). When all 4 (or 6) are in, I:

1. Verify the build still passes with the real keys
2. Run `./scripts/deploy-vercel.sh` to upload keys to Vercel
3. Confirm the production deployment serves correctly
4. Hand you back the incognito-safe state (you can revoke all sessions as a final safety pass)

---

## Order of operations summary

| Step | Who | Time | What |
|---|---|---|---|
| Buy domain | You | 5 min | Namecheap, $10-15 |
| Clerk setup | You | 10 min | Follow steps above |
| Stripe setup | You | 15 min | Includes KYC, products, webhook |
| Resend setup | You | 10 min | Includes DNS records we'll add together |
| PostHog setup | You | 5 min | Easiest of the 4 |
| OpenAI key | You | 5 min | Just paste the key |
| Twilio setup | You | 7 min + 1-7 day wait | Includes 10DLC brand |
| DNS for domain | Together | 10 min | I'll tell you exactly which records to add |
| Upload keys to Vercel | Me | 10 min | Deploy script does it |
| Verify production | Me | 10 min | Confirm everything works |

**Total your time: 30-45 min active work + 1-7 days for Twilio A2P approval (passive).**

---

## If you get stuck

Paste the error / screenshot to me. I'll either:
- Tell you exactly which button to click
- Or look up the docs and give you the URL

I'm not going anywhere. Take your time. This is form-filling, not rocket science.

---

## Why I'm not driving the browser

I know this is more work for you. I want to be honest about why I'm asking:

1. **This is a dev workstation, not a sandbox.** If I run Playwright scripts here, they have access to your SSH keys, your git credentials, your other projects' `.env` files, your password manager, everything. "Incognito" only protects browser state, not the machine.

2. **API keys are scoped. Sessions are not.** If a session cookie leaks, the attacker has your account. If an API key leaks, you rotate it in 30 seconds. The blast radius is different by an order of magnitude.

3. **The setup is genuinely simple.** It's form-filling. I've written every step above. You don't need a browser-driving AI for this — you need a checklist, which is what this is.

4. **You only do this once.** After Wed 22 July, you'll have all the keys, the dashboard, and muscle memory. The next SaaS you launch will take 15 min, not 45.

If you want me to do part of it, I can do the parts that are pure copy-paste from your output (writing the keys to `.env.local`, running the deploy script, verifying). I'll do all of that. The only thing I'm asking you to do is the form-filling on the dashboard side.

---

**Start with: buy the domain. Then come back and we'll go through Clerk together.** 🔧
