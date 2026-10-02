// Runs scripts/selftest/qbo-paging-errors.ts (real sync code, local QuickBooks stand-in, in-memory database)
// in a child process, because the sync code uses the "@/" import alias that node --test cannot resolve.
// Checks the sync logic only; real QuickBooks behaviour is covered by 34-qbo-sandbox-test-plan.md.
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

type Obs = Record<string, any>;
let obs: Obs;

before(() => {
  const root = path.resolve(import.meta.dirname, '../../..');
  const r = spawnSync(path.join(root, 'node_modules/.bin/tsx'), ['scripts/selftest/qbo-paging-errors.ts'], { cwd: root, encoding: 'utf8', timeout: 280_000 });
  const line = (r.stdout ?? '').split('\n').find((l) => l.startsWith('RESULT '));
  assert.ok(line, `stand-in run produced no result. stderr: ${(r.stderr ?? '').slice(0, 500)}`);
  obs = JSON.parse(line.slice(7));
}, { timeout: 290_000 });

test('paging: later pages use 1-based STARTPOSITION steps of 1000, ordered by Id, nothing lost', () => {
  assert.deepEqual(obs.paging.errors, []);
  assert.equal(obs.paging.invoices, 2001);
  assert.deepEqual(obs.paging.invoiceStarts, [0, 1001, 2001]); // 0 = first page has no STARTPOSITION
  assert.deepEqual(obs.paging.customerStarts, [0, 1001]);
  assert.equal(obs.paging.truncated, false);
  assert.equal(obs.paging.allOrdered, true);
});

test('credit: memos and unapplied payments are read page by page and summed', () => {
  assert.deepEqual(obs.credits.paymentStarts, [1, 1001, 2001]);
  assert.equal(obs.credits.count, 2101);
  assert.equal(obs.credits.total, 2110);
  assert.deepEqual(obs.credits.currencies, ['GBP']);
});

test('credit: a read cut off at the page limit is flagged and stored credit is left alone', () => {
  assert.equal(obs.creditsTruncated.truncated, true);
  assert.deepEqual(obs.creditsTruncated.memoStarts, [1, 1001, 2001]);
  assert.match(obs.creditsTruncated.syncError, /left as it was/);
});

test('errors: a 429 is retried and the sync completes', () => {
  assert.ok(obs.throttle.ms >= 2000);
  assert.deepEqual(obs.throttle.errors, []);
  assert.equal(obs.throttle.customers, 3);
});

test('errors: throttled past the retry budget is reported, not thrown, and imports nothing', () => {
  assert.equal(obs.throttleExhausted.customersUpserted, 0);
  assert.ok(obs.throttleExhausted.errors.length >= 2);
});

test('errors: a 401 refreshes the token once and retries with the new one', () => {
  assert.equal(obs.unauthorized.oauthCalls, 1);
  assert.equal(obs.unauthorized.usedFresh, true);
  assert.deepEqual(obs.unauthorized.errors, []);
});

test('errors: a Fault inside a 200 is an error, never an empty clean result', () => {
  assert.equal(obs.faultOn200.customersUpserted, 0);
  assert.ok(obs.faultOn200.errors.length >= 3);
});

test('errors: a 400 Fault carries the intuit_tid into the error text', () => {
  assert.equal(obs.badRequest.hasTid, true);
});

test('errors: a failing second page is reported, so the sync does not look clean', () => {
  assert.ok(obs.laterPageFails.errors.some((e: string) => e.startsWith('invoices:')));
});
