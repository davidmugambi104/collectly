import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { reconcileBooks } from './book-membership.ts';
import { attentionFor, type BookFacts } from './practice.ts';
import { practiceBillingNote } from './practice-copy.ts';
import { bookOverage } from './book-overage.ts';
import { PRACTICE_INCLUDED_ORGS, PRACTICE_EXTRA_ORG_MONTHLY } from './utils.ts';

const ref = (orgId: string, name = orgId) => ({ orgId, name });

test('without Clerk (the dev shim) the cache is the list', () => {
  const r = reconcileBooks(null, [ref('a'), ref('b')]);
  assert.deepEqual(r.books.map((b) => b.orgId), ['a', 'b']);
  assert.deepEqual(r.staleOrgIds, []);
});

test('an organization the person was removed from is dropped, never listed', () => {
  const r = reconcileBooks([ref('a')], [ref('a'), ref('gone')]);
  assert.deepEqual(r.books.map((b) => b.orgId), ['a']);
  assert.deepEqual(r.staleOrgIds, ['gone']);
});

test('a Clerk organization nobody has opened is still a book, flagged unseen', () => {
  const r = reconcileBooks([ref('a'), ref('new', 'Clerk name')], [ref('a')]);
  assert.deepEqual(r.books.map((b) => b.orgId), ['a', 'new']);
  assert.deepEqual(r.unseen.map((b) => b.orgId), ['new']);
});

test('our row name wins over Clerk when both exist', () => {
  const r = reconcileBooks([ref('a', 'Clerk')], [ref('a', 'Renamed in Mugavi')]);
  assert.equal(r.books[0].name, 'Renamed in Mugavi');
});

test('an empty Clerk list means no books, not a fallback to the cache', () => {
  assert.deepEqual(reconcileBooks([], [ref('a')]).books, []);
});

test('an unopened book says so instead of reporting a clean book', () => {
  const b = { orgId: 'x', name: 'X', openInvoices: 0, overdueInvoices: 0, money: {}, oldestOverdueDays: 0, awaitingApproval: 0, newReplies: 0, lastSyncAt: null, integrationError: false, hasIntegration: false, notOpenedYet: true } as BookFacts;
  assert.deepEqual(attentionFor(b), ['Not opened yet. Open it once to set it up']);
});

test('billing rule: 10 books included, $25 each after, never blocked', () => {
  assert.equal(PRACTICE_INCLUDED_ORGS, 10);
  assert.equal(PRACTICE_EXTRA_ORG_MONTHLY, 25);
  assert.deepEqual(bookOverage({ books: 10, included: 10, extraMonthly: 25 }), { kind: 'within' });
  assert.deepEqual(bookOverage({ books: 11, included: 10, extraMonthly: 25 }), { kind: 'extra', extra: 1, monthly: 25 });
});

test('the practice billing note is manual, never automatic, with no dashes', () => {
  for (const n of [1, 10, 11, 14]) {
    const t = practiceBillingNote(n, 10, 25);
    assert.match(t, /manual invoice/);
    assert.match(t, /nothing is charged automatically/);
    assert.doesNotMatch(t, /[–—]/);
  }
  assert.doesNotMatch(practiceBillingNote(10, 10, 25), /extra:/);
  assert.match(practiceBillingNote(11, 10, 25), /1 is extra: \$25 a month/);
  assert.match(practiceBillingNote(14, 10, 25), /4 are extra: \$100 a month/);
});

test('the billing page uses the shared contact address, not a hard-coded old domain', () => {
  const src = readFileSync(new URL('../app/dashboard/billing/page.tsx', import.meta.url), 'utf8');
  assert.doesNotMatch(src, /billing@getcollectly\.app/);
});

test('getAuth records membership so the Client books cache fills in production', () => {
  const src = readFileSync(new URL('./auth-helper.ts', import.meta.url), 'utf8');
  assert.equal((src.match(/await rememberMembership\(/g) ?? []).length, 2);
});
