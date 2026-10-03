// Run: npx tsx scripts/selftest/purge-quickbooks.ts
// Removing QuickBooks-imported data against an in-memory database: QBO-format (numeric) rows go; Xero GUID rows, hand-typed rows,
// another organization's rows, and a QBO customer who also has a hand-typed invoice all stay.
process.env.USE_PGLITE = '1';
import { eq, sql } from 'drizzle-orm';

async function main() {
  const { db } = await import('@/db'); const { ensureBootstrapped } = await import('@/lib/bootstrap-db');
  const { organizations, users, customers, invoices } = await import('@/db/schema');
  const { previewImportedData, purgeImportedData } = await import('@/lib/integrations/imported-data-db');
  await ensureBootstrapped();
  const [u] = await db.select().from(users).limit(1);
  const mk = async (id: string) => { await db.insert(organizations).values({ id, name: id, slug: id, ownerId: u.id } as any).onConflictDoNothing(); };
  await mk('me'); await mk('other');
  const G = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
  const cust = async (org: string, id: string, ext: string | null) => { await db.insert(customers).values({ id, orgId: org, name: id, externalId: ext, email: `${id}@example.test` } as any); return id; };
  const inv = (org: string, c: string, n: string, ext: string | null) => db.insert(invoices).values({ orgId: org, customerId: c, number: n, externalId: ext, status: 'overdue', amount: '100', amountPaid: '0', currency: 'USD', issueDate: new Date(), dueDate: new Date(Date.now() - 864e5) } as any);
  const q1 = await cust('me', 'qbo-cust-1', '101'), q2 = await cust('me', 'qbo-cust-2', '102');
  const mixed = await cust('me', 'qbo-cust-with-manual-invoice', '103');
  const xe = await cust('me', 'xero-cust', G(1)), hand = await cust('me', 'hand-cust', null), theirs = await cust('other', 'other-qbo-cust', '104');
  await inv('me', q1, 'Q-1', '201'); await inv('me', q1, 'Q-2', '202'); await inv('me', q2, 'Q-3', '203');
  await inv('me', mixed, 'Q-4', '204'); await inv('me', mixed, 'MANUAL-1', null);
  await inv('me', xe, 'X-1', G(11)); await inv('me', hand, 'H-1', null); await inv('other', theirs, 'O-1', '205');

  const before = await previewImportedData('me', 'quickbooks');
  console.log('PREVIEW', JSON.stringify({ invoices: before.invoices, customers: before.customers }), '(expect 4 invoices, 2 removable customers)');
  const removed = await purgeImportedData('me', 'quickbooks');
  console.log('REMOVED', JSON.stringify(removed), '(expect 4 invoices, 2 customers: the one with a hand-typed invoice stays)');
  const left = (await db.select({ n: invoices.number }).from(invoices).where(eq(invoices.orgId, 'me'))).map((r: { n: string }) => r.n).sort();
  console.log('LEFT in my org', JSON.stringify(left), '(expect H-1, MANUAL-1, X-1)');
  const lc = (await db.select({ id: customers.id }).from(customers).where(eq(customers.orgId, 'me'))).map((r: { id: string }) => r.id).sort();
  console.log('CUSTOMERS left', JSON.stringify(lc));
  console.log('OTHER org untouched:', (await db.select({ n: sql<number>`count(*)::int` }).from(invoices).where(eq(invoices.orgId, 'other')))[0].n === 1);
  console.log('PREVIEW after', JSON.stringify(await previewImportedData('me', 'quickbooks')));
  const ok = before.invoices === 4 && before.customers === 2 && removed.invoices === 4 && removed.customers === 2 && JSON.stringify(left) === JSON.stringify(['H-1', 'MANUAL-1', 'X-1']);
  console.log(ok ? 'PASS' : 'FAIL');
  process.exit(ok ? 0 : 1);
}
main().catch((e) => { console.error('FAILED', e); process.exit(1); });
