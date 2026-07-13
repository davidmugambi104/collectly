/**
 * Database client — auto-selects PGlite (dev) or node-postgres (prod).
 * This is the canonical `@/db` export.
 */
import * as pgSchema from './schema';
export { pgSchema as schema };

import { db as pgDb } from './pg';
import { db as pgliteDb } from './pglite';

export const db: any = process.env.USE_PGLITE === '1' ? pgliteDb : pgDb;
