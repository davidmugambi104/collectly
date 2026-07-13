/**
 * Dev-only: PGlite (in-process WASM Postgres) wrapper.
 * Use this when USE_PGLITE=1 to avoid requiring a real Postgres in dev.
 */
import { PGlite } from '@electric-sql/pglite';
import { drizzle as drizzlePglite, type PgliteDatabase } from 'drizzle-orm/pglite';
import * as schema from './schema';

const globalForDb = globalThis as unknown as { pglite: PGlite | undefined; db: PgliteDatabase<typeof schema> | undefined };

let _client: PGlite | null = null;
let _db: PgliteDatabase<typeof schema> | null = null;

function getClient(): PGlite {
  if (!_client) {
    const dataDir = process.env.PGLITE_DIR ?? './.pglite';
    _client = globalForDb.pglite ?? new PGlite(dataDir);
    if (process.env.NODE_ENV !== 'production') globalForDb.pglite = _client;
  }
  return _client!;
}

function getDb(): PgliteDatabase<typeof schema> {
  if (!_db) {
    _db = globalForDb.db ?? drizzlePglite(getClient(), { schema });
    if (process.env.NODE_ENV !== 'production') globalForDb.db = _db;
  }
  return _db!;
}

export const db = new Proxy({} as PgliteDatabase<typeof schema>, {
  get(_t, prop) { return (getDb() as any)[prop]; },
});

export { getClient as client };
export { schema };
