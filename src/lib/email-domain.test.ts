import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeDomain, isBlockedDomain, normalizeLocalPart, mapProviderStatus, normalizeRecords, canSendFrom, dmarcRecord } from './email-domain.ts';
import { formatOwnDomainFrom } from './email-from.ts';

test('domains are cleaned from what people paste', () => {
  assert.equal(normalizeDomain('acme.com'), 'acme.com');
  assert.equal(normalizeDomain('  ACME.com '), 'acme.com');
  assert.equal(normalizeDomain('https://www.acme.com/pricing?x=1'), 'acme.com');
  assert.equal(normalizeDomain('billing@acme.co.uk'), 'acme.co.uk');
  assert.equal(normalizeDomain('mail.acme.com'), 'mail.acme.com');
  assert.equal(normalizeDomain('acme.com:8080/path'), 'acme.com');
});

test('things that are not domains are refused', () => {
  for (const bad of ['', 'localhost', 'acme', 'ac me.com', '-acme.com', 'acme-.com', 'acme.c', 'a..com', 'a'.repeat(64) + '.com', 42, null, undefined]) {
    assert.equal(normalizeDomain(bad as string), null, String(bad));
  }
});

test('free mailboxes, our own domains and their subdomains are blocked', () => {
  for (const d of ['gmail.com', 'outlook.com', 'mugavi.com', 'getcollectly.app', 'mail.mugavi.com', 'x.gmail.com', 'resend.dev']) {
    assert.equal(isBlockedDomain(d), true, d);
  }
  assert.equal(isBlockedDomain('acme.com'), false);
  assert.equal(isBlockedDomain('notgmail.com'), false, 'a different domain that merely ends the same way');
});

test('local part defaults to billing and refuses role addresses that receive abuse mail', () => {
  assert.equal(normalizeLocalPart(undefined), 'billing');
  assert.equal(normalizeLocalPart(''), 'billing');
  assert.equal(normalizeLocalPart('Accounts'), 'accounts');
  assert.equal(normalizeLocalPart('ar+chasers'), 'ar+chasers');
  assert.equal(normalizeLocalPart('accounts@acme.com'), 'accounts');
  for (const bad of ['postmaster', 'abuse', 'no reply', '.x', 'a'.repeat(65), 5]) assert.equal(normalizeLocalPart(bad as string), null, String(bad));
});

test('provider states collapse to pending, verified, failed', () => {
  assert.equal(mapProviderStatus('verified'), 'verified');
  assert.equal(mapProviderStatus('failed'), 'failed');
  for (const s of ['pending', 'not_started', 'temporary_failure', 'weird', null, undefined]) assert.equal(mapProviderStatus(s as string), 'pending');
});

test('provider records are normalised and empty ones dropped', () => {
  const out = normalizeRecords([
    { record: 'SPF', name: 'send', value: 'v=spf1 include:amazonses.com ~all', type: 'TXT', ttl: 'Auto', status: 'pending' },
    { record: 'DKIM', name: 'resend._domainkey', value: 'p=MIGf...', type: 'TXT', ttl: 'Auto', status: 'verified' },
    { record: 'SPF', name: 'send', value: 'feedback-smtp.eu-west-1.amazonses.com', type: 'MX', ttl: 'Auto', priority: 10, status: 'not_started' },
    { record: 'X', name: '', value: '', type: '' },
    null,
  ]);
  assert.equal(out.length, 3);
  assert.equal(out[2].priority, 10);
  assert.equal(out[1].status, 'verified');
  assert.deepEqual(normalizeRecords('nope'), []);
});

test('sending from a customer domain needs a verified status, and nothing less', () => {
  const row = { status: 'verified', domain: 'acme.com', localPart: 'billing' };
  assert.equal(canSendFrom(row), true);
  assert.equal(canSendFrom({ ...row, status: 'pending' }), false);
  assert.equal(canSendFrom({ ...row, status: 'failed' }), false);
  assert.equal(canSendFrom(null), false);
});

test('the own-domain From line names the business, with no platform, and cannot inject a header', () => {
  assert.equal(formatOwnDomainFrom('Acme Studio', 'billing', 'acme.com'), '"Acme Studio" <billing@acme.com>');
  const evil = formatOwnDomainFrom('Acme"\r\nBcc: x@y.z', 'billing', 'acme.com');
  assert.ok(!/[\r\n]/.test(evil));
  assert.ok(evil.endsWith('<billing@acme.com>'));
  assert.equal(formatOwnDomainFrom('', 'billing', 'acme.com'), '"acme.com" <billing@acme.com>');
});

test('dmarcRecord starts in monitor mode and names the _dmarc host', () => {
  const r = dmarcRecord('acme.com');
  assert.equal(r.name, '_dmarc.acme.com');
  assert.equal(r.value, 'v=DMARC1; p=none');
});

test('dmarcRecord adds a report address only when it looks like one', () => {
  assert.equal(dmarcRecord('acme.com', 'dmarc@acme.com').value, 'v=DMARC1; p=none; rua=mailto:dmarc@acme.com');
  assert.equal(dmarcRecord('acme.com', 'not an address').value, 'v=DMARC1; p=none');
  assert.equal(dmarcRecord('acme.com', 'a@b.com; p=reject').value, 'v=DMARC1; p=none');
});
