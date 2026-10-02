// Run: npx tsx scripts/selftest/practice.ts
// Runs the real loadBooks/loadBookCount against an in-memory database: only books the user belongs to,
// money kept per currency, counts and ages right, another person's book never shown.
process.env.USE_PGLITE = '1';
import { eq } from 'drizzle-orm';

async function main() {
  const { db } = await import('@/db'); const { ensureBootstrapped } = await import('@/lib/bootstrap-db');
  const { organizations, users, memberships, customers, invoices, inboxMessages, integrations } = await import('@/db/schema');
  const { loadBooks, loadBookCount } = await import('@/lib/practice-load');
  const { rankBooks, totalBooks } = await import('@/lib/practice');
  await ensureBootstrapped();
  const [u] = await db.select().from(users).limit(1);
  const other = 'user_not_me';
  await db.insert(users).values({ id: other, clerkId: 'clerk_other', email: 'other@example.test', name: 'Other' } as any).onConflictDoNothing();
  const mkOrg = async (id: string, name: string) => { await db.insert(organizations).values({ id, name, slug: id, ownerId: u.id } as any).onConflictDoNothing(); };
  await mkOrg('book_a', 'Acme Plumbing'); await mkOrg('book_b', 'Bright Dental'); await mkOrg('book_secret', 'Not Yours');
  await db.insert(memberships).values([{ userId: u.id, orgId: 'book_a', role: 'owner' }, { userId: u.id, orgId: 'book_b', role: 'owner' }, { userId: other, orgId: 'book_secret', role: 'owner' }] as any).onConflictDoNothing();
  const cust = async (org: string, id: string) => { await db.insert(customers).values({ id, orgId: org, name: id, email: `${id}@example.test` } as any); return id; };
  const inv = (org: string, customerId: string, n: string, status: any, amount: string, paid: string, cur: string, daysAgo: number) =>
    db.insert(invoices).values({ orgId: org, customerId, number: n, status, amount, amountPaid: paid, currency: cur, issueDate: new Date(Date.now() - 864e5 * (daysAgo + 30)), dueDate: new Date(Date.now() - 864e5 * daysAgo) } as any);
  const ca = await cust('book_a', 'ca1'), cb = await cust('book_b', 'cb1'), cs = await cust('book_secret', 'cs1');
  await inv('book_a', ca, 'A1', 'overdue', '1000', '200', 'USD', 40); // owes 800, 40d late
  await inv('book_a', ca, 'A2', 'sent', '500', '0', 'USD', -10);      // not due yet: open, not overdue
  await inv('book_a', ca, 'A3', 'paid', '999', '999', 'USD', 5);      // paid: ignored
  await inv('book_a', ca, 'A4', 'overdue', '300', '0', 'EUR', 3);     // other currency
  await inv('book_b', cb, 'B1', 'overdue', '250', '0', 'USD', 12);
  await inv('book_secret', cs, 'S1', 'overdue', '77777', '0', 'USD', 90);
  await db.insert(inboxMessages).values({ orgId: 'book_b', customerId: cb, status: 'new', subject: 'hi', body: 'x', fromEmail: 'cb1@example.test' } as any).catch(() => {});
  await db.delete(integrations).where(eq(integrations.orgId, 'book_a'));
  await db.insert(integrations).values({ orgId: 'book_a', provider: 'xero', status: 'error' } as any);

  const books = await loadBooks(u.id);
  const names = books.map((b) => b.name).sort();
  console.log('BOOKS', JSON.stringify(names));
  console.log('NOT-MINE hidden:', !books.some((b) => b.orgId === 'book_secret'));
  const a = books.find((b) => b.orgId === 'book_a')!;
  console.log('A', JSON.stringify({ open: a.openInvoices, overdue: a.overdueInvoices, money: a.money, oldest: a.oldestOverdueDays, integrationError: a.integrationError }));
  const b = books.find((x) => x.orgId === 'book_b')!;
  console.log('B', JSON.stringify({ open: b.openInvoices, overdue: b.overdueInvoices, replies: b.newReplies, hasIntegration: b.hasIntegration }));
  console.log('COUNT', await loadBookCount(u.id), '(expect books a, b + any the user already had)');
  const ranked = rankBooks(books); console.log('RANK first:', ranked[0].name, '|', ranked[0].attention.join('; '));
  console.log('TOTALS', JSON.stringify(totalBooks(books).money));
  process.exit(0);
}
main().catch((e) => { console.error('FAILED', e); process.exit(1); });
