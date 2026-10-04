// Runs scripts/selftest/qbo-sync.ts (real sync code, local QuickBooks stand-in, in-memory database) in a child
// process, because the sync code uses the "@/" alias node --test cannot resolve. Checks sync logic only.
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

let out = '';
before(() => {
  const root = path.resolve(import.meta.dirname, '../../..');
  const r = spawnSync(path.join(root, 'node_modules/.bin/tsx'), ['scripts/selftest/qbo-sync.ts'], { cwd: root, encoding: 'utf8', timeout: 280_000 });
  out = r.stdout ?? '';
  assert.match(out, /^RESULT /m, `no result. stderr: ${(r.stderr ?? '').slice(0, 500)}`);
}, { timeout: 290_000 });

test('voided and deleted invoices are written off; an unreadable one stays open and is reported', () => {
  const line = out.split('\n').find((l) => l.startsWith('CLOSED '))!;
  const o = JSON.parse(line.slice(line.indexOf('{')));
  assert.deepEqual(o, { closed: 3, voided: 'written_off', deleted: 'written_off', deletedDisputed: 'written_off', flakyStaysOpen: 'overdue', flakyErrorReported: true });
});

test('a missing CurrencyRef takes the company home currency, with a country fallback', () => {
  assert.match(out, /^CURRENCY missing CurrencyRef -> home currency: GBP$/m);
  assert.match(out, /^CURRENCY with Preferences down \(country fallback\): GBP$/m);
});
