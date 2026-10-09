import { test } from 'node:test';
import assert from 'node:assert/strict';
import { noCardNotice, poweredByLabel } from './payment-copy.ts';

test('notice names the business and starts its sentences with capitals', () => {
  const t = noCardNotice('Acme Books', false);
  assert.match(t, /^Acme Books has not set up/);
  assert.ok(!/\. [a-z]/.test(t), 'no lowercase sentence starts');
  assert.match(t, /bank transfer/);
});

test('notice falls back when the business name is missing', () => {
  assert.match(noCardNotice('', false), /^This business has not set up/);
  assert.match(noCardNotice(null, true), /Paystack/);
});

test('wire transfers do not claim a card processor', () => {
  assert.equal(poweredByLabel('wire'), null);
  assert.match(poweredByLabel('card')!, /Stripe/);
  assert.match(poweredByLabel('square')!, /Square/);
});
