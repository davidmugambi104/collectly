-- 0012_task_assignments.sql
-- Who a call task is assigned to. A new table; nothing existing changes.

CREATE TABLE IF NOT EXISTS task_assignments (
  run_id text PRIMARY KEY REFERENCES dunning_runs(id) ON DELETE CASCADE,
  org_id text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  assignee_id text NOT NULL,
  assignee_name text NOT NULL,
  assigned_by text,
  assigned_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS task_assignments_assignee_idx ON task_assignments (org_id, assignee_id);
