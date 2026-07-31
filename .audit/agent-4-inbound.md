# Agent 4: Inbound webhook

## Tests run (with verbatim output)

### 1. Valid reply from prospect
```bash
curl -s -X POST https://getcollectly.app/api/inbound -H 'Content-Type: application/json' -d '{"from":"bills@acmestudios.com","to":"davie@getcollectly.app","subject":"Re: Invoice INV-2370 overdue","text":"Hi, we paid via wire yesterday. Sorry for the delay."}'
```
Response:
```json
{"ok":true,"classification":{"state":"replied","nextStep":"human_review","note":"Reply received; needs human triage"}}
```

### 2. Opt-out
```bash
curl ... -d '{"from":"bills@acmestudios.com","to":"davie@getcollectly.app","subject":"Re: Invoice INV-2370 overdue","text":"Please remove me from your list"}'
```
Response:
```json
{"ok":true,"classification":{"state":"do_not_contact","nextStep":"suppress","note":"Opt-out request"}}
```

### 3. Auto-reply
```bash
curl ... -d '{"from":"bills@acmestudios.com","to":"davie@getcollectly.app","subject":"Re: Invoice INV-2370 overdue","text":"This is an automated response. I am out of office."}'
```
Response:
```json
{"ok":true,"classification":{"state":"t1_sent","nextStep":"ignore_auto_reply","note":"Auto-reply detected; keep sequence running"}}
```

### 4. Positive reply
```bash
curl ... -d '{"from":"bills@acmestudios.com","to":"davie@getcollectly.app","subject":"Re: Invoice INV-2370 overdue","text":"Yes, I would be interested in a call. Email me at me@example.com"}'
```
Response:
```json
{"ok":true,"classification":{"state":"replied","nextStep":"human_review_priority","note":"Positive reply / buying signal"}}
```

### 5. Malformed (no `from`)
```bash
curl ... -d '{"to":"davie@getcollectly.app","subject":"Re: Invoice INV-2370 overdue","text":"Missing from field"}'
```
Response:
```json
{"error":"Missing from address"}
```

### 6. DB verification
```bash
cd /home/davie/.openclaw/workspace/collectly && DBURL=$(grep '^DATABASE_URL=' .env.local | sed 's/DATABASE_URL=//' | sed 's/^"//;s/"$//') && psql "$DBURL" -c "select c.email, c.status, count(*) from outreach_contacts c left join outreach_replies r on r.contact_id=c.id group by c.email, c.status order by c.email limit 15;"
```
Output:
```
           email            | status  | count
----------------------------+---------+-------
 a@b.com                    | replied |     3
 bills@acmestudios.com      | replied |     4
 post-fix-check@example.com | replied |     1
 test-agent@example.com     | replied |     1
 test-check@example.com     | replied |     1
(5 rows)
```

Per-row detail for `bills@acmestudios.com` (most recent first):
```
 a3e221d5... | new | human_review_priority | Yes, I would be interested in a call...   | 2026-07-31 13:05:40.891822+00
 e898b682... | new | suppress              | Please remove me from your list           | 2026-07-31 13:05:40.719713+00
 7a328088... | new | ignore_auto_reply     | This is an automated response...          | 2026-07-31 13:05:40.696758+00
 66b9f3ce... | new | human_review          | Hi, we paid via wire yesterday...         | 2026-07-31 13:05:40.611332+00
```

## Best-practice search findings

- Resend inbound webhooks are signed with Svix headers (`svix-id`, `svix-timestamp`, `svix-signature`) and should be verified with the signing secret using either the Resend SDK (`resend.webhooks.verify(...)`) or the `svix` package directly. Docs: https://resend.com/docs/webhooks/verify-webhooks-requests
- Resend inbound email docs: https://resend.com/docs/dashboard/receiving/
- Production webhook receivers should verify signatures over raw body, enforce a timestamp window (e.g. 5 min), dedupe with a delivery/event id, and return precise status codes. Reference: https://matheuspalma.com/blog/production-webhook-receivers-signatures-replay-idempotency
- Idempotency must be atomic (check + record in one operation, e.g. Redis SET NX or a DB unique constraint). Payload hashing is inferior to sender-provided idempotency keys. Reference: https://formspring.io/blog/webhook-idempotency-handling-duplicate-deliveries

## What I found

### Signature verification
- **Not enforced.** The route.ts comment explicitly says signature verification is "optional" and "if you want header verification, add it here later."
- The handler never reads `svix-id`, `svix-timestamp`, or `svix-signature` headers, never uses `RESEND_INBOUND_WEBHOOK_SECRET`, and has no `svix` import.
- Relevant lines:
  - Lines 30-33:
    ```ts
    // Optional: verify Resend webhook secret via a signature header if available.
    // Resend inbound webhooks currently authenticate by the URL secret; if you
    // want header verification, add it here later.
    ```
  - Line 35 onward immediately does `payload = await req.json();` with no verification.

### Classifier behavior
- Classifier requires **no prior `outreach_contacts` row**. It does an `INSERT ... ON CONFLICT (email) DO UPDATE`, so any sender creates/upserts a contact.
- Classification is keyword-based, not LLM-based.
- Logic order: auto-reply patterns first, then opt-out, then positive/buying-signal keywords, otherwise generic `replied`.
- Relevant code:
  ```ts
  const optOut = ['unsubscribe', 'remove me', "don't email", 'stop emailing', 'not interested'];
  const positive = ['book', 'calendar', 'demo', 'call', 'schedule', 'meet', ' interested', 'tell me more', 'pricing'];
  ```
- The `replyClassification` enum in `db/schema.ts` (e.g. `will_pay_date`, `already_paid`, `disputed`, `needs_payment_plan`) is **not used** by this inbound route; the route writes free-text `classification` and `next_step` to `outreach_replies`.

### Unknown sender handling
- **No rejection for unknown senders.** Any `from` address is accepted and creates a contact row with `source = 'resend_inbound'` and the classified status. This allows arbitrary senders to pollute the contact table and trigger founder notification emails.
- Relevant lines (77-89):
  ```ts
  INSERT INTO outreach_contacts (email, source, status, last_contact_at, notes)
  VALUES ($1, $2, $3, NOW(), $4)
  ON CONFLICT (email) DO UPDATE SET
    status = EXCLUDED.status,
    last_contact_at = EXCLUDED.last_contact_at,
    notes = COALESCE(outreach_contacts.notes, '') || '\n' || EXCLUDED.notes,
    updated_at = NOW()
  RETURNING id
  ```

### Idempotency
- **None implemented.** Each POST inserts a new `outreach_replies` row. Resend may retry/duplicate deliveries; the same inbound email could create many rows and many founder notification emails.
- No `svix-id` deduplication, no unique constraint on an external message id, and no idempotency store.

### Notification behavior
- For every successful POST, `sendEmail` is fired to `LEAD_NOTIFY_EMAIL ?? 'davie@getcollectly.app'` using unescaped template interpolation for `fromAddress` and `nextStep`. `subject` and `text` use `escapeHtml`, but the other fields do not.
- Relevant lines (108-122):
  ```ts
  await sendEmail({
    to: notifyEmail,
    subject: `Outreach reply: ${fromAddress}`,
    html: `<p><b>${fromAddress}</b> replied ...</p>
  <p><b>Classification:</b> ${classification.state}</p>
  <p><b>Next step:</b> ${classification.nextStep}</p>
  ...
  <pre ...>${escapeHtml(text.slice(0, 2000))}</pre>`,
  });
  ```

### Auth helper relevance
- `auth-helper.ts` is **not used** by `/api/inbound/route.ts`. It is not imported in the route. Authentication is entirely missing.

## What should change

1. **P0: Verify Svix webhook signatures.** Use `svix` or `resend.webhooks.verify` with `RESEND_WEBHOOK_SECRET` over the raw request body; return 400 on failure.
2. **P0: Add idempotency.** Store `svix-id` (or Resend message id) in a unique index/table and return 200 immediately on duplicates. This prevents duplicate replies and duplicate founder notifications.
3. **P1: Validate sender against known customers/contacts.** Do not auto-create contacts from arbitrary inbound senders; either reject unknown senders or quarantine them (e.g. status `review` / `suspicious`).
4. **P1: Escape/encode all fields inserted into notification HTML.** `classification.state`, `classification.nextStep`, and `fromAddress` are currently unescaped.
5. **P2: Remove/reduce `ensureTables` in a live webhook.** The route runs `CREATE TABLE IF NOT EXISTS` on every request. It is useful for bootstrapping but adds latency and should not run in production; move schema ownership to migrations.
6. **P2: Return 200 only after durable persistence.** Currently the contact/reply insert and notification happen in one synchronous block; consider an internal queue for notifications to avoid DB failures leaking as 500s.

## Source / evidence

- `/home/davie/.openclaw/workspace/collectly/src/app/api/inbound/route.ts` (full, read in this audit)
- `/home/davie/.openclaw/workspace/collectly/src/db/schema.ts` (relevant `replyClassification` enum + `inboxMessages` table definition, no `outreach_contacts`/`outreach_replies` in Drizzle schema — those are ad-hoc SQL in the route)
- Live POST test results and DB query output captured 2026-07-31 13:05 UTC
- Web docs:
  - https://resend.com/docs/webhooks/verify-webhooks-requests
  - https://resend.com/docs/dashboard/receiving/
  - https://matheuspalma.com/blog/production-webhook-receivers-signatures-replay-idempotency
  - https://formspring.io/blog/webhook-idempotency-handling-duplicate-deliveries
