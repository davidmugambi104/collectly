import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withMinorVersion, QBO_MINOR_VERSION } from './qbo-minor-version.ts';

test('adds minorversion to a query path', () => {
  assert.equal(withMinorVersion('/query?query=abc'), `/query?query=abc&minorversion=${QBO_MINOR_VERSION}`);
});
test('adds minorversion to a path without a query string', () => {
  assert.equal(withMinorVersion('/invoice/7'), `/invoice/7?minorversion=${QBO_MINOR_VERSION}`);
});
test('keeps an explicit minorversion', () => {
  assert.equal(withMinorVersion('/invoice/7?minorversion=70'), '/invoice/7?minorversion=70');
});
