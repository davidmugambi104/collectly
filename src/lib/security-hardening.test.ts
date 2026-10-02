import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { safeEqual, paystackSignatureValid } from './webhook-auth.ts';
import { parseAdminEmails, isAdminEmail } from './admin-allowlist.ts';
import { resolveStateSecret } from './oauth-state-secret.ts';
import { renderEmailHtml } from './email-html.ts';

test('safeEqual is exact and length-safe', () => {
  assert.equal(safeEqual('abc', 'abc'), true);
  assert.equal(safeEqual('abc', 'abd'), false);
  assert.equal(safeEqual('abc', 'abcd'), false);
  assert.equal(safeEqual('', ''), true);
});

test('paystack signature: valid, tampered body, wrong secret, missing pieces', () => {
  const secret = 'sk_test_example_secret';
  const body = '{"event":"charge.success"}';
  const sig = createHmac('sha512', secret).update(body).digest('hex');
  assert.equal(paystackSignatureValid(body, sig, secret), true);
  assert.equal(paystackSignatureValid(body, sig.toUpperCase(), secret), true);
  assert.equal(paystackSignatureValid(body + ' ', sig, secret), false);
  assert.equal(paystackSignatureValid(body, sig, 'other'), false);
  assert.equal(paystackSignatureValid(body, null, secret), false);
  assert.equal(paystackSignatureValid(body, sig, undefined), false);
  assert.equal(paystackSignatureValid(body, 'short', secret), false);
});

test('admin allowlist parsing and matching', () => {
  assert.deepEqual(parseAdminEmails(' A@x.com , b@y.com,, '), ['a@x.com', 'b@y.com']);
  assert.deepEqual(parseAdminEmails(''), []);
  const list = parseAdminEmails('a@x.com');
  assert.equal(isAdminEmail('A@X.com ', list), true);
  assert.equal(isAdminEmail('b@x.com', list), false);
  assert.equal(isAdminEmail(undefined, list), false);
  assert.equal(isAdminEmail('', parseAdminEmails('')), false);
});

test('OAuth state secret: prefers configured, refuses the dev fallback in production', () => {
  assert.equal(resolveStateSecret({ OAUTH_STATE_SECRET: 'a', CRON_SECRET: 'b', NODE_ENV: 'production' }), 'a');
  assert.equal(resolveStateSecret({ CRON_SECRET: 'b', NODE_ENV: 'production' }), 'b');
  assert.throws(() => resolveStateSecret({ NODE_ENV: 'production' }));
  assert.equal(typeof resolveStateSecret({ NODE_ENV: 'development' }), 'string');
});

test('reminder email HTML escapes the body and imported names', () => {
  const html = renderEmailHtml({
    body: 'Hi <img src=x onerror=alert(1)> pay at https://mugavi.com/pay/abc?a=1&b=2',
    invoice: { number: 'INV-<b>1', currency: 'USD', amount: '10.00' } as never,
    businessName: 'Evil <script>x</script> Co',
    extraHtml: '<table>kept</table>',
  });
  assert.ok(!html.includes('<img'));
  assert.ok(!html.includes('<script>'));
  assert.ok(!html.includes('INV-<b>'));
  assert.ok(html.includes('&lt;img'));
  assert.ok(html.includes('a=1&amp;b=2'));
  assert.ok(html.includes('<table>kept</table>'), 'already-escaped extra markup is passed through');
});
