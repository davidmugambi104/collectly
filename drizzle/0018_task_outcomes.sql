-- 0018_task_outcomes.sql
-- What happened on a call, written when a call task is closed. A new table.

CREATE TABLE IF NOT EXISTS task_outcomes (
  run_id text PRIMARY KEY REFERENCES dunning_runs(id) ON DELETE CASCADE,
  org_id text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  outcome text,
  note text,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);
