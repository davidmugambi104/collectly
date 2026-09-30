-- 0014_statement_log.sql
-- Statements emailed to customers. A new table; nothing existing changes.

CREATE TABLE IF NOT EXISTS statement_log (
  id text PRIMARY KEY,
  org_id text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  customer_id text NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  to_address text NOT NULL,
  subject text NOT NULL,
  totals jsonb NOT NULL,
  sent_by text,
  external_id text,
  sent_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS statement_log_customer_idx ON statement_log (org_id, customer_id);
