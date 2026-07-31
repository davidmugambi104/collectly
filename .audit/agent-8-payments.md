# Agent 8: Payment integrations

## Tests run (with verbatim output)

### Stripe webhook (no signature)

```bash
curl -sD- -X POST https://getcollectly.app/api/webhooks/stripe -H 'Content-Type: application/json' -d '{}'
```

Output:

```
HTTP/2 400
...
{"error":"missing signature"}
```

### Paystack webhook (no signature)

```bash
curl -sD- -X POST https://getcollectly.app/api/paystack/webhook -H 'Content-Type: application/json' -d '{}'
```

Output:

```
HTTP/2 401
...
{"error":"Unauthorized"}
```

### Live DB payments query

```bash
cd /home/davie/.openclaw/workspace/collectly && DBURL=$(grep '^DATABASE_URL=' .env.local | sed 's/DATABASE_URL=//' | sed 's/^"//;s/"$//') && psql "$DBURL" -c "select id, org_id, amount, currency, method, reference, external_id, paid_at, created_at from payments order by created_at desc limit 10;"
```

Output:

```
      id      |             org_id              |  amount  | currency | method | reference | external_id |          paid_at           |         created_at
--------------+---------------------------------+----------+----------+--------+-----------+-------------+----------------------------+----------------------------
 71kch8jgq1dw | org_3GrgRV9z7wpVb6GDMVsIJ2Zz5So | 18000.00 | USD      | ach    |           |             | 2026-07-08 18:36:35.768+00 | 2026-07-26 18:36:35.768+00
 o8mo3e4cxlie | org_3GrgRV9z7wpVb6GDMVsIJ2Zz5So |  4500.00 | USD      | card   |           |             | 2026-07-22 18:36:35.768+00 | 2026-07-26 18:36:35.768+00
 8ioan4kbp63c | org_dev_collectly               | 18000.00 | USD      | ach    |           |             | 2026-06-27 12:20:37.465+00 | 2026-07-15 12:20:37.465+00
 zn38sos3lfxc | org_dev_collectly               |  4500.00 | USD      | card   |             | 2026-07-11 12:20:37.465+00 | 2026-07-15 12:20:37.465+00
(4 rows)
```

### Environment variables present

```
PLAID_CLIENT_ID=<SET>
PLAID_ENV=<SET>
PLAID_SECRET=<SET>
PLAID_WEBHOOK_URL=<SET>
SQUARE_CLIENT_ID=<SET>
SQUARE_CLIENT_SECRET=<SET>
SQUARE_ENVIRONMENT=<SET>
SQUARE_REDIRECT_URI=<SET>
PAYSTACK_SECRET_KEY=<SET>
PAYSTACK_PUBLIC_KEY=<SET>
STRIPE_CONNECT_REDIRECT_URI=<SET>
STRIPE_SECRET_KEY=<SET>
STRIPE_WEBHOOK_SECRET=<SET>
```

### Signature verification code quotes

**Stripe** (`src/app/api/webhooks/stripe/route.ts`):

```typescript
const sig = req.headers.get('stripe-signature');
const secret = process.env.STRIPE_WEBHOOK_SECRET;
if (!sig || !secret) return NextResponse.json({ error: 'missing signature' }, { status: 400 });
const body = await req.text();
let event: Stripe.Event;
try {
  event = getStripe().webhooks.constructEvent(body, sig, secret);
} catch (e: any) {
  return NextResponse.json({ error: `webhook signature failed: ${e.message}` }, { status: 400 });
}
```

**Paystack** (`src/app/api/paystack/webhook/route.ts`):

```typescript
const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;
function verifySignature(body: string, signature: string | null): boolean {
  if (!PAYSTACK_SECRET || !signature) return false;
  const hash = crypto
    .createHmac('sha512', PAYSTACK_SECRET)
    .update(body)
    .digest('hex');
  return hash === signature;
}
const signature = req.headers.get('x-paystack-signature');
const body = await req.text();
if (!verifySignature(body, signature)) {
  return NextResponse.json({ error: 'invalid signature' }, { status: 401 });
}
```

## Best-practice search findings

1. **Stripe webhook signature verification (2026)**  
   Source: https://docs.stripe.com/webhooks/signature?lang=node  
   Key points:
   - Use the `Stripe-Signature` header.
   - Call `stripe.webhooks.constructEvent(requestBody, signature, endpointSecret)`.
   - The request body must be the raw UTF-8 string sent by Stripe; parsing/mutating it (e.g., via JSON middleware) breaks verification.

2. **Paystack webhook HMAC verification**  
   Source: https://docs-v2.paystack.com/docs/payments/webhooks/  
   Key points:
   - Paystack sends `x-paystack-signature` header containing HMAC SHA512 of the payload signed with the secret key.
   - Verification must happen before processing the event.
   - Paystack also publishes whitelisted IPs: `52.31.139.75`, `52.49.173.169`, `52.214.14.220`.

## What I found

### Stripe

- Signature enforced: **yes**.
- Uses `constructEvent` with raw `req.text()` body and `STRIPE_WEBHOOK_SECRET`.
- Missing secret returns 400 with body `{"error":"missing signature"}`; bad signature returns 400.
- No idempotency check visible in the 60-line read (`handleStripeEvent` not inspected).
- No explicit event replay / timestamp tolerance check (`constructEvent` handles Stripe's `t` tolerance by default).

### Paystack

- Signature enforced: **yes**.
- Uses HMAC SHA512 with `PAYSTACK_SECRET_KEY` and raw `req.text()` body.
- Missing/bad signature returns 401.
- **Implementation gap**: only logs events (`console.log`) and does not update invoices/payments in DB.
- No idempotency guard; no IP whitelist.

### Plaid

- `src/app/api/plaid/connect/route.ts`: returns 503 if `PLAID_CLIENT_ID` or `PLAID_SECRET` missing; otherwise creates link token.
- `src/app/api/plaid/exchange/route.ts`: requires `public_token`, exchanges via `plaidExchangePublicToken`, saves connection.
- No webhook route inspected in scope.

### Square

- `src/app/api/square/connect/route.ts`: returns 503 if `SQUARE_CLIENT_ID` missing; otherwise redirects to `squareAuthUrl(orgId)`.
- No webhook route inspected in scope.

### Stripe Connect

- `src/app/api/stripe-connect/callback/route.ts`: handles OAuth callback, exchanges code, saves tokens.
- No webhook route inspected in scope.

### Create checkout

- `src/app/api/payment/create-checkout/route.ts`: rate-limited to 5/min per IP, validates invoice, creates Stripe Checkout Session.
- Continues beyond line 60 (not fully read).

### Database

- `payments` table exists with 4 rows; all `reference` and `external_id` columns are empty.
- No `status` column on `payments`; status likely tracked on `invoices` table.

## What should change

1. **Paystack webhook must write outcomes to the database.** Currently it only logs events; payments will not be marked paid/failed. This is the highest-risk issue.
2. **Add idempotency guards to Stripe and Paystack webhooks.** Replayed `charge.success` / `invoice.payment_succeeded` events could create duplicate payment rows. Use `event.id` / `reference` uniqueness.
3. **Paystack webhook should verify `reference` and `amount` match an existing invoice/payment before updating status.** The current handler trusts the payload after signature check but does not correlate it to local records.
4. **Consider Paystack IP whitelisting** in addition to HMAC (`52.31.139.75`, `52.49.173.169`, `52.214.14.220`) for defense in depth.
5. **Stripe webhook should return non-4xx only for actual verification failures.** It currently does; confirm `handleStripeEvent` failures do not cause Stripe to disable the endpoint by returning 500 for transient DB errors.
6. **Square webhook route not in scope but should be audited** if Square payments are active; ensure it verifies signature if supported.

## Source / evidence

- `src/app/api/webhooks/stripe/route.ts` — signature verification lines quoted above.
- `src/app/api/paystack/webhook/route.ts` — HMAC verification and TODO-only logging quoted above.
- `src/app/api/paystack/initialize/route.ts` — creates transaction via Paystack API, sets callback URL.
- `src/app/api/payment/create-checkout/route.ts` — rate limit and Stripe Checkout creation.
- Live curl responses and DB query output quoted above.
- Stripe docs: https://docs.stripe.com/webhooks/signature?lang=node
- Paystack docs: https://docs-v2.paystack.com/docs/payments/webhooks/
