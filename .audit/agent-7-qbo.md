# Agent 7: QuickBooks integration

## Tests run (with verbatim output)

### 1. Live DB state

```
org_id              |  provider  |  status   |        last_sync_at        | metadata |         updated_at
---------------------------------+------------+-----------+----------------------------+----------+----------------------------
 org_3GrgRV9z7wpVb6GDMVsIJ2Zz5So | quickbooks | error     | 2026-07-26 18:37:02.772+00 |          | 2026-07-26 18:37:02.772+00
 org_dev_collectly               | quickbooks | connected | 2026-07-15 12:20:37.465+00 |          | 2026-07-15 12:20:37.465+00
(2 rows)
```

### 2. Production endpoint probes (no session)

`curl -sD- https://getcollectly.app/api/quickbooks/connect`

```
HTTP/2 400
...
x-clerk-auth-reason: session-token-and-uat-missing
x-clerk-auth-status: signed-out
...
{"error":"missing orgId"}
```

`curl -sD- "https://getcollectly.app/api/quickbooks/callback?code=test&state=test&realmId=test"`

```
HTTP/2 307
...
x-clerk-auth-reason: session-token-and-uat-missing
x-clerk-auth-status: signed-out
location: https://getcollectly.app/dashboard/integrations?err=quickbooks&reason=unauthenticated
...
```

### 3. quickbooks.ts code findings

**Env vars expected**

```ts
const QBO_BASE = process.env.QBO_ENVIRONMENT === 'production'
  ? 'https://quickbooks.api.intuit.com'
  : 'https://sandbox-quickbooks.api.intuit.com';
// ...
const basic = Buffer.from(`${process.env.QBO_CLIENT_ID}:${process.env.QBO_CLIENT_SECRET}`).toString('base64');
// ...
export function qboAuthUrl(state: string) {
  const params = new URLSearchParams({
    client_id: process.env.QBO_CLIENT_ID ?? '',
    redirect_uri: process.env.QBO_REDIRECT_URI ?? '',
    ...
  });
}
```

**Token refresh logic**

- TTL: proactive refresh within 5 min of expiry (`expiresAt - now < 5 * 60 * 1000`).
- Expiry is computed from `expires_in` returned at exchange/refresh (`new Date(now + (json.expires_in as number) * 1000)`).
- No explicit jitter; no maximum retry count on repeated refresh failures.
- On 401/`invalid_grant`, cached `expiresAt` is reset to `new Date(0)` and a single refresh+retry is attempted; second auth failure throws `QboReconnectRequiredError`.

**Sync flow**

- `/query?query=SELECT Id, DisplayName, ... FROM Customer MAXRESULTS 1000`
- `/query?query=SELECT Id, DocNumber, CustomerRef, TotalAmount, Balance, DueDate, TxnDate, CurrencyRef, EmailStatus FROM Invoice WHERE Balance > '0' MAXRESULTS 1000`
- Upserts into `customers` and `invoices` matched by `(orgId, externalId)`.
- Also flips local status to `paid`/`partial`/`overdue` based on `Balance`.
- Updates `lastSyncAt` at end.

**Error handling on stale/revoked tokens**

```ts
if (res.status === 401 || errorCode === 'invalid_grant') {
  throw new QboAuthError(`QBO refresh failed: ${res.status} ${body}`, 'invalid_grant');
}
```

`markQboError` sets `status = 'error'` and records `lastErrorCode` in `metadata`:

```ts
await db.update(integrations).set({
  status: 'error',
  updatedAt: new Date(),
  metadata: next as any,
}).where(eq(integrations.id, integ.id));
```

### 4. Env var presence

```
.env.local:QBO_CLIENT_ID="ABCuo9aYUfHzex3TOiUHL5xz7iQXoUfx4VTWoelezCqw44wrAx"
.env.local:QBO_CLIENT_SECRET="eEHm9TmU13mUVyt3XNDhRqkt5y3IqSZFKGRchwL9"
.env.local:QBO_ENVIRONMENT="sandbox"
.env.local:QBO_REDIRECT_URI="https://getcollectly.app/api/quickbooks/callback"
.env.example:QBO_CLIENT_ID=""
.env.example:QBO_CLIENT_SECRET=""
.env.example:QBO_REDIRECT_URI="http://localhost:3000/api/quickbooks/callback"
.env.example:QBO_ENVIRONMENT="sandbox"
```

## Best-practice search findings

- **QBO refresh-token policy change**: Intuit now caps refresh-token lifetime at 5 years and will return a new `refresh_token_expires_in` / expiration field in refresh responses. Apps should store that field and prompt reauthorization before expiry.
  - URL: https://medium.com/intuitdev/important-changes-to-refresh-token-policy-8443779d40db
  - Docs: https://developer.intuit.com/app/developer/qbo/docs/develop/authentication-and-authorization/faq
- **Drizzle upsert**: Use `.onConflictDoUpdate({ target: ..., set: ... })` (Postgres) instead of manual select+update/insert, but Drizzle does not return the upserted row without a separate query.
  - URL: https://orm.drizzle.team/docs/guides/upsert

## What I found

- **DB has two QBO rows**: one `connected` (dev org, last sync 2026-07-15), one `error` (prod-like org, last sync 2026-07-26). The error row has empty `metadata`, so `markQboError` either did not run or wrote `metadata = {}` and the `lastErrorCode` was lost. `lastErrorCode` is not surfaced back to the DB unless `metadata` is persisted correctly; current code stores it.
- **Schema has no `error_message` column** — the audit prompt asked for it but it does not exist; errors live only in `metadata.lastErrorCode`.
- **Connect route returns 400 `{"error":"missing orgId"}` without an authenticated session**, not 401/307. This is because `orgId` validation happens before auth. The route does require a session and org membership after that, but an unauthenticated hit leaks that the endpoint exists and expects an orgId.
- **Callback route correctly redirects unauthenticated callers** to `/dashboard/integrations?err=quickbooks&reason=unauthenticated` (307).
- **OAuth state is minted/consumed via `mintOAuthState`/`consumeOAuthState`** and bound to `{orgId, userId}`; callback validates before exchanging code. Good CSRF protection.
- **Refresh tokens are rotated on every refresh** and stored. However, the code does **not yet consume/store the new refresh-token-expiration field** Intuit is adding per the 2025 policy change.
- **Token refresh is single-shot with no retry/backoff** for transient OAuth endpoint failures (e.g. 503 from Intuit). The code throws `QboAuthError('refresh_failed')` and marks the integration `error`, which may create false-positive "needs reconnect" states.
- **`syncQboForOrg` does not wrap customer/invoice loops in a transaction**; partial failures can leave DB in an inconsistent state.
- **`saveQboConnection` uses select-then-update/insert** instead of Drizzle `onConflictDoUpdate`, which is race-prone under concurrent connects.
- **Real client_id/secret are committed in `.env.local`** (sandbox values, but still sensitive). This is the audit file; noting only because it is in the grep output.

## What should change

1. **Store refresh-token expiry**: Add `refreshExpiresAt` (or parse `refresh_token_expires_in` / `x_refresh_token_expires_in` from Intuit refresh responses) and schedule proactive reconnection emails/UI nags before 5-year expiry.
2. **Fix `markQboError` persistence**: verify `metadata` is actually being written; the empty `metadata` on the error row suggests either no error code was captured or the update silently failed. Add logging.
3. **Add retry/backoff on token refresh**: transient Intuit OAuth 503/5xx should retry once with exponential backoff before marking integration `error`.
4. **Use Drizzle `onConflictDoUpdate` in `saveQboConnection`**: replace manual select+upsert to eliminate race conditions.
5. **Wrap sync in a transaction**: `syncQboForOrg` should run customer/invoice upserts inside `db.transaction()` so partial syncs are atomic.
6. **Move auth check before orgId validation in connect route** or keep orgId check but return 401 consistently for unauthenticated requests without leaking endpoint shape.
7. **Add `error_message` column** to `integrations` if the audit prompt expected it; otherwise document that error context is in `metadata.lastErrorCode`.

## Source / evidence

- `/home/davie/.openclaw/workspace/collectly/src/lib/integrations/quickbooks.ts`
- `/home/davie/.openclaw/workspace/collectly/src/app/api/quickbooks/connect/route.ts`
- `/home/davie/.openclaw/workspace/collectly/src/app/api/quickbooks/callback/route.ts`
- `/home/davie/.openclaw/workspace/collectly/src/app/api/integrations/sync/route.ts`
- `/home/davie/.openclaw/workspace/collectly/src/db/schema.ts` lines 179-195
- Live DB query output above
- https://medium.com/intuitdev/important-changes-to-refresh-token-policy-8443779d40db
- https://orm.drizzle.team/docs/guides/upsert
