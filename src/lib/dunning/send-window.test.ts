import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isWithinWindow, nextWindowOpen, parseWindowInput, isValidTimezone, localParts, WEEKDAYS, ALL_DAYS, DEFAULT_WINDOW, type SendWindow } from './send-window.ts';

const NY: SendWindow = { enabled: true, startHour: 9, endHour: 17, days: WEEKDAYS, timezone: 'America/New_York' };
const SYD: SendWindow = { enabled: true, startHour: 9, endHour: 17, days: WEEKDAYS, timezone: 'Australia/Sydney' };
const at = (iso: string) => new Date(iso);

test('a disabled window never holds anything back', () => {
  assert.equal(isWithinWindow(at('2026-10-03T03:00:00Z'), { ...NY, enabled: false }), true);
  assert.equal(isWithinWindow(at('2026-10-03T03:00:00Z'), DEFAULT_WINDOW), true);
});

test('reads the hour in the owner timezone, not UTC', () => {
  // 14:00 UTC on 1 Oct 2026 is 10:00 in New York (EDT, UTC-4).
  assert.deepEqual(localParts(at('2026-10-01T14:00:00Z'), 'America/New_York'), { weekday: 3, hour: 10, minute: 0 });
  assert.equal(isWithinWindow(at('2026-10-01T14:00:00Z'), NY), true);
  assert.equal(isWithinWindow(at('2026-10-01T12:59:00Z'), NY), false, '08:59 local is before 9');
  assert.equal(isWithinWindow(at('2026-10-01T13:00:00Z'), NY), true, '09:00 local opens it');
  assert.equal(isWithinWindow(at('2026-10-01T21:00:00Z'), NY), false, '17:00 local is the exclusive end');
});

test('follows daylight saving: the same UTC time lands an hour apart in summer and winter', () => {
  assert.equal(isWithinWindow(at('2026-11-02T13:30:00Z'), NY), false, 'EST: 08:30 local');
  assert.equal(isWithinWindow(at('2026-11-02T14:00:00Z'), NY), true, 'EST: 09:00 local');
  assert.equal(isWithinWindow(at('2026-10-01T13:00:00Z'), NY), true, 'EDT: 09:00 local');
});

test('weekends are outside a weekday window', () => {
  assert.equal(isWithinWindow(at('2026-10-03T15:00:00Z'), NY), false, 'Saturday');
  assert.equal(isWithinWindow(at('2026-10-04T15:00:00Z'), NY), false, 'Sunday');
  assert.equal(isWithinWindow(at('2026-10-05T15:00:00Z'), NY), true, 'Monday');
});

test('the daily 14:00 UTC run misses a window in Sydney, and the next opening is found', () => {
  const run = at('2026-10-01T14:00:00Z'); // midnight in Sydney
  assert.equal(isWithinWindow(run, SYD), false);
  const next = nextWindowOpen(run, SYD);
  assert.equal(next?.toISOString(), '2026-10-01T23:00:00.000Z', 'Friday 09:00 Sydney');
});

test('the next opening after Friday evening is Monday morning', () => {
  const fri = at('2026-10-02T22:00:00Z'); // Friday 18:00 in New York
  assert.equal(nextWindowOpen(fri, NY)?.toISOString(), '2026-10-05T13:00:00.000Z');
});

test('already inside means now', () => {
  const now = at('2026-10-01T15:00:00Z');
  assert.equal(nextWindowOpen(now, NY)?.getTime(), now.getTime());
});

test('a window that can never open reports null', () => {
  assert.equal(nextWindowOpen(at('2026-10-01T03:00:00Z'), { ...NY, days: 0 }), null);
});

test('an end hour of 24 runs to the end of the day', () => {
  const late: SendWindow = { ...NY, startHour: 18, endHour: 24, days: ALL_DAYS };
  assert.equal(isWithinWindow(at('2026-10-01T03:30:00Z'), late), true, '23:30 local');
});

test('timezone validation', () => {
  assert.equal(isValidTimezone('Africa/Nairobi'), true);
  assert.equal(isValidTimezone('Mars/Olympus'), false);
  assert.equal(isValidTimezone(''), false);
  assert.equal(isValidTimezone(42), false);
});

test('parsing rejects nonsense and accepts a sensible form', () => {
  const ok = parseWindowInput({ enabled: true, startHour: 8, endHour: 18, days: 31, timezone: 'Europe/London' });
  assert.equal(ok.ok, true);
  assert.equal(parseWindowInput({ enabled: true, startHour: 17, endHour: 9, days: 31, timezone: 'UTC' }).ok, false);
  assert.equal(parseWindowInput({ enabled: true, startHour: 9, endHour: 17, days: 0, timezone: 'UTC' }).ok, false);
  assert.equal(parseWindowInput({ enabled: true, startHour: 9, endHour: 17, days: 31, timezone: 'Nope/Nope' }).ok, false);
  assert.equal(parseWindowInput({ enabled: true, startHour: 9.5, endHour: 17, days: 31, timezone: 'UTC' }).ok, false);
  assert.equal(parseWindowInput(null).ok, false);
});

test('a missing timezone falls back to the org timezone', () => {
  const r = parseWindowInput({ enabled: true, startHour: 9, endHour: 17, days: 31 }, 'Africa/Nairobi');
  assert.equal(r.ok && r.value.timezone, 'Africa/Nairobi');
});
