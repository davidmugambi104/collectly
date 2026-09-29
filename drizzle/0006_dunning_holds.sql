-- 0006_dunning_holds.sql
-- Owner-set pause on automatic reminders for one customer ("I've spoken to
-- them, leave it with me"). Kept apart from customers.dnd_at, which is the
-- compliance switch (unsubscribe, hard bounce, spam complaint) and is never
-- cleared from the app. A new table rather than a customers column so that
-- deploying it cannot break select-all queries on customers.

CREATE TABLE IF NOT EXISTS dunning_holds (
  customer_id text PRIMARY KEY REFERENCES customers(id) ON DELETE CASCADE,
  org_id text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  held_until timestamptz,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS dunning_holds_org_idx ON dunning_holds (org_id);
