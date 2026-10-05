import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { TRADEMARK_NOTICE } from './trademark.ts';

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), 'utf8');
const dir = new URL('../app/dashboard/integrations/', import.meta.url);
const files = readdirSync(dir).filter((f) => f.endsWith('.tsx'));

test('dashboard integration components carry the exact Intuit label strings', () => {
  const page = read('../app/dashboard/integrations/page.tsx');
  const controls = read('../app/dashboard/integrations/integration-controls.tsx');
  assert.ok(page.includes('ctaLabel="Connect to QuickBooks"'));
  assert.ok(page.includes('ctaLabel="Connect to Xero"'));
  assert.ok(controls.includes('`Disconnect from ${label}`'));
  assert.ok(page.includes('provider="quickbooks" label="QuickBooks"'));
  assert.ok(page.includes('provider="xero" label="Xero"'));
  assert.ok(page.includes('const hideConnect = connected &&'));
  assert.ok(page.includes('TRADEMARK_NOTICE'));
});

test('no QB or QBO abbreviation in dashboard integration components', () => {
  for (const f of files) {
    const src = read(`../app/dashboard/integrations/${f}`);
    // Env var names such as QBO_CLIENT_ID are code, not UI text.
    assert.equal(/\bQBO?\b/.test(src), false, `${f} contains QB/QBO`);
  }
});

test('trademark notice is exact and does not claim permission', () => {
  assert.equal(TRADEMARK_NOTICE, 'Intuit and QuickBooks are registered trademarks of Intuit Inc.');
  assert.ok(read('../components/marketing/footer.tsx').includes('TRADEMARK_NOTICE'));
});

test('public Intuit pages are public, noindex where required, and QuickBooks-only', () => {
  const mw = read('../middleware.ts');
  assert.ok(mw.includes("'/disconnected'") && mw.includes("'/integrations/quickbooks'"));
  const gone = read('../app/disconnected/page.tsx');
  assert.ok(gone.includes('noindex: true'));
  const learn = read('../app/integrations/quickbooks/page.tsx');
  assert.equal(/xero|stripe|square|plaid|sage|netsuite|myob|freshbooks/i.test(learn), false);
  assert.equal(/xero/i.test(gone), false);
});

test('connect, callback and disconnect routes set no-store', () => {
  for (const r of ['quickbooks/connect', 'quickbooks/callback', 'xero/connect', 'xero/callback', 'integrations/sync']) {
    assert.ok(read(`../app/api/${r}/route.ts`).includes('noStore('), r);
  }
});
