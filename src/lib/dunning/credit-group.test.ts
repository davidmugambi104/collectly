import { test } from 'node:test';
import assert from 'node:assert/strict';
import { groupCredits } from './credit.ts';

test('credit notes for one customer and currency are added up', () => {
  const out = groupCredits([
    { customerExternalId: 'c1', currency: 'usd', amount: 10.1 },
    { customerExternalId: 'c1', currency: 'USD', amount: 20.2 },
    { customerExternalId: 'c1', currency: 'EUR', amount: 5 },
    { customerExternalId: 'c2', currency: 'USD', amount: 7 },
  ]);
  assert.deepEqual(out.find((o) => o.customerExternalId === 'c1' && o.currency === 'USD')?.amount, 30.3);
  assert.equal(out.length, 3);
});

test('empty ids, empty currencies and non-positive amounts are dropped', () => {
  assert.deepEqual(groupCredits([
    { customerExternalId: '', currency: 'USD', amount: 5 },
    { customerExternalId: 'c1', currency: '', amount: 5 },
    { customerExternalId: 'c1', currency: 'USD', amount: 0 },
    { customerExternalId: 'c1', currency: 'USD', amount: -4 },
  ]), []);
});
