-- 0015_late_fees.sql
-- Late fee policy (one row per org) and the ledger of fees the owner decided on.
-- New tables; nothing existing changes. A fee never alters an invoice's amount.

CREATE TABLE IF NOT EXISTS late_fee_policy (
  org_id text PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT false,
  kind text NOT NULL DEFAULT 'percent',
  value numeric(14,2) NOT NULL DEFAULT 0,
  currency varchar(3) NOT NULL DEFAULT 'USD',
  grace_days smallint NOT NULL DEFAULT 14,
  repeat_monthly boolean NOT NULL DEFAULT false,
  cap_percent numeric(5,2),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS late_fees (
  id text PRIMARY KEY,
  org_id text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  invoice_id text NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  period smallint NOT NULL,
  amount numeric(14,2) NOT NULL,
  currency varchar(3) NOT NULL,
  status text NOT NULL,
  decided_by text,
  decided_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);
CREATE UNIQUE INDEX IF NOT EXISTS late_fees_invoice_period_uniq ON late_fees (invoice_id, period);
CREATE INDEX IF NOT EXISTS late_fees_org_idx ON late_fees (org_id, status);
