import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { ensureIntegrationProviderEnum, NEW_PROVIDER_ENUM_VALUES } from './provider-enum.ts';

const OLD = ['quickbooks', 'xero', 'stripe', 'square', 'plaid'];

async function liveLikeDb() {
  const db = new PGlite();
  await db.exec(`CREATE TYPE integration_provider AS ENUM (${OLD.map((c) => `'${c}'`).join(',')});
    CREATE TABLE integrations (id text PRIMARY KEY, provider integration_provider NOT NULL)`);
  const run = (q: string) => db.query(q) as Promise<{ rows: Record<string, unknown>[] }>;
  return { db, run };
}

test('old enum rejects the new providers; the ensure adds them, twice is harmless', async () => {
  const { db, run } = await liveLikeDb();
  await assert.rejects(db.query(`INSERT INTO integrations VALUES ('a','freshbooks')`));
  assert.equal(await ensureIntegrationProviderEnum(run), 'added');
  assert.equal(await ensureIntegrationProviderEnum(run), 'present');
  for (const v of NEW_PROVIDER_ENUM_VALUES) await db.query(`INSERT INTO integrations VALUES ('${v}','${v}')`);
  const labels = (await db.query<{ enumlabel: string }>(`SELECT enumlabel FROM pg_enum e JOIN pg_type t ON t.oid=e.enumtypid WHERE t.typname='integration_provider'`)).rows.map((r) => r.enumlabel).sort();
  assert.deepEqual(labels, [...OLD, ...NEW_PROVIDER_ENUM_VALUES].sort());
  await db.close();
});

test('the schema.ts enum lists exactly the old plus the new values', () => {
  const src = readFileSync(new URL('../../db/schema.ts', import.meta.url), 'utf8');
  const m = src.match(/pgEnum\('integration_provider', \[([^\]]+)\]/);
  assert.ok(m);
  const vals = m[1].split(',').map((x) => x.trim().replace(/'/g, ''));
  assert.deepEqual(vals, [...OLD, ...NEW_PROVIDER_ENUM_VALUES]);
});

test('a text column (no enum) is left alone', async () => {
  const db = new PGlite();
  assert.equal(await ensureIntegrationProviderEnum((q) => db.query(q) as never), 'no_enum');
  await db.close();
});

test('drizzle/0022 runs twice on a live-like database and on a text-column one', async () => {
  const sql = readFileSync(new URL('../../../drizzle/0022_integration_providers.sql', import.meta.url), 'utf8');
  const { db } = await liveLikeDb();
  await db.exec(sql);
  await db.exec(sql);
  await db.query(`INSERT INTO integrations VALUES ('c','csv')`);
  const plain = new PGlite();
  await plain.exec(sql);
  await plain.exec(sql);
  await db.close();
  await plain.close();
});
