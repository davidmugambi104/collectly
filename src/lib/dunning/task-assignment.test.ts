import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findMember, memberLabel, parseTaskView } from './task-assignment.ts';

const members = [{ id: 'u1', name: 'Amina' }, { id: 'u2', name: 'Brian' }];

test('findMember only accepts people in the organisation', () => {
  assert.deepEqual(findMember(members, 'u2'), { id: 'u2', name: 'Brian' });
  assert.equal(findMember(members, 'someone-else'), null);
  assert.equal(findMember(members, ''), null);
  assert.equal(findMember(members, undefined), null);
  assert.equal(findMember(members, 42), null);
});

test('parseTaskView falls back to all', () => {
  assert.equal(parseTaskView('me'), 'me');
  assert.equal(parseTaskView('unassigned'), 'unassigned');
  assert.equal(parseTaskView('junk'), 'all');
  assert.equal(parseTaskView(undefined), 'all');
});

test('memberLabel', () => {
  assert.equal(memberLabel('Amina', 'Otieno', 'x'), 'Amina Otieno');
  assert.equal(memberLabel(' Amina ', null, 'x'), 'Amina');
  assert.equal(memberLabel(null, null, 'fallback-id'), 'fallback-id');
  assert.equal(memberLabel(null, null, null), 'Team member');
});
