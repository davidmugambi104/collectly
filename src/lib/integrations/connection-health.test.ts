import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pickBroken } from './connection-health.ts';

test('a quickbooks or xero row in status error is broken, with a reconnect link that names the org and provider', () => {
  const out = pickBroken('org1', [{ provider: 'quickbooks', status: 'error' }]);
  assert.equal(out.length, 1);
  assert.equal(out[0].provider, 'quickbooks');
  assert.equal(out[0].label, 'QuickBooks');
  assert.equal(out[0].reconnectHref, '/api/quickbooks/connect?orgId=org1');
});

test('xero gets its own label and reconnect route', () => {
  const out = pickBroken('org2', [{ provider: 'xero', status: 'error' }]);
  assert.equal(out[0].label, 'Xero');
  assert.equal(out[0].reconnectHref, '/api/xero/connect?orgId=org2');
});

test('a connected row is not broken', () => {
  assert.deepEqual(pickBroken('org1', [{ provider: 'quickbooks', status: 'connected' }]), []);
});

test('other providers (square, plaid) never count, even in status error -- this gate is accounting-only', () => {
  assert.deepEqual(pickBroken('org1', [{ provider: 'square', status: 'error' }, { provider: 'plaid', status: 'error' }]), []);
});

test('no rows at all is not broken (never connected, nothing to be stale)', () => {
  assert.deepEqual(pickBroken('org1', []), []);
});

test('both connections broken: both are reported', () => {
  const out = pickBroken('org1', [{ provider: 'quickbooks', status: 'error' }, { provider: 'xero', status: 'error' }]);
  assert.deepEqual(out.map((o) => o.provider).sort(), ['quickbooks', 'xero']);
});
