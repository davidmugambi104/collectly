-- 0008_customer_groups.sql
-- Customer groups, each optionally with its own reminder schedule. A group's
-- schedule is an ordinary dunning_sequences row linked via group_sequences.
-- All new tables; nothing existing changes.

CREATE TABLE IF NOT EXISTS customer_groups (
  id text PRIMARY KEY,
  org_id text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS customer_groups_org_name_uniq ON customer_groups (org_id, name);

CREATE TABLE IF NOT EXISTS customer_group_members (
  customer_id text PRIMARY KEY REFERENCES customers(id) ON DELETE CASCADE,
  group_id text NOT NULL REFERENCES customer_groups(id) ON DELETE CASCADE,
  org_id text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS customer_group_members_group_idx ON customer_group_members (group_id);

CREATE TABLE IF NOT EXISTS group_sequences (
  group_id text PRIMARY KEY REFERENCES customer_groups(id) ON DELETE CASCADE,
  sequence_id text NOT NULL REFERENCES dunning_sequences(id) ON DELETE CASCADE,
  org_id text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE
);
