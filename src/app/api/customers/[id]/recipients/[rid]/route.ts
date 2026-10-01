import { NextRequest, NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { getAuth } from '@/lib/auth-helper';
import { db } from '@/db';
import { customerRecipients } from '@/db/schema';
import { ensureBootstrapped } from '@/lib/bootstrap-db';
import { ensureDunningControlSchema } from '@/lib/dunning-control-schema';
import { recordEvent } from '@/lib/events';

/** DELETE removes an extra recipient. Only within the caller's own organisation and this customer. */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; rid: string }> }) {
  await ensureBootstrapped();
  await ensureDunningControlSchema();
  const { orgId, userId } = await getAuth();
  if (!orgId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id, rid } = await params;
  const gone = await db.delete(customerRecipients)
    .where(and(eq(customerRecipients.id, rid), eq(customerRecipients.customerId, id), eq(customerRecipients.orgId, orgId)))
    .returning({ id: customerRecipients.id });
  if (gone.length === 0) return NextResponse.json({ error: 'not found' }, { status: 404 });
  await recordEvent({ orgId, type: 'recipient.removed', actorId: userId ?? undefined, payload: { customerId: id } });
  return NextResponse.json({ ok: true });
}
