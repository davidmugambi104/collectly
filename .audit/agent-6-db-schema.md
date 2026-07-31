# Agent 6: Database schema

## Tests run (with verbatim output)

### 1. \dt (tables)

```
Did not capture \dt output separately; pg_indexes list below confirms tables.
```

### 2. pg_indexes (table + index names)

```
 table               | indexname
----------------------+----------------------
 customer_preferences | cust_prefs_cust_idx
 customer_preferences | customer_preferences_pkey
 customers            | customers_ext_idx
 customers            | customers_org_idx
 customers            | customers_pkey
 disputes             | disputes_inv_idx
 disputes             | disputes_org_idx
 disputes             | disputes_status_idx
 disputes             | disputes_pkey
 dunning_runs         | dunning_sched_idx
 dunning_runs         | dunning_inv_idx
 dunning_runs         | dunning_runs_pkey
 dunning_sequences    | dunning_sequences_pkey
 events               | events_org_type_idx
 events               | events_pkey
 inbox_messages       | inbox_cust_idx
 inbox_messages       | inbox_messages_pkey
 inbox_messages       | inbox_org_status_idx
 integrations         | integrations_pkey
 integrations         | integrations_pair_idx
 invoices             | invoices_org_idx
 invoices             | invoices_pkey
 invoices             | invoices_due_idx
 invoices             | invoices_cust_idx
 invoices             | invoices_status_idx
 memberships          | memberships_pkey
 memberships          | memberships_pair_idx
 organizations        | organizations_pkey
 organizations        | organizations_slug_unique
 organizations        | orgs_slug_idx
 outreach_contacts    | outreach_contacts_pkey
 outreach_contacts    | outreach_contacts_email_key
 outreach_contacts    | outreach_contacts_email_idx
 outreach_replies     | outreach_replies_pkey
 outreach_replies     | outreach_replies_contact_idx
 payments             | payments_pkey
 payments             | payments_inv_idx
 payments             | payments_org_idx
 promises_to_pay      | ptop_inv_idx
 promises_to_pay      | ptop_status_idx
 promises_to_pay      | ptop_org_idx
 promises_to_pay      | promises_to_pay_pkey
 subscriptions        | subs_org_idx
 subscriptions        | subscriptions_pkey
 timeline_events      | timeline_events_pkey
 timeline_events      | timeline_cust_time_idx
 timeline_events      | timeline_inv_idx
 timeline_events      | timeline_org_type_idx
 upgrade_requests     | upgrade_req_status_idx
 upgrade_requests     | upgrade_requests_pkey
 upgrade_requests     | upgrade_req_org_idx
 users                | users_clerk_id_unique
 users                | users_email_unique
 users                | users_pkey
 waitlist             | waitlist_pkey
 waitlist             | waitlist_email_unique
(56 rows)
```

### 3. Row counts per table

```
t                   | count
---------------------+-------
invoices            |    22
customers           |    16
organizations       |     5
dunning_sequences   |     3
dunning_runs        |     9
integrations        |     2
outreach_contacts   |     5
outreach_replies    |    10
payments            |     4
events              |    14
subscriptions       |     0
memberships         |     4
users               |     5
waitlist            |     6
upgrade_requests    |     0
customer_preferences|     0
promises_to_pay     |     0
disputes            |     0
inbox_messages      |     0
timeline_events     |     0
(20 rows)
```

### 4. FK columns missing indexes

```
table               | column
---------------------+----------------------
customer_preferences| account_manager_id
customer_preferences| org_id
disputes            | customer_id
dunning_runs        | org_id
dunning_runs        | sequence_id
dunning_sequences   | org_id
inbox_messages      | action_taken_by
inbox_messages      | invoice_id
organizations       | owner_id
payments            | customer_id
promises_to_pay     | fulfilled_payment_id
promises_to_pay     | customer_id
timeline_events     | actor_id
(13 rows)
```

## Best-practice search findings

- **Drizzle ORM migrations best practice 2026**
  - https://orm.drizzle.team/docs/mysql/migrations (official migrations docs)
  - https://hassanjaved.work/blog/drizzle-orm-patterns-production-2026
  - https://tomodahinata.com/en/blog/drizzle-orm-typescript-type-safe-database-production-guide
  - https://dev.to/whoffagents/drizzle-orm-migrations-in-production-zero-downtime-schema-changes-e71
  Consensus: generate migrations with `drizzle-kit generate`, review SQL before applying, run `drizzle-kit push` only in dev; in production apply generated `.sql` with `drizzle-kit migrate` and keep migrations under version control.

- **Postgres index on foreign key necessity**
  - https://www.cybertec-postgresql.com/en/index-your-foreign-key/
  - https://www.percona.com/blog/should-i-create-an-index-on-foreign-keys-in-postgresql/
  - https://dba.stackexchange.com/questions/75894/postgresql-do-foreign-key-constraints-automatically-create-indexes
  - https://stackoverflow.com/questions/970562/postgres-and-indexes-on-foreign-keys-and-primary-keys
  Consensus: PostgreSQL **does not** auto-create indexes on FK columns. Add them unless the table is tiny or the FK is never queried/joined/deleted; indexes speed up joins and FK checks on parent deletes/updates and avoid table locks.

## What I found

### Missing indexes on FK columns (13)

| Table | FK column | Notes |
|---|---|---|
| `customer_preferences` | `org_id` | Already has unique index on `customer_id`; `org_id` FK unindexed |
| `customer_preferences` | `account_manager_id` | References `users.id`, no index |
| `disputes` | `customer_id` | Has `org_id`/`status` index, but FK to customers unindexed |
| `dunning_runs` | `org_id` | Has `invoice_id` + `status/scheduled_for`, but `org_id` FK unindexed |
| `dunning_runs` | `sequence_id` | FK to `dunning_sequences` unindexed |
| `dunning_sequences` | `org_id` | No index at all |
| `inbox_messages` | `invoice_id` | Has `orgId/status` + `customerId`, but invoice FK unindexed |
| `inbox_messages` | `action_taken_by` | FK to `users.id`, unindexed |
| `organizations` | `owner_id` | Only slug unique index; owner FK unindexed |
| `payments` | `customer_id` | Has `org_id` + `invoice_id`, but customer FK unindexed |
| `promises_to_pay` | `customer_id` | Has `org_id`/`invoice_id`/`status+promisedDate`, but customer FK unindexed |
| `promises_to_pay` | `fulfilled_payment_id` | Nullable self/related FK, unindexed |
| `timeline_events` | `actor_id` | FK to `users.id`, unindexed |

### Tables with zero rows vs declared schema

- `subscriptions`, `upgrade_requests`, `customer_preferences`, `promises_to_pay`, `disputes`, `inbox_messages`, `timeline_events` all have **0 rows**.
- `qbo_request_errors` is defined in `schema.ts` but **does not exist** in the live DB (not in `pg_indexes` list either). It appears newer tables (`customer_preferences`, `promises_to_pay`, `disputes`, `inbox_messages`, `timeline_events`, `qbo_request_errors`) were added to the Drizzle schema but **migrations have not been pushed/applied** to the live database — only the first 3 migration SQL files exist in `drizzle/`, and they do not cover those newer tables.
- `outreach_contacts` and `outreach_replies` exist in the DB but are **not present** in `src/db/schema.ts` — likely legacy or managed by a different skill/schema.

### Migration drift

- `drizzle/` contains only `0000_needy_hiroim.sql`, `0001_perpetual_kylun.sql`, `0002_add_unsubscribe_and_dnd.sql`.
- `0002` only alters `customers`/`waitlist`; it does not create `customer_preferences`, `promises_to_pay`, `disputes`, `inbox_messages`, `timeline_events`, or `qbo_request_errors`.
- Live DB schema is therefore **behind** the Drizzle schema file. Running `drizzle-kit push` or generating a new migration is required to reconcile.

### Data anomalies

- 5 organizations but only 4 memberships and 5 users — plausible.
- 22 invoices, 16 customers, only 4 payments, 9 dunning runs — low payment coverage; no hard anomaly but worth validating invoice/payment integrity.
- `disputes`/`promises_to_pay`/`inbox_messages`/`timeline_events` schemas exist in code but are empty; the app may be writing data to non-existent tables if code already references them.

## What should change

1. **Generate and apply missing migration** (P0). Run `npx drizzle-kit generate` and apply the resulting migration to create `customer_preferences`, `promises_to_pay`, `disputes`, `inbox_messages`, `timeline_events`, `qbo_request_errors`. Before applying, review generated SQL for destructive changes.
2. **Add FK indexes** (P1). Add indexes in `schema.ts` for all 13 unindexed FK columns, especially high-join tables: `dunning_runs.org_id`, `dunning_runs.sequence_id`, `dunning_sequences.org_id`, `payments.customer_id`, `inbox_messages.invoice_id`, `customer_preferences.org_id`. Generate a new migration.
3. **Reconcile `outreach_*` tables** (P2). Determine whether `outreach_contacts`/`outreach_replies` are legacy; either add them to the Drizzle schema or document why they are excluded.
4. **Enable `drizzle-kit migrate` in CI/Prod** (P2). Stop using `push` in production; apply version-controlled `.sql` migrations.

## Source / evidence

- `/home/davie/.openclaw/workspace/collectly/src/db/schema.ts`
- `/home/davie/.openclaw/workspace/collectly/drizzle.config.ts`
- `/home/davie/.openclaw/workspace/collectly/drizzle/0000_needy_hiroim.sql`
- `/home/davie/.openclaw/workspace/collectly/drizzle/0001_perpetual_kylun.sql`
- `/home/davie/.openclaw/workspace/collectly/drizzle/0002_add_unsubscribe_and_dnd.sql`
- Live PostgreSQL queries via `DATABASE_URL` from `.env.local`
