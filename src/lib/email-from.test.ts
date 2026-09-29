import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatDunningFrom, extractAddress } from './email-from.ts';

const BASE = 'Mugavi <billing@mail.mugavi.com>';

test('names the business, then the platform', () => {
  assert.equal(formatDunningFrom('Acme Studio', BASE), '"Acme Studio via Mugavi" <billing@mail.mugavi.com>');
});

test('keeps the sending address exactly as configured', () => {
  assert.equal(extractAddress(BASE), 'billing@mail.mugavi.com');
  assert.equal(extractAddress('plain@example.com'), 'plain@example.com');
  assert.equal(extractAddress('not an address'), null);
});

test('falls back to the platform name when there is no business name', () => {
  for (const v of ['', '   ', null, undefined, 'Mugavi']) {
    assert.equal(formatDunningFrom(v as string, BASE), '"Mugavi" <billing@mail.mugavi.com>');
  }
});

test('a business name cannot break out of the header', () => {
  const evil = 'Acme"\r\nBcc: victim@example.com <x@y.z>';
  const out = formatDunningFrom(evil, BASE);
  assert.ok(!/[\r\n]/.test(out), 'no line breaks');
  assert.ok(out.endsWith('<billing@mail.mugavi.com>'), 'address is still ours');
  assert.equal((out.match(/<[^>]+>/g) ?? []).length, 1, 'exactly one address');
});

test('quotes and backslashes in the name are escaped, and long names are capped', () => {
  assert.equal(formatDunningFrom('Bob "The Builder" Co', BASE), '"Bob \\"The Builder\\" Co via Mugavi" <billing@mail.mugavi.com>');
  const long = formatDunningFrom('x'.repeat(200), BASE);
  assert.ok(long.length < 120);
});

test('an unusable base address is returned untouched, never invented', () => {
  assert.equal(formatDunningFrom('Acme', 'garbage'), 'garbage');
});
