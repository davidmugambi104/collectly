import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isHoldActive, parseHoldUntil, cleanHoldReason, MAX_HOLD_DAYS } from './hold.ts';

const NOW = new Date('2026-10-01T12:00:00.000Z');
const day = (n: number) => new Date(NOW.getTime() + n * 86_400_000);

test('no hold row means reminders run', () => {
  assert.equal(isHoldActive(null, NOW), false);
  assert.equal(isHoldActive(undefined, NOW), false);
});

test('a hold with no end date lasts until the owner lifts it', () => {
  assert.equal(isHoldActive({ heldUntil: null }, NOW), true);
});

test('a dated hold is active until that instant, then reminders resume on their own', () => {
  assert.equal(isHoldActive({ heldUntil: day(3) }, NOW), true);
  assert.equal(isHoldActive({ heldUntil: day(-1) }, NOW), false);
  assert.equal(isHoldActive({ heldUntil: NOW }, NOW), false, 'the boundary itself is over');
});

test('an unreadable stored date fails safe: keep holding, do not chase', () => {
  assert.equal(isHoldActive({ heldUntil: 'not a date' }, NOW), true);
});

test('empty input parses as an open-ended hold', () => {
  for (const v of [undefined, null, '']) {
    assert.deepEqual(parseHoldUntil(v, NOW), { ok: true, value: null });
  }
});

test('a bare date holds through the end of that day', () => {
  const r = parseHoldUntil('2026-10-05', NOW);
  assert.equal(r.ok, true);
  if (r.ok) assert.equal(r.value?.toISOString(), '2026-10-05T23:59:59.999Z');
});

test('rejects past dates, garbage and non-strings', () => {
  assert.equal(parseHoldUntil('2026-09-30', NOW).ok, false);
  assert.equal(parseHoldUntil('soon', NOW).ok, false);
  assert.equal(parseHoldUntil(12345, NOW).ok, false);
});

test('rejects a hold longer than the cap', () => {
  const far = new Date(NOW.getTime() + (MAX_HOLD_DAYS + 2) * 86_400_000).toISOString().slice(0, 10);
  assert.equal(parseHoldUntil(far, NOW).ok, false);
  const near = new Date(NOW.getTime() + (MAX_HOLD_DAYS - 2) * 86_400_000).toISOString().slice(0, 10);
  assert.equal(parseHoldUntil(near, NOW).ok, true);
});

test('reason is trimmed, flattened and capped', () => {
  assert.equal(cleanHoldReason('  spoke\n\ton the phone  '), 'spoke on the phone');
  assert.equal(cleanHoldReason(''), null);
  assert.equal(cleanHoldReason(42), null);
  assert.equal(cleanHoldReason('x'.repeat(500))?.length, 200);
});
