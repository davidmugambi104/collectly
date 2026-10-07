// Runs scripts/selftest/dunning-broken-connection.ts (real scheduler, real pglite database) in a child
// process, because the scheduler uses the "@/" import alias that node --test cannot resolve directly.
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

let obs: { broken: { scheduled: number; blockedByConnection: number }; healthy: { scheduled: number; blockedByConnection: number } };

before(() => {
  const root = path.resolve(import.meta.dirname, '../../..');
  const r = spawnSync(path.join(root, 'node_modules/.bin/tsx'), ['scripts/selftest/dunning-broken-connection.ts'], { cwd: root, encoding: 'utf8', timeout: 120_000 });
  const line = (r.stdout ?? '').split('\n').find((l) => l.startsWith('RESULT '));
  assert.ok(line, `stand-in run produced no result. stderr: ${(r.stderr ?? '').slice(0, 800)}`);
  obs = JSON.parse(line.slice(7));
}, { timeout: 130_000 });

test('a broken QuickBooks/Xero connection stops new dunning scheduling for that org', () => {
  assert.equal(obs.broken.scheduled, 0);
  assert.equal(obs.broken.blockedByConnection, 1);
});

test('an org with no broken connection is unaffected', () => {
  assert.equal(obs.healthy.scheduled, 1);
  assert.equal(obs.healthy.blockedByConnection, 0);
});
