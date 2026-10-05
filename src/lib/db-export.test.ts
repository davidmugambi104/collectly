import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import { createHash } from 'node:crypto';
import { dependencyOrder, exportLines, importRows, isSecretColumn, type Manifest, type Queryable } from './db-export.ts';

const DDL = `
create table orgs (id text primary key, name text not null, created_at timestamptz not null default now());
create table customers (id text primary key, org_id text not null references orgs(id), name text, notes jsonb, tags text[], created_at timestamptz default now());
create table invoices (id text primary key, customer_id text not null references customers(id), cents bigint not null, steps jsonb, blob bytea, memo text);
create table integrations (id text primary key, org_id text references orgs(id), provider text, access_token text, refresh_token text, api_key text, realm_id text);
create table nopk (a int, b text);
`;

async function seed(): Promise<PGlite> {
  const db = new PGlite();
  await db.exec(DDL);
  await db.query("insert into orgs values ('o1','Acme & Söhne ✓', '2026-01-02T03:04:05Z')");
  await db.query(`insert into customers values ('c1','o1','Ünï Ltd','{"a":[1,2,{"b":null}]}','{x,"y z"}', '2026-02-03T00:00:00Z'), ('c2','o1',null,null,null,null)`);
  await db.query(`insert into invoices values ('i1','c1',9007199254740993,'[{"day":3},{"day":7}]','\\x00ff10','line1\nline2 "q"'), ('i2','c2',5,null,null,null)`);
  await db.query(`insert into integrations values ('g1','o1','xero','SECRET-ACCESS','SECRET-REFRESH','KEY-123','realm9')`);
  await db.query("insert into nopk values (1,'x'),(2,'y'),(3,'z')");
  return db;
}

async function collect(db: Queryable, batch?: number): Promise<{ lines: string[]; manifest: Manifest }> {
  const lines: string[] = [];
  for await (const l of exportLines(db, batch)) lines.push(l);
  return { lines, manifest: JSON.parse(lines[lines.length - 1]) as Manifest };
}

test('secret-looking columns are recognised', () => {
  for (const c of ['access_token', 'refresh_token', 'api_key', 'client_secret', 'password_hash', 'signing_secret', 'unsubscribe_token', 'Authorization'])
    assert.ok(isSecretColumn(c), c);
  for (const c of ['id', 'org_id', 'name', 'amount_cents', 'realm_id', 'tenant_id', 'created_at'])
    assert.ok(!isSecretColumn(c), c);
});

test('no credential column or value ever appears in the export', async () => {
  const db = await seed();
  const { lines, manifest } = await collect(db as unknown as Queryable);
  const rowLines = lines.slice(0, -1).join('');
  const body = lines.join('');
  // Values never appear anywhere; column NAMES appear only in the manifest's list of what was skipped.
  for (const s of ['SECRET-ACCESS', 'SECRET-REFRESH', 'KEY-123']) assert.ok(!body.includes(s), `leaked value ${s}`);
  for (const s of ['access_token', 'refresh_token', 'api_key']) assert.ok(!rowLines.includes(s), `row carries column ${s}`);
  assert.deepEqual(manifest.skippedColumns.integrations?.sort(), ['access_token', 'api_key', 'refresh_token']);
  assert.ok(body.includes('realm9'), 'non-secret columns of the same table are kept');
});

test('manifest counts every table, including one with no primary key, and the checksum matches', async () => {
  const db = await seed();
  const { lines, manifest } = await collect(db as unknown as Queryable);
  assert.deepEqual(manifest.tables, { customers: 2, integrations: 1, invoices: 2, nopk: 3, orgs: 1 });
  const h = createHash('sha256');
  for (const l of lines.slice(0, -1)) h.update(l);
  assert.equal(h.digest('hex'), manifest.sha256);
});

test('paging in batches of 2 gives the same rows as one big batch', async () => {
  const db = await seed();
  const a = await collect(db as unknown as Queryable, 2);
  const b = await collect(db as unknown as Queryable, 1000);
  assert.deepEqual(a.lines, b.lines);
});

test('export then import reproduces values exactly (jsonb arrays, bigint, bytea, arrays, unicode, nulls)', async () => {
  const src = await seed();
  const { lines, manifest } = await collect(src as unknown as Queryable);
  const rows = new Map<string, Record<string, unknown>[]>();
  for (const l of lines.slice(0, -1)) {
    const o = JSON.parse(l);
    if (!rows.has(o.t)) rows.set(o.t, []);
    rows.get(o.t)!.push(o.r);
  }
  const dst = new PGlite();
  await dst.exec(DDL);
  const res = await importRows(dst as unknown as Queryable, rows, manifest);
  assert.deepEqual(res.mismatches, []);

  const q = async (db: PGlite, sql: string) => JSON.stringify((await db.query(sql)).rows);
  assert.equal(await q(dst, 'select id,name,notes,tags,created_at from customers order by id'), await q(src, 'select id,name,notes,tags,created_at from customers order by id'));
  assert.equal(await q(dst, 'select id,cents::text,steps,encode(blob,\'hex\') h,memo from invoices order by id'), await q(src, 'select id,cents::text,steps,encode(blob,\'hex\') h,memo from invoices order by id'));
  assert.equal(await q(dst, 'select name from orgs'), await q(src, 'select name from orgs'));
  const t = await dst.query('select access_token from integrations');
  assert.equal((t.rows[0] as { access_token: unknown }).access_token, null, 'credentials are not restored');
});

test('importing twice does not duplicate rows', async () => {
  const src = await seed();
  const { lines, manifest } = await collect(src as unknown as Queryable);
  const rows = new Map<string, Record<string, unknown>[]>();
  for (const l of lines.slice(0, -1)) { const o = JSON.parse(l); if (!rows.has(o.t)) rows.set(o.t, []); rows.get(o.t)!.push(o.r); }
  const dst = new PGlite();
  await dst.exec(DDL.replace('create table nopk (a int, b text);', 'create table nopk (a int primary key, b text);'));
  await importRows(dst as unknown as Queryable, rows, manifest);
  const again = await importRows(dst as unknown as Queryable, rows, manifest);
  assert.deepEqual(again.mismatches, []);
});

test('dependency order puts parents first and survives a cycle', () => {
  assert.deepEqual(dependencyOrder(['c', 'b', 'a'], [{ child: 'c', parent: 'b' }, { child: 'b', parent: 'a' }]), ['a', 'b', 'c']);
  assert.equal(dependencyOrder(['x', 'y'], [{ child: 'x', parent: 'y' }, { child: 'y', parent: 'x' }]).length, 2);
});

import fs from 'node:fs';
test('the export route checks admin and the rate limit before it opens the database', () => {
  const src = fs.readFileSync(new URL('../app/api/admin/export-database/route.ts', import.meta.url), 'utf8');
  const iAdmin = src.indexOf('requireAdminEmail()');
  const iRate = src.indexOf('rateLimit(');
  const iPool = src.indexOf('pool()');
  assert.ok(iAdmin > 0 && iAdmin < iRate && iRate < iPool, 'order: admin, rate limit, database');
  assert.ok(src.includes('status: 403'));
  assert.ok(src.includes("'Cache-Control': 'no-store'"));
});
