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
