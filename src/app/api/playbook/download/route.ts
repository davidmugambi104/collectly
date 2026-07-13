import { rateLimit, getIp } from '@/lib/rate-limit';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { waitlist } from '@/db/schema';
import { nanoid } from '@/lib/utils';
import { z } from 'zod';
import { generatePlaybookPdf } from '@/lib/playbook-pdf';
import { ensureBootstrapped } from '@/lib/bootstrap-db';

const schema = z.object({
  email: z.string().email(),
  name: z.string().min(1).optional(),
  company: z.string().optional(),
  /** When false, return a redirect to a hosted PDF URL instead of the bytes. */
  inline: z.boolean().default(false),
});

/**
 * POST /api/playbook/download
 * Body: { email, name?, company? }
 * Returns: application/pdf (the "5-Step DSO Reduction Playbook")
 * Side effect: stores email in waitlist with source='playbook-download'
 */
export async function POST(req: NextRequest) {
  const rl = rateLimit(getIp(req), { max: 10 });
  if (!rl.allowed) return NextResponse.json({ error: 'Too many requests. Try again in a minute.' }, { status: 429, headers: { 'retry-after': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } });

  await ensureBootstrapped();
  const data = schema.parse(await req.json());
  const [row] = await db.insert(waitlist).values({
    id: nanoid(),
    email: data.email,
    name: data.name,
    company: data.company,
    source: 'playbook-download',
  }).onConflictDoNothing({ target: waitlist.email }).returning();

  // Fire-and-forget lead notify
  const base = process.env.NEXT_PUBLIC_APP_URL ?? `http://localhost:${process.env.PORT ?? 3030}`;
  fetch(`${base}/api/lead-notify`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ type: 'waitlist', email: data.email, name: data.name, company: data.company, meta: { source: 'playbook-download' } }),
  }).catch(() => {});

  const pdf = generatePlaybookPdf();
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      'content-type': 'application/pdf',
      'content-disposition': `attachment; filename="collectly-dso-playbook.pdf"`,
      'content-length': String(pdf.length),
      'x-lead-accepted': row ? '1' : '0',
    },
  });
}

/** GET endpoint for direct download (e.g. /playbook link in a footer). */
export async function GET(req: NextRequest) {
  const sp = new URL(req.url).searchParams;
  const email = sp.get('email');
  if (email) {
    // If they passed an email via query string, capture it.
    try {
      await ensureBootstrapped();
      await db.insert(waitlist).values({
        id: nanoid(),
        email,
        source: 'playbook-link',
      }).onConflictDoNothing({ target: waitlist.email });
    } catch {}
  }
  const pdf = generatePlaybookPdf();
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      'content-type': 'application/pdf',
      'content-disposition': `attachment; filename="collectly-dso-playbook.pdf"`,
      'content-length': String(pdf.length),
    },
  });
}
