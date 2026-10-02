import { test } from 'node:test';
import assert from 'node:assert/strict';
import { creditCoversOwed, sumCredits } from './credit.ts';

test('credit that covers the balance stops the chase', () => {
  assert.equal(creditCoversOwed(500, 500), true);
  assert.equal(creditCoversOwed(600, 500), true);
});

test('partial credit does not', () => {
  assert.equal(creditCoversOwed(200, 500), false);
});

test('no credit, or nothing owed, never counts', () => {
  assert.equal(creditCoversOwed(0, 500), false);
  assert.equal(creditCoversOwed(null, 500), false);
  assert.equal(creditCoversOwed(undefined, 500), false);
  assert.equal(creditCoversOwed(100, 0), false);
});

test('cents rounding does not flip the answer', () => {
  assert.equal(creditCoversOwed(0.1 + 0.2, 0.3), true);
});

test('credits are summed in cents and bad values ignored', () => {
  assert.equal(sumCredits([10.1, 20.2]), 30.3);
  assert.equal(sumCredits([5, -3, NaN, null, undefined]), 5);
  assert.equal(sumCredits([]), 0);
});
