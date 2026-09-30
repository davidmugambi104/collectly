/**
 * Create the owner-control tables at runtime, idempotently:
 *
 *   dunning_holds      per-customer pause on automatic reminders
 *   dunning_settings   per-org switches (approval before send, send window)
 *   dunning_sender_domains  a customer's own verified sending domain
 *   dunning_approvals  drafted reminders waiting for the owner
 *
 * Same reason as sms-consent-schema.ts: production has no reliable way to run a
 * migration from outside the app, so the tables create themselves. drizzle/0006
 * holds the same DDL for anyone who does run migrations.
 *
 * All three are new tables on purpose, not new columns. Drizzle's select-all
 * emits every model column, so a missing column on customers or organizations
 * would break every query on those tables until the DDL ran. A missing new
 * table only breaks the code that asks about it, and each caller runs this
 * first.
 *
 * Every statement is IF NOT EXISTS, and the promise is cached per instance.
 */
import { pool } from '@/db';

export const DUNNING_CONTROL_DDL = [
  `CREATE TABLE IF NOT EXISTS dunning_holds (
     customer_id text PRIMARY KEY REFERENCES customers(id) ON DELETE CASCADE,
     org_id text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
     held_until timestamptz,
     reason text,
     created_at timestamptz NOT NULL DEFAULT now(),
     updated_at timestamptz NOT NULL DEFAULT now()
   )`,
  `CREATE INDEX IF NOT EXISTS dunning_holds_org_idx ON dunning_holds (org_id)`,
  `CREATE TABLE IF NOT EXISTS dunning_settings (
     org_id text PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
     approval_required boolean NOT NULL DEFAULT true,
     updated_at timestamptz NOT NULL DEFAULT now()
   )`,
  `ALTER TABLE dunning_settings ADD COLUMN IF NOT EXISTS send_window_enabled boolean NOT NULL DEFAULT false`,
  `ALTER TABLE dunning_settings ADD COLUMN IF NOT EXISTS send_window_start smallint NOT NULL DEFAULT 9`,
  `ALTER TABLE dunning_settings ADD COLUMN IF NOT EXISTS send_window_end smallint NOT NULL DEFAULT 17`,
  `ALTER TABLE dunning_settings ADD COLUMN IF NOT EXISTS send_days smallint NOT NULL DEFAULT 31`,
  `ALTER TABLE dunning_settings ADD COLUMN IF NOT EXISTS send_timezone text`,
  `CREATE TABLE IF NOT EXISTS dunning_sender_domains (
     org_id text PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
     domain text NOT NULL UNIQUE,
     local_part text NOT NULL DEFAULT 'billing',
     provider_domain_id text NOT NULL,
     status text NOT NULL DEFAULT 'pending',
     records jsonb NOT NULL DEFAULT '[]'::jsonb,
     verified_at timestamptz,
     created_at timestamptz NOT NULL DEFAULT now(),
     updated_at timestamptz NOT NULL DEFAULT now()
   )`,
  `CREATE TABLE IF NOT EXISTS dunning_approvals (
     run_id text PRIMARY KEY REFERENCES dunning_runs(id) ON DELETE CASCADE,
     org_id text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
     created_at timestamptz NOT NULL DEFAULT now()
   )`,
  `CREATE INDEX IF NOT EXISTS dunning_approvals_org_idx ON dunning_approvals (org_id)`,
];

let applied: Promise<void> | null = null;

export function ensureDunningControlSchema(): Promise<void> {
  if (process.env.USE_PGLITE === '1') return Promise.resolve(); // bootstrap-db already has it
  if (!applied) {
    applied = (async () => {
      const client = await pool().connect();
      try {
        for (const stmt of DUNNING_CONTROL_DDL) await client.query(stmt);
      } catch (e) {
        // Reset so a transient failure is retried, not cached as done.
        applied = null;
        console.error('[dunning-control] schema apply failed:', e instanceof Error ? e.message : e);
        throw e;
      } finally {
        client.release();
      }
    })();
  }
  return applied;
}
