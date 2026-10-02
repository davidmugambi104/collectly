import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isXeroId, describeImported } from './imported-data.ts';

test('Xero ids are GUIDs, upper or lower case', () => {
  assert.equal(isXeroId('9f5bca33-8590-4b6f-acfb-e85712b10217'), true);
  assert.equal(isXeroId('9F5BCA33-8590-4B6F-ACFB-E85712B10217'), true);
});

test('QuickBooks ids, hand-typed ids and empties are not Xero ids', () => {
  for (const v of ['123', '9341457531392484', 'DEMO-001', '', null, undefined, '9f5bca33-8590-4b6f-acfb-e85712b1021', 'x9f5bca33-8590-4b6f-acfb-e85712b10217']) assert.equal(isXeroId(v as string), false);
});

test('the notice says what is left, and nothing when nothing is', () => {
  assert.equal(describeImported({ customers: 0, invoices: 0, sampleCustomers: [] }), null);
  assert.equal(describeImported({ customers: 1, invoices: 1, sampleCustomers: [] }), '1 invoice and 1 customer imported from Xero are still here.');
  assert.equal(describeImported({ customers: 12, invoices: 70, sampleCustomers: [] }), '70 invoices and 12 customers imported from Xero are still here.');
});
