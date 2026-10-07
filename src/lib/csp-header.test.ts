import { test } from 'node:test';
import assert from 'node:assert/strict';

// Imports the real next.config.mjs so this test breaks if the config object
// stops exposing the header, rather than checking a copy that can drift.
async function securityHeaders(): Promise<{ key: string; value: string }[]> {
  const mod = await import('../../next.config.mjs');
  const config = mod.default;
  assert.ok(config.headers, 'expected next.config.mjs to export a headers() function');
  const blocks = await config.headers();
  const block = blocks.find((b: { source: string }) => b.source === '/(.*)');
  assert.ok(block, 'expected a headers() block for source "/(.*)"');
  return block.headers;
}

test('ships a Content-Security-Policy-Report-Only header, not an enforcing one', async () => {
  const headers = await securityHeaders();
  const names = headers.map((h) => h.key);
  assert.ok(names.includes('Content-Security-Policy-Report-Only'));
  assert.ok(
    !names.includes('Content-Security-Policy'),
    'an enforcing CSP has not been verified against live Clerk/PostHog/Clarity origins yet — see the comment above cspReportOnly in next.config.mjs before adding one'
  );
});

test('the report-only policy fails closed (default-src self) and has no syntax gaps', async () => {
  const headers = await securityHeaders();
  const csp = headers.find((h) => h.key === 'Content-Security-Policy-Report-Only')!.value;
  const directives = csp.split(';').map((d) => d.trim()).filter(Boolean);
  assert.ok(directives.includes("default-src 'self'"));
  assert.ok(directives.some((d) => d.startsWith('object-src')));
  assert.ok(directives.some((d) => d.startsWith('script-src')));
  assert.ok(directives.some((d) => d.startsWith('connect-src')));
  // Every directive must be "name value..." with no doubled/trailing semicolons.
  for (const d of directives) {
    assert.ok(/^[a-z-]+ /.test(d), `malformed directive: "${d}"`);
  }
});
