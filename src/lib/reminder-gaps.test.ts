import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reminderGaps } from './reminder-gaps.ts';

const ok = { email: 'a@example.com', phone: '+15550001', dndAt: null, preferredChannel: 'email' };

test('a customer with what they need has no gaps', () => {
  assert.deepEqual(reminderGaps(ok), []);
});

test('no email, or a blank one', () => {
  assert.deepEqual(reminderGaps({ ...ok, email: null }), ['no_email']);
  assert.deepEqual(reminderGaps({ ...ok, email: '   ' }), ['no_email']);
});

test('a missing phone only matters when they prefer text', () => {
  assert.deepEqual(reminderGaps({ ...ok, phone: null }), []);
  assert.deepEqual(reminderGaps({ ...ok, phone: null, preferredChannel: 'sms' }), ['no_phone']);
});

test('unsubscribed wins over everything else', () => {
  assert.deepEqual(reminderGaps({ ...ok, email: null, dndAt: new Date() }), ['unsubscribed']);
});
