import { test } from 'node:test';
import assert from 'node:assert/strict';
import { statusFromAmounts, xeroSyncedStatus, reconcileStatus, needsLookup } from './sync-status.ts';
import { fetchAllPages, chunk } from './paging.ts';

const now = new Date('2026-10-01T12:00:00Z');
const past = new Date('2026-09-01T00:00:00Z');
const future = new Date('2026-11-01T00:00:00Z');

test('status from amounts', () => {
  assert.equal(statusFromAmounts({ total: 100, due: 0, dueDate: past, now }), 'paid');
  assert.equal(statusFromAmounts({ total: 100, due: 40, dueDate: past, now }), 'partial');
  assert.equal(statusFromAmounts({ total: 100, due: 100, dueDate: past, now }), 'overdue');
  assert.equal(statusFromAmounts({ total: 100, due: 100, dueDate: future, now }), 'sent');
});

test('xero: voided and deleted are closed, drafts are drafts, and they beat the amounts', () => {
  const base = { total: 100, due: 100, dueDate: past, now };
  assert.equal(xeroSyncedStatus({ ...base, xeroStatus: 'VOIDED' }), 'written_off');
  assert.equal(xeroSyncedStatus({ ...base, xeroStatus: 'deleted' }), 'written_off');
  assert.equal(xeroSyncedStatus({ ...base, xeroStatus: 'DRAFT' }), 'draft');
  assert.equal(xeroSyncedStatus({ ...base, xeroStatus: 'SUBMITTED' }), 'draft');
  assert.equal(xeroSyncedStatus({ ...base, xeroStatus: 'PAID', due: 0 }), 'paid');
  assert.equal(xeroSyncedStatus({ ...base, xeroStatus: 'AUTHORISED' }), 'overdue');
  assert.equal(xeroSyncedStatus({ ...base, xeroStatus: undefined }), 'overdue');
  assert.equal(xeroSyncedStatus({ ...base, xeroStatus: 'AUTHORISED', due: 0 }), 'paid');
});

test('an owner decision holds while the invoice is still open at the source', () => {
  for (const incoming of ['sent', 'partial', 'overdue'] as const) {
    assert.equal(reconcileStatus('disputed', incoming), 'disputed', incoming);
    assert.equal(reconcileStatus('written_off', incoming), 'written_off', incoming);
  }
});

test('paid, voided or draft at the source always wins, even over a dispute', () => {
  assert.equal(reconcileStatus('disputed', 'paid'), 'paid');
  assert.equal(reconcileStatus('written_off', 'paid'), 'paid');
  assert.equal(reconcileStatus('disputed', 'written_off'), 'written_off');
  assert.equal(reconcileStatus('disputed', 'draft'), 'draft');
});

test('ordinary statuses just follow the source', () => {
  assert.equal(reconcileStatus('overdue', 'paid'), 'paid');
  assert.equal(reconcileStatus('sent', 'overdue'), 'overdue');
  assert.equal(reconcileStatus('viewed', 'sent'), 'sent');
  assert.equal(reconcileStatus(undefined, 'overdue'), 'overdue');
  assert.equal(reconcileStatus(null, 'sent'), 'sent');
});

test('which local invoices need a lookup', () => {
  for (const s of ['sent', 'viewed', 'partial', 'overdue', 'disputed']) assert.equal(needsLookup(s), true, s);
  for (const s of ['paid', 'written_off', 'draft']) assert.equal(needsLookup(s), false, s);
});

test('fetchAllPages stops on a short page and reports no truncation', async () => {
  const pages = [[1, 2, 3], [4, 5, 6], [7]];
  const calls: number[] = [];
  const r = await fetchAllPages(async (p) => { calls.push(p); return pages[p - 1] ?? []; }, 3, 10);
  assert.deepEqual(r, { items: [1, 2, 3, 4, 5, 6, 7], pages: 3, truncated: false });
  assert.deepEqual(calls, [1, 2, 3]);
});

test('an exact multiple needs the empty page to know it is finished', async () => {
  const pages = [[1, 2], [3, 4]];
  const r = await fetchAllPages(async (p) => pages[p - 1] ?? [], 2, 10);
  assert.deepEqual(r, { items: [1, 2, 3, 4], pages: 3, truncated: false });
});

test('fetchAllPages reports truncation at the page limit, and never loops past it', async () => {
  let calls = 0;
  const r = await fetchAllPages(async () => { calls++; return [1, 2]; }, 2, 4);
  assert.equal(r.truncated, true);
  assert.equal(r.items.length, 8);
  assert.equal(calls, 4);
});

test('an error in a later page propagates, so a partial list is never mistaken for a full one', async () => {
  await assert.rejects(fetchAllPages(async (p) => { if (p === 2) throw new Error('429'); return [1, 2]; }, 2, 5), /429/);
});

test('chunk', () => {
  assert.deepEqual(chunk([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5]]);
  assert.deepEqual(chunk([], 3), []);
});
