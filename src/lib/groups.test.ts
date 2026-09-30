import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeGroupName, copySteps, FALLBACK_STEPS, MAX_GROUP_NAME } from './groups.ts';

test('group names are cleaned and capped', () => {
  assert.equal(normalizeGroupName('  VIP   customers '), 'VIP customers');
  assert.equal(normalizeGroupName('a\u0000b\nc'), 'a b c');
  assert.equal(normalizeGroupName('x'.repeat(200))?.length, MAX_GROUP_NAME);
  for (const bad of ['', '   ', null, undefined, 5]) assert.equal(normalizeGroupName(bad as string), null);
});

test('a new group copies the org schedule with fresh step ids, and never shares objects with it', () => {
  const src = [{ id: 'x9', daysFromDue: 3, channel: 'email' as const, tone: 'friendly' as const, template: 'hi' }, { id: 'y1', daysFromDue: 10, channel: 'sms' as const, tone: 'final' as const, template: '' }];
  const out = copySteps(src);
  assert.deepEqual(out.map((s) => s.id), ['s1', 's2']);
  assert.equal(out[0].template, 'hi');
  assert.notEqual(out[0], src[0]);
  assert.equal(src[0].id, 'x9', 'the original is untouched');
});

test('with no org schedule a small email-only starter is used', () => {
  assert.deepEqual(copySteps(null).map((s) => s.channel), ['email', 'email', 'email']);
  assert.equal(copySteps([]).length, FALLBACK_STEPS.length);
});
