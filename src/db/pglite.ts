/**
 * Dev-only: PGlite (in-process WASM Postgres) wrapper.
 */
import { PGlite } from '@electric-sql/pglite';
import { drizzle as drizzlePglite, type PgliteDatabase } from 'drizzle-orm/pglite';
import * as schema from './schema';

const globalForDb = globalThis as unknown as { pglite: PGlite | undefined; pgliteDb: PgliteDatabase<typeof schema> | undefined };

function getClient(): PGlite {
  if (!globalForDb.pglite) {
    globalForDb.pglite = new PGlite();
  }
  return globalForDb.pglite;
}

function getDb(): PgliteDatabase<typeof schema> {
  if (!globalForDb.pgliteDb) {
    globalForDb.pgliteDb = drizzlePglite(getClient(), { schema });
  }
  return globalForDb.pgliteDb;
}

// Build the real db object at import time so the proxy isn't needed.
export const db = getDb();
export const client = getClient();
export { schema };
