import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// seo.ts and the llms.txt route import through the '@/' alias, which the plain
// node test runner cannot resolve, so these guards read the source text.
const seo = readFileSync(new URL('./seo.ts', import.meta.url), 'utf8');
const llms = readFileSync(new URL('../app/llms.txt/route.ts', import.meta.url), 'utf8');
const code = (s: string) => s.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');

test('structured data only claims the US and UK as served markets', () => {
  const m = [...seo.matchAll(/areaServed:\s*\[([^\]]*)\]/g)].map((x) => x[1]);
  assert.ok(m.length > 0);
  for (const a of m) assert.equal(a.replace(/[\s']/g, ''), 'US,GB');
});

test('pricing SoftwareApplication schema has an image and no dash characters in its text', () => {
  const start = seo.indexOf('export function pricingProductJsonLd');
  const end = seo.indexOf('// ─── Competitor facts');
  const block = code(seo.slice(start, end));
  assert.match(block, /image:/);
  assert.doesNotMatch(block, /[–—]/);
});

test('no schema or llms.txt text claims an API or SSO (the brief says there is none)', () => {
  const start = seo.indexOf('export function pricingProductJsonLd');
  const end = seo.indexOf('// ─── Competitor facts');
  assert.doesNotMatch(code(seo.slice(start, end)), /\bAPI\b|\bSSO\b/);
  assert.doesNotMatch(code(llms), /Adds API access and SSO/);
});

test('llms.txt body text has no em or en dashes', () => {
  const body = code(llms).split('body(): string')[1] ?? '';
  assert.doesNotMatch(body, /[–—]/);
});

// ─── Canonicals and indexability (Search Console, 2026-10-09) ────────────────

const rootLayout = readFileSync(new URL('../app/layout.tsx', import.meta.url), 'utf8');

test('root layout sets no canonical or hreflang, so no page inherits the homepage URL', () => {
  assert.doesNotMatch(code(rootLayout), /canonical\s*:/);
  assert.doesNotMatch(code(rootLayout), /languages\s*:/);
});

test('pageMetadata gives every page its own canonical', () => {
  assert.match(code(seo), /alternates:\s*\{\s*canonical:\s*url\s*\}/);
});

test('sign-in and sign-up layouts are noindex', () => {
  for (const f of ['sign-in', 'sign-up']) {
    const src = readFileSync(new URL(`../app/${f}/layout.tsx`, import.meta.url), 'utf8');
    assert.match(code(src), /robots:\s*\{\s*index:\s*false/);
  }
});

test('/pay/[id] answers an unknown id with a real 404 from generateMetadata and stays noindex', () => {
  const src = code(readFileSync(new URL('../app/pay/[id]/page.tsx', import.meta.url), 'utf8'));
  const gm = src.slice(src.indexOf('export async function generateMetadata'));
  assert.match(gm.slice(0, 500), /notFound\(\)/);
  assert.match(src, /index:\s*false/);
});

test('every help page and the QuickBooks page are linked from site-wide chrome, not only the sitemap', () => {
  const footer = readFileSync(new URL('../components/marketing/footer.tsx', import.meta.url), 'utf8');
  for (const href of ['/help', '/integrations/quickbooks', '/interview', '/qualify', '/vs-gaviti', '/vs-upflow', '/vs-growfin', '/vs-highradius']) {
    assert.ok(footer.includes(`href="${href}"`), `footer should link ${href}`);
  }
  const article = readFileSync(new URL('../app/help/_lib/article.tsx', import.meta.url), 'utf8');
  assert.match(article, /HELP_PAGES/);
});
