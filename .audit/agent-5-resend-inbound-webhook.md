# Agent 5: Resend inbound webhook

## Tests run (with verbatim output)

### POST empty
```bash
curl -s -X POST https://getcollectly.app/api/webhooks/resend-inbound
```
```
HTTP:401
{"error":"Unauthorized"}
```

### POST with bad Svix signature
```bash
curl -s -X POST -H 'svix-id: x' -H 'svix-timestamp: 1' -H 'svix-signature: v1,xxx' -d '{"type":"email.received"}' -H 'Content-Type: application/json' https://getcollectly.app/api/webhooks/resend-inbound
```
```
HTTP:401
{"error":"Unauthorized"}
```

### Middleware check
```bash
cd /home/davie/.openclaw/workspace/collectly && grep -n 'resend-inbound' src/middleware.ts
```
Result: **no matches**. The route is **not** in `isPublicRoute`.

### Env check
```bash
grep RESEND_INBOUND_WEBHOOK_SECRET .env.local
```
```
RESEND_INBOUND_WEBHOOK_SECRET="whsec_<REDACTED>"
```

### Build output check
```bash
find .next -path '*resend-inbound*' -maxdepth 6
```
Result: **no build output found**. A production build has not been produced in this workspace.

## Best-practice search findings

- Vercel Functions runtimes docs confirm Functions are stateless and `/tmp` is only available within a single invocation: https://vercel.com/docs/functions/runtimes
- Vercel community discussion on `/tmp` notes: you can write only in `/tmp`, only the same process can handle that file, and you cannot rely on how long files are stored: https://github.com/vercel/vercel/discussions/5190
- Reliable webhook patterns emphasize idempotency, durable event log, and replay safety: https://fasthook.hashnode.dev/your-webhook-returned-200-ok-did-the-event-actually-get-processed
- Stripe webhook + Postgres ledger pattern for audit-grade durability: https://www.fronttribe.com/insights/stripe-webhook--postgres-ledger-the-50-line-pattern-that-survives-an-anudit

## What I found

### Route is not public in middleware
`src/middleware.ts` does **not** include `/api/webhooks/resend-inbound` in `isPublicRoute`. Because Clerk middleware is enabled in production (when `CLERK_SECRET_KEY` and `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` are present), external Resend webhooks are blocked with `401 Unauthorized` before they ever hit the route handler. This matches the live `curl` responses.

### `/tmp` is not durable on Vercel
`route.ts` writes inbound events to:
```ts
const LOG_PATH = path.resolve('/tmp', 'resend-inbound-events.jsonl');
// ...
fs.appendFileSync(LOG_PATH, line + '\n');
```
On Vercel, `/tmp` is ephemeral per function invocation. The file is **not** shared across invocations and is **not** guaranteed to persist. Event history will be lost.

### No deduplication
The route accepts `svix-id` (via `req.headers.get('svix-id')`) but never records or checks it. There is no deduplication by event ID. Retries or duplicate deliveries will append duplicate lines.

### Missing-secret handling
```ts
const secret = process.env.RESEND_INBOUND_WEBHOOK_SECRET;
if (!secret) {
  return NextResponse.json({ error: 'missing RESEND_INBOUND_WEBHOOK_SECRET' }, { status: 500 });
}
```
If the secret env var is absent, the endpoint returns `500` instead of a more appropriate `404`/`503`. It also exposes the exact missing variable name to the caller.

### TODOs in production code
The route contains unimplemented TODOs for matching to `outreach-log.csv` and updating Google Sheets. As of now, the only side effects are appending to ephemeral `/tmp` and returning the parsed `matched_message_id`.

## What should change

1. **Add `/api/webhooks/resend-inbound` to `isPublicRoute`** in `src/middleware.ts` so Resend can deliver events. (Critical — currently broken in production.)
2. **Move durable event storage** from `/tmp` to a persistent store (Postgres, Redis, or Google Sheet/Airtable) so events are not lost across invocations.
3. **Add idempotent deduplication** keyed by `svix-id` (or `event.data.id`) before logging/processing.
4. **Return a non-500 status when secret is missing** (`503 Service Unavailable` or `404` with minimal detail) and log the config error server-side.
5. **Implement or remove the TODOs** for matching to `outreach-log.csv` and updating Google Sheets.
6. **Verify the delivery route too** — `resend-delivery/route.ts` also uses `process.cwd()` for logs, which is also not durable on Vercel.

## Source / evidence

- `src/app/api/webhooks/resend-inbound/route.ts`: full source read; writes to `/tmp/resend-inbound-events.jsonl`, checks secret, verifies Svix signature, no dedupe.
- `src/middleware.ts`: public route list inspected; `/api/webhooks/resend-inbound` is absent.
- `.env.local`: contains `RESEND_INBOUND_WEBHOOK_SECRET`.
- Live `curl` tests against `https://getcollectly.app/api/webhooks/resend-inbound` returned `401 Unauthorized` for both empty and bad-signature payloads.
- No `.next` build output present in workspace.
