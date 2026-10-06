import { test } from 'node:test';
import assert from 'node:assert/strict';
import { qboCustomersQuery, qboPaymentsQuery } from './qbo-queries.ts';

// Both shapes were rejected by QuickBooks Online on the first real sandbox sync (2026-10-06, code 4001).

test('the customer query does not name CurrencyRef (not selectable in single-currency companies)', () => {
  for (const q of [qboCustomersQuery(1000), qboCustomersQuery(1000, 1001)]) {
    assert.match(q, /^SELECT \* FROM Customer ORDERBY Id/);
    assert.doesNotMatch(q, /CurrencyRef/);
  }
  assert.match(qboCustomersQuery(1000, 1001), /STARTPOSITION 1001/);
});

test('the payments query never filters on UnappliedAmt (not queryable) and pages newest first', () => {
  const q = qboPaymentsQuery(1000, 1001);
  assert.doesNotMatch(q, /WHERE/i);
  assert.doesNotMatch(q, /UnappliedAmt/);
  assert.match(q, /ORDERBY TxnDate DESC STARTPOSITION 1001 MAXRESULTS/);
});
