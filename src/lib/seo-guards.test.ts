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

test('pricing Product schema has an image and no dash characters in its text', () => {
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
