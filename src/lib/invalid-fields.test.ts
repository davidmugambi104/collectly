import { test } from 'node:test';
import assert from 'node:assert/strict';
import { invalidFields } from './invalid-fields.ts';

test('invalidFields names each offending path once, in order', () => {
  const issues = [
    { path: ['channel'] },
    { path: ['tone'] },
    { path: ['channel'] },
    { path: ['customer', 'email'] },
  ];
  assert.deepEqual(invalidFields(issues), ['channel', 'tone', 'customer.email']);
});

test('a top-level failure is reported as (body), not an empty string', () => {
  // A non-object body produces an issue with an empty path. Without this the
  // message read "Invalid or missing: " with nothing after it.
  assert.deepEqual(invalidFields([{ path: [] }]), ['(body)']);
});

test('numeric array indexes render readably', () => {
  assert.deepEqual(invalidFields([{ path: ['items', 0, 'qty'] }]), ['items.0.qty']);
});
