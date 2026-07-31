import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { fallbackDunningMessage } from '@/lib/ai/dunning';

const schema = z.object({
  amount: z.string().default('12500'),
  daysOverdue: z.number().int().min(0).default(35),
  tone: z.enum(['friendly', 'firm', 'final']).default('firm'),
  channel: z.enum(['email', 'sms']).default('email'),
});

/**
 * Public AI dunning demo — no auth, no DB, no signup. Returns a sample
 * message based on the inputs using our deterministic fallback template.
 *
 * NOTE: this route is wired to the same fallback function the dunning
 * scheduler uses when Gemini is unavailable. When a real Gemini key is
 * configured, this route still returns the deterministic output (it's
 * a demo, not the production generator) — but the form, tone handling,
 * and email/SMS framing are identical to what the in-app composer
 * shows, so a visitor's experience matches what they'll actually send
 * once they sign up. The pay link is intentionally a placeholder; it's
 * not clickable in the demo output (rendered as code, not a hyperlink).
 */
export async function POST(req: NextRequest) {
  try {
    const data = schema.parse(await req.json());
    const result = fallbackDunningMessage({
      // Sentinel: the demo output is rendered as code, never as a clickable
      // hyperlink. Using a stable placeholder keeps the link readable in
      // the demo output while making it obvious it isn't a real URL.
      invoiceId: 'demo-invoice-id',
      businessName: 'Acme Studios',
      contactName: 'Sarah from billing',
      invoiceNumber: 'INV-1234',
      amount: data.amount,
      currency: 'USD',
      dueDate: new Date(Date.now() - data.daysOverdue * 86400000).toISOString().slice(0, 10),
      daysOverdue: data.daysOverdue,
      tone: data.tone,
      channel: data.channel,
      priorMessages: 0,
      customerPaymentHistory: { avgDaysToPay: 30, paidRate: 0.85 },
    });
    // Rewrite the link to make it obviously a demo URL (don't use the
    // real prod domain so a curious visitor doesn't bookmark it).
    result.body = result.body.replace(
      /https:\/\/getcollectly\.app\/pay\/demo-invoice-id/g,
      'https://getcollectly.app/pay/[your-invoice-id]'
    );
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 400 });
  }
}
