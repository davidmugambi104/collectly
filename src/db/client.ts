/**
 * Database client — auto-selects PGlite (dev) or node-postgres (prod).
 * The same `db` interface regardless of backend.
 */
import * as pgSchema from './schema';
export { pgSchema as schema };

// eslint-disable-next-line @typescript-eslint/no-var-requires
const mod = process.env.USE_PGLITE === '1' ? require('./pglite') : require('./index');
export const db = mod.db;
