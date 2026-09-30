import { NextRequest, NextResponse } from 'next/server';
import { and, eq, gte } from 'drizzle-orm';
import { db } from '@/db';
import { customers, inboxMessages, invoices, organizations, promisesToPay, timelineEvents } from '@/db/schema';
import { ensureBootstrapped } from '@/lib/bootstrap-db';
import { rateLimit, getIp } from '@/lib/rate-limit';
import { recordEvent } from '@/lib/events';
import { canSelfServe, parsePromiseDate, utcDay } from '@/lib/portal-self-service';
import { formatCurrency, nanoid } from '@/lib/utils';

/**
 * PUBLIC. POST { date: "YYYY-MM-DD" } from the payment page: "I will pay on this
 * day". The invoice id in the link is the only credential, so this does the
 * least it can: records a promise (which pauses reminders until that day),
 * leaves a message in the owner's Inbox, and refuses anything that is not an
 * open invoice, a sensible date, or a second promise while one is running.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await ensureBootstrapped();
  const { id } = await params;
  const rl = await rateLimit(`${getIp(req)}:${id}`, { max: 6, windowMs: 3_600_000, key: 'portal-act' });
  if (!rl.allowed) return NextResponse.json({ error: 'Too many tries. Please try again later.' }, { status: 429 });

  let input: Record<string, unknown> = {};
  try { const p = await req.json(); if (p && typeof p === 'object') input = p as Record<string, unknown>; } catch { /* handled below */ }
  const now = new Date();
  const when = parsePromiseDate(input.date, now);
  if (!when.ok) return NextResponse.json({ error: when.error }, { status: 400 });

  const [row] = await db.select({ invoice: invoices, customer: customers, orgName: organizations.name }).from(invoices)
    .innerJoin(customers, eq(customers.id, invoices.customerId))
    .innerJoin(organizations, eq(organizations.id, invoices.orgId))
    .where(eq(invoices.id, id)).limit(1);
  if (!row) return NextResponse.json({ error: 'not found' }, { status: 404 });
  const { invoice, customer } = row;
  if (!canSelfServe(invoice.status)) return NextResponse.json({ error: 'There is nothing to arrange on this invoice right now.' }, { status: 409 });

  const [existing] = await db.select({ d: promisesToPay.promisedDate }).from(promisesToPay)
    .where(and(eq(promisesToPay.invoiceId, id), eq(promisesToPay.status, 'active'), gte(promisesToPay.promisedDate, now))).limit(1);
  if (existing?.d) return NextResponse.json({ error: `We already have your promise to pay by ${utcDay(existing.d)}.` }, { status: 409 });

  const balance = Number(invoice.amount) - Number(invoice.amountPaid ?? 0);
  const text = `${customer.name} said on the payment page that they will pay ${formatCurrency(balance, invoice.currency)} by ${utcDay(when.date)}.`;
  await db.insert(promisesToPay).values({
    id: nanoid(), orgId: invoice.orgId, invoiceId: id, customerId: customer.id, promisedDate: when.date,
    promisedAmount: balance.toFixed(2), currency: invoice.currency, status: 'active', sourceText: 'Told us on the payment page',
  });
  await db.insert(timelineEvents).values({
    id: nanoid(), orgId: invoice.orgId, customerId: customer.id, invoiceId: id, eventType: 'promise_made',
    title: `Promised to pay by ${utcDay(when.date)} (on the payment page)`, description: null,
  });
  await db.insert(inboxMessages).values({
    id: nanoid(), orgId: invoice.orgId, customerId: customer.id, invoiceId: id, channel: 'portal',
    fromAddress: customer.email, fromName: customer.name, subject: `Invoice ${invoice.number}: promise to pay`, body: text,
    classification: 'will_pay_date', status: 'new', aiSummary: 'Promised a payment date from the payment page. Reminders are paused until then.',
  });
  await recordEvent({ orgId: invoice.orgId, type: 'portal.promise.created', payload: { invoiceId: id, date: when.date.toISOString() } });
  return NextResponse.json({ ok: true, date: when.date.toISOString().slice(0, 10), org: row.orgName });
}
