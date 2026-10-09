import { test } from 'node:test';
import assert from 'node:assert/strict';
import { requiresAuthEvenIfUnknown } from './route-guard.ts';

test('protects /dashboard and /admin even for unknown sub-paths', () => {
  assert.equal(requiresAuthEvenIfUnknown('/dashboard'), true);
  assert.equal(requiresAuthEvenIfUnknown('/dashboard/typo-does-not-exist'), true);
  assert.equal(requiresAuthEvenIfUnknown('/admin'), true);
  assert.equal(requiresAuthEvenIfUnknown('/admin/upgrade-requests'), true);
});

test('does not false-positive on a sibling path with the same prefix text', () => {
  assert.equal(requiresAuthEvenIfUnknown('/dashboardish'), false);
  assert.equal(requiresAuthEvenIfUnknown('/administer'), false);
});

test('leaves unknown marketing-style paths unprotected so Next can 404 them', () => {
  assert.equal(requiresAuthEvenIfUnknown('/this-page-does-not-exist'), false);
  assert.equal(requiresAuthEvenIfUnknown('/blog/some-typo-slug'), false);
  assert.equal(requiresAuthEvenIfUnknown('/'), false);
});

test('unknown public-looking paths, including /pay/<bad-id>, are not forced to sign-in', () => {
  assert.equal(requiresAuthEvenIfUnknown('/pay/bad-id'), false);
  assert.equal(requiresAuthEvenIfUnknown('/help/does-not-exist'), false);
  assert.equal(requiresAuthEvenIfUnknown('/for/nobody'), false);
});
