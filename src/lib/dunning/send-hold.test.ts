import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HOLD_SECONDS, holdEndsAt, holdSecondsLeft, holdIsOver } from './send-hold.ts';

test('the hold is 30 seconds', () => {
  assert.equal(HOLD_SECONDS, 30);
  assert.equal(holdEndsAt(1_000), 31_000);
});

test('the countdown reads 30 at the start and 1 just before it fires', () => {
  const end = holdEndsAt(0);
  assert.equal(holdSecondsLeft(end, 0), 30);
  assert.equal(holdSecondsLeft(end, 100), 30);
  assert.equal(holdSecondsLeft(end, 29_001), 1);
  assert.equal(holdSecondsLeft(end, 30_000), 0);
  assert.equal(holdSecondsLeft(end, 45_000), 0);
});

test('it is over exactly at the end, not before', () => {
  const end = holdEndsAt(0);
  assert.equal(holdIsOver(end, 29_999), false);
  assert.equal(holdIsOver(end, 30_000), true);
});
