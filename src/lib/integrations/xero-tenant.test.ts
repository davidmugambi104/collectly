import { test } from 'node:test';
import assert from 'node:assert/strict';
import { authEventIdFromToken, newestTenant, pickTenant } from './xero-tenant.ts';

const jwt = (claims: object) => `h.${Buffer.from(JSON.stringify(claims)).toString('base64url')}.s`;

test('reads the authentication event id from the token', () => {
  assert.equal(authEventIdFromToken(jwt({ authentication_event_id: 'evt-123' })), 'evt-123');
});

test('anything that is not a usable token gives null and never throws', () => {
  for (const bad of [null, undefined, '', 'nodots', 'a.b.c', jwt({}), jwt({ authentication_event_id: 5 })]) assert.equal(authEventIdFromToken(bad as string), null);
});

test('the newest authorised tenant wins, by update time then creation time', () => {
  const t = newestTenant([
    { tenantId: 'old', updatedDateUtc: '2026-01-01T00:00:00Z' },
    { tenantId: 'new', updatedDateUtc: '2026-10-02T00:00:00Z' },
    { tenantId: 'mid', createdDateUtc: '2026-05-01T00:00:00Z' },
  ]);
  assert.equal(t?.tenantId, 'new');
});

test('tenants without an id are ignored, and an empty list is null', () => {
  assert.equal(newestTenant([{ tenantId: '' }]), null);
  assert.equal(newestTenant([]), null);
  assert.equal(newestTenant(undefined), null);
});

test("this consent's own organisation beats a newer one authorised earlier", () => {
  const picked = pickTenant(
    [{ tenantId: 'mugavi', tenantName: 'mugavi', updatedDateUtc: '2026-10-02T00:00:00Z' }],
    [{ tenantId: 'demo', tenantName: 'Demo Company (Global)', updatedDateUtc: '2026-10-02T01:00:00Z' }, { tenantId: 'mugavi' }],
  );
  assert.equal(picked?.tenantId, 'mugavi');
});

test('with no consent list it falls back to the newest of all', () => {
  assert.equal(pickTenant([], [{ tenantId: 'a', updatedDateUtc: '2026-01-01' }, { tenantId: 'b', updatedDateUtc: '2026-02-01' }])?.tenantId, 'b');
});
