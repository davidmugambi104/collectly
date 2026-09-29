import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isApprovalRequired, approvalBlocker, applyEdits } from './approval.ts';

test('approval is required unless the org has explicitly turned it off', () => {
  assert.equal(isApprovalRequired(null), true);
  assert.equal(isApprovalRequired(undefined), true);
  assert.equal(isApprovalRequired({ approvalRequired: true }), true);
  assert.equal(isApprovalRequired({ approvalRequired: false }), false);
});

const base = {
  invoiceStatus: 'overdue', customerDndAt: null, channel: 'email' as const,
  customerEmail: 'ap@example.test', customerPhone: null, smsAllowed: false,
};

test('an open invoice to a reachable customer can go', () => {
  assert.equal(approvalBlocker(base), null);
  for (const s of ['sent', 'viewed', 'overdue', 'partial']) assert.equal(approvalBlocker({ ...base, invoiceStatus: s }), null);
});

test('a draft for an invoice that was paid or disputed while queued is blocked', () => {
  for (const s of ['paid', 'written_off', 'disputed']) assert.match(approvalBlocker({ ...base, invoiceStatus: s }) ?? '', /nothing to chase/);
});

test('approval never overrides an unsubscribe', () => {
  assert.match(approvalBlocker({ ...base, customerDndAt: new Date() }) ?? '', /unsubscribed/);
});

test('SMS needs a phone and an explicit opt-in, even when approved', () => {
  const sms = { ...base, channel: 'sms' as const };
  assert.match(approvalBlocker(sms) ?? '', /no phone/);
  assert.match(approvalBlocker({ ...sms, customerPhone: '+15550100' }) ?? '', /opted in/);
  assert.equal(approvalBlocker({ ...sms, customerPhone: '+15550100', smsAllowed: true }), null);
});

test('email with no address is blocked', () => {
  assert.match(approvalBlocker({ ...base, customerEmail: null }) ?? '', /no email/);
});

test('owner edits replace the draft; blanks keep it', () => {
  const d = { subject: 'Invoice 12', body: 'draft body' };
  assert.deepEqual(applyEdits(d, undefined), d);
  assert.deepEqual(applyEdits(d, { subject: '  ', body: '' }), d);
  assert.deepEqual(applyEdits(d, { subject: 'New\r\nBcc: x', body: '  mine  ' }), { subject: 'New Bcc: x', body: 'mine' });
});

test('an unhandled customer reply blocks the send, so a draft cannot talk over it', () => {
  assert.match(approvalBlocker({ ...base, unhandledReply: true }) ?? '', /replied/);
  assert.equal(approvalBlocker({ ...base, unhandledReply: false }), null);
});
