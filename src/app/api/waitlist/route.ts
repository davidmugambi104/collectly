import { NextRequest, NextResponse } from 'next/server';
import { db } from "@/db";
import { waitlist, events } from '@/db/schema';
import { nanoid } from '@/lib/utils';
import { z } from 'zod';
import { ensureBootstrapped } from '@/lib/bootstrap-db';

const schema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
  company: z.string().optional(),
  country: z.string().length(2).optional(),
  teamSize: z.string().optional(),
  painPoint: z.string().optional(),
  source: z.string().optional(),
  referrer: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    await ensureBootstrapped();
    const body = await req.json();
    const data = schema.parse(body);
    const [row] = await db.insert(waitlist).values({ id: nanoid(), ...data }).onConflictDoNothing({ target: waitlist.email }).returning();
    return NextResponse.json({ ok: true, created: !!row });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Bad request' }, { status: 400 });
  }
}

export async function GET() {
  await ensureBootstrapped();
  const rows = await db.select().from(waitlist).limit(10);
  return NextResponse.json({ count: rows.length, sample: rows.map((r: typeof rows[number]) => r.email) });
}
