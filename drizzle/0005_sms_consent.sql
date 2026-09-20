-- 0005_sms_consent.sql
-- Double opt-in for SMS payment reminders, required for Twilio toll-free
-- verification. Consent is tracked separately from customers.dnd_at: dnd_at is
-- a blanket "stop all dunning" switch, this is express consent for SMS
-- specifically, and it starts at 'none' because having a phone number on file
-- is not permission to text it.

DO $$ BEGIN
  CREATE TYPE sms_consent_status AS ENUM ('none', 'pending', 'opted_in', 'opted_out');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE sms_consent_event_type AS ENUM ('invite_sent', 'opted_in', 'opted_out');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS sms_consent_status sms_consent_status NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS sms_consent_at timestamptz;

-- Append-only audit. Twilio asks for proof of consent, and "the customer row
-- says opted_in" is an assertion rather than proof; this records what was sent,
-- what came back, and when. phone is NOT NULL and customer_id is nullable on
-- purpose: a STOP can arrive from a number we have not matched to a customer
-- and must still be honoured and recorded.
CREATE TABLE IF NOT EXISTS sms_consent_events (
  id           text PRIMARY KEY,
  org_id       text REFERENCES organizations(id) ON DELETE CASCADE,
  customer_id  text REFERENCES customers(id) ON DELETE SET NULL,
  phone        text NOT NULL,
  event_type   sms_consent_event_type NOT NULL,
  message_text text,
  twilio_sid   text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sms_consent_events_phone_idx      ON sms_consent_events (phone);
CREATE INDEX IF NOT EXISTS sms_consent_events_customer_idx   ON sms_consent_events (customer_id);
CREATE INDEX IF NOT EXISTS sms_consent_events_created_at_idx ON sms_consent_events (created_at);
