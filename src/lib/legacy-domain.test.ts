import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hostRedirect, isAppPath, clerkOnPublicHost, PUBLIC_HOST, APP_HOST } from './legacy-domain.ts';

test('public pages on the retired domain move permanently to the public host', () => {
  assert.deepEqual(hostRedirect('getcollectly.app', '/'), { host: PUBLIC_HOST, status: 301 });
  assert.deepEqual(hostRedirect('www.getcollectly.app', '/pricing'), { host: PUBLIC_HOST, status: 301 });
  assert.deepEqual(hostRedirect('GetCollectly.App:443', '/blog/x'), { host: PUBLIC_HOST, status: 301 });
});

test('app routes stay on the app host, because Clerk is bound there', () => {
  // clerk.getcollectly.app answers origin_invalid for mugavi.com, so sending a
  // visitor to the public host for these would break sign-in outright.
  for (const p of ['/sign-in', '/sign-up', '/dashboard', '/dashboard/invoices', '/admin/upgrade-requests']) {
    assert.equal(hostRedirect('getcollectly.app', p), null, `${p} should be served, not redirected`);
    assert.deepEqual(hostRedirect('mugavi.com', p), { host: APP_HOST, status: 302 }, `${p} should go to the app host`);
  }
});

test('the app redirect is 302, so it reverses when Clerk moves', () => {
  assert.equal(hostRedirect('mugavi.com', '/sign-in')?.status, 302);
});

test('/api is never redirected, on any host', () => {
  // Webhooks arrive as POSTs a 301 will not reliably re-POST, and ~415 sent
  // emails carry getcollectly.app/api/unsubscribe links.
  for (const h of ['getcollectly.app', 'www.getcollectly.app', 'mugavi.com']) {
    assert.equal(hostRedirect(h, '/api/unsubscribe'), null);
    assert.equal(hostRedirect(h, '/api/webhooks/resend-delivery'), null);
    assert.equal(hostRedirect(h, '/api/xero/callback'), null);
  }
});

test('public pages on the public host are served as-is', () => {
  assert.equal(hostRedirect('mugavi.com', '/'), null);
  assert.equal(hostRedirect('mugavi.com', '/pricing'), null);
});

test('previews, localhost and unknown hosts are never redirected', () => {
  for (const h of ['localhost', 'collectly-abc.vercel.app', '', null]) {
    assert.equal(hostRedirect(h, '/'), null);
    assert.equal(hostRedirect(h, '/sign-in'), null);
  }
});

test('isAppPath matches prefixes, not substrings', () => {
  assert.equal(isAppPath('/dashboard'), true);
  assert.equal(isAppPath('/dashboard/invoices'), true);
  assert.equal(isAppPath('/dashboarding'), false);
  assert.equal(isAppPath('/blog/dashboard-tips'), false);
  assert.equal(isAppPath('/sign-in-help'), false);
});

// ─── Post-migration behaviour, behind CLERK_ON_PUBLIC_HOST ─────────────────
// The flag is passed explicitly here; production reads the env at call time.

test('with Clerk migrated, app routes stay on the public host', () => {
  const on = { clerkOnPublicHost: true };
  for (const p of ['/sign-in', '/sign-up', '/dashboard', '/dashboard/invoices', '/admin/upgrade-requests']) {
    assert.equal(hostRedirect('mugavi.com', p, on), null, `${p} should be served in place`);
  }
});

test('with Clerk migrated, app routes on the retired domain move forward', () => {
  const on = { clerkOnPublicHost: true };
  assert.deepEqual(hostRedirect('getcollectly.app', '/sign-in', on), { host: PUBLIC_HOST, status: 302 });
  assert.deepEqual(hostRedirect('getcollectly.app', '/dashboard', on), { host: PUBLIC_HOST, status: 302 });
});

test('the post-migration app redirect is 302, so a rollback is not cached', () => {
  assert.equal(hostRedirect('getcollectly.app', '/dashboard', { clerkOnPublicHost: true })?.status, 302);
});

test('migration never affects /api or public pages', () => {
  const on = { clerkOnPublicHost: true };
  assert.equal(hostRedirect('getcollectly.app', '/api/unsubscribe', on), null);
  assert.equal(hostRedirect('mugavi.com', '/api/webhooks/resend-delivery', on), null);
  assert.deepEqual(hostRedirect('getcollectly.app', '/pricing', on), { host: PUBLIC_HOST, status: 301 });
  assert.equal(hostRedirect('mugavi.com', '/pricing', on), null);
});

test('the flag defaults off, so nothing changes until it is set', () => {
  delete process.env.CLERK_ON_PUBLIC_HOST;
  delete process.env.NEXT_PUBLIC_CLERK_ON_PUBLIC_HOST;
  assert.equal(clerkOnPublicHost(), false);
  assert.deepEqual(hostRedirect('mugavi.com', '/sign-in'), { host: APP_HOST, status: 302 });
});
