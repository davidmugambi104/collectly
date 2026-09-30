import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parsePromiseDate, parsePortalReason, cleanNote, canSelfServe, PROMISE_MAX_DAYS, MAX_NOTE_CHARS, reasonLabel } from './portal-self-service.ts';

const NOW = new Date('2026-10-01T15:00:00Z');

test('a promise date must be a real day from today to 30 days ahead', () => {
  const today = parsePromiseDate('2026-10-01', NOW);
  assert.equal(today.ok, true);
  assert.equal(today.ok && today.date.toISOString(), '2026-10-01T23:59:59.000Z');
  assert.equal(parsePromiseDate('2026-10-31', NOW).ok, true);
  assert.equal(parsePromiseDate('2026-11-01', NOW).ok, false, 'one day too far');
  assert.equal(parsePromiseDate('2026-09-30', NOW).ok, false, 'yesterday');
  assert.equal(PROMISE_MAX_DAYS, 30);
});

test('junk dates are refused', () => {
  for (const bad of ['', 'tomorrow', '2026-13-40', '2026-02-30', '10/05/2026', null, 20261005, '2026-10-05T00:00:00Z']) {
    assert.equal(parsePromiseDate(bad, NOW).ok, false, String(bad));
  }
});

test('only the listed reasons are accepted', () => {
  assert.equal(parsePortalReason('already_paid'), 'already_paid');
  assert.equal(parsePortalReason('awaiting_approval'), null, 'a real enum value, but not one the customer may pick');
  assert.equal(parsePortalReason('<script>'), null);
  assert.equal(reasonLabel('amount_incorrect'), 'The amount looks wrong');
});

test('notes are cleaned and capped, and empty is null', () => {
  assert.equal(cleanNote('  hi\r\nthere '), 'hi\nthere');
  assert.equal(cleanNote('   '), null);
  assert.equal(cleanNote({}), null);
  assert.equal(cleanNote('x'.repeat(MAX_NOTE_CHARS + 10))?.length, MAX_NOTE_CHARS);
});

test('only open invoices can be acted on from a public link', () => {
  for (const s of ['sent', 'viewed', 'overdue', 'partial']) assert.equal(canSelfServe(s), true, s);
  for (const s of ['paid', 'written_off', 'draft', 'disputed']) assert.equal(canSelfServe(s), false, s);
});

test('a chosen day is shown as that day, not shifted by a time zone', async () => {
  const { utcDay } = await import('./portal-self-service.ts');
  assert.equal(utcDay(new Date('2026-10-05T23:59:59.000Z')), 'Oct 5, 2026');
});
