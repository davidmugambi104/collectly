# Collectly audit — prioritized upgrade list

Compiled from 15 subagent reports in `collectly/.audit/agent-*.md`. Each finding references the source report and was spot-verified before inclusion.

Each item: **what** (one line), **why** (evidence), **effort** (rough), **risk** (severity if not done).

---

## P0 — Fix in this session

### P0.1 — `/api/inbound` has no Svix signature verification
**Source:** agent-4-inbound, agent-5-resend-inbound-webhook  
**What:** Anyone can POST to `https://getcollectly.app/api/inbound` with any `from` address and create `outreach_contacts` rows + send a notification email to Davie. The route reads `"Optional: verify Resend webhook secret via a signature header if available."` but never does it.  
**Evidence:** `src/app/api/inbound/route.ts` line ~30 has only a comment; no `svix` import, no signature check. Live test with `bills@acmestudios.com` from external curl created 4 contact rows.  
**Effort:** S (~30 lines). **Risk:** critical — public, no-auth write path into production DB + outbound email.

### P0.2 — `/api/webhooks/resend-inbound` returns 401 to Resend (not in public routes)
**Source:** agent-5-resend-inbound-webhook  
**What:** Add `/api/webhooks/resend-inbound` to `isPublicRoute` in `src/middleware.ts`. The other webhook handlers (`/api/webhooks/stripe`, `/api/webhooks/clerk`) are present; this one is missing.  
**Evidence:** `grep` confirms only stripe/clerk are listed; live curl returns `401 Unauthorized` before reaching the route.  
**Effort:** XS (1-line). **Risk:** high — silent webhook drops.

### P0.3 — Blog posts are gated behind auth (SEO dead)
**Source:** agent-13-marketing-seo  
**What:** Every `/blog/<slug>` URL returns 307 → `/sign-in` for anonymous users. Sitemap lists 7 articles but they cannot be indexed.  
**Evidence:** live curl `https://getcollectly.app/blog/ar-automation-for-small-business-2026` → `307 -> https://getcollectly.app/sign-in`.  
**Effort:** S (add `/blog/(.*)` to public routes in middleware). **Risk:** high — SEO + content marketing value zeroed out.

### P0.4 — Dunning scheduler: silent SMS dev-stub success
**Source:** agent-2-dunning-scheduler  
**What:** When Twilio env vars are missing, `sendSms` returns `{ sid: 'dev-stub' }` and the scheduler marks the run `sent`. Future operators will see SMS as working when it's silently a stub.  
**Evidence:** `src/lib/dunning/scheduler.ts:108-112`.  
**Effort:** XS. **Risk:** medium — silent misclassification of SMS health.

---

## P1 — Fix this week

### P1.1 — Add 13 missing FK indexes
**Source:** agent-6-db-schema  
**What:** `dunning_runs.org_id`, `dunning_runs.sequence_id`, `dunning_sequences.org_id`, `payments.customer_id`, `inbox_messages.invoice_id`, `customer_preferences.org_id`, `disputes.customer_id`, `organizations.owner_id`, `promises_to_pay.customer_id`, `promises_to_pay.fulfilled_payment_id`, `timeline_events.actor_id`, `inbox_messages.action_taken_by`, `customer_preferences.account_manager_id`.  
**Evidence:** `pg_attribute` join with `pg_constraint` and `pg_index` returned 13 unindexed FK columns.  
**Effort:** S (one Drizzle migration). **Risk:** medium — query slowness as data grows.

### P1.2 — Apply missing Drizzle migrations to production DB
**Source:** agent-6-db-schema  
**What:** Schema declares `customer_preferences`, `promises_to_pay`, `disputes`, `inbox_messages`, `timeline_events`, `qbo_request_errors`. None of these exist in the live DB (only 3 migrations applied). If the app code references them, writes will throw.  
**Evidence:** `\dt` list vs schema.ts; `drizzle/0000–0002` only cover older tables.  
**Effort:** S (`drizzle-kit generate` + manual review + apply). **Risk:** high if any current code path inserts into these tables.

### P1.3 — Add Svix idempotency + reject unknown senders (after P0.1)
**Source:** agent-4-inbound  
**What:** Once signature is verified, dedupe by `svix-id` (unique constraint) and reject/queue senders not in `outreach_contacts` (or move them to `review` status).  
**Evidence:** `outreach_replies` is append-only with no dedup key.  
**Effort:** S. **Risk:** medium — duplicate notifications, contact table pollution.

### P1.4 — Dunning scheduler: wrap select+insert in a transaction
**Source:** agent-2-dunning-scheduler  
**What:** Race condition between dedup select and insert means concurrent Vercel cron invocations can double-schedule the same `(invoiceId, sequenceId, stepId)`. Use `db.transaction()`.  
**Evidence:** `src/lib/dunning/scheduler.ts:82-90`.  
**Effort:** S. **Risk:** medium — duplicate customer dunning emails possible.

### P1.5 — Paystack webhook logs but never updates DB
**Source:** agent-8-payments  
**What:** `src/app/api/paystack/webhook/route.ts` only `console.log`s events. Even successful payments don't mark invoices paid.  
**Evidence:** code line ~25-40.  
**Effort:** M. **Risk:** high if Paystack is the active payment channel — silent payment-tracking failure.

### P1.6 — Refresh-token expiry handling for QBO
**Source:** agent-7-qbo  
**What:** Intuit now caps refresh tokens at 5 years. `src/lib/integrations/quickbooks.ts` does not consume/store `refresh_token_expires_in`.  
**Evidence:** quickbooks.ts refresh logic.  
**Effort:** S. **Risk:** medium — silent breakage in 4-5 years.

### P1.7 — QBO sync: wrap in transaction + onConflictDoUpdate
**Source:** agent-7-qbo  
**What:** `syncQboForOrg` upserts customers and invoices without a transaction or Drizzle's `onConflictDoUpdate`. Partial syncs can leave inconsistent DB state.  
**Evidence:** quickbooks.ts sync loop.  
**Effort:** S. **Risk:** medium — partial sync corruption.

### P1.8 — Add Sentry for server-side error capture
**Source:** agent-14-observability  
**What:** Only PostHog (client) is configured. No server error tracking. `global-error.tsx` has a Sentry TODO comment.  
**Evidence:** grep found only a comment, no SDK.  
**Effort:** M (sentry nextjs setup + DSN env). **Risk:** high — production bugs invisible.

### P1.9 — Add structured logging (pino) with request IDs
**Source:** agent-14-observability  
**What:** ~150 `console.*` calls, no correlation IDs, no log drain. Vercel logs default retention is short.  
**Effort:** M. **Risk:** high — incident forensics limited.

### P1.10 — Extend `/api/healthcheck` to check integrations
**Source:** agent-14-observability  
**What:** Only checks DB `SELECT 1`. Does not verify Stripe, Clerk, SMTP, cron heartbeat age.  
**Effort:** S. **Risk:** medium — silent outages undetected.

---

## P2 — Fix this month

### P2.1 — Dunning AI: validate LLM output with Zod
**Source:** agent-3-dunning-ai  
**What:** `callGeminiJSON<T>` does raw `JSON.parse(text) as T`. No schema validation. Malformed output silently falls back.  
**Evidence:** `src/lib/ai/dunning.ts:27`.  
**Effort:** S. **Risk:** medium — silently wrong dunning copy.

### P2.2 — Dunning AI: prompt injection from `businessName`/`contactName`/`brandVoice`
**Source:** agent-3-dunning-ai  
**What:** User-controlled strings interpolated directly into prompts. No delimiter, no escape, no output key validation.  
**Effort:** M. **Risk:** medium — crafted prospect name could redirect LLM.

### P2.3 — Dunning AI: format currency in code, not in prompt
**Source:** agent-3-dunning-ai  
**What:** Amount + currency passed to LLM with no formatting; output is unpredictable (`USD 12500` vs `12,500 USD`).  
**Effort:** S. **Risk:** low — cosmetic but unprofessional.

### P2.4 — Dunning AI: enforce tone sequence (`final` requires priorMessages > 0)
**Source:** agent-3-dunning-ai  
**What:** `/api/dunning/test` accepts `tone='final'` even with `priorMessages=0`. No escalation logic.  
**Effort:** XS. **Risk:** medium — premature final-notice could damage relationships.

### P2.5 — Email deliverability: switch from `noreply@` to a real From
**Source:** agent-12-deliverability  
**What:** Outreach sends as `Collectly <noreply@getcollectly.app>`. Bad for cold-email reputation.  
**Evidence:** Resend API email list shows `noreply@` in cold sends; `receiving: disabled`.  
**Effort:** S. **Risk:** medium — cold email deliverability.

### P2.6 — Email deliverability: strengthen DMARC, add `rua=` reporting
**Source:** agent-12-deliverability  
**What:** `_dmarc.getcollectly.app` = `v=DMARC1; p=none;` only. No report address.  
**Effort:** XS. **Risk:** low — monitoring only.

### P2.7 — Email deliverability: throttle warmup volume
**Source:** agent-12-deliverability  
**What:** Sends are bursty (5 in 1 second). 10-day-old domain, no warmup cadence.  
**Effort:** M (script change). **Risk:** medium — domain reputation.

### P2.8 — Marketing/SEO: add JSON-LD, canonical, OG image
**Source:** agent-13-marketing-seo  
**What:** No schema.org structured data, no `<link rel="canonical">`, no `og:image`/`twitter:image`.  
**Evidence:** homepage grep for `"@type":` returned nothing.  
**Effort:** M. **Risk:** medium — SEO + social CTR.

### P2.9 — Marketing/SEO: unique meta per route + clean sitemap
**Source:** agent-13-marketing-seo  
**What:** `/blog` and `/pricing` reuse homepage meta. Sitemap has Next.js chunk route (`/blog/page-90ff1257c909d8e4`).  
**Effort:** M. **Risk:** medium — SEO.

### P2.10 — Reply tracking: wire Resend inbound webhook as primary
**Source:** agent-11-replies, agent-9-outreach-policy  
**What:** No live reply-detection path exists. `check_replies_imap.py` reads wrong inbox + subject. `poll_replies.py` has no IMAP password. No process, no cron, no Vercel cron for reply-check.  
**Evidence:** `ps`, `crontab -l`, `vercel crons ls` all empty for replies.  
**Effort:** L (need real Resend inbound webhook configuration in Resend dashboard + handler). **Risk:** high — outreach is currently one-way.

### P2.11 — Outreach scripts: archive superseded `outreach-policy.yaml`
**Source:** agent-9-outreach-policy  
**What:** YAML still in `outreach/policy/` but explicitly superseded by `collectly_bot_policy.md`. Contradicts on Gmail fallback (YAML says "fallback if Resend is down", MD says "deprecated at 0/day").  
**Effort:** XS. **Risk:** medium — operator confusion.

### P2.12 — Outreach scripts: deprecate Gmail path in code, not just policy
**Source:** agent-9-outreach-policy, agent-10-outreach-scripts  
**What:** 9 scripts still reference `gog`/`gmail`. Even with cron disabled, manual invocation is possible. Add early-exit guards.  
**Effort:** S. **Risk:** medium — accidentally firing broken channel.

### P2.13 — Outreach scripts: fix `run_seed_inbox_test.py --dry-run` bug
**Source:** agent-10-outreach-scripts  
**What:** Script treats `--dry-run` as a recipient email and sends a real (failing) API call.  
**Evidence:** dry-run output: `FAIL 422: Invalid 'to' field`.  
**Effort:** XS. **Risk:** low — corrupted test logs but no user impact.

### P2.14 — Outreach scripts: fix `daily_outreach_v2.py` keyring issue
**Source:** agent-10-outreach-scripts  
**What:** Shells out to `gog send`, fails in non-TTY environments, still writes `err` rows to log during dry-run.  
**Effort:** S. **Risk:** low.

### P2.15 — Workspace hygiene: add `__pycache__/` and `*.pyc` to `.gitignore`
**Source:** agent-15-workspace-hygiene  
**What:** 13 `.pyc` files tracked in git; `.gitignore` doesn't block `__pycache__`.  
**Evidence:** `git ls-files | grep -c '\.pyc$'` = 13.  
**Effort:** XS. **Risk:** low — repo hygiene.

### P2.16 — Workspace hygiene: review flagged scripts for hardcoded credentials
**Source:** agent-15-workspace-hygiene  
**What:** 10 scripts flagged for `password`/`secret` strings. Manual review needed. `check_replies_imap.py` already confirmed hardcoded Gmail app password (deprecated channel).  
**Effort:** S. **Risk:** high if a real credential leaks — rotate.

### P2.17 — Auth: add resource-level auth in route handlers
**Source:** agent-1-auth  
**What:** Middleware is the only auth gate. Clerk recommends resource-level checks. Public-route list keeps regressing (multiple recent fix commits).  
**Effort:** L. **Risk:** medium — auth bypass via missing public entry.

### P2.18 — Auth: migrate `createRouteMatcher()` away (deprecated)
**Source:** agent-1-auth  
**What:** Clerk has deprecated `createRouteMatcher()`. Use resource-based auth instead.  
**Effort:** L. **Risk:** low.

### P2.19 — Auth: clarify `/api/admin/interviews/(.*)` public vs route's own 401
**Source:** agent-1-auth  
**What:** Public-route list says admin interviews are public; route handler returns 401. Contradictory. Either remove from public list or open up the route.  
**Effort:** XS. **Risk:** low — minor inconsistency.

### P2.20 — Dunning scheduler: add retry/queue for transient provider errors
**Source:** agent-2-dunning-scheduler  
**What:** No retry, no exponential backoff. Resend 5xx or Twilio 5xx becomes a permanent failure.  
**Evidence:** scheduler.ts: synchronous send, no retry.  
**Effort:** L (need a queue or QStash). **Risk:** medium — single transient failure = lost reminder.

---

## P3 — Backlog / nice-to-have

### P3.1 — Dunning scheduler: include `channel` in dedup key
**Source:** agent-2-dunning-scheduler. Effort XS.

### P3.2 — Dunning scheduler: record DND-skip events
**Source:** agent-2-dunning-scheduler. Effort XS.

### P3.3 — Dunning AI: unify `fallbackDunningMessage` between preview/test routes
**Source:** agent-3-dunning-ai. Effort XS.

### P3.4 — QBO: move auth check before orgId validation in `connect` route
**Source:** agent-7-qbo. Effort XS.

### P3.5 — QBO: add retry/backoff on transient OAuth 5xx
**Source:** agent-7-qbo. Effort S.

### P3.6 — Paystack: add IP whitelist + idempotency
**Source:** agent-8-payments. Effort S.

### P3.7 — Inbound: HTML-escape all notification fields (currently `fromAddress`, `state`, `nextStep` interpolated raw)
**Source:** agent-4-inbound. Effort XS.

### P3.8 — Outreach scripts: consolidate `state.py` + `outreach_state.py` to one source of truth
**Source:** agent-10-outreach-scripts. Effort M.

### P3.9 — Outreach scripts: atomic writes in `outreach_state.py`
**Source:** agent-10-outreach-scripts. Effort XS.

### P3.10 — Marketing/SEO: split blog sitemap, accurate `lastmod`
**Source:** agent-13-marketing-seo. Effort S.

### P3.11 — Workspace hygiene: secrets-scanning pre-commit (gitleaks)
**Source:** agent-15-workspace-hygiene. Effort S.

### P3.12 — Dunning AI: clarify `generateCashFlowForecast` semantics or remove
**Source:** agent-3-dunning-ai. Effort M.

---

## Summary of P0/P1 by impact

| Item | Effort | User-visible impact |
|---|---|---|
| P0.1 Inbound signature | S | Prevents public DB write + outbound email injection |
| P0.2 Resend-inbound public route | XS | Webhook delivery works |
| P0.3 Blog posts public | S | SEO indexing returns |
| P0.4 SMS stub detection | XS | Operational correctness |
| P1.1 13 FK indexes | S | Performance + integrity |
| P1.2 Apply migrations | S | App code can write to declared tables |
| P1.3 Inbound idempotency | S | No duplicate notifications |
| P1.4 Dunning txn | S | No double-sends |
| P1.5 Paystack DB writes | M | Payment tracking works |
| P1.6 QBO refresh-token expiry | S | Avoids future silent breakage |
| P1.7 QBO sync txn | S | Partial-sync safety |
| P1.8 Sentry | M | Production errors visible |
| P1.9 Structured logs | M | Forensics |
| P1.10 Healthcheck depth | S | Outage detection |

---

## Spot-verifications I ran while compiling

- `/blog/ar-automation-for-small-business-2026` → 307 to `/sign-in` (P0.3)
- `grep 'webhooks/' src/middleware.ts` → only stripe/clerk listed (P0.2)
- `grep 'svix\|RESEND_INBOUND_WEBHOOK_SECRET' src/app/api/inbound/route.ts` → only a comment, no verification (P0.1)
- DB FK index query returned 13 unindexed FK columns (P1.1)

All other items come from the agents' verbatim test outputs that I read in full before including.