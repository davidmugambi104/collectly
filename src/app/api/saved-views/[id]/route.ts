import { NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { getAuth } from '@/lib/auth-helper';
import { db } from '@/db';
import { savedViews } from '@/db/schema';
import { ensureBootstrapped } from '@/lib/bootstrap-db';
import { ensureDunningControlSchema } from '@/lib/dunning-control-schema';

/** DELETE removes a saved view. Scoped to the caller's organisation, so an id from another one finds nothing. */
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  await ensureBootstrapped();
  await ensureDunningControlSchema();
  const { orgId } = await getAuth();
  if (!orgId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await ctx.params;
  const gone = await db.delete(savedViews).where(and(eq(savedViews.id, id), eq(savedViews.orgId, orgId))).returning({ id: savedViews.id });
  if (gone.length === 0) return NextResponse.json({ error: 'That view was already removed.' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
