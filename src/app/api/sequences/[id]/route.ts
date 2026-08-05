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
    // The editor's "Style hint" field is explicitly labeled optional
    // ("Leave blank to let the AI write with no extra guidance") — this
    // must accept an empty string to match that, not just make the key
    // itself optional. Previously required min(1), so leaving the field
    // blank (the UI's own suggested use) threw an uncaught ZodError here
    // on every save.
    template: z.string().max(2000).optional().default(''),
  })),
});

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await ensureBootstrapped();
  const { orgId } = await getAuth();
  if (!orgId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;

  let data: z.infer<typeof schema>;
  try {
    data = schema.parse(await req.json());
  } catch (e: unknown) {
    // A malformed request must come back as a real 400 the client can
    // show, not an unhandled exception that becomes a bare 500 the caller
    // has no way to explain to the user.
    const message = e instanceof z.ZodError ? e.issues.map((i) => i.message).join('; ') : 'Invalid request body';
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const [seq] = await db.select().from(dunningSequences).where(and(eq(dunningSequences.id, id), eq(dunningSequences.orgId, orgId))).limit(1);
  if (!seq) return NextResponse.json({ error: 'not found' }, { status: 404 });
  await db.update(dunningSequences).set({ steps: data.steps as any, updatedAt: new Date() }).where(eq(dunningSequences.id, id));
  return NextResponse.json({ ok: true });
}
