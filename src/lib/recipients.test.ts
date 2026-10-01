import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeEmail, parseRecipientInput, pickCopyTargets, MAX_RECIPIENTS } from './recipients.ts';

test('normalizeEmail', () => {
  assert.equal(normalizeEmail('  AP@Example.TEST '), 'ap@example.test');
  for (const bad of ['', 'nope', 'a@b', 'a b@c.de', 'a@b.c,d@e.fg', '<a@b.cd>', 'a@b.cd;x@y.zz', 42, null, undefined, `${'x'.repeat(250)}@a.bc`]) assert.equal(normalizeEmail(bad), null, String(bad));
});

test('parseRecipientInput: valid, name cleaned, primary refused', () => {
  const ok = parseRecipientInput({ email: 'AP@acme.example.test', name: '  Ann <b>Lee</b>  ' }, 'owner@acme.example.test');
  assert.deepEqual(ok, { ok: true, value: { email: 'ap@acme.example.test', name: 'Ann b Lee /b' } });
  assert.deepEqual(parseRecipientInput({ email: 'x@y.zz' }, null), { ok: true, value: { email: 'x@y.zz', name: null } });
  assert.equal(parseRecipientInput({ email: 'Owner@Acme.example.test' }, 'owner@acme.example.test').ok, false);
  assert.equal(parseRecipientInput({ email: 'nope' }, null).ok, false);
  assert.equal(parseRecipientInput(null, null).ok, false);
  assert.equal((parseRecipientInput({ email: 'a@b.cd', name: 'x'.repeat(300) }, null) as { ok: true; value: { name: string } }).value.name.length, 80);
});

test('pickCopyTargets drops the primary, the unsubscribed, the suppressed, duplicates and junk', () => {
  const r = [
    { email: 'Owner@x.test', unsubscribedAt: null },   // the primary
    { email: 'ap@x.test', unsubscribedAt: null },
    { email: 'AP@x.test', unsubscribedAt: null },      // duplicate
    { email: 'gone@x.test', unsubscribedAt: new Date() },
    { email: 'blocked@x.test', unsubscribedAt: null },
    { email: 'junk', unsubscribedAt: null },
    { email: 'cfo@x.test', unsubscribedAt: null },
  ];
  assert.deepEqual(pickCopyTargets('owner@x.test', r, new Set(['blocked@x.test'])), ['ap@x.test', 'cfo@x.test']);
  assert.deepEqual(pickCopyTargets(null, [{ email: 'a@x.test', unsubscribedAt: null }], new Set()), ['a@x.test']);
  assert.deepEqual(pickCopyTargets('o@x.test', [], new Set()), []);
});

test('never more than the cap', () => {
  const many = Array.from({ length: 12 }, (_, i) => ({ email: `p${i}@x.test`, unsubscribedAt: null }));
  assert.equal(pickCopyTargets('o@x.test', many, new Set()).length, MAX_RECIPIENTS);
});
