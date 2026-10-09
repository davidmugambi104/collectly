import { test } from 'node:test';
import assert from 'node:assert/strict';
import { moneyText } from './money-text.ts';

test('whole dollars carry no cents', () => { assert.equal(moneyText(93800), '$93,800'); });
test('cents always show two digits', () => {
  assert.equal(moneyText(4905.5), '$4,905.50');
  assert.equal(moneyText(845.05), '$845.05');
});
test('float noise rounds away', () => { assert.equal(moneyText(0.1 + 0.2), '$0.30'); });

import { roundCents } from './money-text.ts';
test('balances keep their cents', () => { assert.equal(roundCents(845.5), 845.5); assert.equal(roundCents(845.504), 845.5); });
