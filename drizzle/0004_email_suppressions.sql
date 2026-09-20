-- 0004_email_suppressions.sql
-- /api/unsubscribe only ever ran:
--     UPDATE waitlist SET unsubscribed_at = $1 WHERE email = $2
-- A cold outreach recipient is not on the waitlist, so that matched zero rows,
-- while the endpoint still rendered "Unsubscribed ✓". Opt-outs from anyone who
-- was not already a waitlist signup or a customer were silently discarded.
--
-- This table accepts any address, so an opt-out always lands somewhere durable.
--
-- /api/unsubscribe also creates this table itself on 42P01 and retries, so an
-- opt-out is never lost to an unrun migration. This file stays as the canonical
-- schema definition and to keep drizzle in step; running it is still correct,
-- it is just no longer load-bearing.

CREATE TABLE IF NOT EXISTS email_suppressions (
  id          text PRIMARY KEY,
  email       text NOT NULL UNIQUE,
  reason      text NOT NULL DEFAULT 'unsubscribe',
  source      text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS email_suppressions_created_at_idx
  ON email_suppressions (created_at);
