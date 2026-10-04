import { test } from 'node:test';
import assert from 'node:assert/strict';
import { qboClosure, isQboNotFound, resolveHomeCurrency } from './qbo-sync-rules.ts';
import { qboSyncedStatus } from './sync-status.ts';

test('a voided invoice is closed, not "paid"; a plain paid one is not', () => {
  assert.equal(qboClosure({ TotalAmt: 0, Balance: 0, PrivateNote: 'Voided' }), 'voided');
  assert.equal(qboClosure({ TotalAmt: 0, Balance: 0, PrivateNote: 'voided by Sam' }), 'voided');
  assert.equal(qboClosure({ TotalAmt: 100, Balance: 0 }), null);
  assert.equal(qboClosure({ TotalAmt: 100, Balance: 40, PrivateNote: 'Void this later' }), null, 'still owed: not voided');
  assert.equal(qboClosure({ status: 'Deleted' }), 'deleted');
  assert.equal(qboClosure(null), null);
});

test('closed invoices become written_off, like Xero VOIDED/DELETED', () => {
  const base = { total: 0, due: 0, dueDate: new Date('2026-01-01'), now: new Date('2026-02-01') };
  assert.equal(qboSyncedStatus({ ...base, closure: 'voided' }), 'written_off');
  assert.equal(qboSyncedStatus({ ...base, closure: 'deleted' }), 'written_off');
  assert.equal(qboSyncedStatus({ ...base, closure: null }), 'paid');
  assert.equal(qboSyncedStatus({ ...base, total: 10, due: 10, closure: null }), 'overdue');
});

test('only a clear not-found counts as deleted', () => {
  assert.equal(isQboNotFound(new Error('QBO /invoice/9 failed: 400 {"Fault":{"Error":[{"Message":"Object Not Found","code":"610"}]}}')), true);
  assert.equal(isQboNotFound(new Error('QBO /invoice/9 failed: 404 nope')), true);
  assert.equal(isQboNotFound(new Error('QBO /invoice/9 failed: 500 {}')), false);
  assert.equal(isQboNotFound(new Error('QBO /invoice/9 failed: 429 throttled')), false);
  assert.equal(isQboNotFound(new Error('QBO /invoice/9 failed: 401 unauthorized')), false);
});

test('home currency: preferences, then country, then org base, then USD', () => {
  assert.deepEqual(resolveHomeCurrency({ preferences: { Preferences: { CurrencyPrefs: { HomeCurrency: { value: 'gbp' } } } } }), { currency: 'GBP', source: 'preferences' });
  assert.equal(resolveHomeCurrency({ preferences: { Preferences: { CurrencyPref: { HomeCurrency: { value: 'CAD' } } } } }).currency, 'CAD');
  assert.deepEqual(resolveHomeCurrency({ preferences: null, companyInfo: { CompanyInfo: { Country: 'GB' } } }), { currency: 'GBP', source: 'country' });
  assert.deepEqual(resolveHomeCurrency({ companyInfo: { CompanyInfo: { LegalAddr: { Country: 'AU' } } } }), { currency: 'AUD', source: 'country' });
  assert.deepEqual(resolveHomeCurrency({ companyInfo: { CompanyInfo: { Country: 'ZZ' } }, orgBaseCurrency: 'EUR' }), { currency: 'EUR', source: 'organization' });
  assert.deepEqual(resolveHomeCurrency({}), { currency: 'USD', source: 'default' });
  assert.equal(resolveHomeCurrency({ preferences: { Preferences: { CurrencyPrefs: { HomeCurrency: { value: 'pounds' } } } } }).source, 'default', 'junk is ignored');
});
