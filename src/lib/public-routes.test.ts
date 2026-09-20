import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

/**
 * Every URL in the sitemap must be reachable without signing in.
 *
 * /vs-upflow shipped to production returning 307 -> /sign-in: it was added to
 * the app router, the sitemap and /compare, but the middleware's public routes
 * were a hardcoded list of ten competitor paths and it was not one of them. We
 * were telling Google to index a page that redirected anonymous visitors to a
 * login screen.
 *
 * Both files are read as text rather than imported -- middleware.ts pulls in
 * next/server and Clerk, neither of which the node test runner can resolve.
 */
const sitemapSrc = readFileSync(new URL('../app/sitemap.ts', import.meta.url), 'utf8');
const middlewareSrc = readFileSync(new URL('../middleware.ts', import.meta.url), 'utf8');

function sitemapPaths(): string[] {
  return [...sitemapSrc.matchAll(/path:\s*'([^']+)'/g)].map((m) => m[1]);
}

function publicMatchers(): RegExp[] {
  const block = middlewareSrc.slice(
    middlewareSrc.indexOf('createRouteMatcher('),
    middlewareSrc.indexOf('export default'),
  );
  return [...block.matchAll(/'(\/[^']*)'/g)]
    .map((m) => m[1])
    // Clerk's matcher syntax is a path with optional (.*) groups.
    .map((p) => new RegExp(`^${p.replace(/\//g, '\\/').replace(/\(\.\*\)/g, '.*')}$`));
}

test('the sitemap lists paths', () => {
  const paths = sitemapPaths();
  assert.ok(paths.length > 20, `expected a populated sitemap, got ${paths.length}`);
  assert.ok(paths.includes('/vs-upflow'), 'vs-upflow should be in the sitemap');
});

test('every sitemap path is a public route', () => {
  const matchers = publicMatchers();
  const gated = sitemapPaths().filter((p) => !matchers.some((re) => re.test(p)));
  assert.deepEqual(
    gated,
    [],
    `these are in the sitemap but not public, so anonymous visitors and crawlers get redirected to sign-in:\n  ${gated.join('\n  ')}`,
  );
});

test('the matcher block was actually found', () => {
  // Guards the test itself: if middleware.ts is restructured and the slice
  // comes back empty, every path would "fail" for the wrong reason.
  assert.ok(publicMatchers().length > 10, 'public route patterns not parsed from middleware.ts');
});
