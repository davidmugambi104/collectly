import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCallOutcome, hasOutcome, callTimelineTitle, MAX_CALL_NOTE } from './call-outcome.ts';

test('known outcome and a trimmed note are kept', () => {
  assert.deepEqual(parseCallOutcome('reached', '  Said he will pay Friday.\r\nCall back Monday. '), { outcome: 'reached', note: 'Said he will pay Friday.\nCall back Monday.' });
});

test('unknown outcome or non-text is dropped, never guessed', () => {
  assert.deepEqual(parseCallOutcome('angry', 42), { outcome: null, note: null });
  assert.deepEqual(parseCallOutcome(undefined, undefined), { outcome: null, note: null });
  assert.deepEqual(parseCallOutcome('no_answer', '   '), { outcome: 'no_answer', note: null });
});

test('control characters are removed and length is capped', () => {
  assert.equal(parseCallOutcome(null, 'a\u0000b\u0007c').note, 'abc');
  assert.equal(parseCallOutcome(null, 'x'.repeat(5000)).note!.length, MAX_CALL_NOTE);
});

test('hasOutcome and the timeline title', () => {
  assert.equal(hasOutcome({ outcome: null, note: null }), false);
  assert.equal(hasOutcome({ outcome: null, note: 'x' }), true);
  assert.equal(callTimelineTitle({ outcome: 'left_message', note: null }, 'INV-1'), 'Call about INV-1: left a message');
  assert.equal(callTimelineTitle({ outcome: null, note: 'x' }, 'INV-1'), 'Call about INV-1');
});
