import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isHoneypotHit, looksLikeEmail, leadOutcome, LEAD_FAILED_MESSAGE } from './lead-guard.ts';
import { leadSubject, buildLeadEmail } from './lead-email.ts';

test('a filled honeypot is a hit, an empty or missing one is not', () => {
  assert.equal(isHoneypotHit({ website: 'http://spam.example.test' }), true);
  assert.equal(isHoneypotHit({ website: '   ' }), false);
  assert.equal(isHoneypotHit({ website: '' }), false);
  assert.equal(isHoneypotHit({ email: 'a@b.co' }), false);
  assert.equal(isHoneypotHit(null), false);
  assert.equal(isHoneypotHit('x'), false);
});

test('looksLikeEmail accepts normal addresses and rejects junk and header injection', () => {
  assert.equal(looksLikeEmail('test@example.test'), true);
  assert.equal(looksLikeEmail('a.b+c@sub.example.co.uk'), true);
  for (const bad of ['notanemail', 'a@b', '@example.test', 'a b@example.test', 'a@example.test\nBcc: x@y.test', 'a@b.c', '', 'a@b.test,c@d.test']) {
    assert.equal(looksLikeEmail(bad), false, bad);
  }
  assert.equal(looksLikeEmail('a'.repeat(250) + '@example.test'), false);
  assert.equal(looksLikeEmail(undefined), false);
});

test('a lead is captured if it was stored or the founder was told; only losing both fails', () => {
  assert.equal(leadOutcome({ stored: true, notified: true }).status, 200);
  assert.equal(leadOutcome({ stored: true, notified: false }).status, 200);
  assert.equal(leadOutcome({ stored: false, notified: true }).status, 200);
  assert.equal(leadOutcome({ stored: false, notified: false }).status, 503);
});

test('the failure message tells the visitor what to do and has no em dash', () => {
  assert.ok(LEAD_FAILED_MESSAGE.includes('email'));
  assert.ok(!LEAD_FAILED_MESSAGE.includes('—'));
});

test('audit and sign-up notifications have their own subject and carry the full pain text', () => {
  assert.match(leadSubject({ type: 'ar_audit', email: 'a@example.test', company: 'Acme' }), /A\/R audit request/);
  assert.match(leadSubject({ type: 'signup', email: 'a@example.test' }), /sign-up/);
  const long = 'x'.repeat(1500);
  const { html } = buildLeadEmail({ type: 'ar_audit', email: 'a@example.test', meta: { topPain: long } });
  assert.ok(html.includes(long), 'long answers must not be truncated');
});
