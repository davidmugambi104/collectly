import { test } from 'node:test';
import assert from 'node:assert/strict';
import { statementTarget } from './statement-target.ts';

test('sends to the address on file', () => assert.deepEqual(statementTarget({ email: ' ap@example.test ', unsubscribedAt: null }), { ok: true, to: 'ap@example.test' }));
test('never to someone who unsubscribed', () => assert.equal(statementTarget({ email: 'ap@example.test', unsubscribedAt: new Date() }).ok, false));
test('no usable address', () => {
  for (const email of [null, undefined, '', '   ', 'nope', 'a@b', 'a b@c.d']) assert.equal(statementTarget({ email, unsubscribedAt: null }).ok, false);
});
