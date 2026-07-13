/**
 * Production / hosted Postgres client.
 * Lazy-initializes the pool so module load doesn't fail when DATABASE_URL is missing.
 */
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

const globalForDb = globalThis as unknown as { pool: Pool | undefined; db: NodePgDatabase<typeof schema> | undefined };

let _pool: Pool | null = null;
let _db: NodePgDatabase<typeof schema> | null = null;

function getPool(): Pool {
  if (!_pool) {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL is not set. Set it in .env.local, or USE_PGLITE=1 for dev.');
    }
    _pool = globalForDb.pool ?? new Pool({ connectionString: process.env.DATABASE_URL, max: 10 });
    if (process.env.NODE_ENV !== 'production') globalForDb.pool = _pool;
  }
  return _pool!;
}

function getDb(): NodePgDatabase<typeof schema> {
  if (!_db) {
    _db = globalForDb.db ?? drizzle(getPool(), { schema });
    if (process.env.NODE_ENV !== 'production') globalForDb.db = _db;
  }
  return _db!;
}

export const db = new Proxy({} as NodePgDatabase<typeof schema>, {
  get(_t, prop) { return (getDb() as any)[prop]; },
});

export { schema };
export { getPool as pool };
