import { test } from 'node:test';
import assert from 'node:assert/strict';
import { statementPeriod, isStatementDay, parseScheduleInput, shouldDraftStatement, MAX_DAY } from './statement-schedule.ts';

test('period is the UTC month, zero padded', () => {
  assert.equal(statementPeriod(new Date('2026-10-01T00:30:00Z')), '2026-10');
  assert.equal(statementPeriod(new Date('2026-01-31T23:59:59Z')), '2026-01');
  assert.equal(statementPeriod(new Date('2026-12-15T12:00:00Z')), '2026-12');
});

test('due on or after the chosen day, so a missed day is made up', () => {
  assert.equal(isStatementDay(new Date('2026-10-04T10:00:00Z'), 5), false);
  assert.equal(isStatementDay(new Date('2026-10-05T00:00:00Z'), 5), true);
  assert.equal(isStatementDay(new Date('2026-10-20T10:00:00Z'), 5), true);
  assert.equal(isStatementDay(new Date('2026-02-28T10:00:00Z'), MAX_DAY), true);
});

test('settings input is validated', () => {
  assert.deepEqual(parseScheduleInput({ enabled: true, day: 5 }), { ok: true, value: { enabled: true, day: 5 } });
  assert.deepEqual(parseScheduleInput({ enabled: false, day: '28' }), { ok: true, value: { enabled: false, day: 28 } });
  for (const bad of [null, 'x', {}, { enabled: 'yes', day: 5 }, { enabled: true, day: 0 }, { enabled: true, day: 29 }, { enabled: true, day: 1.5 }, { enabled: true }]) {
    assert.equal(parseScheduleInput(bad).ok, false, JSON.stringify(bad));
  }
});

test('who qualifies for a draft', () => {
  const ok = { email: 'a@x.test', unsubscribedAt: null, onHold: false, overdueCents: 100 };
  assert.equal(shouldDraftStatement(ok), true);
  assert.equal(shouldDraftStatement({ ...ok, email: null }), false);
  assert.equal(shouldDraftStatement({ ...ok, email: '  ' }), false);
  assert.equal(shouldDraftStatement({ ...ok, unsubscribedAt: new Date() }), false);
  assert.equal(shouldDraftStatement({ ...ok, onHold: true }), false);
  assert.equal(shouldDraftStatement({ ...ok, overdueCents: 0 }), false);
});
