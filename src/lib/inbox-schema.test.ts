import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import { ensureReplyClassificationEnum } from './inbox-schema.ts';
import { REPLY_CLASSIFICATIONS } from './ai/inbox-rules.ts';

const OLD = REPLY_CLASSIFICATIONS.filter((c) => c !== 'unsubscribe');

async function liveLikeDb() {
  const db = new PGlite();
  await db.exec(`CREATE TYPE reply_classification AS ENUM (${OLD.map((c) => `'${c}'`).join(',')});
    CREATE TABLE inbox_messages (id text PRIMARY KEY, classification reply_classification NOT NULL DEFAULT 'unclassified')`);
  const run = (q: string) => db.query(q) as Promise<{ rows: Record<string, unknown>[] }>;
  return { db, run };
}

test('old enum rejects unsubscribe; the ensure adds it, and running it twice is harmless', async () => {
  const { db, run } = await liveLikeDb();
  await assert.rejects(db.query(`INSERT INTO inbox_messages (id, classification) VALUES ('a','unsubscribe')`));
  assert.equal(await ensureReplyClassificationEnum(run), 'added');
  assert.equal(await ensureReplyClassificationEnum(run), 'present');
  await db.query(`INSERT INTO inbox_messages (id, classification) VALUES ('b','unsubscribe')`);
  const labels = (await db.query<{ enumlabel: string }>(`SELECT enumlabel FROM pg_enum e JOIN pg_type t ON t.oid=e.enumtypid WHERE t.typname='reply_classification'`)).rows.map((r) => r.enumlabel).sort();
  assert.deepEqual(labels, [...REPLY_CLASSIFICATIONS].sort(), 'enum matches REPLY_CLASSIFICATIONS exactly');
  await db.close();
});

test('the raw IF NOT EXISTS statement is idempotent on its own', async () => {
  const { db } = await liveLikeDb();
  await db.query(`ALTER TYPE reply_classification ADD VALUE IF NOT EXISTS 'unsubscribe'`);
  await db.query(`ALTER TYPE reply_classification ADD VALUE IF NOT EXISTS 'unsubscribe'`);
  await db.close();
});

test('a text column (no enum) is left alone', async () => {
  const db = new PGlite();
  assert.equal(await ensureReplyClassificationEnum((q) => db.query(q) as never), 'no_enum');
  await db.close();
});
