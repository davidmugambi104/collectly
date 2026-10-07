import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bookOverage } from './book-overage.ts';

test('books within the plan cost nothing extra', () => {
  assert.deepEqual(bookOverage({ books: 10, included: 10, extraMonthly: 25 }), { kind: 'within' });
  assert.deepEqual(bookOverage({ books: 1, included: 1, extraMonthly: 25 }), { kind: 'within' });
});

test('an unlimited plan is never over', () => {
  assert.deepEqual(bookOverage({ books: 500, included: 'unlimited', extraMonthly: 25 }), { kind: 'within' });
});

test('Practice charges per extra book', () => {
  assert.deepEqual(bookOverage({ books: 13, included: 10, extraMonthly: 25 }), { kind: 'extra', extra: 3, monthly: 75 });
});

test('the Single plan points to Practice instead of a per-book price', () => {
  assert.deepEqual(bookOverage({ books: 2, included: 1, extraMonthly: 25 }), { kind: 'upgrade', books: 2 });
});

import { planMonthly } from './book-overage.ts';
import { PLAN_PRICING, PRACTICE_EXTRA_ORG_MONTHLY, PRACTICE_SCALE_CROSSOVER_ORGS, PRACTICE_SCALE_INCLUDED_ORGS } from './utils.ts';

const g = PLAN_PRICING.growth;
const monthly = (books: number) => planMonthly({ books, monthly: g.monthly, included: g.includedOrgs, extraMonthly: PRACTICE_EXTRA_ORG_MONTHLY });

test('Practice is $399 up to 10 books, then $25 each', () => {
  assert.equal(g.monthly, 399);
  assert.equal(g.includedOrgs, 10);
  assert.equal(monthly(1), 399);
  assert.equal(monthly(10), 399);
  assert.equal(monthly(11), 424);
  assert.equal(monthly(20), 649);
});

test('the Scale crossover is where Practice plus extras stops being cheaper', () => {
  assert.equal(PRACTICE_SCALE_CROSSOVER_ORGS, 34);
  assert.equal(monthly(PRACTICE_SCALE_CROSSOVER_ORGS), PLAN_PRICING.scale.monthly);
  assert.ok(monthly(PRACTICE_SCALE_CROSSOVER_ORGS - 1) < PLAN_PRICING.scale.monthly);
  assert.ok(monthly(PRACTICE_SCALE_CROSSOVER_ORGS + 1) > PLAN_PRICING.scale.monthly);
  assert.equal(PRACTICE_SCALE_INCLUDED_ORGS, 100);
});

test('Single with several books is never given a per-book price', () => {
  const s = PLAN_PRICING.starter;
  assert.equal(planMonthly({ books: 3, monthly: s.monthly, included: s.includedOrgs, extraMonthly: 25 }), 79);
});

test('Scale makes no promise of API access or SSO that does not exist', () => {
  const text = JSON.stringify(PLAN_PRICING.scale);
  assert.doesNotMatch(text, /\bAPI\b|SSO|concierge|custom workflows/i);
});
