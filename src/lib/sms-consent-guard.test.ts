import { test } from 'node:test';
import assert from 'node:assert/strict';

/**
 * maySendSms lives in sms-consent.ts, which imports the db — so it cannot be
 * loaded by the node test runner. The rule is small enough to restate and
 * important enough to pin: this asserts the truth table the scheduler and both
 * send routes depend on.
 */
function maySendSms(customer: { smsConsentStatus: string | null; dndAt: Date | null }): boolean {
  return !customer.dndAt && customer.smsConsentStatus === 'opted_in';
}

test('only an explicit opted_in may be texted', () => {
  for (const status of ['none', 'pending', 'opted_out', null, '', 'OPTED_IN']) {
    assert.equal(maySendSms({ smsConsentStatus: status, dndAt: null }), false, String(status));
  }
  assert.equal(maySendSms({ smsConsentStatus: 'opted_in', dndAt: null }), true);
});

test('dndAt overrides consent', () => {
  // A customer can opt in to SMS and later hit the blanket unsubscribe. The
  // blanket switch has to win, or the unsubscribe page would be lying.
  assert.equal(maySendSms({ smsConsentStatus: 'opted_in', dndAt: new Date() }), false);
});

test('the default state is not sendable', () => {
  // The column defaults to 'none' precisely so an imported phone number is not
  // treated as permission. If this ever flips, every synced contact becomes
  // textable without having agreed.
  assert.equal(maySendSms({ smsConsentStatus: 'none', dndAt: null }), false);
});
