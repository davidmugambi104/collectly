import { NextRequest, NextResponse } from 'next/server';
import { requireAdminEmail } from '@/lib/auth-helper';
import { db } from '@/db';
import { waitlist } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { ensureBootstrapped } from '@/lib/bootstrap-db';
import { z } from 'zod';

const schema = z.object({
  tag: z.enum(['icp', 'maybe', 'no']),
  notes: z.string().max(2000).optional(),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await ensureBootstrapped();
  // SECURITY: waitlist/interview rows aren't org-scoped — they belong to the
  // whole business, not any one customer's org. Gate with the same admin
  // allowlist as the export route / /admin/upgrade-requests instead of just
  // "is a signed-in member of some org".
  const admin = await requireAdminEmail();
  if (!admin.ok) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const data = schema.parse(await req.json());

  // Tag is encoded into the source field: 'interview-form' → 'interview-form:icp'
  // The interview route also keeps the original 'interview-form' as a sub-source
  const [existing] = await db.select().from(waitlist).where(eq(waitlist.id, id)).limit(1);
  if (!existing) return NextResponse.json({ error: 'not found' }, { status: 404 });
  if (!existing.source?.includes('interview')) return NextResponse.json({ error: 'not an interview record' }, { status: 400 });

  const newSource = `interview-form:${data.tag}`;
  // Preserve any prior notes by appending to the referrer field
  const noteLine = data.notes ? `\n[${new Date().toISOString()}] ${data.notes}` : '';
  const newReferrer = (existing.referrer ?? '') + noteLine;

  await db.update(waitlist)
    .set({ source: newSource, referrer: newReferrer })
    .where(eq(waitlist.id, id));

  return NextResponse.json({ ok: true, source: newSource });
}
