import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stepDayPhrase, stepDayLabel, leadDays, daysUntilDue, MAX_LEAD_DAYS } from './step-timing.ts';

test('phrases read naturally on either side of the due date', () => {
  assert.equal(stepDayPhrase(-7), '7 days before the due date');
  assert.equal(stepDayPhrase(-1), '1 day before the due date');
  assert.equal(stepDayPhrase(0), 'on the due date');
  assert.equal(stepDayPhrase(1), '1 day past due');
  assert.equal(stepDayPhrase(14), '14 days past due');
});

test('tile labels', () => {
  assert.deepEqual([-7, -1, 0, 1, 30].map(stepDayLabel), ['7 days before', '1 day before', 'Due date', 'Day 1', 'Day 30']);
});

test('lead days is how far ahead the earliest step looks, never negative, capped', () => {
  assert.equal(leadDays([{ daysFromDue: 1 }, { daysFromDue: 7 }]), 0);
  assert.equal(leadDays([{ daysFromDue: -7 }, { daysFromDue: 3 }]), 7);
  assert.equal(leadDays([{ daysFromDue: -400 }]), MAX_LEAD_DAYS);
  assert.equal(leadDays([]), 0);
  assert.equal(leadDays(null), 0);
});

test('days until due rounds up and never goes below zero', () => {
  const now = new Date('2026-10-01T12:00:00Z');
  assert.equal(daysUntilDue('2026-10-08T12:00:00Z', now), 7);
  assert.equal(daysUntilDue('2026-10-08T00:00:00Z', now), 7);
  assert.equal(daysUntilDue('2026-09-20T00:00:00Z', now), 0);
});
