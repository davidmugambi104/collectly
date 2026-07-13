import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { customers, invoices, payments, organizations } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { nanoid } from '@/lib/utils';

export async function POST(req: NextRequest) {
  const { userId, orgId } = await auth();
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!orgId) return NextResponse.json({ error: 'no org' }, { status: 400 });
  // Auto-create org if user has no org yet
  const [org] = await db.select().from(organizations).where(eq(organizations.id, orgId)).limit(1);
  if (!org) {
    await db.insert(organizations).values({ id: orgId, name: 'My business', slug: `org-${nanoid().slice(0, 6)}`, ownerId: userId });
  }

  const body = await req.json();
  const customersIn = Array.isArray(body) ? body : [body];
  const created = [];
  for (const c of customersIn) {
    if (!c.name) continue;
    const [customer] = await db.insert(customers).values({
      id: nanoid(), orgId, name: c.name, email: c.email, phone: c.phone, company: c.company, preferredChannel: c.preferredChannel ?? 'email',
    }).returning();
    const inv = (c.invoices ?? []) as Array<any>;
    for (const i of inv) {
      const [invRow] = await db.insert(invoices).values({
        id: nanoid(), orgId, customerId: customer.id, number: i.number ?? `INV-${Date.now()}`,
        status: 'sent', amount: String(i.amount ?? 0), amountPaid: '0', currency: i.currency ?? 'USD',
        issueDate: new Date(i.issueDate ?? new Date()), dueDate: new Date(i.dueDate ?? new Date(Date.now() + 30 * 86400000)),
        description: i.description,
      }).returning();
      if (i.paid) {
        await db.insert(payments).values({
          id: nanoid(), orgId, invoiceId: invRow.id, customerId: customer.id,
          amount: String(i.amount ?? 0), currency: i.currency ?? 'USD',
          method: 'manual', paidAt: new Date(),
        });
        await db.update(invoices).set({ status: 'paid', amountPaid: String(i.amount ?? 0), paidAt: new Date() }).where(eq(invoices.id, invRow.id));
      }
    }
    created.push(customer.id);
  }
  return NextResponse.json({ ok: true, created });
}
