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
 * (When a real Gemini key is set, this will use Gemini Flash Lite.)
 */
export async function POST(req: NextRequest) {
  try {
    const data = schema.parse(await req.json());
    const result = fallbackDunningMessage({
      businessName: 'Lumen & Co',
      contactName: 'Acme Studios',
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
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 400 });
  }
}
