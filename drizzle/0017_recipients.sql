-- 0017_recipients.sql
-- Extra recipients per customer (each gets their own email and opt-out) and the
-- message ids of reminder copies, so replies from copied people are matched.
-- New tables; nothing existing changes.

CREATE TABLE IF NOT EXISTS customer_recipients (
  id text PRIMARY KEY,
  org_id text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  customer_id text NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  email text NOT NULL,
  name text,
  unsubscribed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS customer_recipients_customer_email_uniq ON customer_recipients (customer_id, email);
CREATE INDEX IF NOT EXISTS customer_recipients_email_idx ON customer_recipients (email);
CREATE TABLE IF NOT EXISTS reminder_copies (
  id text PRIMARY KEY,
  run_id text NOT NULL REFERENCES dunning_runs(id) ON DELETE CASCADE,
  email text NOT NULL,
  external_message_id text,
  sent_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS reminder_copies_msg_idx ON reminder_copies (external_message_id);
CREATE INDEX IF NOT EXISTS reminder_copies_run_idx ON reminder_copies (run_id);
