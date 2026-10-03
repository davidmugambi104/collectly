// Run: npx tsx scripts/selftest/export-isolation.ts
// The export for one organization must never contain another organization's rows.
process.env.USE_PGLITE = '1';
async function main() {
  const { db } = await import('@/db'); const { ensureBootstrapped } = await import('@/lib/bootstrap-db');
  const { organizations, users, customers, invoices } = await import('@/db/schema');
  const { loadExportBundle } = await import('@/lib/export-data-load');
  await ensureBootstrapped();
  const [u] = await db.select().from(users).limit(1);
  for (const id of ['exp-a', 'exp-b']) await db.insert(organizations).values({ id, name: id, slug: id, ownerId: u.id } as any).onConflictDoNothing();
  const mk = async (org: string, tag: string) => {
    await db.insert(customers).values({ id: `c-${tag}`, orgId: org, name: `CUST-${tag}`, email: `${tag}@example.test`, notes: `NOTE-${tag}` } as any);
    await db.insert(invoices).values({ orgId: org, customerId: `c-${tag}`, number: `INV-${tag}`, status: 'overdue', amount: '10', amountPaid: '0', currency: 'USD', issueDate: new Date(), dueDate: new Date() } as any);
  };
  await mk('exp-a', 'AAA'); await mk('exp-b', 'BBB');
  const a = JSON.stringify(await loadExportBundle('exp-a'));
  const ok = a.includes('AAA') && !a.includes('BBB');
  console.log(ok ? 'PASS: org A export has A and no B' : 'FAIL');
  process.exit(ok ? 0 : 1);
}
main().catch((e) => { console.error('FAILED', e); process.exit(1); });
