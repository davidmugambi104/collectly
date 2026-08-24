import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@/lib/auth-helper';
import { db } from "@/db";
import { dunningSequences } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { ensureBootstrapped } from '@/lib/bootstrap-db';

const schema = z.object({
  steps: z.array(z.object({
    id: z.string(),
    daysFromDue: z.number().int().min(0),
    channel: z.enum(['email', 'sms']),
    tone: z.enum(['friendly', 'firm', 'final']),
    subject: z.string().optional(),
    template: z.string().min(1),
  })),
});

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await ensureBootstrapped();
  const { orgId } = await getAuth();
  if (!orgId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const data = schema.parse(await req.json());
  const [seq] = await db.select().from(dunningSequences).where(and(eq(dunningSequences.id, id), eq(dunningSequences.orgId, orgId))).limit(1);
  if (!seq) return NextResponse.json({ error: 'not found' }, { status: 404 });
  await db.update(dunningSequences).set({ steps: data.steps, updatedAt: new Date() }).where(eq(dunningSequences.id, id));
  return NextResponse.json({ ok: true });
}
