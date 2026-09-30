-- 0011_inbox_replies.sql
-- What the organisation has written back to a customer from the Inbox.
-- A new table; nothing existing changes.

CREATE TABLE IF NOT EXISTS inbox_replies (
  id text PRIMARY KEY,
  org_id text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  message_id text NOT NULL REFERENCES inbox_messages(id) ON DELETE CASCADE,
  to_address text NOT NULL,
  subject text NOT NULL,
  body text NOT NULL,
  sent_by text,
  external_id text,
  sent_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS inbox_replies_message_idx ON inbox_replies (message_id);
