import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isSmsConfigured, smsStepSkipReason, latestDueStep, SMS_UNCONFIGURED_REASON } from './sms-config.ts';
import { approvalBlocker } from './approval.ts';

const fullEnv = { TWILIO_ACCOUNT_SID: 'ACfake', TWILIO_AUTH_TOKEN: 'fake', TWILIO_FROM_NUMBER: '+15550100' };

test('SMS is configured only when all three Twilio settings are present', () => {
  assert.equal(isSmsConfigured(fullEnv), true);
  assert.equal(isSmsConfigured({}), false);
  for (const k of Object.keys(fullEnv)) assert.equal(isSmsConfigured({ ...fullEnv, [k]: '' }), false);
});

// The scheduler applies the skip before any draft, so it is the same in
// approval mode and auto-send mode.
for (const mode of ['approval', 'auto-send']) {
  test(`${mode} mode: unconfigured SMS step is skipped with a reason`, () => {
    assert.equal(smsStepSkipReason('sms', isSmsConfigured({})), SMS_UNCONFIGURED_REASON);
  });
  test(`${mode} mode: configured SMS step goes ahead`, () => {
    assert.equal(smsStepSkipReason('sms', isSmsConfigured(fullEnv)), null);
  });
}

test('email and call steps are never skipped for missing Twilio', () => {
  assert.equal(smsStepSkipReason('email', false), null);
  assert.equal(smsStepSkipReason('phone', false), null);
});

const steps = [
  { id: 'e1', daysFromDue: 7, channel: 'email' as const },
  { id: 'e2', daysFromDue: 30, channel: 'email' as const },
  { id: 's3', daysFromDue: 60, channel: 'sms' as const },
];

test('final-step SMS at 65 days overdue, Twilio unconfigured: skipped, nothing after it, no email reroute', () => {
  const step = latestDueStep([...steps].reverse(), 65);
  assert.equal(step?.id, 's3');
  assert.equal(smsStepSkipReason(step!.channel, false), SMS_UNCONFIGURED_REASON);
  assert.equal(latestDueStep(steps, 65)?.channel, 'sms'); // not rerouted to e2
});

test('final-step SMS at 65 days overdue, Twilio configured: goes ahead', () => {
  assert.equal(smsStepSkipReason(latestDueStep(steps, 65)!.channel, true), null);
});

test('skipping the SMS step leaves earlier and later email steps untouched', () => {
  assert.equal(latestDueStep(steps, 45)?.id, 'e2');
  const withLater = [...steps, { id: 'e4', daysFromDue: 90, channel: 'email' as const }];
  const next = latestDueStep(withLater, 91)!;
  assert.equal(next.id, 'e4');
  assert.equal(smsStepSkipReason(next.channel, false), null);
});

test('no step due yet gives null', () => assert.equal(latestDueStep(steps, 3), null));

test('approval: a queued SMS draft cannot be approved while Twilio is unconfigured', () => {
  const sms = { invoiceStatus: 'overdue', customerDndAt: null, channel: 'sms' as const, customerEmail: null, customerPhone: '+15550123', smsAllowed: true };
  assert.match(approvalBlocker({ ...sms, smsConfigured: false }) ?? '', /not set up/);
  assert.equal(approvalBlocker({ ...sms, smsConfigured: true }), null);
  assert.equal(approvalBlocker(sms), null);
});
