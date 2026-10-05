import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCsv, detectDelimiter } from './csv-parse.ts';
import { toCsv } from './csv.ts';

test('plain rows, CRLF and a trailing newline', () => {
  assert.deepEqual(parseCsv('a,b\r\n1,2\r\n').rows, [['a', 'b'], ['1', '2']]);
});

test('quotes, escaped quotes, commas and line breaks inside a field', () => {
  const r = parseCsv('n,note\n1,"say ""hi"", ok"\n2,"line1\nline2"\n').rows;
  assert.deepEqual(r, [['n', 'note'], ['1', 'say "hi", ok'], ['2', 'line1\nline2']]);
});

test('byte order mark, blank lines, empty cells and a missing final newline', () => {
  assert.deepEqual(parseCsv('﻿a,b\n\n1,\n,2').rows, [['a', 'b'], ['1', ''], ['', '2']]);
});

test('semicolon and tab delimiters are detected from the header, not from quoted text', () => {
  assert.equal(detectDelimiter('a;b;c\n1;2;3'), ';');
  assert.equal(detectDelimiter('a\tb\tc'), '\t');
  assert.equal(detectDelimiter('"a,b,c";d\n1;2'), ';');
  assert.deepEqual(parseCsv('a;b\n1,5;2').rows, [['a', 'b'], ['1,5', '2']]);
});

test('maxRows stops early and says so', () => {
  const r = parseCsv('h\n1\n2\n3\n4', { maxRows: 2 });
  assert.equal(r.truncated, true);
  assert.equal(r.rows.length, 3);
  assert.equal(parseCsv('h\n1\n2', { maxRows: 2 }).truncated, false);
});

test('a formula cell is returned as text and is neutralised again on export', () => {
  const evil = '=HYPERLINK("http://x.example","a")';
  const back = parseCsv(`name\n"${evil.replace(/"/g, '""')}"`).rows[1][0];
  assert.equal(back, evil);
  const out = toCsv(['name'], [[evil], ['+1'], ['-2'], ['@x'], ['\t=1']]);
  const lines = out.trim().split('\r\n').slice(1);
  for (const l of lines) assert.match(l, /^"?'/, `not neutralised: ${l}`);
});
