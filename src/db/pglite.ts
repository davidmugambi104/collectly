/**
 * Dev-only: PGlite (in-process WASM Postgres) wrapper.
 * Reads PGLITE_DIR from env to support persistent dev data across restarts.
 */
import { PGlite } from '@electric-sql/pglite';
import { drizzle as drizzlePglite, type PgliteDatabase } from 'drizzle-orm/pglite';
import * as schema from './schema';

const globalForDb = globalThis as unknown as { pglite: PGlite | undefined; pgliteDb: PgliteDatabase<typeof schema> | undefined };

function getClient(): PGlite {
  if (!globalForDb.pglite) {
    // Read PGLITE_DIR from env so dev data persists across restarts.
    // Falls back to in-memory if not set (production-style behavior).
    const dataDir = process.env.PGLITE_DIR;
    globalForDb.pglite = dataDir ? new PGlite(dataDir) : new PGlite();
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
