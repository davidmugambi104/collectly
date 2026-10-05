import test from 'node:test';
import assert from 'node:assert/strict';
import { makeUnsubscribeToken, readUnsubscribeToken } from './unsubscribe-token.ts';

const env = { OAUTH_STATE_SECRET: 'test-secret' };
const legacy = (e: string) => Buffer.from(e).toString('base64url');

test('signed token round-trips and normalises case', () => {
  const t = makeUnsubscribeToken('Pat@Example.com', env);
  assert.ok(t.includes('.'));
  assert.equal(readUnsubscribeToken(t, env), 'pat@example.com');
});

test('a forged or tampered signature is rejected', () => {
  const t = makeUnsubscribeToken('pat@example.com', env);
  const [body] = t.split('.');
  assert.equal(readUnsubscribeToken(`${body}.AAAAAAAAAAAAAAAAAAAAAA`, env), null);
  assert.equal(readUnsubscribeToken(`${legacy('other@example.com')}.${t.split('.')[1]}`, env), null);
  assert.equal(readUnsubscribeToken(t, { OAUTH_STATE_SECRET: 'different' }), null);
});

test('legacy unsigned tokens still work unless signing is required', () => {
  assert.equal(readUnsubscribeToken(legacy('pat@example.com'), env), 'pat@example.com');
  assert.equal(readUnsubscribeToken(legacy('pat@example.com'), { ...env, UNSUBSCRIBE_REQUIRE_SIGNED: '1' }), null);
});

test('without a secret tokens stay unsigned and still read', () => {
  const t = makeUnsubscribeToken('pat@example.com', {});
  assert.equal(t.includes('.'), false);
  assert.equal(readUnsubscribeToken(t, {}), 'pat@example.com');
});

test('garbage is rejected', () => {
  assert.equal(readUnsubscribeToken('', env), null);
  assert.equal(readUnsubscribeToken('not-an-email', env), null);
  assert.equal(readUnsubscribeToken('a.b.c', env), null);
});
