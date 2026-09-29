-- 0006_dunning_controls.sql
-- Owner controls over automatic reminders. All new tables, no new columns on
-- existing ones, so deploying cannot break select-all queries.
--
-- dunning_holds: "I've spoken to them, leave it with me" for one customer.
--   Kept apart from customers.dnd_at, the compliance switch (unsubscribe, hard
--   bounce, spam complaint), which the app never clears.
-- dunning_settings: per-org switches. A missing row means approval is required.
-- dunning_approvals: reminders the scheduler drafted but did not send, waiting
--   for the owner to approve or skip.

CREATE TABLE IF NOT EXISTS dunning_holds (
  customer_id text PRIMARY KEY REFERENCES customers(id) ON DELETE CASCADE,
  org_id text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  held_until timestamptz,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS dunning_holds_org_idx ON dunning_holds (org_id);

CREATE TABLE IF NOT EXISTS dunning_settings (
  org_id text PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
  approval_required boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS dunning_approvals (
  run_id text PRIMARY KEY REFERENCES dunning_runs(id) ON DELETE CASCADE,
  org_id text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS dunning_approvals_org_idx ON dunning_approvals (org_id);
