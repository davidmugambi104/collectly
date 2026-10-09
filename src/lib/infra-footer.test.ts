import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// infra.ts pulls in path-aliased modules, so check the footer wording from source.
const src = readFileSync(new URL('./infra.ts', import.meta.url), 'utf8');

test('reminder footer does not tell a customer they signed up at mugavi.com', () => {
  assert.ok(!/signed up at mugavi\.com/.test(src));
  assert.match(src, /invoice addressed to you/);
});
