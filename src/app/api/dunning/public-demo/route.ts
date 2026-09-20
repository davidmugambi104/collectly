import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { fallbackDunningMessage } from '@/lib/ai/dunning';
import { parseJsonBody } from '@/lib/parse-body';

/**
 * Both numeric fields accept a number or a numeric string.
 *
 * The asymmetry here was accidental rather than intended: the demo form's days
 * slider does Number(e.target.value) so daysOverdue arrived as a number, while
 * the amount field is an <input type="number"> whose .value is a string and was
 * never converted. The schema was written to match whatever each happened to
 * send, so this public endpoint rejected {"amount": 5000} -- the obvious thing
 * for any caller who is not that one form.
 *
 * DunningContext.amount is a string and formatAmount() already takes
 * string | number, so the boundary normalises rather than widening the internal
 * type. Non-numeric input is rejected here instead of falling through to
 * formatAmount's "USD abc" escape hatch.
 */
const numericAmount = z
  .union([z.string(), z.number()])
  .refine((v) => Number.isFinite(Number(v)) && String(v).trim() !== '', {
    message: 'must be a number',
  })
  .transform((v) => String(v));

const schema = z.object({
  amount: numericAmount.default('12500'),
  // Capped: the form's slider stops at 120, and an uncapped value lands in
  // `Date.now() - daysOverdue * 86400000`, which for a large enough number
  // produces an invalid date rather than an error.
  daysOverdue: z.coerce.number().int().min(0).max(3650).default(35),
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
    const _parsed = await parseJsonBody(req, schema);
    if (!_parsed.ok) return _parsed.response;
    const data = _parsed.data;
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
      'https://mugavi.com/pay/[your-invoice-id]'
    );
    return NextResponse.json(result);
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 400 });
  }
}
