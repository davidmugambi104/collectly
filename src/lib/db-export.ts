/**
 * Whole-database export as newline-delimited JSON, and the pure helpers the
 * importer shares. No imports from the app (no `@/` alias) so node --test and
 * the standalone import script can load it.
 *
 * CREDENTIALS NEVER LEAVE: every column whose name looks like a secret, plus
 * the columns the schema stores through `encryptedText`, is left out of the
 * file entirely. After a move the owner reconnects Xero and QuickBooks.
 * The row values of everything else are exported as stored.
 */
import { createHash } from 'node:crypto';

/** Minimal client surface: node-postgres Pool/Client and PGlite both fit. */
export interface Queryable {
  query(sql: string, params?: unknown[]): Promise<{ rows: Record<string, unknown>[] }>;
}

/** Column names that are never exported. Matched on the whole lower-case name. */
const SECRET_NAME = /(token|secret|password|passwd|pwd|api_?key|private_?key|signing|credential|refresh|session|otp|salt|hash)/i;
/** Exact extra names, for credentials that do not match the pattern. */
const SECRET_EXACT = new Set(['access_key', 'client_key', 'webhook_key', 'auth', 'authorization', 'cookie']);

export function isSecretColumn(name: string): boolean {
  return SECRET_NAME.test(name) || SECRET_EXACT.has(name.toLowerCase());
}

export const BATCH = 1000;
const ident = (s: string) => '"' + s.replace(/"/g, '""') + '"';

export interface TableInfo {
  name: string;
  columns: string[];
  skipped: string[];
  pk: string[];
}

export async function listTables(db: Queryable): Promise<TableInfo[]> {
  const t = await db.query(
    "select table_name from information_schema.tables where table_schema='public' and table_type='BASE TABLE' order by 1",
  );
  const out: TableInfo[] = [];
  for (const { table_name } of t.rows as { table_name: string }[]) {
    const c = await db.query(
      "select column_name, data_type, udt_name from information_schema.columns where table_schema='public' and table_name=$1 and is_generated='NEVER' order by ordinal_position",
      [table_name],
    );
    const pk = await db.query(
      `select a.attname as col from pg_index i join pg_attribute a on a.attrelid=i.indrelid and a.attnum=any(i.indkey)
       where i.indisprimary and i.indrelid=('public.'||quote_ident($1))::regclass order by array_position(i.indkey, a.attnum)`,
      [table_name],
    );
    const cols: string[] = [];
    const skipped: string[] = [];
    for (const r of c.rows as { column_name: string }[]) (isSecretColumn(r.column_name) ? skipped : cols).push(r.column_name);
    out.push({ name: table_name, columns: cols, skipped, pk: (pk.rows as { col: string }[]).map((x) => x.col) });
  }
  return out;
}

/** JSON-safe, lossless value: bigint and numeric as strings (pg already does), dates ISO, bytea base64. */
export function encodeValue(v: unknown): unknown {
  if (v === null || v === undefined) return null;
  if (typeof v === 'bigint') return { $bigint: v.toString() };
  if (v instanceof Date) return { $date: v.toISOString() };
  if (v instanceof Uint8Array) return { $bytea: Buffer.from(v).toString('base64') };
  return v;
}

export function decodeValue(v: unknown): unknown {
  if (v && typeof v === 'object' && !Array.isArray(v)) {
    const o = v as Record<string, unknown>;
    const keys = Object.keys(o);
    if (keys.length === 1) {
      if (keys[0] === '$bigint') return String(o.$bigint);
      if (keys[0] === '$date') return new Date(String(o.$date));
      if (keys[0] === '$bytea') return Buffer.from(String(o.$bytea), 'base64');
    }
  }
  return v;
}

export interface Manifest {
  manifest: true;
  tables: Record<string, number>;
  skippedColumns: Record<string, string[]>;
  sha256: string;
  note: string;
}

/**
 * Yields NDJSON lines (each ends with a newline), one batch of one table at a
 * time. The last line is the manifest, whose sha256 covers every line before it.
 */
export async function* exportLines(db: Queryable, batch = BATCH): AsyncGenerator<string> {
  const hash = createHash('sha256');
  const counts: Record<string, number> = {};
  const skippedColumns: Record<string, string[]> = {};
  const emit = (line: string) => {
    hash.update(line);
    return line;
  };
  for (const tbl of await listTables(db)) {
    counts[tbl.name] = 0;
    if (tbl.skipped.length) skippedColumns[tbl.name] = tbl.skipped;
    if (!tbl.columns.length) continue;
    const cols = tbl.columns.map(ident).join(', ');
    const order = tbl.pk.length ? tbl.pk.map(ident).join(', ') : 'ctid';
    // Order by primary key (or physical position) and page with OFFSET: simple, correct, and the
    // data set here is small. Never loads a whole table into memory.
    for (let offset = 0; ; offset += batch) {
      const res = await db.query(`select ${cols} from public.${ident(tbl.name)} order by ${order} limit ${batch} offset ${offset}`);
      for (const row of res.rows) {
        const enc: Record<string, unknown> = {};
        for (const k of Object.keys(row)) enc[k] = encodeValue(row[k]);
        yield emit(JSON.stringify({ t: tbl.name, r: enc }) + '\n');
        counts[tbl.name]++;
      }
      if (res.rows.length < batch) break;
    }
  }
  const m: Manifest = {
    manifest: true,
    tables: counts,
    skippedColumns,
    sha256: hash.digest('hex'),
    note: 'Credential columns are not in this file. Reconnect Xero and QuickBooks after importing. Contains customer data: keep private, delete after the move.',
  };
  yield JSON.stringify(m) + '\n';
}

/** Order tables so a table comes after every table it references. Cycles fall back to name order. */
export function dependencyOrder(tables: string[], edges: Array<{ child: string; parent: string }>): string[] {
  const set = new Set(tables);
  const deps = new Map<string, Set<string>>(tables.map((t) => [t, new Set<string>()]));
  for (const e of edges) if (e.child !== e.parent && set.has(e.child) && set.has(e.parent)) deps.get(e.child)!.add(e.parent);
  const out: string[] = [];
  const done = new Set<string>();
  const remaining = [...tables].sort();
  while (remaining.length) {
    const i = remaining.findIndex((t) => [...deps.get(t)!].every((p) => done.has(p)));
    const pick = i === -1 ? 0 : i;
    const [t] = remaining.splice(pick, 1);
    out.push(t);
    done.add(t);
  }
  return out;
}

/* ------------------------------- import ------------------------------- */

export interface ImportResult {
  loaded: Record<string, number>;
  mismatches: string[];
}

/**
 * Insert exported rows into `db` in foreign-key order, then compare per-table
 * counts with the manifest. Rows that already exist are left alone.
 */
export async function importRows(
  db: Queryable,
  rows: Map<string, Record<string, unknown>[]>,
  manifest: Pick<Manifest, 'tables'>,
  log: (s: string) => void = () => {},
): Promise<ImportResult> {
  const names = [...rows.keys()];
  const fk = await db.query(
    `select c.conrelid::regclass::text as child, c.confrelid::regclass::text as parent from pg_constraint c where c.contype='f'`,
  );
  const norm = (s: unknown) => String(s).replace(/^public\./, '').replace(/"/g, '');
  const edges = (fk.rows as { child: string; parent: string }[]).map((e) => ({ child: norm(e.child), parent: norm(e.parent) }));
  const loaded: Record<string, number> = {};
  for (const t of dependencyOrder(names, edges)) {
    const data = rows.get(t)!;
    if (!data.length) continue;
    const types = await db.query(
      "select column_name, udt_name from information_schema.columns where table_schema='public' and table_name=$1",
      [t],
    );
    const isJson = new Set((types.rows as { column_name: string; udt_name: string }[]).filter((c) => c.udt_name === 'json' || c.udt_name === 'jsonb').map((c) => c.column_name));
    const cols = Object.keys(data[0]);
    for (let i = 0; i < data.length; i += 200) {
      const chunk = data.slice(i, i + 200);
      const params: unknown[] = [];
      const tuples = chunk.map(
        (r) =>
          '(' +
          cols
            .map((c) => {
              const v = decodeValue(r[c]);
              params.push(isJson.has(c) && v !== null ? JSON.stringify(v) : v);
              return '$' + params.length;
            })
            .join(',') +
          ')',
      );
      await db.query(`insert into public.${ident(t)} (${cols.map(ident).join(',')}) values ${tuples.join(',')} on conflict do nothing`, params);
    }
    loaded[t] = data.length;
    log(`loaded ${t} ${data.length}`);
  }
  const mismatches: string[] = [];
  for (const [t, n] of Object.entries(manifest.tables)) {
    const r = await db.query(`select count(*)::bigint as n from public.${ident(t)}`);
    if (String(r.rows[0].n) !== String(n)) mismatches.push(`${t} (export ${n}, database ${r.rows[0].n})`);
  }
  return { loaded, mismatches };
}
