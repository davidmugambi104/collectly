/**
 * Load an export from /api/admin/export-database into an empty Postgres.
 *
 *   TARGET_DATABASE_URL=... npx tsx scripts/import-database-json.ts mugavi-data-YYYY-MM-DD.ndjson [--dry-run]
 *
 * The URL comes only from the environment and is never printed. Prints MATCH or
 * DIFFERENT with table names only. Credential columns are not in the file, so
 * reconnect Xero and QuickBooks afterwards.
 */
import fs from 'node:fs';
import readline from 'node:readline';
import { createHash } from 'node:crypto';
import pg from 'pg';
import { importRows, type Manifest } from '../src/lib/db-export.ts';

const file = process.argv[2];
const dry = process.argv.includes('--dry-run');
const url = process.env.TARGET_DATABASE_URL;
if (!file || (!url && !dry)) {
  console.error('Usage: TARGET_DATABASE_URL=... npx tsx scripts/import-database-json.ts <file.ndjson> [--dry-run]');
  process.exit(2);
}

const rows = new Map<string, Record<string, unknown>[]>();
let manifest: Manifest | null = null;
const hash = createHash('sha256');
const rl = readline.createInterface({ input: fs.createReadStream(file, { encoding: 'utf8' }), crlfDelay: Infinity });
for await (const line of rl) {
  if (!line.trim()) continue;
  const o = JSON.parse(line);
  if (o.manifest) { manifest = o; continue; }
  hash.update(line + '\n');
  if (!rows.has(o.t)) rows.set(o.t, []);
  rows.get(o.t)!.push(o.r);
}
if (!manifest) { console.error('No manifest line: the file is incomplete. Download it again.'); process.exit(2); }
if (hash.digest('hex') !== manifest.sha256) { console.error('Checksum mismatch: the file is damaged or incomplete. Download it again.'); process.exit(2); }
console.log(`file ok: ${Object.keys(manifest.tables).length} tables, ${Object.values(manifest.tables).reduce((a, b) => a + b, 0)} rows`);
if (dry) {
  for (const [t, n] of Object.entries(manifest.tables)) if (n) console.log(String(n).padStart(7), t);
  console.log('dry run, nothing written');
  process.exit(0);
}

const pool = new pg.Pool({ connectionString: url, max: 2, connectionTimeoutMillis: 20000 });
try {
  const res = await importRows(pool as never, rows, manifest, (s) => console.log(s));
  console.log(res.mismatches.length ? 'DIFFERENT: ' + res.mismatches.join('; ') : 'MATCH: every table has the same row count as the export.');
  process.exitCode = res.mismatches.length ? 1 : 0;
} catch (e) {
  const err = e as { code?: string; name?: string; message?: string };
  console.error('import failed:', err.code || err.name, String(err.message).slice(0, 160));
  process.exitCode = 2;
} finally {
  await pool.end().catch(() => {});
}
