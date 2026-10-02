import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Webhook } from 'svix';
import { planDeliveryEvent, verifyDeliveryWebhook, isHardBounce } from './delivery-events.ts';

const SECRET = 'whsec_' + Buffer.from('a-test-secret-of-32-bytes-long!!').toString('base64');

function signed(body: object, opts: { secret?: string; ageSeconds?: number } = {}) {
  const raw = JSON.stringify(body);
  const id = 'msg_test_1';
  const ts = new Date(Date.now() - (opts.ageSeconds ?? 0) * 1000);
  const sig = new Webhook(opts.secret ?? SECRET).sign(id, ts, raw);
  const h = new Map([['svix-id', id], ['svix-timestamp', String(Math.floor(ts.getTime() / 1000))], ['svix-signature', sig]]);
  return { raw, headers: { get: (n: string) => h.get(n) ?? null } };
}

test('a correctly signed webhook is accepted and parsed', () => {
  const { raw, headers } = signed({ type: 'email.delivered', data: { message_id: '<a@b>' } });
  assert.equal(verifyDeliveryWebhook(SECRET, raw, headers).type, 'email.delivered');
});

test('a webhook signed with another secret is rejected', () => {
  const other = 'whsec_' + Buffer.from('some-other-secret-of-32-bytes!!!').toString('base64');
  const { raw, headers } = signed({ type: 'email.bounced' }, { secret: other });
  assert.throws(() => verifyDeliveryWebhook(SECRET, raw, headers));
});

test('a tampered body is rejected', () => {
  const { raw, headers } = signed({ type: 'email.delivered', data: { message_id: '<a@b>' } });
  assert.throws(() => verifyDeliveryWebhook(SECRET, raw.replace('delivered', 'complained'), headers));
});

test('missing signature headers are rejected', () => {
  assert.throws(() => verifyDeliveryWebhook(SECRET, '{}', { get: () => null }));
});

test('a stale timestamp is rejected (replay)', () => {
  const { raw, headers } = signed({ type: 'email.delivered' }, { ageSeconds: 3600 });
  assert.throws(() => verifyDeliveryWebhook(SECRET, raw, headers));
});

test('permanent bounce: run fails and the customer is suppressed', () => {
  const p = planDeliveryEvent('sent', { type: 'email.bounced', data: { bounce: { type: 'Permanent', message: 'No such user' } } });
  assert.equal(p.setStatus, 'failed');
  assert.equal(p.suppressCustomer, true);
  assert.equal(p.reason, 'hard_bounce');
  assert.match(p.error ?? '', /^bounced: No such user/);
});

test('transient bounce: run fails but the customer keeps getting reminders', () => {
  const p = planDeliveryEvent('sent', { type: 'email.bounced', data: { bounce: { type: 'Transient', message: 'Mailbox full' } } });
  assert.equal(p.setStatus, 'failed');
  assert.equal(p.suppressCustomer, false);
  assert.equal(p.reason, 'soft_bounce');
});

test('undetermined or untyped bounce is not treated as hard', () => {
  assert.equal(planDeliveryEvent('sent', { type: 'email.bounced', data: { bounce: { type: 'Undetermined' } } }).suppressCustomer, false);
  assert.equal(planDeliveryEvent('sent', { type: 'email.bounced', data: {} }).suppressCustomer, false);
  assert.equal(isHardBounce(undefined), false);
  assert.equal(isHardBounce({ type: 'permanent' }), true);
});

test('spam complaint: run fails and the customer is suppressed', () => {
  const p = planDeliveryEvent('delivered', { type: 'email.complained' });
  assert.equal(p.setStatus, 'failed');
  assert.equal(p.suppressCustomer, true);
  assert.equal(p.reason, 'complaint');
});

test('delivered, opened, clicked only move a run forward', () => {
  assert.equal(planDeliveryEvent('sent', { type: 'email.delivered' }).setStatus, 'delivered');
  assert.equal(planDeliveryEvent('delivered', { type: 'email.opened' }).setStatus, 'opened');
  assert.equal(planDeliveryEvent('opened', { type: 'email.delivered' }).setStatus, null);
  assert.equal(planDeliveryEvent('clicked', { type: 'email.opened' }).setStatus, null);
});

test('a failed or cancelled run is never revived by a late event', () => {
  assert.equal(planDeliveryEvent('failed', { type: 'email.delivered' }).setStatus, null);
  assert.equal(planDeliveryEvent('cancelled', { type: 'email.opened' }).setStatus, null);
});

test('unknown event types change nothing', () => {
  const p = planDeliveryEvent('sent', { type: 'email.delivery_delayed' });
  assert.equal(p.setStatus, null);
  assert.equal(p.suppressCustomer, false);
});

test('bounce error text is capped', () => {
  const p = planDeliveryEvent('sent', { type: 'email.bounced', data: { bounce: { type: 'Permanent', message: 'x'.repeat(2000) } } });
  assert.ok((p.error ?? '').length < 330);
});
