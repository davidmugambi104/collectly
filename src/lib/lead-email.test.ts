import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildLeadEmail, leadSubject, escapeHtml } from './lead-email.ts';

test('every field from the public form is escaped', () => {
  // This email is assembled entirely from an unauthenticated form and opened
  // by the founder, so injection here lands in his inbox.
  const { html } = buildLeadEmail({
    type: 'waitlist',
    email: 'a@b.com',
    name: '<img src=x onerror=alert(1)>',
    company: '"><script>alert(2)</script>',
    meta: { note: '<b>bold</b>', ref: "o'reilly & co" },
  });
  assert.ok(!html.includes('<script>'), 'raw <script> reached the email');
  assert.ok(!html.includes('<img src=x'), 'raw <img> reached the email');
  assert.ok(!html.includes('<b>bold</b>'), 'raw meta HTML reached the email');
  assert.ok(html.includes('&lt;script&gt;'));
  assert.ok(html.includes('&amp;'));
});

test('empty and missing meta values are dropped, not rendered blank', () => {
  const { html } = buildLeadEmail({
    type: 'waitlist', email: 'a@b.com',
    meta: { country: 'GB', teamSize: undefined, source: '' },
  });
  assert.ok(html.includes('GB'));
  assert.ok(!html.includes('teamSize'));
  assert.ok(!html.includes('source'));
});

test('subjects identify the lead type', () => {
  assert.match(leadSubject({ type: 'waitlist', email: 'a@b.com' }), /waitlist signup/);
  assert.match(leadSubject({ type: 'interview', email: 'a@b.com', company: 'X' }), /interview.*X/);
  assert.match(leadSubject({ type: 'async_qualify', email: 'a@b.com' }), /Async qualify/);
  assert.match(leadSubject({ type: 'dunning_test', email: 'a@b.com' }), /Dunning test/);
});

test('escapeHtml covers the five characters that matter', () => {
  assert.equal(escapeHtml(`&<>"'`), '&amp;&lt;&gt;&quot;&#039;');
});
