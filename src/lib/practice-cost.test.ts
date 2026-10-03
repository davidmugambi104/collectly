import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crossoverBooks, mugaviCost, paidniceCost, type MugaviPrices } from './practice-cost.ts';
import { PLAN_PRICING, PRACTICE_EXTRA_ORG_MONTHLY, PRACTICE_INCLUDED_ORGS, PRACTICE_SCALE_INCLUDED_ORGS } from './utils.ts';

// The real prices, so repricing in utils.ts fails here on purpose and the copy gets reviewed.
const P: MugaviPrices = {
  single: PLAN_PRICING.starter.monthly,
  practice: PLAN_PRICING.growth.monthly,
  practiceBooks: PRACTICE_INCLUDED_ORGS,
  extraBook: PRACTICE_EXTRA_ORG_MONTHLY,
  scale: PLAN_PRICING.scale.monthly,
  scaleBooks: PRACTICE_SCALE_INCLUDED_ORGS,
};

test('Paidnice: one small book is Essentials, a bigger one is Pro', () => {
  assert.deepEqual(paidniceCost(1, 30)?.monthly, 69);
  assert.equal(paidniceCost(1, 30)?.tier, 'Essentials');
  assert.equal(paidniceCost(1, 200)?.monthly, 99);
  assert.equal(paidniceCost(1, 200)?.tier, 'Pro');
});

test('Paidnice: tier is picked on shared volume, plus $29 per extra entity', () => {
  // 10 books x 30 = 300 invoices: Pro $99 + 9 x $29
  assert.equal(paidniceCost(10, 30)?.monthly, 360);
  // 12 books x 30 = 360 invoices: next tier $179 + 11 x $29
  assert.equal(paidniceCost(12, 30)?.monthly, 179 + 11 * 29);
  assert.equal(paidniceCost(20, 10)?.monthly, 99 + 19 * 29);
});

test('Paidnice: above 4,000 invoices a month there is no published price', () => {
  assert.equal(paidniceCost(100, 50), null);
});

test('Mugavi: single plans while they are cheaper, then Practice, then extras, then Scale', () => {
  assert.deepEqual(mugaviCost(1, P), { monthly: 79, plan: 'single' });
  assert.deepEqual(mugaviCost(3, P), { monthly: 237, plan: 'singles' });
  assert.deepEqual(mugaviCost(5, P), { monthly: 395, plan: 'singles' });
  assert.deepEqual(mugaviCost(6, P), { monthly: 399, plan: 'practice' });
  assert.deepEqual(mugaviCost(10, P), { monthly: 399, plan: 'practice' });
  assert.deepEqual(mugaviCost(20, P), { monthly: 649, plan: 'practice' });
  assert.deepEqual(mugaviCost(60, P), { monthly: 999, plan: 'scale' });
  assert.equal(mugaviCost(101, P), null);
});

test('the crossover moves with invoice volume, and about a dozen only holds near 30 invoices a book', () => {
  assert.equal(crossoverBooks(10, P), 20);
  assert.equal(crossoverBooks(20, P), 16);
  assert.equal(crossoverBooks(30, P), 11);
  assert.equal(crossoverBooks(50, P), 9);
  assert.equal(crossoverBooks(80, P), 8);
});

test('crossover is a real point: dearer just below it, no dearer from it up', () => {
  for (const inv of [10, 20, 30, 50]) {
    const c = crossoverBooks(inv, P)!;
    assert.ok(mugaviCost(c - 1, P)!.monthly > paidniceCost(c - 1, inv)!.monthly, `below ${c} at ${inv}`);
    for (let n = c; n <= 40; n++) {
      const them = paidniceCost(n, inv);
      if (them) assert.ok(mugaviCost(n, P)!.monthly <= them.monthly, `${n} books at ${inv}`);
    }
  }
});
