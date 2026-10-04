/**
 * Make sure the live `reply_classification` Postgres enum knows 'unsubscribe'.
 *
 * inbox_messages.classification is text() in the Drizzle model but an enum in
 * the live database, so inserting a value the enum lacks fails. The same
 * no-migration-runner reason as sms-consent-schema.ts applies, so this runs on
 * demand, once per instance, before the first insert that could need it.
 *
 * Safe to repeat: ADD VALUE IF NOT EXISTS is a no-op the second time. It is
 * sent as its own statement (not inside a DO block or a transaction with the
 * insert), because a new enum value cannot be used in the transaction that
 * added it. When the column is plain text (PGlite dev, or a database that never
 * had the enum) the type does not exist and nothing is done.
 */
export type SqlRunner = (sql: string) => Promise<{ rows: Record<string, unknown>[] }>;

export const REPLY_ENUM_VALUE = 'unsubscribe';

export async function ensureReplyClassificationEnum(run: SqlRunner): Promise<'added' | 'present' | 'no_enum'> {
  const type = await run(`SELECT 1 AS one FROM pg_type WHERE typname = 'reply_classification' AND typtype = 'e'`);
  if (type.rows.length === 0) return 'no_enum';
  const has = await run(
    `SELECT 1 AS one FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid WHERE t.typname = 'reply_classification' AND e.enumlabel = '${REPLY_ENUM_VALUE}'`,
  );
  if (has.rows.length > 0) return 'present';
  await run(`ALTER TYPE reply_classification ADD VALUE IF NOT EXISTS '${REPLY_ENUM_VALUE}'`);
  return 'added';
}

let applied: Promise<void> | null = null;

/** Cached per instance; a failure is not cached so the next reply retries. */
export function ensureReplyClassificationSchema(): Promise<void> {
  if (process.env.USE_PGLITE === '1') return Promise.resolve();
  if (!applied) {
    applied = (async () => {
      const { pool } = await import('@/db');
      const client = await pool().connect();
      try {
        await ensureReplyClassificationEnum((q) => client.query(q));
      } finally {
        client.release();
      }
    })().catch((e) => {
      applied = null;
      throw e;
    });
  }
  return applied;
}
