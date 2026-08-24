import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@/lib/auth-helper';
import { db } from '@/db';
import { customers } from '@/db/schema';
import { nanoid } from '@/lib/utils';
import { z } from 'zod';
import { ensureBootstrapped } from '@/lib/bootstrap-db';

const body = z.object({
  name: z.string().min(1),
  company: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  preferredChannel: z.enum(['email', 'sms']).default('email'),
});

export async function POST(req: NextRequest) {
  await ensureBootstrapped();
  const { orgId } = await getAuth();
  if (!orgId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const raw = await req.json();
  const data = body.parse({ ...raw, email: raw.email || undefined });
  const [row] = await db.insert(customers).values({
    id: nanoid(), orgId, name: data.name, company: data.company, email: data.email, phone: data.phone,
    preferredChannel: data.preferredChannel,
  }).returning();
  return NextResponse.json({ ok: true, id: row.id });
}
