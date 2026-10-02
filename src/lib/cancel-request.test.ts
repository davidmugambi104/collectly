import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildCancelNotes, founderEmail, customerEmail, parseCancelKind, isCancelNote } from './cancel-request.ts';

test('only the two known kinds are accepted', () => {
  assert.equal(parseCancelKind('cancel'), 'cancel');
  assert.equal(parseCancelKind('change'), 'change');
  assert.equal(parseCancelKind('delete everything'), null);
  assert.equal(parseCancelKind(undefined), null);
});

test('notes carry the kind prefix and are capped', () => {
  assert.equal(buildCancelNotes('cancel', ''), '[CANCEL REQUEST]');
  assert.ok(isCancelNote(buildCancelNotes('cancel', 'too dear')));
  assert.ok(!isCancelNote(buildCancelNotes('change', 'bigger plan')));
  assert.ok(buildCancelNotes('change', 'x'.repeat(5000)).length < 1600);
});

test('founder email escapes everything the customer typed', () => {
  const { html, subject } = founderEmail({ kind: 'cancel', orgName: '<b>Acme</b>', orgSlug: 'acme', planName: 'Essentials', ownerEmail: null, notes: '<script>alert(1)</script>', requestId: 'r1', appUrl: 'https://mugavi.com' });
  assert.ok(!html.includes('<script>') && !html.includes('<b>Acme'));
  assert.ok(subject.startsWith('[Cancel request]'));
});

test('customer email makes no promise beyond what is true, and has no save offer', () => {
  const { html } = customerEmail({ kind: 'cancel', orgName: 'Acme', firstName: 'Sam' });
  assert.ok(html.includes('nothing changes until I do'));
  assert.ok(html.includes('not charged again'));
  assert.ok(!/discount|stay with us|miss|sure you/i.test(html));
  assert.ok(!/[–—]/.test(html));
});
