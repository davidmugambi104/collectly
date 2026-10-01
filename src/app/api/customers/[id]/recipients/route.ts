import { NextRequest, NextResponse } from 'next/server';
import { and, asc, eq, sql } from 'drizzle-orm';
import { getAuth } from '@/lib/auth-helper';
import { db } from '@/db';
import { customerRecipients, customers } from '@/db/schema';
import { ensureBootstrapped } from '@/lib/bootstrap-db';
import { ensureDunningControlSchema } from '@/lib/dunning-control-schema';
import { recordEvent } from '@/lib/events';
import { MAX_RECIPIENTS, parseRecipientInput } from '@/lib/recipients';

/** POST { email, name? } adds an extra person who also gets this customer's reminders and statements. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await ensureBootstrapped();
  await ensureDunningControlSchema();
  const { orgId, userId } = await getAuth();
  if (!orgId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;

  const [customer] = await db.select({ email: customers.email }).from(customers).where(and(eq(customers.id, id), eq(customers.orgId, orgId))).limit(1);
  if (!customer) return NextResponse.json({ error: 'not found' }, { status: 404 });

  let input: unknown = null;
  try { input = await req.json(); } catch { /* handled by the parser */ }
  const parsed = parseRecipientInput(input, customer.email);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const [{ n }] = await db.select({ n: sql<number>`count(*)` }).from(customerRecipients).where(and(eq(customerRecipients.customerId, id), eq(customerRecipients.orgId, orgId)));
  if (Number(n) >= MAX_RECIPIENTS) return NextResponse.json({ error: `A customer can have at most ${MAX_RECIPIENTS} extra recipients.` }, { status: 409 });

  const added = await db.insert(customerRecipients)
    .values({ orgId, customerId: id, email: parsed.value.email, name: parsed.value.name })
    .onConflictDoNothing({ target: [customerRecipients.customerId, customerRecipients.email] })
    .returning({ id: customerRecipients.id });
  if (added.length === 0) return NextResponse.json({ error: 'That address is already on this customer.' }, { status: 409 });
  await recordEvent({ orgId, type: 'recipient.added', actorId: userId ?? undefined, payload: { customerId: id } });
  return NextResponse.json({ ok: true, id: added[0].id });
}

/** GET lists the extra recipients. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await ensureBootstrapped();
  await ensureDunningControlSchema();
  const { orgId } = await getAuth();
  if (!orgId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const rows = await db.select({ id: customerRecipients.id, email: customerRecipients.email, name: customerRecipients.name, unsubscribedAt: customerRecipients.unsubscribedAt })
    .from(customerRecipients).where(and(eq(customerRecipients.customerId, id), eq(customerRecipients.orgId, orgId))).orderBy(asc(customerRecipients.createdAt));
  return NextResponse.json({ recipients: rows });
}
