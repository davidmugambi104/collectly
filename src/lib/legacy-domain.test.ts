import { test } from 'node:test';
import assert from 'node:assert/strict';
import { legacyRedirectHost, CANONICAL_HOST } from './legacy-domain.ts';

test('legacy hosts redirect to the canonical host', () => {
  assert.equal(legacyRedirectHost('getcollectly.app', '/'), CANONICAL_HOST);
  assert.equal(legacyRedirectHost('www.getcollectly.app', '/pricing'), CANONICAL_HOST);
  assert.equal(legacyRedirectHost('GetCollectly.App', '/blog/x'), CANONICAL_HOST);
  assert.equal(legacyRedirectHost('getcollectly.app:443', '/'), CANONICAL_HOST);
});

test('the canonical host and everything else is served as-is', () => {
  assert.equal(legacyRedirectHost('mugavi.com', '/'), null);
  assert.equal(legacyRedirectHost('www.mugavi.com', '/'), null);
  assert.equal(legacyRedirectHost('localhost', '/'), null);
  assert.equal(legacyRedirectHost('collectly-abc.vercel.app', '/'), null);
  assert.equal(legacyRedirectHost(null, '/'), null);
  assert.equal(legacyRedirectHost('', '/'), null);
});

test('/api/ is never redirected off the legacy host', () => {
  // Webhooks arrive as POSTs and a 301 is not reliably re-POSTed; and the
  // unsubscribe links already sent to ~415 people point at this exact path.
  assert.equal(legacyRedirectHost('getcollectly.app', '/api/unsubscribe'), null);
  assert.equal(legacyRedirectHost('getcollectly.app', '/api/webhooks/resend-delivery'), null);
  assert.equal(legacyRedirectHost('getcollectly.app', '/api/webhooks/clerk'), null);
  assert.equal(legacyRedirectHost('www.getcollectly.app', '/api/cron/dunning'), null);
});

test('a path merely containing /api/ still redirects', () => {
  // Only a genuine /api/ prefix is carved out -- /blog/api-design is a page.
  assert.equal(legacyRedirectHost('getcollectly.app', '/blog/api-design'), CANONICAL_HOST);
  assert.equal(legacyRedirectHost('getcollectly.app', '/apiary'), CANONICAL_HOST);
});
