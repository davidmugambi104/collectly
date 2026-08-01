/**
 * Idempotent production migration: ensure QBO error log table exists.
 *
 * Called once per cold start from the QBO client. We use raw SQL
 * (CREATE TABLE IF NOT EXISTS) so it's safe to call on every request.
 *
 * Why: the production Postgres DB doesn't run drizzle-kit migrations
 * automatically, so any new tables need an idempotent fallback.
 */
import { sql } from 'drizzle-orm';
import { db } from '@/db';

let ensured = false;

export async function ensureQboErrorTable(): Promise<void> {
  if (ensured) return;
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS qbo_request_errors (
        id text PRIMARY KEY,
        org_id text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        endpoint text NOT NULL,
        method text NOT NULL,
        status integer NOT NULL,
        intuit_tid text,
        intuit_error_code text,
        intuit_error_message text,
        fault_type text,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS qbo_err_org_time_idx ON qbo_request_errors(org_id, created_at)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS qbo_err_status_idx ON qbo_request_errors(status)`);
    ensured = true;
  } catch (e) {
    // If the table already exists with different schema, log and continue.
    console.error('[qbo-errors] ensureTable failed (continuing):', (e as Error)?.message);
  }
}