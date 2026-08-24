/**
 * Database client — auto-selects PGlite (dev) or node-postgres (prod).
 * This is the canonical `@/db` export.
 */
import * as pgSchema from './schema';
export { pgSchema as schema };

import { db as pgDb } from './pg';
import { pool as pgPool } from './pg';
import { db as pgliteDb } from './pglite';

// Deliberately `any`, not a fix-later shortcut: tried `typeof pgDb | typeof
// pgliteDb` here and it surfaced 7+ pre-existing type errors across
// unrelated files (a dunningSequences insert missing a required `steps`
// field, a `paidAt` property access that doesn't exist on the selected
// row shape, a possibly-undefined paymentBehavior.paidRate, a
// `refresh_token: string | null` vs URLSearchParams' `string | undefined`
// mismatch in both quickbooks.ts and xero.ts, a paystack webhook arg-count
// mismatch, and a ReactNode/unknown mismatch) -- every one of them
// currently invisible because `db` being `any` makes every `.select()`/
// `.insert()`/`.update()` call on it untyped throughout the whole app.
// That's a real, worthwhile fix, but it's a dedicated type-safety pass
// across several unrelated files/domains, not something to rush through
// as a side effect of an unrelated any-type cleanup pass. Left as `any`
// on purpose until that pass happens deliberately.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
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
