# QBO graceful-degradation backlog

Captured during Intuit questionnaire prep on 2026-07-27. Davie explicitly deferred
these because they're not launch-blocking and need real customer data to validate
the right shape. Re-evaluate after the Intuit submission lands and we have live
edge cases flowing through `syncQboForOrg`.

## Context

`src/lib/integrations/quickbooks.ts` was hardened for the Intuit security review
(401 retry-once, reconnect-required on invalid_grant, CSRF state validation, audit
log on state rejections). What it does NOT yet handle gracefully is the QBO
plan-downgrade / endpoint-loss scenario, where:

- A customer downgrades QBO from Plus to Simple Start, and an endpoint we
  call (e.g. Aged Receivables report, or multi-currency invoice fields)
  suddenly returns 403.
- A field that was always present in the response disappears.
- A field that was always a valid date string returns `""` or `"0000-00-00"`.

Current behavior in all three cases: no crash, no reconnect, but the sync
either silently skips or silently writes degraded data. That's better than
crashing but worse than telling the user.

## Items

### 1. Surface field-degradation warnings

**Where:** `syncQboForOrg` in `src/lib/integrations/quickbooks.ts`, in the
customer + invoice loops.

**What:** Detect when `CurrencyRef`, `PrimaryEmailAddr`, `PrimaryPhone`,
`DueDate`, `TxnDate`, or `TotalAmount` are missing/null on individual rows.
Push a structured warning into `errors[]` (e.g. `invoice 123: missing CurrencyRef`).
Return that count in the `QboSyncResult` so the UI can show
"3 invoices missing currency" instead of silently writing `'USD'` defaults.

**Estimated effort:** 10 lines.

**Why deferred:** Need to see whether the warnings become noise (every invoice
missing a field) or signal (3 out of 100 invoices missing a field) before
deciding on UI surface area.

### 2. Distinguish 403 plan-downgrade from 403 app-revocation

**Where:** `isAuthFailure()` in `src/lib/integrations/quickbooks.ts`.

**What:** Currently `isAuthFailure()` returns `true` only for 401 and a small
set of auth-specific codes. A 403 falls through as a soft error. If Intuit
ever returns 403 for OAuth-level app revocation (currently they return 401,
but no contract here), we'd silently swallow it.

Add a soft "permission issue" detection: status 403 + fault message containing
`scope` / `permission` / `authorization` → surface as a typed signal (e.g.
`QboPermissionNarrowedError`) that the UI can render as
"Your QuickBooks plan no longer includes this feature — please reconnect from
a different company" without firing the hard reconnect flow.

**Estimated effort:** 15 lines + a new error class + one UI surface.

**Why deferred:** Live behavior of QBO 403s in downgrade scenarios is unknown.
Better to ship after we observe one than to guess.

### 3. Per-invoice row-level try/catch around field extraction

**Where:** Inside the `for (const inv of qboInvoices)` loop, around the block
that builds the local invoice row.

**What:** `new Date(inv.DueDate)` and `new Date(inv.TxnDate)` can return
`Invalid Date` if QBO sends `""` or a malformed string. Currently `Invalid Date`
flows through into the DB as a bad timestamp. Wrap the field-extraction block
in a `try` and `continue` on failure with a row-scoped error logged to
`qbo_request_errors`.

**Estimated effort:** 8 lines.

**Why deferred:** Hasn't surfaced in the wild yet; adding it now risks masking
other validation issues if I'm not careful about what counts as a "bad" date.

## How to pick this back up

When re-evaluating:

1. Re-read the original analysis in this session's history (Davie's question
   on 2026-07-27 16:47 GMT+3 about plan-downgrade handling).
2. Look at `qbo_request_errors` rows tagged with `status=403` or
   `fault_type=ValidationFault` once we have live data.
3. Prioritize item 3 first (lowest risk, highest data-correctness value),
   then 1, then 2.

## Status

- [ ] Item 1: field-degradation warnings
- [ ] Item 2: 403 plan-downgrade vs app-revocation
- [ ] Item 3: per-invoice row-level try/catch
