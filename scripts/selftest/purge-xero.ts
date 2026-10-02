// Run: npx tsx scripts/selftest/purge-xero.ts
// Removing Xero-imported data against an in-memory database: Xero-format rows go; QuickBooks rows, hand-typed rows,
// another organization's rows, and a Xero customer who also has a hand-typed invoice all stay.
process.env.USE_PGLITE = '1';
import { eq, sql } from 'drizzle-orm';

async function main() {
  const { db } = await import('@/db'); const { ensureBootstrapped } = await import('@/lib/bootstrap-db');
  const { organizations, users, customers, invoices } = await import('@/db/schema');
  const { previewXeroData, purgeXeroData } = await import('@/lib/integrations/imported-data-db');
  await ensureBootstrapped();
  const [u] = await db.select().from(users).limit(1);
  const mk = async (id: string) => { await db.insert(organizations).values({ id, name: id, slug: id, ownerId: u.id } as any).onConflictDoNothing(); };
  await mk('me'); await mk('other');
  const G = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
  const cust = async (org: string, id: string, ext: string | null) => { await db.insert(customers).values({ id, orgId: org, name: id, externalId: ext, email: `${id}@example.test` } as any); return id; };
  const inv = (org: string, c: string, n: string, ext: string | null) => db.insert(invoices).values({ orgId: org, customerId: c, number: n, externalId: ext, status: 'overdue', amount: '100', amountPaid: '0', currency: 'USD', issueDate: new Date(), dueDate: new Date(Date.now() - 864e5) } as any);
  const x1 = await cust('me', 'xero-cust-1', G(1)), x2 = await cust('me', 'xero-cust-2', G(2));
  const mixed = await cust('me', 'xero-cust-with-manual-invoice', G(3));
  const qb = await cust('me', 'qb-cust', '4521'), hand = await cust('me', 'hand-cust', null), theirs = await cust('other', 'other-xero-cust', G(9));
  await inv('me', x1, 'X-1', G(11)); await inv('me', x1, 'X-2', G(12)); await inv('me', x2, 'X-3', G(13));
  await inv('me', mixed, 'X-4', G(14)); await inv('me', mixed, 'MANUAL-1', null);
  await inv('me', qb, 'Q-1', '88'); await inv('me', hand, 'H-1', null); await inv('other', theirs, 'O-1', G(19));

  const before = await previewXeroData('me');
  console.log('PREVIEW', JSON.stringify({ invoices: before.invoices, customers: before.customers }), '(expect 4 invoices, 2 removable customers)');
  const removed = await purgeXeroData('me');
  console.log('REMOVED', JSON.stringify(removed), '(expect 4 invoices, 2 customers: the one with a hand-typed invoice stays)');
  const left = (await db.select({ n: invoices.number }).from(invoices).where(eq(invoices.orgId, 'me'))).map((r: { n: string }) => r.n).sort();
  console.log('LEFT in my org', JSON.stringify(left), '(expect H-1, MANUAL-1, Q-1)');
  const lc = (await db.select({ id: customers.id }).from(customers).where(eq(customers.orgId, 'me'))).map((r: { id: string }) => r.id).sort();
  console.log('CUSTOMERS left', JSON.stringify(lc));
  console.log('OTHER org untouched:', (await db.select({ n: sql<number>`count(*)::int` }).from(invoices).where(eq(invoices.orgId, 'other')))[0].n === 1);
  console.log('PREVIEW after', JSON.stringify(await previewXeroData('me')));
  process.exit(0);
}
main().catch((e) => { console.error('FAILED', e); process.exit(1); });
