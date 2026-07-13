# Collectly — B2B SaaS Build Status

**Block 1 build (7h elapsed of 5h+2h+5h+2h+5h cycle):**

**Live:** http://localhost:3030 — all 24 routes return 200 OK

## What's running
- **Marketing site:** home, pricing, features, blog (index + post), customers, about, contact, changelog, sign-in, sign-up
- **Dashboard:** overview, invoices (+new, [id]), customers (+new, [id]), dunning (+sequence), cash-flow, billing, settings, integrations, events, payments
- **Public:** interview form, payment portal `/pay/[id]`
- **API routes:** /api/waitlist, /api/interview, /api/dunning/{preview,send}, /api/invoices, /api/invoices/mark-paid, /api/customers, /api/sequences/[id], /api/quickbooks/{connect,callback}, /api/webhooks/stripe, /api/cron/dunning

## How to run
```bash
cd /home/davie/.openclaw/workspace/collectly
ps -ef | grep next | grep -v grep | awk '{print $2}' | xargs -r kill -9

# Dev (PGlite in-memory + dev auth — no DB or Clerk needed)
USE_PGLITE=1 USE_DEV_AUTH=1 PGLITE_DIR=./.pglite \
  NEXT_PUBLIC_APP_URL=http://localhost:3030 \
  OPENAI_API_KEY=sk-placeholder RESEND_API_KEY=re_placeholder STRIPE_SECRET_KEY=sk_placeholder \
  npx next dev -p 3030

# or production build
USE_PGLITE=1 USE_DEV_AUTH=1 PGLITE_DIR=./.pglite \
  NEXT_PUBLIC_APP_URL=http://localhost:3030 \
  npx next build && npx next start -p 3030
```

## Dev seeded data
The first call to any API auto-bootstraps:
- User: `davie@collectly.app`
- Org: `Lumen & Co` (slug `lumen-co`)
- 6 customers (Brightline Legal, Harbor Painting, Westgate Advisory, Northstar Marketing, Acme Studios, Riverstone Co.)
- 9 invoices (8 unpaid, 1 paid)
- 1 default dunning sequence (4 steps: friendly → firm → firm → final)
- 1 growth trial subscription (13 days)

## GitHub push — what Davie needs to do
The fine-grained token doesn't have `Administration: write` on `davidmugambi104` so I can't create the repo via API.

**Option A — create repo on github.com, then I push:**
1. Go to https://github.com/new
2. Name: `collectly`, Public, do NOT init with README/.gitignore/license
3. Tell me when ready
4. I run: `cd /home/davie/.openclaw/workspace/collectly && git push -u origin main`
5. Token `<REDACTED_TOKEN>` should have `Contents: read and write` on the new repo (or I need a new token that includes `repo:write` for the user)

**Option B — make the existing token `repo` scoped:**
1. https://github.com/settings/tokens → edit the fine-grained token
2. Under "Repository access" → add `davidmugambi104/collectly` (after creating it) with `Contents: write`
3. Tell me when ready

## Backups taken
- `collectly-backup-20260713-1949.tar.gz` (7.6MB, full project minus node_modules/.next/.pglite)
- All 8 git commits in local repo (latest `1e69577 fix: conditionally render Clerk components...`)
