import { NextResponse } from 'next/server';
import { getAuth } from '@/lib/auth-helper';
import { ensureBootstrapped } from '@/lib/bootstrap-db';
import { eq } from 'drizzle-orm';
import { db, schema } from '@/db';

/**
 * Load sample data for the current org. Idempotent: only loads if the org
 * has no customers yet. Designed for the "Try the demo" flow on the
 * integrations page and the empty-state first-run checklist.
 */
export async function POST() {
  await ensureBootstrapped();
  const { orgId } = await getAuth();
  if (!orgId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const existing = await db.select().from(schema.customers).where(eq(schema.customers.orgId, orgId)).limit(1);
  if (existing.length > 0) {
    return NextResponse.json({ ok: true, loaded: false, reason: 'Org already has data. Clear data first to re-seed.' });
  }

  const now = new Date();
  const { nanoid } = await import('@/lib/utils');
  const custList: Array<{ name: string; email: string; phone: string; company: string; channel: 'email' | 'sms'; behavior: NonNullable<schema.Customer['paymentBehavior']> }> = [
    { name: 'Brightline Legal', email: 'ap@brightlinelegal.com', phone: '+14155551234', company: 'Brightline Legal LLP', channel: 'email', behavior: { avgDaysToPay: 28, paidRate: 0.95, lastPaidAt: new Date(now.getTime() - 12 * 86400000).toISOString(), riskScore: 15 } },
    { name: 'Harbor Painting Co', email: 'bills@harborpainting.com', phone: '+14155555678', company: 'Harbor Painting', channel: 'sms', behavior: { avgDaysToPay: 14, paidRate: 0.99, lastPaidAt: new Date(now.getTime() - 3 * 86400000).toISOString(), riskScore: 8 } },
    { name: 'Westgate Advisory', email: 'finance@westgate.com', phone: '+12125559001', company: 'Westgate Advisory', channel: 'email', behavior: { avgDaysToPay: 47, paidRate: 0.78, lastPaidAt: new Date(now.getTime() - 40 * 86400000).toISOString(), riskScore: 62 } },
    { name: 'Northstar Marketing', email: 'ap@northstar.io', phone: '+12125559002', company: 'Northstar Marketing', channel: 'email', behavior: { avgDaysToPay: 65, paidRate: 0.55, lastPaidAt: new Date(now.getTime() - 70 * 86400000).toISOString(), riskScore: 78 } },
    { name: 'Acme Studios', email: 'bills@acmestudios.com', phone: '+13105559003', company: 'Acme Studios', channel: 'email', behavior: { avgDaysToPay: 95, paidRate: 0.32, lastPaidAt: new Date(now.getTime() - 95 * 86400000).toISOString(), riskScore: 88 } },
    { name: 'Riverstone Co.', email: 'hello@riverstone.co', phone: '+447700900123', company: 'Riverstone Co', channel: 'email', behavior: { avgDaysToPay: 21, paidRate: 0.92, lastPaidAt: new Date(now.getTime() - 18 * 86400000).toISOString(), riskScore: 22 } },
    { name: 'Lakeside Therapy', email: 'admin@lakeside.health', phone: '+16125551111', company: 'Lakeside Therapy Group', channel: 'email', behavior: { avgDaysToPay: 32, paidRate: 0.88, lastPaidAt: new Date(now.getTime() - 25 * 86400000).toISOString(), riskScore: 35 } },
    { name: 'Pinecone Bakery', email: 'bills@pinecone.co', phone: '+12065552222', company: 'Pinecone Bakery', channel: 'email', behavior: { avgDaysToPay: 7, paidRate: 1.0, lastPaidAt: new Date(now.getTime() - 2 * 86400000).toISOString(), riskScore: 5 } },
  ];
  const custIds: Record<string, string> = {};
  now.toISOString();
  for (const c of custList) {
    const id = nanoid();
    custIds[c.name] = id;
    await db.insert(schema.customers).values({
      id, orgId, name: c.name, email: c.email, phone: c.phone, company: c.company,
      preferredChannel: c.channel, paymentBehavior: c.behavior, createdAt: now, updatedAt: now,
    });
  }

  const invoices = [
    { cust: 'Brightline Legal', number: 'INV-2401', amount: '24500.00', daysAgo: 4 },
    { cust: 'Harbor Painting Co', number: 'INV-2402', amount: '8200.00', daysAgo: 12 },
    { cust: 'Westgate Advisory', number: 'INV-2390', amount: '42000.00', daysAgo: 38 },
    { cust: 'Northstar Marketing', number: 'INV-2380', amount: '15750.00', daysAgo: 67 },
    { cust: 'Acme Studios', number: 'INV-2370', amount: '93800.00', daysAgo: 95 },
    { cust: 'Riverstone Co.', number: 'INV-2405', amount: '6300.00', daysAgo: -3 },
    { cust: 'Brightline Legal', number: 'INV-2410', amount: '12500.00', daysAgo: -10 },
    { cust: 'Westgate Advisory', number: 'INV-2412', amount: '8800.00', daysAgo: -2 },
    { cust: 'Lakeside Therapy', number: 'INV-2415', amount: '5400.00', daysAgo: 22 },
    { cust: 'Pinecone Bakery', number: 'INV-2420', amount: '1200.00', daysAgo: -1 },
  ];
  for (const inv of invoices) {
    const cid = custIds[inv.cust];
    if (!cid) continue;
    const issue = new Date(now.getTime() - inv.daysAgo * 86400000);
    const due = new Date(issue.getTime() + 30 * 86400000);
    const status = inv.daysAgo > 0 ? 'overdue' : 'sent';
    await db.insert(schema.invoices).values({
      id: nanoid(), orgId, customerId: cid, number: inv.number, status, amount: inv.amount, amountPaid: '0',
      currency: 'USD', issueDate: issue, dueDate: due, description: `${inv.cust} services`, createdAt: now, updatedAt: now,
    });
  }

  // One paid invoice + payment (so DSO history exists)
  const paidCust = custIds['Brightline Legal'];
  const paidIssue = new Date(now.getTime() - 25 * 86400000);
  const paidDue = new Date(paidIssue.getTime() + 30 * 86400000);
  const paidPaidAt = new Date(now.getTime() - 18 * 86400000);
  const paidId = nanoid();
  await db.insert(schema.invoices).values({
    id: paidId, orgId, customerId: paidCust, number: 'INV-2395', status: 'paid',
    amount: '18000.00', amountPaid: '18000.00', currency: 'USD', issueDate: paidIssue, dueDate: paidDue, paidAt: paidPaidAt,
    description: 'Brand sprint', createdAt: now, updatedAt: now,
  });
  await db.insert(schema.payments).values({
    id: nanoid(), orgId, invoiceId: paidId, customerId: paidCust, amount: '18000.00', currency: 'USD',
    method: 'ach', paidAt: paidPaidAt, createdAt: now,
  });
  await db.insert(schema.payments).values({
    id: nanoid(), orgId, invoiceId: paidId, customerId: paidCust, amount: '4500.00', currency: 'USD',
    method: 'card', paidAt: new Date(now.getTime() - 4 * 86400000), createdAt: now,
  });
  // Mark a connection as connected so "Quick actions" doesn't nag
  await db.insert(schema.integrations).values({
    id: nanoid(), orgId, provider: 'quickbooks', status: 'connected', realmId: 'demo-realm-1',
    lastSyncAt: now, createdAt: now, updatedAt: now,
  }).onConflictDoNothing();

  return NextResponse.json({ ok: true, loaded: true, customers: custList.length, invoices: invoices.length + 1 });
}
