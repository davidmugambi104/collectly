# Production Blockers Status — 2026-07-26

| # | Blocker | Status | Notes | Owner |
|---|---|---|---|---|
| 1 | Vercel deploy | ✅ Done | `https://getcollectly.app` returns HTTP 200. | Confirmed by user. |
| 2 | Resend domain verify | ✅ Done | `getcollectly.app` verified, sending enabled. | Done |
| 3 | Stripe webhook secret | ⏭️ Deprioritized | Using Paystack instead of Stripe for Kenya-compatible payments. | N/A |
| 4 | OpenAI key | ⏭️ Not needed | User is using Gemini for AI features. | N/A |
| 5 | Twilio triplet | ⏭️ Deprioritized | User switching to Paystack; SMS via Twilio not required for first revenue. | User decision |
| 6 | Paystack live keys | ❌ Pending | Currently `sk_test_` / `pk_test_`. Need `sk_live_` / `pk_live_` to process real payments. | User action |

## What remains before first real payment can be collected
1. Swap Paystack test keys for live keys in `.env.local`:
   - `PAYSTACK_SECRET_KEY=sk_live_...`
   - `PAYSTACK_PUBLIC_KEY=pk_live_...`
2. Deploy with live keys.
3. Run a real transaction test (minimum amount).

## Non-blocking for first customer conversations
- Product is deployed.
- Resend domain is verified.
- Payments strategy is clear (Paystack).
- SMS/Twilio not required for close.

## Recommended next actions
1. User: add Paystack live keys.
2. Agent: update payment page to support live Paystack initialization.
3. User/agent: start 3–5 warmup emails/day and 5 manual prospect conversations/week.
