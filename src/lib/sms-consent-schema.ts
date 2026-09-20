/**
 * Apply the SMS consent schema at runtime, idempotently.
 *
 * drizzle/0005 defines it, but ensureBootstrapped() returns early unless
 * USE_PGLITE=1, so it does nothing in production -- and there is no reliable
 * way to run a migration against production from outside the running app. Same
 * reason webhook_events_seen self-creates in /api/webhooks/stripe and
 * email_suppressions does in /api/unsubscribe.
 *
 * This one matters more than those. Drizzle's select-all emits every column in
 * the model, so deploying the customers.sms_consent_status field against a
 * database that lacks it would throw undefined_column on any customer query --
 * taking down email dunning, not just SMS. Running the DDL before the first
 * query removes that window entirely.
 *
 * Every statement is IF NOT EXISTS or a duplicate_object catch, so it is safe
 * to run on every cold start, and the promise is cached so it runs once per
 * instance rather than once per call.
 */
import { pool } from '@/db';

const DDL = [
  `DO $$ BEGIN CREATE TYPE sms_consent_status AS ENUM ('none','pending','opted_in','opted_out');
   EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  `DO $$ BEGIN CREATE TYPE sms_consent_event_type AS ENUM ('invite_sent','opted_in','opted_out');
   EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  `ALTER TABLE customers ADD COLUMN IF NOT EXISTS sms_consent_status sms_consent_status NOT NULL DEFAULT 'none'`,
  `ALTER TABLE customers ADD COLUMN IF NOT EXISTS sms_consent_at timestamptz`,
  `CREATE TABLE IF NOT EXISTS sms_consent_events (
     id text PRIMARY KEY,
     org_id text REFERENCES organizations(id) ON DELETE CASCADE,
     customer_id text REFERENCES customers(id) ON DELETE SET NULL,
     phone text NOT NULL,
     event_type sms_consent_event_type NOT NULL,
     message_text text,
     twilio_sid text,
     created_at timestamptz NOT NULL DEFAULT now()
   )`,
  `CREATE INDEX IF NOT EXISTS sms_consent_events_phone_idx ON sms_consent_events (phone)`,
  `CREATE INDEX IF NOT EXISTS sms_consent_events_customer_idx ON sms_consent_events (customer_id)`,
  `CREATE INDEX IF NOT EXISTS sms_consent_events_created_at_idx ON sms_consent_events (created_at)`,
];

let applied: Promise<void> | null = null;

export function ensureSmsConsentSchema(): Promise<void> {
  if (process.env.USE_PGLITE === '1') return Promise.resolve(); // bootstrap-db already has it
  if (!applied) {
    applied = (async () => {
      const client = await pool().connect();
      try {
        for (const stmt of DDL) await client.query(stmt);
      } catch (e) {
        // Reset so a transient failure can be retried rather than cached as
        // done -- the same correction ensureBootstrapped makes.
        applied = null;
        console.error('[sms-consent] schema apply failed:', e instanceof Error ? e.message : e);
        throw e;
      } finally {
        client.release();
      }
    })();
  }
  return applied;
}
