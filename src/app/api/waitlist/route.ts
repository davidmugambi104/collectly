import { rateLimit, getIp } from '@/lib/rate-limit';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { waitlist } from '@/db/schema';
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

function notify(type: 'waitlist' | 'interview', data: Record<string, unknown>) {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? `http://localhost:${process.env.PORT ?? 3030}`;
  fetch(`${base}/api/lead-notify`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ type, ...data }),
  }).catch(() => {});
}

export async function POST(req: NextRequest) {
  const rl = await rateLimit(getIp(req), { max: 10 });
  if (!rl.allowed) return NextResponse.json({ error: 'Too many requests. Try again in a minute.' }, { status: 429, headers: { 'retry-after': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } });

  try {
    await ensureBootstrapped();
    const body = await req.json();
    const data = schema.parse(body);
    const [row] = await db.insert(waitlist).values({ id: nanoid(), ...data }).onConflictDoNothing({ target: waitlist.email }).returning();
    notify('waitlist', { email: data.email, name: data.name, company: data.company, meta: { country: data.country, teamSize: data.teamSize, source: data.source } });
    return NextResponse.json({ ok: true, created: !!row });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Bad request' }, { status: 400 });
  }
}

export async function GET() {
  await ensureBootstrapped();
  const rows = await db.select().from(waitlist).limit(10);
  return NextResponse.json({ count: rows.length, sample: rows.map((r: typeof rows[number]) => r.email) });
}
