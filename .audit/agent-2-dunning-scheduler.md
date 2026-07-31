# Agent 2: Dunning scheduler

## Tests run (with verbatim output)

### 1. Cron trigger (curl)
```json
{"ok":true,"scheduled":0,"sent":0,"errors":0,"took_ms":169}
```

### 2. Last 20 dunning_runs (psql)
Actual 9 rows returned:
```text
id      | channel | status | err | created_at
m49s8pv2jniy | email | sent |  | 2026-07-31 12:53:58.816923+00
dvue1dtqmejn | sms   | sent |  | 2026-07-31 12:49:17.713386+00
dronchrkj3xb | sms   | sent |  | 2026-07-31 12:49:16.911538+00
xxbqcaiqvfba | email | failed | resend: validation_error: Invalid `from` field. The email address needs to follow the `email@example.com` or `Name <email@example.com>` format. | 2026-07-30 13:00:16.993312+00
8f44og53jkav | email | failed | resend: validation_error: The gmail.com domain is not verified. Please, add and verify your domain on https://resend.com/domains | 2026-07-24 14:26:46.259634+00
sc79xgpvbmwk | email | failed | resend: validation_error: The gmail.com domain is not verified. Please, add and verify your domain on https://resend.com/domains | 2026-07-21 14:42:41.108988+00
lzizkeejq04i | sms | sent |  | 2026-07-15 12:24:47.854026+00
ltff5dp9tva6 | sms | sent |  | 2026-07-15 12:24:46.769184+00
ky91xlb0k7m8 | email | sent |  | 2026-07-15 12:24:45.165464+00
```

### 3. Vercel crons list
```text
Vercel CLI 56.3.2 (Node.js 22.22.3) | crons is in beta
> 1 cron job found for david-mugambis-projects/collectly [339ms]
Path              Schedule
/api/cron/dunning 0 14 * * *
```

## Best-practice search findings

### Drizzle ORM transactions / retry pattern
- Drizzle exposes `db.transaction(async (tx) => { ... })` for atomic operations (https://orm.drizzle.team/docs/transactions).
- `andymitchell/drizzle-robust-transaction` wraps retry logic with exponential backoff and deadlock detection (https://github.com/andymitchell/drizzle-robust-transaction).

### node-cron vs Vercel cron reliability
- StackOverflow confirms `node-cron` inside Vercel serverless is unreliable because functions are stateless and short-lived (https://stackoverflow.com/questions/76995601/scheduling-jobs-using-node-cron-in-next-js-deployed-on-vercel-not-working).
- Vercel Cron Jobs review (2026): built-in, free, best for simple schedules; reliability depends on function timeouts and cold starts (https://auxiliar.ai/service/vercel-cron/).
- For production-grade reliability, combine Vercel cron with a queue (QStash/Trigger.dev/BullMQ) so the cron only enqueues and workers retry (https://nextjslaunchpad.com/article/nextjs-cron-jobs-background-tasks-app-router-vercel-qstash-trigger-dev).

### Transactional email retry best practice
- Treat 4xx class errors as temporary/retryable, 5xx as permanent unless provider docs say otherwise; retry temporary failures with backoff (https://postscale.io/guides/smtp-errors-and-retries).
- Courier guide: make sends reliable with retries and idempotency keys (https://www.courier.com/guides/the-developers-guide-to-transactional-email/chapter-4-operating-transactional-email-at-scale).
- Resend best practices: ensure exactly-once sending and handle failures gracefully (https://github.com/resend/email-best-practices/blob/HEAD/references/sending-reliability.md).
- Photonconsole: implement rate-limit aware retry with exponential backoff and dead-letter for hard bounces (https://photonconsole.com/blog/smtp-retry-logic-explained-for-transactional-email-systems/).

## What I found

### Code path when invoice has only phone or only email
`src/lib/dunning/scheduler.ts:103-129` (exact quote):
```typescript
        try {
          if (lastStep.channel === 'email' && customer.email) {
            const sendResult = await sendEmail({...});
            if ((sendResult as any).status === 'skipped') {
              await db.update(dunningRuns).set({ status: 'failed', error: 'resend api key missing' }).where(eq(dunningRuns.id, run.id));
              errors += 1;
            } else {
              await db.update(dunningRuns).set({ status: 'sent', sentAt: now }).where(eq(dunningRuns.id, run.id));
              sent += 1;
              await recordEvent({...});
            }
          } else if (lastStep.channel === 'sms' && customer.phone) {
            const sms = await sendSms({ to: customer.phone, body: result.body });
            await db.update(dunningRuns).set({ status: 'sent', sentAt: now }).where(eq(dunningRuns.id, run.id));
            sent += 1;
            await recordEvent({...});
          } else {
            // No channel available for this customer — cancel, don't mark 'sent'
            await db.update(dunningRuns).set({ status: 'cancelled', error: 'no email/phone on file' }).where(eq(dunningRuns.id, run.id));
            await recordEvent({...});
          }
```
- If `lastStep.channel === 'email'` and `customer.email` is falsy → falls into `else` block and is **cancelled**.
- If `lastStep.channel === 'sms'` and `customer.phone` is falsy → same, **cancelled**.
- There is **no fallback channel logic**: a customer with only phone but an email step, or only email but an SMS step, is silently cancelled. The run is recorded with reason `'no email/phone on file'`.

### From-template bug
`src/lib/infra.ts:57-65` contains an explicit fix comment for a previous bug:
```typescript
    // Prefer RESEND_FROM_EMAIL if it already contains a full "Name <email>"
    // formatted string ... Fall back to combining RESEND_FROM_NAME + RESEND_FROM_EMAIL.
    // The previous unconditional combination produced nested angle brackets when
    // RESEND_FROM_EMAIL was a full string, causing Resend to reject every
    // dunning email with "Invalid `from` field".
```
- Evidence that this bug did occur: dunning_runs row `xxbqcaiqvfba` (2026-07-30) shows `failed: resend: validation_error: Invalid \`from\` field`. The code fix appears present in this file, but a run from 2026-07-30 still recorded the old error. Likely the fix was deployed after that failure.

### Dedup logic
`src/lib/dunning/scheduler.ts:82-90`:
```typescript
      const existing = await db
        .select()
        .from(dunningRuns)
        .where(and(
          eq(dunningRuns.invoiceId, invoice.id),
          eq(dunningRuns.sequenceId, seq.id),
          eq(dunningRuns.stepId, lastStep.id),
        ))
        .limit(1);
      if (existing[0]) continue;
```
- Dedup is keyed on `(invoiceId, sequenceId, stepId)` only. It does **not** include `channel` or `scheduledFor`. If a step's channel is changed in the sequence, a new run will not be created for the same step because the `(invoiceId, sequenceId, stepId)` row already exists.
- Race condition: no transaction wrapping the `select` + `insert`; concurrent cron invocations can double-schedule the same step. Vercel cron can fire twice in some edge cases (cold start overlap), so this is a real risk.

### Customer DND
`src/lib/dunning/scheduler.ts:63-66`:
```typescript
      if (customer.dndAt) {
        continue;
      }
```
- DND is honored before selecting the step. Skips both email and SMS for the customer. No event is recorded that dunning was skipped due to DND, so there is no audit trail for DND skips.

### Retry logic
- The scheduler has **no retry mechanism**. Every send attempt is synchronous and either `sent`, `cancelled`, or `failed` immediately.
- Real failures (Resend 403, Twilio errors) are recorded as `failed` with the error message, but there is no automatic follow-up attempt, exponential backoff, or separate retry queue.
- `sendEmail` returns `{ status: 'skipped' }` when `RESEND_API_KEY` is missing; scheduler then marks run as `failed` with error `'resend api key missing'`. This is a config failure but indistinguishable in the table from a transient provider error.
- `sendSms` returns `{ sid: 'dev-stub' }` when Twilio is not configured, but the scheduler treats that as success and marks the run `sent`. **This is a bug**: missing Twilio config silently records SMS runs as sent.

### Error recording
`src/lib/events.ts` swallows audit-log failures:
```typescript
  } catch (e: any) {
    console.warn(`[events] recordEvent failed: type=${opts.type} org=${opts.orgId} err=${e?.message}`);
  }
```
- This is intentional per comments, but means a database outage can silently lose dunning audit events.

### Cron schedule
- Vercel cron is configured for `/api/cron/dunning` at `0 14 * * *` (daily 14:00 UTC = 17:00 EAT). It is present and registered.
- Live trigger returned `{scheduled:0, sent:0, errors:0, took_ms:169}`, indicating no active sequences matched overdue invoices at this moment, or no sequences are active.

## What should change

1. **Fix SMS dev-stub success bug** (HIGH)
   - File: `src/lib/dunning/scheduler.ts:108-112`
   - `sendSms` returns `{ sid: 'dev-stub' }` when Twilio is unconfigured, but the scheduler unconditionally marks the run `sent`. Mirror the email logic: detect stub/missing config and mark `failed` or `cancelled`.

2. **Wrap schedule+send in a database transaction** (HIGH)
   - File: `src/lib/dunning/scheduler.ts:82-130`
   - Use `db.transaction` around the dedup select and insert/update to eliminate the race-condition double-schedule and ensure status updates are atomic with the run record.

3. **Add retry/queue for failures** (HIGH)
   - File: `src/lib/dunning/scheduler.ts` overall
   - Move actual sending out of the cron function into a queue (QStash/BullMQ/Trigger.dev). Store `scheduled` runs and let workers retry temporary provider failures with exponential backoff. The cron should only enqueue, not perform network calls.

4. **Record DND skips in events** (MEDIUM)
   - File: `src/lib/dunning/scheduler.ts:63-66`
   - Add `dunning.run.dnd` event so customer DND opt-outs are auditable.

5. **Improve dedup key or allow channel changes** (MEDIUM)
   - File: `src/lib/dunning/scheduler.ts:82-90`
   - Consider including `channel` in the uniqueness check, or add a `hash` of the rendered message. Currently editing a step's channel will not re-send to invoices already at that step.

6. **Distinguish config failures from provider failures** (MEDIUM)
   - File: `src/lib/dunning/scheduler.ts`
   - Use a separate status such as `config_error` or prefix errors clearly (`[config]`, `[provider]`) so ops can tell at a glance whether to rotate API keys or retry.

7. **Retry policy for transactional email** (MEDIUM)
   - File: `src/lib/infra.ts:43-69`
   - Implement provider-aware retry: retry 4xx/timeout/rate-limit with backoff; do not retry 5xx/bounced addresses. This aligns with Postscale/Courier/Resend best practices.

## Source / evidence

- Code files:
  - `src/lib/dunning/scheduler.ts`
  - `src/app/api/cron/dunning/route.ts`
  - `src/lib/infra.ts`
  - `src/lib/events.ts`
- Web findings:
  - https://orm.drizzle.team/docs/transactions
  - https://github.com/andymitchell/drizzle-robust-transaction
  - https://stackoverflow.com/questions/76995601/scheduling-jobs-using-node-cron-in-next-js-deployed-on-vercel-not-working
  - https://auxiliar.ai/service/vercel-cron/
  - https://nextjslaunchpad.com/article/nextjs-cron-jobs-background-tasks-app-router-vercel-qstash-trigger-dev
  - https://postscale.io/guides/smtp-errors-and-retries
  - https://www.courier.com/guides/the-developers-guide-to-transactional-email/chapter-4-operating-transactional-email-at-scale
  - https://github.com/resend/email-best-practices/blob/HEAD/references/sending-reliability.md
  - https://photonconsole.com/blog/smtp-retry-logic-explained-for-transactional-email-systems/
- Database evidence: dunning_runs rows for `xxbqcaiqvfba`, `8f44og53jkav`, `sc79xgpvbmwk` show Resend from-field and domain verification errors.
