-- Per-organization usage meter (ids and counts only, no customer data).
CREATE TABLE IF NOT EXISTS usage_events (
  id text PRIMARY KEY,
  org_id text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  kind text NOT NULL,
  units integer NOT NULL DEFAULT 1,
  model text,
  est_cost_micros bigint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS usage_events_org_time_idx ON usage_events (org_id, created_at);
