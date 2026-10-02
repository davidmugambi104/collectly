import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isAppPath } from './consent.ts';

test('third-party scripts are kept off the signed-in app and payment pages', () => {
  for (const p of ['/dashboard', '/dashboard/invoices', '/admin/config', '/pay/abc', '/sign-in', '/sign-up/verify']) {
    assert.equal(isAppPath(p), true, p);
  }
});

test('marketing pages and look-alike prefixes are not app paths', () => {
  for (const p of ['/', '/pricing', '/security', '/dashboards', '/payment-terms', '', null, undefined]) {
    assert.equal(isAppPath(p as string | null | undefined), false, String(p));
  }
});
