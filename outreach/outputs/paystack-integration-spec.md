# Paystack Integration Spec for Collectly

## Why Paystack
- Stripe is not available for Kenyan-registered businesses.
- Paystack (owned by Stripe) operates in Kenya, supports international card payments, and pays out to Kenyan banks / M-PESA.
- Apple Pay available if needed later.

## Test keys (in `.env.local`)
- `PAYSTACK_SECRET_KEY=sk_test_...`
- `PAYSTACK_PUBLIC_KEY=pk_test_...`

## Required production setup
1. Create live Paystack business account at https://dashboard.paystack.com
2. Complete business verification and compliance
3. Request international payments in Dashboard → Settings → Preferences
4. Generate live secret + public keys
5. Set webhook endpoint: `https://getcollectly.app/api/paystack/webhook`

## Core flows to replace

### 1. Customer subscription / payment
**Stripe flow:** create customer + subscription, charge via Stripe Elements.
**Paystack flow:**
- Create Paystack customer (email + metadata)
- Initialize transaction with amount + plan code
- Redirect user to Paystack checkout / inline JS popup
- Verify transaction on webhook or callback

### 2. Invoice payment by agency's client
**Current plan:** branded payment portal.
**Paystack flow:**
- Generate a Paystack payment link for each invoice
- Send link via email/SMS dunning
- Webhook updates invoice status on `charge.success`

### 3. Webhooks to handle
- `charge.success` — payment received, mark invoice paid
- `charge.failed` — payment failed, retry logic
- `subscription.create` / `subscription.disable` — plan lifecycle

## API endpoints to build
- `POST /api/paystack/initialize` — start payment
- `GET /api/paystack/verify?reference=...` — verify transaction
- `POST /api/paystack/webhook` — receive events

## Fees
- International cards: 3.8%
- Local cards: 2.9%
- M-PESA: 1.5%
- Settlement: T+2

## Next step
Build a minimal Paystack payment page that creates a test transaction and verifies it.
