/**
 * Database client — auto-selects PGlite (dev) or node-postgres (prod).
 * This is the canonical `@/db` export.
 */
import * as pgSchema from './schema';
export { pgSchema as schema };

import { db as pgDb } from './pg';
import { pool as pgPool } from './pg';
import { db as pgliteDb } from './pglite';

export const db: any = process.env.USE_PGLITE === '1' ? pgliteDb : pgDb;

/**
 * Get the raw node-postgres Pool (only available when USE_PGLITE !== '1').
 * Throws if called in PGlite mode. Used by the unsubscribe endpoint and
 * the one-shot migration endpoint to run raw SQL outside the drizzle layer.
 */
export function pool() {
  if (process.env.USE_PGLITE === '1') {
    throw new Error('pool() is not available in PGlite mode; USE_PGLITE=0 in production');
  }
  return pgPool();
}
