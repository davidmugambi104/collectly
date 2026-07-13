import OpenAI from 'openai';

let _openai: OpenAI | null = null;
export function getOpenAI() {
  if (!_openai) {
    _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY ?? 'sk-placeholder' });
  }
  return _openai;
}

export type DunningTone = 'friendly' | 'firm' | 'final';

export interface DunningContext {
  businessName: string;
  contactName: string | null;
  invoiceNumber: string;
  amount: string;
  currency: string;
  dueDate: string;
  daysOverdue: number;
  tone: DunningTone;
  channel: 'email' | 'sms';
  priorMessages: number;
  customerPaymentHistory: {
    avgDaysToPay: number;
    paidRate: number;
  };
  brandVoice?: string;
}

const TONE_GUIDANCE: Record<DunningTone, string> = {
  friendly: 'Polite, warm, assumes good intent. The reminder framing. Use "just a quick nudge" or "wanted to make sure this reached you." No mention of late fees or consequences. Keep it brief and human.',
  firm: 'Direct, professional, factual. State the amount, the date, and the next step clearly. Do not threaten, but make the consequences clear. Avoid hedging language. One short paragraph.',
  final: 'Last notice before escalation. Clear, professional, and matter-of-fact. State the specific action (collections, legal, service suspension) without being abusive. Include the contact information for resolution. Leave the door open for immediate resolution.',
};

const MAX_BODY = { email: 600, sms: 320 };

export async function generateDunningMessage(ctx: DunningContext): Promise<{ subject?: string; body: string }> {
  const toneGuide = TONE_GUIDANCE[ctx.tone];
  const maxBody = MAX_BODY[ctx.channel];

  const systemPrompt = `You are the collections copywriter for ${ctx.businessName}. Write a ${ctx.tone} ${ctx.channel === 'email' ? 'email' : 'SMS'} reminder about an unpaid invoice. Tone: ${toneGuide}
Output rules:
- ${ctx.channel === 'email' ? 'Email: subject line (max 60 chars), then body. Body max 600 chars.' : 'SMS only: max 320 characters. No subject.'}
- Never invent details not given in the context. Use only the invoice number, amount, currency, due date, and contact name provided.
- Reference payment history only if it's relevant to the tone (e.g. "We usually get this settled within a few days — wanted to make sure this didn't slip through.")
- No exclamation points. No emoji. No all-caps. No pleading.
- Include a clear next step and a payment link if natural ("Click here to pay" or "Reply with any questions").
- Currency formatting: include the symbol and proper amount.
- Sound like a thoughtful operations person, not a debt collector.`;

  const userPrompt = `Context:
- Business: ${ctx.businessName}
- Contact: ${ctx.contactName ?? 'Customer'}
- Invoice #${ctx.invoiceNumber}
- Amount: ${ctx.amount} ${ctx.currency}
- Due date: ${ctx.dueDate}
- Days overdue: ${ctx.daysOverdue}
- Prior messages sent: ${ctx.priorMessages}
- Customer history: avg ${ctx.customerPaymentHistory.avgDaysToPay} days to pay, ${Math.round(ctx.customerPaymentHistory.paidRate * 100)}% paid rate
- Channel: ${ctx.channel}
- Tone: ${ctx.tone}
${ctx.brandVoice ? `- Brand voice: ${ctx.brandVoice}` : ''}

Write the message. Output as ${ctx.channel === 'email' ? 'JSON: {"subject": "...", "body": "..."}' : 'JSON: {"body": "..."}'}`;

  try {
    const completion = await getOpenAI().chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.6,
      max_tokens: 500,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) throw new Error('No dunning content generated');

    try {
      const parsed = JSON.parse(content);
      if (ctx.channel === 'email') {
        return { subject: parsed.subject, body: parsed.body };
      }
      return { body: parsed.body };
    } catch {
      return { body: content.slice(0, maxBody) };
    }
  } catch (e) {
    // OpenAI unavailable / invalid key — fall back to a deterministic template.
    return fallbackDunningMessage(ctx);
  }
}

export function fallbackDunningMessage(ctx: DunningContext): { subject?: string; body: string } {
  const link = `https://collectly.app/pay/${ctx.invoiceNumber}`;
  const linkFragment = ctx.channel === 'email' ? `\n\nPay here: ${link}` : ` ${link}`;
  let body: string;
  if (ctx.tone === 'friendly') {
    body = `Hi ${ctx.contactName ?? 'there'},\n\nJust a quick nudge — invoice ${ctx.invoiceNumber} for ${ctx.currency} ${ctx.amount} was due on ${ctx.dueDate}. No rush, but if you can settle it today, that'd help us out.${linkFragment}\n\nThanks for being a great customer.\n\n${ctx.businessName}`;
  } else if (ctx.tone === 'firm') {
    body = `Hi ${ctx.contactName ?? 'there'},\n\nInvoice ${ctx.invoiceNumber} for ${ctx.currency} ${ctx.amount} is now ${ctx.daysOverdue} day${ctx.daysOverdue === 1 ? '' : 's'} past due (originally due ${ctx.dueDate}).\n\nPlease review and settle at your earliest convenience. If there's an issue with the work, just reply and we'll sort it out.${linkFragment}\n\n${ctx.businessName}`;
  } else {
    body = `Final notice: invoice ${ctx.invoiceNumber} for ${ctx.currency} ${ctx.amount} is ${ctx.daysOverdue} days overdue. After 60 days unpaid, we will need to refer this to collections.${linkFragment}\n\nIf you'd like to discuss payment arrangements, please reply today.\n\n${ctx.businessName}`;
  }
  if (ctx.channel === 'sms') {
    // SMS: shorter, no newlines
    const short = `${ctx.contactName ?? 'Hi'} — invoice ${ctx.invoiceNumber} for ${ctx.currency} ${ctx.amount} is ${ctx.daysOverdue}d overdue.${linkFragment} — ${ctx.businessName}`;
    return { body: short.slice(0, 320) };
  }
  const subject = ctx.tone === 'friendly'
    ? `Quick reminder — invoice ${ctx.invoiceNumber}`
    : ctx.tone === 'firm'
    ? `Invoice ${ctx.invoiceNumber} — ${ctx.daysOverdue} days overdue`
    : `Final notice — invoice ${ctx.invoiceNumber}`;
  return { subject, body };
}

export async function predictPaymentLikelihood(ctx: {
  avgDaysToPay: number;
  paidRate: number;
  daysOverdue: number;
  priorMessages: number;
  invoiceAmount: number;
}): Promise<{ score: number; reasoning: string }> {
  const completion = await getOpenAI().chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: 'You predict the probability that a small business will pay an overdue invoice within the next 7 days. Output JSON: {"score": number 0-100, "reasoning": "one short sentence"}' },
      { role: 'user', content: JSON.stringify(ctx) },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.3,
  });
  const content = completion.choices[0]?.message?.content;
  if (!content) return { score: 50, reasoning: 'Unable to predict' };
  try {
    return JSON.parse(content);
  } catch {
    return { score: 50, reasoning: 'Unable to predict' };
  }
}

export async function generateCashFlowForecast(ctx: {
  openInvoices: Array<{ amount: number; dueDate: string; daysOverdue: number; customerPaidRate: number; customerAvgDays: number }>;
  monthlyBurn: number;
  currentCash: number;
}): Promise<{ week1: number; week2: number; week3: number; week4: number; confidence: 'low' | 'medium' | 'high'; narrative: string }> {
  const completion = await getOpenAI().chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: 'You forecast weekly incoming cash for a small business over the next 4 weeks based on open invoices. Adjust for late payment probability (older invoices more likely to pay but lower amounts recoverable). Output JSON: {"week1": number, "week2": number, "week3": number, "week4": number, "confidence": "low"|"medium"|"high", "narrative": "one sentence"}' },
      { role: 'user', content: JSON.stringify(ctx) },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.2,
  });
  const content = completion.choices[0]?.message?.content;
  if (!content) return { week1: 0, week2: 0, week3: 0, week4: 0, confidence: 'low', narrative: 'Insufficient data' };
  try {
    return JSON.parse(content);
  } catch {
    return { week1: 0, week2: 0, week3: 0, week4: 0, confidence: 'low', narrative: 'Insufficient data' };
  }
}
