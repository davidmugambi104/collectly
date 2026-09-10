import { test } from 'node:test';
import assert from 'node:assert/strict';
import { daysOverdue, bucketFor, daysBetween } from './utils.ts';

const DAY = 86400000;
const inDays = (n: number) => new Date(Date.now() + n * DAY);

test('daysOverdue returns 0 for invoices that are not due yet', () => {
  // Regression: daysBetween() returns an absolute distance, so a future due
  // date used to come back as its distance (26) instead of 0, dropping every
  // not-yet-due invoice into the "1-30 days overdue" bucket.
  assert.equal(daysOverdue(inDays(26)), 0);
  assert.equal(daysOverdue(inDays(1)), 0);
  assert.equal(daysOverdue(inDays(400)), 0);
});

test('daysOverdue counts whole days past the due date', () => {
  assert.equal(daysOverdue(inDays(-1)), 1);
  assert.equal(daysOverdue(inDays(-30)), 30);
  assert.equal(daysOverdue(inDays(-95)), 95);
});

test('daysOverdue treats a due date of right now as not overdue', () => {
  assert.equal(daysOverdue(new Date()), 0);
});

test('not-yet-due invoices land in the current aging bucket', () => {
  assert.equal(bucketFor(daysOverdue(inDays(26))), 'current');
  assert.equal(bucketFor(daysOverdue(inDays(-8))), '1-30');
  assert.equal(bucketFor(daysOverdue(inDays(-37))), '31-60');
  assert.equal(bucketFor(daysOverdue(inDays(-65))), '61-90');
  assert.equal(bucketFor(daysOverdue(inDays(-120))), '90+');
});

test('daysBetween stays an absolute distance helper', () => {
  // Intentionally unsigned; daysOverdue must not be rebuilt on top of it.
  assert.equal(daysBetween(inDays(0), inDays(5)), 5);
  assert.equal(daysBetween(inDays(5), inDays(0)), 5);
});
