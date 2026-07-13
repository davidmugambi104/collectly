import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import * as schema from '@/db/schema';
import { nanoid } from '@/lib/utils';
import { z } from 'zod';
import { ensureBootstrapped } from '@/lib/bootstrap-db';

const body = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  company: z.string().min(1),
  country: z.string().min(2),
  teamSize: z.string(),
  industry: z.string(),
  dso: z.string(),
  outstanding: z.string().optional(),
  tool: z.string().optional(),
  pain: z.string().min(1),
});

function notify(type: 'waitlist' | 'interview', data: Record<string, any>) {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? `http://localhost:${process.env.PORT ?? 3030}`;
  fetch(`${base}/api/lead-notify`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ type, ...data }),
  }).catch(() => {});
}

export async function POST(req: NextRequest) {
  await ensureBootstrapped();
  const data = body.parse(await req.json());
  const [row] = await db.insert(schema.waitlist).values({
    id: nanoid(),
    email: data.email,
    name: data.name,
    company: data.company,
    country: data.country,
    teamSize: data.teamSize,
    painPoint: `[INTERVIEW] Industry: ${data.industry}, DSO: ${data.dso}, A/R: ${data.outstanding ?? '?'}, Tool: ${data.tool ?? '?'}\n\n${data.pain}`,
    source: 'interview-form',
  }).onConflictDoNothing({ target: schema.waitlist.email }).returning();
  notify('interview', {
    email: data.email,
    name: data.name,
    company: data.company,
    meta: {
      industry: data.industry,
      dso: data.dso,
      outstanding: data.outstanding,
      tool: data.tool,
      pain: data.pain?.slice(0, 200),
    },
  });
  return NextResponse.json({ ok: true, id: row?.id });
}
