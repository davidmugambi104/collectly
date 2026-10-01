-- 0019_scheduled_statements.sql
-- Monthly statement drafts (always held for approval) and their two settings.

ALTER TABLE dunning_settings ADD COLUMN IF NOT EXISTS statements_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE dunning_settings ADD COLUMN IF NOT EXISTS statements_day smallint NOT NULL DEFAULT 1;
CREATE TABLE IF NOT EXISTS statement_drafts (
  id text PRIMARY KEY,
  org_id text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  customer_id text NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  period text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz
);
CREATE UNIQUE INDEX IF NOT EXISTS statement_drafts_customer_period_uniq ON statement_drafts (customer_id, period);
CREATE INDEX IF NOT EXISTS statement_drafts_org_status_idx ON statement_drafts (org_id, status);
