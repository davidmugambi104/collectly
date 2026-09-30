import { test } from 'node:test';
import assert from 'node:assert/strict';
import { csvCell, toCsv } from './csv.ts';

test('plain values pass through, null and undefined are empty, dates are ISO', () => {
  assert.equal(csvCell('abc'), 'abc');
  assert.equal(csvCell(null), '');
  assert.equal(csvCell(undefined), '');
  assert.equal(csvCell(42), '42');
  assert.equal(csvCell(new Date('2026-10-01T00:00:00Z')), '2026-10-01T00:00:00.000Z');
});

test('commas, quotes and newlines are quoted and escaped', () => {
  assert.equal(csvCell('a,b'), '"a,b"');
  assert.equal(csvCell('say "hi"'), '"say ""hi"""');
  assert.equal(csvCell('a\nb'), '"a\nb"');
});

test('cells that a spreadsheet would run as a formula are defused', () => {
  for (const evil of ['=SUM(A1)', '+1', '-1', '@cmd', '\tx']) assert.ok(csvCell(evil).startsWith("'") || csvCell(evil).startsWith('"\''), evil);
});

test('rows are joined with CRLF and end with one', () => {
  assert.equal(toCsv(['a', 'b'], [[1, 'x,y']]), 'a,b\r\n1,"x,y"\r\n');
});
