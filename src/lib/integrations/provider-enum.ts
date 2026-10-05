/**
 * Make sure the live `integration_provider` Postgres enum knows the newer providers.
 *
 * integrations.provider is an enum in the live database (text on PGlite dev). Inserting a value the enum
 * lacks fails, and there is no migration runner, so this runs on demand, once per instance, before any
 * insert into `integrations`. Same safe pattern as src/lib/inbox-schema.ts:
 *  - every ALTER TYPE ... ADD VALUE IF NOT EXISTS is its own statement (a new enum value cannot be used in
 *    the transaction that added it, and ADD VALUE does not mix with other work in a DO block on older Postgres);
 *  - a no-op when the column is plain text (the type does not exist) and under USE_PGLITE=1.
 * The matching drizzle file is drizzle/0022_integration_providers.sql.
 */
export type SqlRunner = (sql: string) => Promise<{ rows: Record<string, unknown>[] }>;

/** Values added after the original five (quickbooks, xero, stripe, square, plaid). Fixed list: never built from input. */
export const NEW_PROVIDER_ENUM_VALUES = ['freshbooks', 'zoho_books', 'sage', 'wave', 'csv'] as const;

export async function ensureIntegrationProviderEnum(run: SqlRunner): Promise<'added' | 'present' | 'no_enum'> {
  const type = await run(`SELECT 1 AS one FROM pg_type WHERE typname = 'integration_provider' AND typtype = 'e'`);
  if (type.rows.length === 0) return 'no_enum';
  const have = await run(`SELECT e.enumlabel AS label FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid WHERE t.typname = 'integration_provider'`);
  const labels = new Set(have.rows.map((r) => String(r.label)));
  const missing = NEW_PROVIDER_ENUM_VALUES.filter((v) => !labels.has(v));
  if (missing.length === 0) return 'present';
  for (const v of missing) await run(`ALTER TYPE integration_provider ADD VALUE IF NOT EXISTS '${v}'`);
  return 'added';
}

let applied: Promise<void> | null = null;

/** Cached per instance; a failure is not cached so the next insert retries. Call before every insert into `integrations`. */
export function ensureIntegrationProviderSchema(): Promise<void> {
  if (process.env.USE_PGLITE === '1') return Promise.resolve();
  if (!applied) {
    applied = (async () => {
      const { pool } = await import('@/db');
      const client = await pool().connect();
      try {
        await ensureIntegrationProviderEnum((q) => client.query(q));
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
