-- 0003_add_missing_fk_indexes.sql
-- P1.1 from 15-agent audit (collectly/.audit/UPGRADE-PRIORITY-LIST.md)
-- 13 FK columns without indexes on live Postgres.
-- Postgres does not auto-create indexes on FK columns; they slow joins and
-- block cascade deletes/updates.

CREATE INDEX IF NOT EXISTS customer_preferences_org_id_idx
  ON customer_preferences (org_id);
CREATE INDEX IF NOT EXISTS customer_preferences_account_manager_id_idx
  ON customer_preferences (account_manager_id);

CREATE INDEX IF NOT EXISTS disputes_customer_id_idx
  ON disputes (customer_id);

CREATE INDEX IF NOT EXISTS dunning_runs_org_id_idx
  ON dunning_runs (org_id);
CREATE INDEX IF NOT EXISTS dunning_runs_sequence_id_idx
  ON dunning_runs (sequence_id);

CREATE INDEX IF NOT EXISTS dunning_sequences_org_id_idx
  ON dunning_sequences (org_id);

CREATE INDEX IF NOT EXISTS inbox_messages_invoice_id_idx
  ON inbox_messages (invoice_id);
CREATE INDEX IF NOT EXISTS inbox_messages_action_taken_by_idx
  ON inbox_messages (action_taken_by);

CREATE INDEX IF NOT EXISTS organizations_owner_id_idx
  ON organizations (owner_id);

CREATE INDEX IF NOT EXISTS payments_customer_id_idx
  ON payments (customer_id);

CREATE INDEX IF NOT EXISTS promises_to_pay_customer_id_idx
  ON promises_to_pay (customer_id);
CREATE INDEX IF NOT EXISTS promises_to_pay_fulfilled_payment_id_idx
  ON promises_to_pay (fulfilled_payment_id);

CREATE INDEX IF NOT EXISTS timeline_events_actor_id_idx
  ON timeline_events (actor_id);
-- P1.4 audit fix 2026-07-31: scheduler dedup races.
-- Composite unique constraint so concurrent cron invocations cannot
-- double-schedule the same (invoice, sequence, step). Pre-existing
-- dedup was application-level (SELECT + INSERT); now atomic at the DB.
-- Verified zero duplicates before adding.
CREATE UNIQUE INDEX IF NOT EXISTS dunning_runs_invoice_seq_step_uniq
  ON dunning_runs (invoice_id, sequence_id, step_id);

-- P1.5 audit fix 2026-07-31: Paystack webhook idempotency.
-- Partial unique index ensures one payments row per Paystack charge id.
-- Provider-supplied id (data.id in Paystack charge.success) is more
-- reliable than reference (which can be reused for retries).
CREATE UNIQUE INDEX IF NOT EXISTS payments_paystack_charge_uniq
  ON payments (external_id)
  WHERE external_id IS NOT NULL;
