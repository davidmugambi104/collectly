import { rateLimit, getIp } from '@/lib/rate-limit';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { generatePlaybookPdf } from '@/lib/playbook-pdf';
import { ensureBootstrapped } from '@/lib/bootstrap-db';
import { parseJsonBody } from '@/lib/parse-body';
import { captureLead } from '@/lib/lead-capture';
import { isHoneypotHit, leadOutcome, LEAD_FAILED_MESSAGE } from '@/lib/lead-guard';

const schema = z.object({
  email: z.string().email().max(254),
  name: z.string().min(1).max(200).optional(),
  company: z.string().max(200).optional(),
  /** When false, return a redirect to a hosted PDF URL instead of the bytes. */
  inline: z.boolean().default(false),
  website: z.string().optional(), // honeypot
});

function pdfResponse(extra: Record<string, string> = {}) {
  const pdf = generatePlaybookPdf();
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      'content-type': 'application/pdf',
      'content-disposition': `attachment; filename="collectly-dso-playbook.pdf"`,
      'content-length': String(pdf.length),
      ...extra,
    },
  });
}

/**
 * POST /api/playbook/download
 * Body: { email, name?, company? }
 * Returns: application/pdf (the "5-Step DSO Reduction Playbook")
 * Side effects: stores the email in waitlist with source='playbook-download'
 * and emails the founder. If neither could be done the PDF is withheld and a
 * 503 is returned, so a lead is never given the file without being recorded.
 */
export async function POST(req: NextRequest) {
  const rl = await rateLimit(getIp(req), { max: 10, key: 'playbook-download' });
  if (!rl.allowed) return NextResponse.json({ error: 'Too many requests. Try again in a minute.' }, { status: 429, headers: { 'retry-after': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } });

  await ensureBootstrapped();
  const _parsed = await parseJsonBody(req, schema);
  if (!_parsed.ok) return _parsed.response;
  const data = _parsed.data;
  // A bot gets the file but is not stored and does not email the founder.
  if (isHoneypotHit(data)) return pdfResponse({ 'x-lead-accepted': '0' });

  // Was an unawaited fetch() to our own /api/lead-notify, which a serverless
  // function often froze before it was sent, with every failure swallowed.
  const r = await captureLead(
    { email: data.email, name: data.name, company: data.company, source: 'playbook-download' },
    { type: 'waitlist', email: data.email, name: data.name, company: data.company, meta: { source: 'playbook-download' } },
  );
  const { status } = leadOutcome(r);
  if (status !== 200) return NextResponse.json({ error: LEAD_FAILED_MESSAGE }, { status });
  return pdfResponse({ 'x-lead-accepted': r.created ? '1' : '0' });
}

/**
 * GET: plain download, nothing captured. It used to accept ?email= and insert
 * it into the waitlist unverified, which let anyone subscribe someone else's
 * address with a link. Nothing on the site links to it with an email.
 */
export async function GET(req: NextRequest) {
  const rl = await rateLimit(getIp(req), { max: 10, key: 'playbook-download' });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Try again in a minute.' },
      { status: 429, headers: { 'retry-after': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } },
    );
  }
  return pdfResponse();
}
