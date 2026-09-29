/**
 * Create the dunning_holds table at runtime, idempotently.
 *
 * Same reason as sms-consent-schema.ts: production has no reliable way to run a
 * migration from outside the app, so the table creates itself. drizzle/0006
 * holds the same DDL for anyone who does run migrations.
 *
 * This is a new table on purpose, not a column on customers. Drizzle's
 * select-all emits every model column, so a missing customers column would make
 * every customer query throw until the DDL ran. A missing dunning_holds table
 * can only break the code that asks about holds, and each of those callers runs
 * this first (and the dashboard read is wrapped so the page still renders).
 *
 * Every statement is IF NOT EXISTS, and the promise is cached per instance.
 */
import { pool } from '@/db';

const DDL = [
  `CREATE TABLE IF NOT EXISTS dunning_holds (
     customer_id text PRIMARY KEY REFERENCES customers(id) ON DELETE CASCADE,
     org_id text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
     held_until timestamptz,
     reason text,
     created_at timestamptz NOT NULL DEFAULT now(),
     updated_at timestamptz NOT NULL DEFAULT now()
   )`,
  `CREATE INDEX IF NOT EXISTS dunning_holds_org_idx ON dunning_holds (org_id)`,
];

let applied: Promise<void> | null = null;

export function ensureDunningHoldSchema(): Promise<void> {
  if (process.env.USE_PGLITE === '1') return Promise.resolve(); // bootstrap-db already has it
  if (!applied) {
    applied = (async () => {
      const client = await pool().connect();
      try {
        for (const stmt of DDL) await client.query(stmt);
      } catch (e) {
        // Reset so a transient failure is retried, not cached as done.
        applied = null;
        console.error('[dunning-hold] schema apply failed:', e instanceof Error ? e.message : e);
        throw e;
      } finally {
        client.release();
      }
    })();
  }
  return applied;
}
