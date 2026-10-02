import { test } from 'node:test';
import assert from 'node:assert/strict';
import { configStatus, todoOrder, SERVICES } from './config-status.ts';

test('a service counts as configured only when every variable is set', () => {
  const s = configStatus({ XERO_CLIENT_ID: 'a', XERO_CLIENT_SECRET: 'b' }).find((x) => x.id === 'xero')!;
  assert.equal(s.configured, false);
  assert.deepEqual(s.missing, ['XERO_REDIRECT_URI']);
  const ok = configStatus({ XERO_CLIENT_ID: 'a', XERO_CLIENT_SECRET: 'b', XERO_REDIRECT_URI: 'c' }).find((x) => x.id === 'xero')!;
  assert.equal(ok.configured, true);
});

test('blank and whitespace values do not count as set', () => {
  const s = configStatus({ GEMINI_API_KEY: '   ' }).find((x) => x.id === 'ai')!;
  assert.equal(s.configured, false);
});

test('no value is ever returned', () => {
  const out = JSON.stringify(configStatus({ CLERK_SECRET_KEY: 'sk_live_supersecret', DATABASE_URL: 'postgres://u:p@h/db' }));
  assert.equal(out.includes('supersecret'), false);
  assert.equal(out.includes('postgres://'), false);
});

test('the to-do list puts what stops the product first and skips what is done', () => {
  const todo = todoOrder(configStatus({ DATABASE_URL: 'x' }));
  assert.equal(todo.some((t) => t.id === 'db'), false);
  const needs = todo.map((t) => t.needed);
  assert.deepEqual(needs, [...needs].sort((a, b) => ({ now: 0, soon: 1, later: 2 } as const)[a] - ({ now: 0, soon: 1, later: 2 } as const)[b]));
});

test('every service names where to get it and what breaks without it', () => {
  for (const s of SERVICES) { assert.ok(s.where.length > 5, s.id); assert.ok(s.without.length > 5, s.id); assert.ok(s.vars.length > 0, s.id); }
});
