import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runSync, type ProviderAdapter, type SyncStore, type ExistingCustomer, type ExistingInvoice, type AdapterInvoice, type NewCustomerRow, type NewInvoiceRow } from './adapter.ts';
import { analyzeCsv, csvAdapter } from './csv-import.ts';
import { PROVIDER_ID_PATTERN, matchesProviderId } from './imported-data.ts';

type Inv = ExistingInvoice & { externalId: string };
function fakeStore(seed: { customers?: Array<[string, ExistingCustomer]>; invoices?: Inv[] } = {}) {
  const customers = new Map<string, ExistingCustomer>(seed.customers ?? []);
  const invoices = new Map<string, Inv>((seed.invoices ?? []).map((i) => [i.externalId, i]));
  const log = { closed: [] as string[], credits: null as unknown, touched: 0, updates: 0, inserts: 0 };
  const store: SyncStore = {
    async loadExisting() { return { customers: new Map(customers), invoices: new Map(invoices) }; },
    async insertCustomers(_o, rows: NewCustomerRow[]) { for (const r of rows) customers.set(r.externalId, { id: r.id, name: r.name, email: r.email, phone: r.phone, company: r.company }); },
    async updateCustomer(id, set) { for (const [k, c] of customers) if (c.id === id) customers.set(k, { ...c, ...set } as ExistingCustomer); },
    async insertInvoices(_o, rows: NewInvoiceRow[]) { for (const r of rows) { log.inserts++; invoices.set(r.externalId, { ...r, paidAt: r.paidAt } as unknown as Inv); } },
    async updateInvoice(id, set) { log.updates++; for (const [k, i] of invoices) if (i.id === id) invoices.set(k, { ...i, ...set } as Inv); },
    async recordClosed(_o, row) { log.closed.push(row.number); },
    async replaceCredits(_o, found) { log.credits = found; return found.length; },
    async touchLastSync() { log.touched++; },
  };
  return { store, customers, invoices, log };
}

const D = (s: string) => new Date(`${s}T00:00:00Z`);
const inv = (id: string, over: Partial<AdapterInvoice> = {}): AdapterInvoice => ({ id, number: `N${id}`, customerId: 'c1', total: 100, balance: 100, currency: 'usd', issueDate: D('2026-01-01'), dueDate: D('2026-02-01'), ...over });

function adapter(over: Partial<ProviderAdapter> & { invs?: AdapterInvoice[]; custs?: Array<{ id: string; name: string; email?: string }>; credits?: Array<{ customerId: string; currency: string; amount: number }> } = {}): ProviderAdapter {
  const { invs = [], custs = [{ id: 'c1', name: 'Acme', email: 'a@example.com' }], credits = [], ...rest } = over;
  const page = <T,>(l: T[], p: number, n: number) => l.slice((p - 1) * n, p * n);
  return {
    id: 'freshbooks', label: 'FreshBooks', configured: () => true, connectUrl: () => '/x', pageSize: 2, maxPages: 10,
    listCustomers: async (_o, p) => page(custs, p, 2), listOpenInvoices: async (_o, p) => page(invs, p, 2), listCredits: async (_o, p) => page(credits, p, 2),
    disconnect: async () => {}, ...rest,
  };
}
const NOW = D('2026-03-01');

test('first sync reads every page, prefixes every external id, and creates customers and invoices', async () => {
  const { store, customers, invoices, log } = fakeStore();
  const a = adapter({ invs: [inv('1'), inv('2'), inv('3'), inv('4'), inv('5')], custs: [{ id: 'c1', name: 'Acme' }, { id: 'c2', name: 'Beta' }, { id: 'c3', name: 'Gamma' }] });
  const r = await runSync(a, 'org', store, NOW);
  assert.equal(r.invoicesCreated, 5); assert.equal(r.customersUpserted, 3); assert.deepEqual(r.errors, []);
  assert.ok([...customers.keys()].every((k) => k.startsWith('freshbooks:')));
  assert.ok([...invoices.keys()].every((k) => k.startsWith('freshbooks:') && matchesProviderId('freshbooks', k)));
  assert.ok(![...invoices.keys()].some((k) => matchesProviderId('quickbooks', k) || matchesProviderId('xero', k)));
  assert.equal(invoices.get('freshbooks:1')!.status, 'overdue');
  assert.equal(invoices.get('freshbooks:1')!.currency, 'USD');
  assert.equal(log.touched, 1);
});

test('re-running changes nothing: no updates, no duplicates', async () => {
  const f = fakeStore();
  const a = adapter({ invs: [inv('1'), inv('2')] });
  await runSync(a, 'org', f.store, NOW);
  const before = f.log.inserts;
  const r = await runSync(a, 'org', f.store, NOW);
  assert.equal(r.invoicesCreated, 0); assert.equal(r.invoicesUpdated, 0); assert.equal(f.log.updates, 0); assert.equal(f.log.inserts, before);
  assert.equal(f.invoices.size, 2);
});

test('a partial payment updates the amounts; paid stamps paidAt once and counts as marked paid', async () => {
  const f = fakeStore();
  await runSync(adapter({ invs: [inv('1')] }), 'org', f.store, NOW);
  let r = await runSync(adapter({ invs: [inv('1', { balance: 40 })] }), 'org', f.store, NOW);
  assert.equal(r.invoicesUpdated, 1);
  assert.equal(f.invoices.get('freshbooks:1')!.status, 'partial'); assert.equal(Number(f.invoices.get('freshbooks:1')!.amountPaid), 60);
  r = await runSync(adapter({ invs: [inv('1', { balance: 0, state: 'paid' })] }), 'org', f.store, D('2026-03-05'));
  assert.equal(r.invoicesMarkedPaid, 1);
  const paidAt = f.invoices.get('freshbooks:1')!.paidAt;
  assert.equal(paidAt?.toISOString(), D('2026-03-05').toISOString());
  await runSync(adapter({ invs: [inv('1', { balance: 0, state: 'paid' })] }), 'org', f.store, D('2026-04-01'));
  assert.equal(f.invoices.get('freshbooks:1')!.paidAt?.toISOString(), D('2026-03-05').toISOString());
});

test("an owner's dispute survives while the invoice is still open at the source", async () => {
  const f = fakeStore();
  await runSync(adapter({ invs: [inv('1')] }), 'org', f.store, NOW);
  const row = f.invoices.get('freshbooks:1')!; f.invoices.set('freshbooks:1', { ...row, status: 'disputed' });
  await runSync(adapter({ invs: [inv('1', { total: 120, balance: 120 })] }), 'org', f.store, NOW);
  assert.equal(f.invoices.get('freshbooks:1')!.status, 'disputed');
  assert.equal(Number(f.invoices.get('freshbooks:1')!.amount), 120);
});

test('voided at the source closes an existing invoice; a never-seen paid or voided one is skipped', async () => {
  const f = fakeStore();
  await runSync(adapter({ invs: [inv('1')] }), 'org', f.store, NOW);
  const r = await runSync(adapter({ invs: [inv('1', { state: 'voided' }), inv('2', { state: 'paid', balance: 0 }), inv('3', { state: 'voided' })] }), 'org', f.store, NOW);
  assert.equal(r.invoicesClosed, 1); assert.equal(r.invoicesSkippedClosed, 2);
  assert.equal(f.invoices.get('freshbooks:1')!.status, 'written_off'); assert.deepEqual(f.log.closed, ['N1']);
  assert.equal(f.invoices.size, 1);
});

test('an invoice that dropped off the open list is looked up by id: paid, deleted, or left alone on an API failure', async () => {
  const f = fakeStore();
  await runSync(adapter({ invs: [inv('1'), inv('2'), inv('3')] }), 'org', f.store, NOW);
  const lookup = async (_o: string, id: string) => {
    if (id === '1') return inv('1', { balance: 0, state: 'paid' });
    if (id === '2') return 'not_found' as const;
    throw new Error('rate limited');
  };
  const r = await runSync(adapter({ invs: [], getInvoice: lookup }), 'org', f.store, NOW);
  assert.equal(f.invoices.get('freshbooks:1')!.status, 'paid');
  assert.equal(f.invoices.get('freshbooks:2')!.status, 'written_off');
  assert.notEqual(f.invoices.get('freshbooks:3')!.status, 'written_off');
  assert.ok(r.errors.some((e) => e.includes('freshbooks:3') && e.includes('rate limited')));
});

test('a failed invoice read never closes or pays anything', async () => {
  const f = fakeStore();
  await runSync(adapter({ invs: [inv('1')] }), 'org', f.store, NOW);
  const r = await runSync(adapter({ listOpenInvoices: async () => { throw new Error('boom'); }, getInvoice: async () => 'not_found' }), 'org', f.store, NOW);
  assert.ok(r.errors.some((e) => e.startsWith('invoices:')));
  assert.notEqual(f.invoices.get('freshbooks:1')!.status, 'written_off');
});

test('an invoice whose customer is not in the list gets a stub customer', async () => {
  const f = fakeStore();
  const r = await runSync(adapter({ custs: [], invs: [inv('1', { customerId: 'gone', customerName: 'Gone Ltd' })] }), 'org', f.store, NOW);
  assert.equal(r.invoicesCreated, 1);
  assert.equal(f.customers.get('freshbooks:gone')!.name, 'Gone Ltd');
});

test('an empty email from the provider never blanks a stored one', async () => {
  const f = fakeStore();
  await runSync(adapter({ custs: [{ id: 'c1', name: 'Acme', email: 'a@example.com' }] }), 'org', f.store, NOW);
  await runSync(adapter({ custs: [{ id: 'c1', name: 'Acme Inc' }] }), 'org', f.store, NOW);
  const c = f.customers.get('freshbooks:c1')!;
  assert.equal(c.name, 'Acme Inc'); assert.equal(c.email, 'a@example.com');
});

test('credits are stored with prefixed customer ids only after a full read', async () => {
  const f = fakeStore();
  await runSync(adapter({ credits: [{ customerId: 'c1', currency: 'USD', amount: 10 }, { customerId: 'c1', currency: 'USD', amount: 5 }] }), 'org', f.store, NOW);
  assert.deepEqual(f.log.credits, [{ customerExternalId: 'freshbooks:c1', currency: 'USD', amount: 15 }]);
  const g = fakeStore();
  const r = await runSync(adapter({ listCredits: async () => { throw new Error('nope'); } }), 'org', g.store, NOW);
  assert.equal(g.log.credits, null); assert.ok(r.errors.some((e) => e.startsWith('credit:')));
  const h = fakeStore();
  await runSync(adapter({ supportsCredits: false, listCredits: async () => { throw new Error('should not be called'); } }), 'org', h.store, NOW);
  assert.equal(h.log.credits, null);
});

test('a list longer than the page cap is flagged truncated', async () => {
  const f = fakeStore();
  const r = await runSync(adapter({ maxPages: 1, pageSize: 2, invs: [inv('1'), inv('2'), inv('3')], custs: [{ id: 'c1', name: 'A' }] , listOpenInvoices: async (_o, p) => (p === 1 ? [inv('1'), inv('2')] : [inv('3')]) }), 'org', f.store, NOW);
  assert.equal(r.truncated, true);
  assert.ok(r.errors.some((e) => e.includes('stopped at its limit')));
});

test('CSV import through runSync: creates, is idempotent, updates balances, never closes absent rows', async () => {
  const text = 'Invoice number,Customer,Customer email,Amount,Balance,Date,Due date\nINV-1,Acme,a@example.com,100,100,2026-01-01,2026-02-01\nINV-2,Beta,,50,50,2026-01-02,2026-02-02\nINV-3,Beta,,70,0,2026-01-03,2026-02-03';
  const f = fakeStore();
  const a1 = analyzeCsv(text);
  const r1 = await runSync(csvAdapter(a1.good), 'org', f.store, NOW);
  assert.equal(r1.invoicesCreated, 2); assert.equal(r1.invoicesSkippedClosed, 1); assert.equal(r1.customersUpserted, 2);
  assert.ok([...f.invoices.keys()].every((k) => new RegExp(PROVIDER_ID_PATTERN.csv).test(k)));
  const r2 = await runSync(csvAdapter(a1.good), 'org', f.store, NOW);
  assert.equal(r2.invoicesCreated, 0); assert.equal(r2.invoicesUpdated, 0); assert.equal(f.invoices.size, 2); assert.equal(f.customers.size, 2);
  // a later export with INV-1 reduced and INV-2 missing: INV-1 updates, INV-2 is left as it was
  const a3 = analyzeCsv('Invoice number,Customer,Amount,Balance,Date,Due date\nINV-1,Acme,100,30,2026-01-01,2026-02-01');
  const r3 = await runSync(csvAdapter(a3.good), 'org', f.store, NOW);
  assert.equal(r3.invoicesUpdated, 1); assert.equal(r3.invoicesClosed, 0);
  const inv1 = [...f.invoices.values()].find((i) => i.number === 'INV-1')!;
  assert.equal(inv1.status, 'partial');
  assert.ok([...f.invoices.values()].some((i) => i.number === 'INV-2' && i.status !== 'written_off'));
  assert.equal(f.log.credits, null);
});
