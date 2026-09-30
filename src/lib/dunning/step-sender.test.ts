import { test } from 'node:test';
import assert from 'node:assert/strict';
import { senderFromStep, senderKey } from './step-sender.ts';

test('no fields, no sender', () => {
  assert.equal(senderFromStep(null), null);
  assert.equal(senderFromStep({}), null);
  assert.equal(senderFromStep({ senderName: '  ', senderLocalPart: '' }), null);
});

test('a name alone, a local part alone, both', () => {
  assert.deepEqual(senderFromStep({ senderName: 'Amina Otieno' }), { name: 'Amina Otieno', localPart: null });
  assert.deepEqual(senderFromStep({ senderLocalPart: 'Accounts' }), { name: null, localPart: 'accounts' });
  assert.deepEqual(senderFromStep({ senderName: 'Amina', senderLocalPart: 'md@ignored.com' }), { name: 'Amina', localPart: 'md' });
});

test('an unusable or reserved local part is dropped, never replaced with a guess', () => {
  assert.equal(senderFromStep({ senderLocalPart: 'postmaster' }), null);
  assert.equal(senderFromStep({ senderLocalPart: 'has space' }), null);
  assert.deepEqual(senderFromStep({ senderName: 'Amina', senderLocalPart: 'noreply' }), { name: 'Amina', localPart: null });
});

test('senderKey differs per sender', () => {
  assert.equal(senderKey(null), '');
  assert.notEqual(senderKey({ name: 'A', localPart: null }), senderKey({ name: null, localPart: 'a' }));
});
