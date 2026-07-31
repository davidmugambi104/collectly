# Dirty tree triage — 2026-07-31 18:08 EAT

Inventory of all uncommitted changes in `collectly/`. Captured by category with disposition recommendation. Reference `git status --short` snapshot for full list.

Counts: 39 modified, 1 deleted, ~35 untracked. Total ~75 dirty entries.

---

## A. Real app code (should be committed) — 12 untracked API routes, 8 dashboard pages, 6 lib files

The dirty tree contains substantial real app code that has never been committed but is functional:

### Untracked API routes (12 files in 8 routes)
- `src/app/api/customer-preferences/route.ts` — full CRUD over `customer_preferences` table (already in DB & dirty schema)
- `src/app/api/disputes/route.ts` — full CRUD over `disputes`
- `src/app/api/forecast-explainable/route.ts`
- `src/app/api/inbox/route.ts`
- `src/app/api/promises/route.ts`
- `src/app/api/reset-data/route.ts`
- `src/app/api/support/route.ts`
- `src/app/api/timeline/route.ts`
- `src/app/api/webhooks/clerk/route.ts`
- `src/app/api/webhooks/resend-delivery/route.ts`

These reference tables that exist in live DB and dirty `schema.ts` but NOT in HEAD's `schema.ts`. The dirty schema has 6 extra tables (`customerPreferences`, `promisesToPay`, `disputes`, `inboxMessages`, `qboRequestErrors`, `timelineEvents`) plus new enums (`accountSensitivity`, `replyClassification`, `disputeReason`, `promiseStatus`, `timelineEventType`). **Drizzle migrations 0000–0002 don't cover any of these — they only exist because someone manually created them in the DB and wrote the schema afterward.**

### Untracked lib files (6 files)
- `src/lib/api-errors.ts` — centralized error helpers
- `src/lib/classify-reply.ts` — reply classifier
- `src/lib/explainable-forecast.ts`
- `src/lib/mfa.ts` — MFA enforcement (referenced by dirty `middleware.ts`)
- `src/lib/oauth-state.ts`
- `src/lib/qbo-ensure-table.ts`, `qbo-error-logger.ts` — QBO helpers (referenced by dirty `quickbooks.ts`)

### Untracked dashboard routes (5)
- `src/app/dashboard/cash-flow-explainable/`
- `src/app/dashboard/inbox/`
- `src/app/dashboard/relationships/`
- `src/app/dashboard/support/`

**Recommendation:** treat as a single "v3 schema + dispute/promise/MFA" feature batch. Owner should review the dirty `schema.ts` (197 added lines), the 12 untracked API routes, and the untracked lib files together as one feature, then commit as a series of focused commits (`feat(schema): add disputes/promises/customer_preferences/timeline tables`, `feat(api): add relationship-aware collections API`, `feat(auth): MFA enforcement`).

---

## B. Modified marketing pages + components (15 files) — probably safe

- `src/app/{about,contact,customers,features,integrations,page,pricing,privacy,security,terms,tour,dpa}/page.tsx` (12 pages)
- `src/app/dashboard/{customers/[id]/page.tsx,invoices/page.tsx,dashboard/integrations/{integration-controls,sample-data-button}.tsx}` (4)
- `src/components/{app/shell.tsx, marketing/{footer,header}.tsx}` (3)

Roughly 245+ insertions across `src/app/page.tsx` alone. Looks like an "honest marketing refresh" — copy adjustments, removed fake trust signals, added free audit lead magnet (consistent with commit history `ae05710 marketing: honest trust signals, free A/R audit lead magnet, remove fake logos`).

**Recommendation:** the marketing changes appear intentional and authored by the same person as recent commits (`ae05710`, `cc5d0e3`, `baafe3b`). Review the diffs and commit as `marketing: ...` once confirmed.

---

## C. Modified API routes (4 files) — likely coupled to dirty QBO

- `src/app/api/integrations/sync/route.ts`
- `src/app/api/quickbooks/callback/route.ts`
- `src/app/api/quickbooks/connect/route.ts`
- `src/app/api/seed-sample/route.ts`

`sync/route.ts` imports `QboReconnectRequiredError` and `getQboReconnectUrl` from `@/lib/integrations/quickbooks` — these symbols only exist in the dirty version of `quickbooks.ts`, not HEAD. **I added minimal stubs to HEAD's `quickbooks.ts` so build passes; the dirty `quickbooks.ts` has the real implementation. The dirty `sync/route.ts` is functionally broken against HEAD's QBO until the dirty QBO is also merged.**

`quickbooks/{callback,connect}/route.ts` and `seed-sample/route.ts` look like handler improvements (better error handling, OAuth state binding).

**Recommendation:** merge the dirty `quickbooks.ts` and these routes as one feature batch. Until then, dirty `sync/route.ts` is functionally broken even though it builds.

---

## D. Modified lib (3 files) — internal helpers

- `src/lib/auth-helper.ts` — probably adds Clerk org auto-creation logic (197 insertions in dirty schema, but auth-helper is independent)
- `src/lib/bootstrap-db.ts` — table bootstrap
- `src/lib/utils.ts` — small helpers

**Recommendation:** review individually; these are foundation files with broad impact.

---

## E. Docs + config (12 files) — safe to commit as housekeeping

- `.env.example` (template, not a secret)
- `DEPLOY.md`, `README.md`, `launch/hackernews/README.md`, `ops/{founder-content,setup-keys,strategy}.md`
- `outreach/policy/collectly_bot_policy.md` (active policy — already an authoritative file)
- `outreach/data/{seed-inbox-test-log,warmup-contacts}.csv` (operational data; `warmup-contacts.csv` should not be public if it contains real addresses)
- `package.json` + `package-lock.json` (adds `csv-parse`, `googleapis`, `svix`)

**Recommendation:** commit as `docs: ...` and `chore(deps): ...` separately.

---

## F. Deleted file (1) — correct

- `outreach/queue/gog-auth-pending-2026-07-29.txt` — Gmail deprecation. The `.DEPRECATED-do-not-use-gmail-path-retired-2026-07-31` file already exists as a tombstone. Safe to commit.

---

## G. Untracked noise — should not be committed

### Backup files (1)
- `outreach/data/warmup-contacts.csv.bak-2026-07-31-pre-day8` — backup of warmup contacts CSV. Should be removed or `.gitignore`'d.

### Deprecated tombstone (1)
- `outreach/queue/gog-auth-pending-2026-07-29.txt.DEPRECATED-do-not-use-gmail-path-retired-2026-07-31` — informational. Could be committed (it's a marker) or left untracked.

### Python bytecode (2 files)
- `outreach/scripts/__pycache__/outreach_state.cpython-312.pyc`
- `outreach/scripts/__pycache__/warmup_send.cpython-312.pyc`

**Recommendation:** add `__pycache__/` and `*.pyc` to `.gitignore` (P2.15 audit fix). 13 more `.pyc` files are tracked in git — untrack them in a separate cleanup commit.

### Dev helpers (12 files)
- `scripts/_check-qbo.mts`, `_clerk-mint.mjs`, `build-prospect-csv.mjs`, `bulk-import.mjs`, `clerk-webhook-check.mts`, `connect-flow-check.mts`, `mfa-check.mts`, `prospecting.mjs`, `qbo-smoke.mts`, `qbo-state-check.mts`, `sheets-test.mjs`, `sheets.mjs`, `verify-emails.mjs`
- `review-screenshot.js` (top-level, looks experimental)
- `ops/smoke.sh`

**Recommendation:** these are smoke/test/script tools. Some may belong in `scripts/` (the existing folder); others may be one-offs. Either commit as `chore(scripts): add smoke + prospect helpers` or move out of the workspace.

---

## H. Summary by disposition

| Bucket | Count | Disposition |
|---|---|---|
| Real app code (untracked API/dashboard/lib) | ~26 files | Owner must review and commit as feature batch |
| Modified marketing | ~15 files | Likely safe; commit as `marketing:` |
| Modified API routes | 4 files | Coupled with dirty QBO — bundle with feature batch |
| Modified lib | 3 files | Review individually |
| Docs + config | 12 files | Commit as housekeeping |
| Deleted file | 1 | Commit |
| Backup files | 1 | Remove or gitignore |
| Deprecated tombstone | 1 | Commit or leave untracked |
| Python bytecode (tracked) | 13 files | Untrack + add `__pycache__/` to gitignore |
| Python bytecode (untracked) | 2 files | Already ignored by gitignore if we add the pattern |
| Dev helpers | 12 files | Commit as `chore(scripts):` or move out |

---

## I. Quick wins the user can do right now

1. **Add `__pycache__/` and `*.pyc` to `.gitignore`** (P2.15 audit) — one-line fix; untrack the 13 existing `.pyc` files in a cleanup commit.
2. **Move `outreach/data/warmup-contacts.csv.bak-*` out of repo** (or gitignore backups).
3. **Decide on `scripts/`**: commit as one `chore(scripts): ...` batch, or move to `ops/`/`local-bot-lab/`/etc.
4. **Decide on dirty feature batch**: schedule time to review `src/db/schema.ts` (+197 lines), 12 untracked API routes, 6 untracked lib files, dashboard pages as one "v3 schema" feature commit series.
5. **Audit CSV in `outreach/data/`** — these contain prospect data; check what's safe to commit publicly vs needs `.gitignore`/private storage.

---

## J. Recommendation on per-file risk

Highest risk to ship without review: dirty `src/db/schema.ts` (197 added lines including new enums and 6 new tables), dirty `quickbooks.ts` (~500 added lines, new error classes), untracked lib files that touch auth (`api-errors.ts`, `mfa.ts`, `oauth-state.ts`).

Medium risk: dirty marketing pages (high churn, but cosmetic), untracked dashboard pages (full routes, but visible only to authed users).

Low risk: docs, ops, deleted file, deprecated tombstone, dev helpers.

The dirty tree contains a substantial next-version of Collectly that has never landed on `main`. The audit + fixes today (P0 + P1 + P2 + P1.6) are orthogonal to that work and ship cleanly. The next planning session should focus on whether to merge the dirty feature batch as-is, break it into smaller PRs, or revert.