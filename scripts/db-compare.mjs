#!/usr/bin/env node
/**
 * Read-only check that two Postgres databases hold the same data shape after a move.
 *
 *   SOURCE_DATABASE_URL=... TARGET_DATABASE_URL=... node scripts/db-compare.mjs
 *
 * Compares, for every table in the public schema: whether it exists on both
 * sides, the row count, and for tables with a created_at column the newest
 * created_at. It only runs SELECT. It never prints a connection string, a
 * password, or any row contents. Exit code 0 = identical, 1 = differences,
 * 2 = could not connect or run.
 *
 * Run it from your own terminal. The two URLs are secrets: do not paste them
 * into chat, a commit, or a doc.
 */
import pg from 'pg';

const { SOURCE_DATABASE_URL: src, TARGET_DATABASE_URL: dst } = process.env;
if (!src || !dst) {
  console.error('Set SOURCE_DATABASE_URL and TARGET_DATABASE_URL.');
  process.exit(2);
}

const quote = (s) => '"' + String(s).replace(/"/g, '""') + '"';

async function snapshot(url, label) {
  const pool = new pg.Pool({ connectionString: url, max: 1, connectionTimeoutMillis: 15000 });
  try {
    const { rows: tables } = await pool.query(
      "select table_name from information_schema.tables where table_schema='public' and table_type='BASE TABLE' order by 1",
    );
    const out = {};
    for (const { table_name: t } of tables) {
      const { rows: c } = await pool.query(`select count(*)::bigint as n from public.${quote(t)}`);
      const { rows: col } = await pool.query(
        "select 1 from information_schema.columns where table_schema='public' and table_name=$1 and column_name='created_at'",
        [t],
      );
      let newest = null;
      if (col.length) {
        const { rows: m } = await pool.query(`select max(created_at) as m from public.${quote(t)}`);
        newest = m[0].m ? new Date(m[0].m).toISOString() : null;
      }
      out[t] = { rows: String(c[0].n), newest };
    }
    return out;
  } catch (e) {
    console.error(`${label}: could not read (${e.code || e.name}). Check the URL, the firewall and sslmode.`);
    process.exit(2);
  } finally {
    await pool.end().catch(() => {});
  }
}

export function diff(a, b) {
  const problems = [];
  for (const t of new Set([...Object.keys(a), ...Object.keys(b)])) {
    if (!a[t]) problems.push(`${t}: missing on source`);
    else if (!b[t]) problems.push(`${t}: missing on target`);
    else {
      if (a[t].rows !== b[t].rows) problems.push(`${t}: rows ${a[t].rows} on source, ${b[t].rows} on target`);
      if (a[t].newest !== b[t].newest) problems.push(`${t}: newest created_at differs (${a[t].newest} vs ${b[t].newest})`);
    }
  }
  return problems;
}

const a = await snapshot(src, 'source');
const b = await snapshot(dst, 'target');
const names = Object.keys(a).sort();
console.log(`${names.length} tables on source, ${Object.keys(b).length} on target`);
for (const t of names) console.log(`${t.padEnd(34)} ${String(a[t].rows).padStart(8)} ${String(b[t]?.rows ?? '-').padStart(8)}`);
const problems = diff(a, b);
if (problems.length) {
  console.log('\nDIFFERENCES:\n- ' + problems.join('\n- '));
  process.exit(1);
}
console.log('\nIdentical: same tables, same row counts, same newest created_at.');
