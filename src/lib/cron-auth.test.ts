import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cronAuthorized, configuredSecrets } from './cron-auth.ts';

const A = 'a'.repeat(32);
const B = 'b'.repeat(32);

test('either configured secret is accepted', () => {
  assert.equal(cronAuthorized(`Bearer ${A}`, [A, B]), true);
  assert.equal(cronAuthorized(`Bearer ${B}`, [A, B]), true);
});

test('anything else is refused', () => {
  assert.equal(cronAuthorized(null, [A]), false);
  assert.equal(cronAuthorized('', [A]), false);
  assert.equal(cronAuthorized(`Bearer ${A}x`, [A]), false);
  assert.equal(cronAuthorized(`Bearer ${A.slice(0, -1)}`, [A]), false);
  assert.equal(cronAuthorized(A, [A]), false, 'the Bearer prefix is required');
  assert.equal(cronAuthorized('Bearer ', [A]), false);
});

test('with no secret configured nothing is ever authorised', () => {
  assert.equal(cronAuthorized('Bearer ', []), false);
  assert.equal(cronAuthorized('Bearer undefined', []), false);
});

test('unset and short secrets are not counted as configured', () => {
  assert.deepEqual(configuredSecrets(undefined, '', 'short', A), [A]);
  assert.deepEqual(configuredSecrets(undefined, undefined), []);
});
