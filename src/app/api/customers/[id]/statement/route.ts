import { NextRequest, NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { getAuth } from '@/lib/auth-helper';
import { db } from '@/db';
import { customers, organizations, statementLog } from '@/db/schema';
import { ensureBootstrapped } from '@/lib/bootstrap-db';
import { ensureDunningControlSchema } from '@/lib/dunning-control-schema';
import { sendEmail, withUnsubscribeFooter, dunningListUnsubscribeHeaders, getDunningReplyToAddress } from '@/lib/infra';
import { resolveFrom } from '@/lib/dunning/org-settings';
import { rateLimit } from '@/lib/rate-limit';
import { recordEvent } from '@/lib/events';
import { errorMessage } from '@/lib/utils';
import { loadStatement } from '@/lib/statements-load';
import { renderStatementHtml, statementCsv, statementSubject } from '@/lib/statements';
import { statementTarget } from '@/lib/statement-target';

/** GET ?format=csv downloads this customer's open invoices as a CSV. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await ensureBootstrapped();
  const { orgId } = await getAuth();
  if (!orgId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const [customer] = await db.select({ name: customers.name }).from(customers).where(and(eq(customers.id, id), eq(customers.orgId, orgId))).limit(1);
  if (!customer) return NextResponse.json({ error: 'not found' }, { status: 404 });
  if (req.nextUrl.searchParams.get('format') !== 'csv') return NextResponse.json({ error: 'format must be csv' }, { status: 400 });
  const statement = await loadStatement(orgId, id);
  const safe = customer.name.replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'customer';
  return new NextResponse(statementCsv(statement), {
    headers: { 'content-type': 'text/csv; charset=utf-8', 'content-disposition': `attachment; filename="statement-${safe}-${new Date().toISOString().slice(0, 10)}.csv"` },
  });
}

/**
 * POST { note? } emails the statement to the customer, built from their invoices
 * at this moment. Refuses unsubscribed customers, customers with no address, and
 * customers who owe nothing. If email is not configured nothing is sent and
 * nothing is recorded; a log row is only written after the send succeeded.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await ensureBootstrapped();
  await ensureDunningControlSchema();
  const { orgId, userId } = await getAuth();
  if (!orgId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;

  const rl = await rateLimit(orgId, { max: 60, windowMs: 3_600_000, key: 'statement-send' });
  if (!rl.allowed) return NextResponse.json({ error: 'You have sent a lot of statements this hour. Try again shortly.' }, { status: 429 });

  let input: Record<string, unknown> = {};
  try { const p = await req.json(); if (p && typeof p === 'object') input = p as Record<string, unknown>; } catch { /* no body is fine */ }
  const note = typeof input.note === 'string' ? input.note.replace(/\r\n?/g, '\n').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').trim().slice(0, 2000) : '';

  const [customer] = await db.select({ name: customers.name, email: customers.email, dndAt: customers.dndAt }).from(customers).where(and(eq(customers.id, id), eq(customers.orgId, orgId))).limit(1);
  if (!customer) return NextResponse.json({ error: 'not found' }, { status: 404 });
  const target = statementTarget({ email: customer.email, unsubscribedAt: customer.dndAt });
  if (!target.ok) return NextResponse.json({ error: target.reason }, { status: 409 });

  const statement = await loadStatement(orgId, id);
  if (statement.sections.length === 0) return NextResponse.json({ error: 'This customer owes nothing right now, so there is no statement to send.' }, { status: 409 });

  const [org] = await db.select({ name: organizations.name }).from(organizations).where(eq(organizations.id, orgId)).limit(1);
  const businessName = org?.name ?? 'Your team';
  const subject = statementSubject(businessName, statement.asOf);
  const html = withUnsubscribeFooter(renderStatementHtml({ customerName: customer.name, businessName, statement, note }), target.to);

  let externalId: string | null = null;
  try {
    const sent = await sendEmail({
      to: target.to,
      subject,
      html,
      headers: dunningListUnsubscribeHeaders(target.to),
      from: await resolveFrom(orgId, businessName),
      replyTo: getDunningReplyToAddress(),
    });
    if (sent.status === 'skipped') return NextResponse.json({ error: 'Email is not set up on this server, so nothing was sent.' }, { status: 502 });
    externalId = sent.id ?? null;
  } catch (e: unknown) {
    return NextResponse.json({ error: `Could not send: ${errorMessage(e)}` }, { status: 502 });
  }

  const totals = statement.sections.map((s) => ({ currency: s.currency, totalCents: s.totalCents, overdueCents: s.overdueCents }));
  await db.insert(statementLog).values({ orgId, customerId: id, toAddress: target.to, subject, totals, sentBy: userId ?? null, externalId });
  await recordEvent({ orgId, type: 'statement.sent', actorId: userId ?? undefined, payload: { customerId: id, totals } });
  return NextResponse.json({ ok: true });
}
