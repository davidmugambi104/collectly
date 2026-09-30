import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { customers, disputes, inboxMessages, invoices, organizations, timelineEvents } from '@/db/schema';
import { ensureBootstrapped } from '@/lib/bootstrap-db';
import { rateLimit, getIp } from '@/lib/rate-limit';
import { recordEvent } from '@/lib/events';
import { canSelfServe, cleanNote, parsePortalReason, reasonLabel } from '@/lib/portal-self-service';
import { nanoid } from '@/lib/utils';

/**
 * PUBLIC. POST { reason, message? } from the payment page: "something is wrong
 * with this invoice". Marks it disputed (so reminders stop), records the
 * dispute with the customer's own words, and puts it in the owner's Inbox.
 * Only open invoices, only the listed reasons, rate-limited.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await ensureBootstrapped();
  const { id } = await params;
  const rl = await rateLimit(`${getIp(req)}:${id}`, { max: 6, windowMs: 3_600_000, key: 'portal-act' });
  if (!rl.allowed) return NextResponse.json({ error: 'Too many tries. Please try again later.' }, { status: 429 });

  let input: Record<string, unknown> = {};
  try { const p = await req.json(); if (p && typeof p === 'object') input = p as Record<string, unknown>; } catch { /* handled below */ }
  const reason = parsePortalReason(input.reason);
  if (!reason) return NextResponse.json({ error: 'Choose what is wrong.' }, { status: 400 });
  const message = cleanNote(input.message);

  const [row] = await db.select({ invoice: invoices, customer: customers, orgName: organizations.name }).from(invoices)
    .innerJoin(customers, eq(customers.id, invoices.customerId))
    .innerJoin(organizations, eq(organizations.id, invoices.orgId))
    .where(eq(invoices.id, id)).limit(1);
  if (!row) return NextResponse.json({ error: 'not found' }, { status: 404 });
  const { invoice, customer } = row;
  if (!canSelfServe(invoice.status)) return NextResponse.json({ error: 'This invoice is already being looked at, or is closed.' }, { status: 409 });

  await db.insert(disputes).values({ id: nanoid(), orgId: invoice.orgId, invoiceId: id, customerId: customer.id, reason, status: 'open', customerMessage: message });
  await db.update(invoices).set({ status: 'disputed', updatedAt: new Date() }).where(eq(invoices.id, id));
  await db.insert(timelineEvents).values({
    id: nanoid(), orgId: invoice.orgId, customerId: customer.id, invoiceId: id, eventType: 'dispute_opened',
    title: `Dispute opened on the payment page: ${reasonLabel(reason)}`, description: message,
  });
  await db.insert(inboxMessages).values({
    id: nanoid(), orgId: invoice.orgId, customerId: customer.id, invoiceId: id, channel: 'portal',
    fromAddress: customer.email, fromName: customer.name, subject: `Invoice ${invoice.number}: ${reasonLabel(reason)}`,
    body: message ?? reasonLabel(reason), classification: reason === 'already_paid' ? 'already_paid' : reason === 'missing_po' ? 'missing_po' : reason === 'payment_plan_request' ? 'needs_payment_plan' : 'disputed',
    status: 'new', aiSummary: `Raised from the payment page: ${reasonLabel(reason)}. Reminders are paused while the invoice is disputed.`,
  });
  await recordEvent({ orgId: invoice.orgId, type: 'portal.dispute.opened', payload: { invoiceId: id, reason } });
  return NextResponse.json({ ok: true, org: row.orgName });
}
