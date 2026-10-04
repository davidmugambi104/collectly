-- 0021_inbox_poll_validity.sql
-- IMAP UIDVALIDITY per polled mailbox. A new table; nothing existing changes.
-- Also widens the live reply_classification enum for the 'unsubscribe' reply type
-- (the app also does this itself at runtime; see src/lib/inbox-schema.ts).

CREATE TABLE IF NOT EXISTS inbox_poll_validity (
  mailbox text PRIMARY KEY,
  uid_validity bigint NOT NULL,
  last_reset_at timestamptz,
  last_reset_reason text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'reply_classification' AND typtype = 'e') THEN
    ALTER TYPE reply_classification ADD VALUE IF NOT EXISTS 'unsubscribe';
  END IF;
END $$;
