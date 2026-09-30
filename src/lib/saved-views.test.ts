import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cleanViewQuery, normalizeViewName, viewHref, isViewPage, MAX_VIEW_NAME } from './saved-views.ts';

test('keeps only filters the page understands, in a fixed order', () => {
  assert.equal(cleanViewQuery('invoices', 'q=acme&bucket=61-90&filter=overdue'), 'filter=overdue&bucket=61-90&q=acme');
  assert.equal(cleanViewQuery('invoices', '?utm_source=x&filter=overdue&evil=1'), 'filter=overdue');
});

test('drops values the page would ignore', () => {
  assert.equal(cleanViewQuery('invoices', 'filter=bogus&bucket=999'), '');
  assert.equal(cleanViewQuery('history', 'status=failed'), 'status=failed');
  assert.equal(cleanViewQuery('history', 'status=nope'), '');
  assert.equal(cleanViewQuery('history', 'filter=overdue'), '', 'an invoices filter means nothing on history');
});

test('"no filters" is the empty string, however it is spelled', () => {
  assert.equal(cleanViewQuery('invoices', ''), '');
  assert.equal(cleanViewQuery('invoices', { filter: undefined, q: '   ' }), '');
});

test('search text is trimmed, flattened and capped', () => {
  assert.equal(cleanViewQuery('invoices', { q: '  Acme \n  Studios ' }), 'q=Acme+Studios');
  assert.equal(new URLSearchParams(cleanViewQuery('invoices', { q: 'x'.repeat(500) })).get('q')?.length, 100);
});

test('builds a link the page can read back', () => {
  const href = viewHref('invoices', cleanViewQuery('invoices', { filter: 'overdue', q: 'a&b' }));
  assert.equal(href, '/dashboard/invoices?filter=overdue&q=a%26b');
  assert.equal(new URL(href, 'http://x').searchParams.get('q'), 'a&b');
  assert.equal(viewHref('history', ''), '/dashboard/dunning/history');
});

test('view names', () => {
  assert.equal(normalizeViewName('  Big   overdue\n'), 'Big overdue');
  assert.equal(normalizeViewName('   '), null);
  assert.equal(normalizeViewName(42), null);
  assert.equal(normalizeViewName('x'.repeat(200))?.length, MAX_VIEW_NAME);
  assert.ok(isViewPage('invoices') && isViewPage('history') && !isViewPage('customers'));
});
