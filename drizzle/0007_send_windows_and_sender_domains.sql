-- 0007_send_windows_and_sender_domains.sql
-- Send windows (act only in the owner's business hours) and a customer's own
-- verified sending domain. Columns are added to dunning_settings, which only the
-- reminder code reads, so this cannot affect select-all queries on customers or
-- organizations. The domain table is new.

ALTER TABLE dunning_settings ADD COLUMN IF NOT EXISTS send_window_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE dunning_settings ADD COLUMN IF NOT EXISTS send_window_start smallint NOT NULL DEFAULT 9;
ALTER TABLE dunning_settings ADD COLUMN IF NOT EXISTS send_window_end smallint NOT NULL DEFAULT 17;
ALTER TABLE dunning_settings ADD COLUMN IF NOT EXISTS send_days smallint NOT NULL DEFAULT 31;
ALTER TABLE dunning_settings ADD COLUMN IF NOT EXISTS send_timezone text;

CREATE TABLE IF NOT EXISTS dunning_sender_domains (
  org_id text PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
  domain text NOT NULL UNIQUE,
  local_part text NOT NULL DEFAULT 'billing',
  provider_domain_id text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  records jsonb NOT NULL DEFAULT '[]'::jsonb,
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
