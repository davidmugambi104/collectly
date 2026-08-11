import { rateLimit, getIp } from '@/lib/rate-limit';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import * as schema from '@/db/schema';
import { nanoid } from '@/lib/utils';
import { z } from 'zod';
import { ensureBootstrapped } from '@/lib/bootstrap-db';

const body = z.object({
  email: z.string().email(),
  name: z.string().optional(),
  company: z.string().optional(),
  currentTool: z.string().min(1),
  hoursPerWeek: z.string().min(1),
  frustration: z.string().min(1),
  wouldSwitch: z.enum(['yes', 'no', 'maybe']),
});

function notify(data: {
  email: string;
  name?: string;
  company?: string;
  meta: Record<string, string | undefined>;
}) {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? `http://localhost:${process.env.PORT ?? 3030}`;
  fetch(`${base}/api/lead-notify`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ type: 'async_qualify', ...data }),
  }).catch(() => {});
}

export async function POST(req: NextRequest) {
  const rl = await rateLimit(getIp(req), { max: 10, key: 'qualify' });
  if (!rl.allowed) return NextResponse.json({ error: 'Too many requests. Try again in a minute.' }, { status: 429, headers: { 'retry-after': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } });

  try {
    await ensureBootstrapped();
    const data = body.parse(await req.json());
    const [row] = await db.insert(schema.waitlist).values({
      id: nanoid(),
      email: data.email,
      name: data.name || '',
      company: data.company || '',
      country: '',
      teamSize: '',
      painPoint: `[ASYNC-QUALIFY] Currently using: ${data.currentTool}. Hours/week chasing payments: ${data.hoursPerWeek}. Would switch: ${data.wouldSwitch}.\n\n${data.frustration}`,
      source: 'async-qualify-form',
    }).onConflictDoNothing({ target: schema.waitlist.email }).returning();
    notify({
      email: data.email,
      name: data.name,
      company: data.company,
      meta: {
        currentTool: data.currentTool,
        hoursPerWeek: data.hoursPerWeek,
        wouldSwitch: data.wouldSwitch,
        frustration: data.frustration?.slice(0, 200),
      },
    });
    return NextResponse.json({ ok: true, id: row?.id });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Bad request' }, { status: 400 });
  }
}
