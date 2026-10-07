import { NextRequest, NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { getAuth } from '@/lib/auth-helper';
import { db } from '@/db';
import { customers } from '@/db/schema';
import { ensureBootstrapped } from '@/lib/bootstrap-db';
import { ensureDunningControlSchema } from '@/lib/dunning-control-schema';
import { rateLimit } from '@/lib/rate-limit';
import { loadStatement } from '@/lib/statements-load';
import { statementCsv } from '@/lib/statements';
import { sendStatementEmail } from '@/lib/statements-send';

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

  const result = await sendStatementEmail({ orgId, userId: userId ?? null, customerId: id, note });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ ok: true });
}
