import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseRulesInput, gapBlockedUntil, isGapBlocked, belowMinBalance, DEFAULT_RULES, MAX_GAP_DAYS } from './chase-rules.ts';

const NOW = new Date('2026-10-10T12:00:00.000Z');
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);

test('defaults: one reminder per customer a week, no minimum balance', () => {
  assert.deepEqual(DEFAULT_RULES, { minGapDays: 7, minBalance: 0 });
});

test('input is validated, not trusted', () => {
  assert.deepEqual(parseRulesInput({ minGapDays: 3, minBalance: 25.555 }), { ok: true, value: { minGapDays: 3, minBalance: 25.56 } });
  assert.deepEqual(parseRulesInput({ minGapDays: '0', minBalance: '0' }), { ok: true, value: { minGapDays: 0, minBalance: 0 } });
  for (const bad of [{ minGapDays: -1, minBalance: 0 }, { minGapDays: 1.5, minBalance: 0 }, { minGapDays: MAX_GAP_DAYS + 1, minBalance: 0 }, { minGapDays: 7, minBalance: -5 }, { minGapDays: 7, minBalance: NaN }, { minGapDays: 'x', minBalance: 0 }]) {
    assert.equal(parseRulesInput(bad).ok, false, JSON.stringify(bad));
  }
  assert.equal(parseRulesInput(null).ok, false);
});

test('a reminder about another invoice holds the customer for the gap', () => {
  const recent = [{ invoiceId: 'A', at: daysAgo(2) }];
  assert.equal(isGapBlocked(recent, 'B', 7, NOW), true);
  assert.equal(gapBlockedUntil(recent, 'B', 7)?.toISOString(), new Date(daysAgo(2).getTime() + 7 * 86_400_000).toISOString());
  assert.equal(isGapBlocked(recent, 'B', 2, NOW), false, 'exactly at the end of the gap is free');
});

test('an invoice is never held back by its own earlier steps', () => {
  const recent = [{ invoiceId: 'A', at: daysAgo(1) }];
  assert.equal(isGapBlocked(recent, 'A', 7, NOW), false);
  assert.equal(gapBlockedUntil(recent, 'A', 7), null);
});

test('the most recent other reminder decides', () => {
  const recent = [{ invoiceId: 'A', at: daysAgo(20) }, { invoiceId: 'C', at: daysAgo(3) }];
  assert.equal(isGapBlocked(recent, 'B', 7, NOW), true);
  assert.equal(isGapBlocked([{ invoiceId: 'A', at: daysAgo(20) }], 'B', 7, NOW), false);
});

test('a gap of 0 turns the rule off', () => {
  assert.equal(isGapBlocked([{ invoiceId: 'A', at: daysAgo(0) }], 'B', 0, NOW), false);
});

test('minimum balance', () => {
  assert.equal(belowMinBalance(9.99, 10), true);
  assert.equal(belowMinBalance(10, 10), false);
  assert.equal(belowMinBalance(0.5, 0), false, 'zero means off');
});
