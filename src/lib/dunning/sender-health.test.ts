import { test } from 'node:test';
import assert from 'node:assert/strict';
import { senderNotices } from './sender-health.ts';

test('nothing to say when no domain is set and nothing failed', () => {
  assert.deepEqual(senderNotices({ domain: null, failedRecent: 0 }), []);
});

test('a verified domain with no failures is quiet', () => {
  assert.deepEqual(senderNotices({ domain: { domain: 'acme.com', status: 'verified' }, failedRecent: 0 }), []);
});

test('an unverified domain says reminders are not coming from it', () => {
  const [n] = senderNotices({ domain: { domain: 'acme.com', status: 'pending' }, failedRecent: 0 });
  assert.equal(n.level, 'warn');
  assert.match(n.title, /acme\.com is not verified/);
  assert.match(n.body, /Mugavi's address/);
});

test('a failed domain is treated like an unverified one', () => {
  assert.equal(senderNotices({ domain: { domain: 'acme.com', status: 'failed' }, failedRecent: 0 }).length, 1);
});

test('failures are counted, singular and plural, and show the latest error', () => {
  assert.equal(senderNotices({ domain: null, failedRecent: 1 })[0].title, '1 reminder failed to send');
  const [n] = senderNotices({ domain: null, failedRecent: 3, lastError: 'Domain not verified' });
  assert.equal(n.title, '3 reminders failed to send');
  assert.match(n.body, /Domain not verified/);
});

test('failures come first, and a long error is cut', () => {
  const list = senderNotices({ domain: { domain: 'acme.com', status: 'pending' }, failedRecent: 2, lastError: 'x'.repeat(400) });
  assert.equal(list.length, 2);
  assert.match(list[0].title, /failed to send/);
  assert.ok(list[0].body.length < 260);
});
