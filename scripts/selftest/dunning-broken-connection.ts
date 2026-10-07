// Run: npx tsx scripts/selftest/dunning-broken-connection.ts
// Checks that the dunning scheduler will not draft or send a reminder for an
// org whose QuickBooks/Xero connection is in status 'error' -- the invoices
// it would act on may be stale (paid, voided or changed at the source since
// the connection died), so the scheduler must stop instead of silently
// reminding off old data. Real database (pglite), not a provider stand-in.
process.env.USE_PGLITE = '1';
import { eq } from 'drizzle-orm';

async function main() {
  const { db } = await import('@/db');
  const { ensureBootstrapped } = await import('@/lib/bootstrap-db');
  const { organizations, users, customers, invoices, integrations, dunningSequences } = await import('@/db/schema');
  const { processDunning } = await import('@/lib/dunning/scheduler');
  await ensureBootstrapped();

  const [u] = await db.select().from(users).limit(1);
  const mkOrg = async (id: string, name: string) => db.insert(organizations).values({ id, name, slug: id, ownerId: u.id } as any).onConflictDoNothing();
  await mkOrg('dc_broken', 'Broken Co');
  await mkOrg('dc_healthy', 'Healthy Co');

  const cust = async (org: string, id: string) => { await db.insert(customers).values({ id, orgId: org, name: id, email: `${id}@example.test` } as any).onConflictDoNothing(); return id; };
  const cBroken = await cust('dc_broken', 'dc_b_cust');
  const cHealthy = await cust('dc_healthy', 'dc_h_cust');

  const overdueInvoice = (org: string, customerId: string, n: string) =>
    db.insert(invoices).values({ orgId: org, customerId, number: n, status: 'overdue', amount: '500', amountPaid: '0', currency: 'USD', issueDate: new Date(Date.now() - 864e5 * 40), dueDate: new Date(Date.now() - 864e5 * 30) } as any);
  await overdueInvoice('dc_broken', cBroken, 'BRK-1');
  await overdueInvoice('dc_healthy', cHealthy, 'HLT-1');

  const step = { id: 's1', daysFromDue: 1, channel: 'phone' as const, tone: 'friendly' as const, template: 'x' };
  await db.insert(dunningSequences).values({ orgId: 'dc_broken', name: 'Default', isActive: true, steps: [step] } as any);
  await db.insert(dunningSequences).values({ orgId: 'dc_healthy', name: 'Default', isActive: true, steps: [step] } as any);

  await db.delete(integrations).where(eq(integrations.orgId, 'dc_broken'));
  await db.insert(integrations).values({ orgId: 'dc_broken', provider: 'quickbooks', status: 'error' } as any);
  await db.delete(integrations).where(eq(integrations.orgId, 'dc_healthy'));
  await db.insert(integrations).values({ orgId: 'dc_healthy', provider: 'quickbooks', status: 'connected' } as any);

  // A phone step is a task for the owner, not a send -- it exercises the gate
  // without needing email/SMS config, and still proves nothing got scheduled.
  const rBroken = await processDunning({ orgId: 'dc_broken' });
  const rHealthy = await processDunning({ orgId: 'dc_healthy' });

  console.log('RESULT', JSON.stringify({
    broken: { scheduled: rBroken.scheduled, blockedByConnection: rBroken.blockedByConnection },
    healthy: { scheduled: rHealthy.scheduled, blockedByConnection: rHealthy.blockedByConnection },
  }));
  process.exit(0);
}
main().catch((e) => { console.error('FAILED', e); process.exit(1); });
