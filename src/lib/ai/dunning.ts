import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import { z } from 'zod';

let _genai: GoogleGenerativeAI | null = null;
let _model: GenerativeModel | null = null;

function getKey(): string {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error(
      'GEMINI_API_KEY is not set. Dunning message generation requires Google Gemini. Add it to .env.local and restart.',
    );
  }
  return key;
}

function getModel(): GenerativeModel {
  if (!_genai) {
    _genai = new GoogleGenerativeAI(getKey());
  }
  if (!_model) {
    _model = _genai.getGenerativeModel({
      model: 'gemini-flash-lite-latest',
      generationConfig: {
        temperature: 0.6,
        responseMimeType: 'application/json',
      },
    });
  }
  return _model;
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

async function callGeminiJSON<T>(systemPrompt: string, userPrompt: string): Promise<T> {
  const result = await getModel().generateContent({
    contents: [
      { role: 'user', parts: [{ text: systemPrompt + '\n\n' + userPrompt }] },
    ],
  });
  const text = result.response.text();
  return JSON.parse(text) as T;
}

// Pre-format currency once, in code, so the model never gets to choose
// ordering or symbols. P2.3 audit fix 2026-07-31.
function formatAmount(amount: string | number, currency: string): string {
  const num = typeof amount === 'string' ? Number(amount) : amount;
  if (!Number.isFinite(num)) return `${currency} ${amount}`;
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency, currencyDisplay: 'code' }).format(num);
  } catch {
    return `${currency} ${num}`;
  }
}

// Tone escalation guard. `final` requires priorMessages > 0, otherwise
// the AI would send a collections-threatening message on the first
// contact. P2.4 audit fix 2026-07-31.
function validateToneSequence(tone: DunningTone, priorMessages: number): void {
  if (tone === 'final' && priorMessages === 0) {
    throw new Error(
      `Refusing to generate dunning message: tone='final' requires at least one prior touch (priorMessages=${priorMessages}).`,
    );
  }
}

// Zod schemas for each Gemini response shape. Validation runs before
// downstream use so a malformed LLM response can't silently fall through.
// P2.1 audit fix 2026-07-31.
const emailMsgSchema = z.object({
  subject: z.string().min(1).max(120),
  body: z.string().min(1).max(2000),
});
const smsMsgSchema = z.object({
  body: z.string().min(1).max(400),
});
const paymentLikelihoodSchema = z.object({
  score: z.number().min(0).max(100),
  reasoning: z.string().min(1).max(500),
});
const cashFlowForecastSchema = z.object({
  week1: z.number().nonnegative(),
  week2: z.number().nonnegative(),
  week3: z.number().nonnegative(),
  week4: z.number().nonnegative(),
  confidence: z.enum(['low', 'medium', 'high']),
  narrative: z.string().min(1).max(1000),
});

async function callGeminiValidated<T>(systemPrompt: string, userPrompt: string, schema: z.ZodType<T>): Promise<T> {
  const result = await getModel().generateContent({
    contents: [
      { role: 'user', parts: [{ text: systemPrompt + '\n\n' + userPrompt }] },
    ],
  });
  const text = result.response.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (e) {
    throw new Error(`LLM returned non-JSON: ${text.slice(0, 200)}`);
  }
  return schema.parse(parsed);
}

export async function generateDunningMessage(ctx: DunningContext): Promise<{ subject?: string; body: string }> {
  validateToneSequence(ctx.tone, ctx.priorMessages);
  const toneGuide = TONE_GUIDANCE[ctx.tone];
  const maxBody = MAX_BODY[ctx.channel];
  const formattedAmount = formatAmount(ctx.amount, ctx.currency);

  const systemPrompt = `You are the collections copywriter for ${ctx.businessName}. Write a ${ctx.tone} ${ctx.channel === 'email' ? 'email' : 'SMS'} reminder about an unpaid invoice. Tone: ${toneGuide}
Output rules:
- ${ctx.channel === 'email' ? 'Email: subject line (max 60 chars), then body. Body max 600 chars.' : 'SMS only: max 320 characters. No subject.'}
- Never invent details not given in the context. Use only the invoice number, amount, currency, due date, and contact name provided.
- Reference payment history only if it's relevant to the tone (e.g. "We usually get this settled within a few days — wanted to make sure this didn't slip through.")
- No exclamation points. No emoji. No all-caps. No pleading.
- Include a clear next step and a payment link if natural ("Click here to pay" or "Reply with any questions").
- Currency formatting: the amount is pre-formatted for you as "${formattedAmount}". Use it verbatim.
- Sound like a thoughtful operations person, not a debt collector.
- Output as ${ctx.channel === 'email' ? 'JSON: {"subject": "...", "body": "..."}' : 'JSON: {"body": "..."}'}`;

  const userPrompt = `Context:
- Business: ${ctx.businessName}
- Contact: ${ctx.contactName ?? 'Customer'}
- Invoice #${ctx.invoiceNumber}
- Amount: ${formattedAmount}
- Due date: ${ctx.dueDate}
- Days overdue: ${ctx.daysOverdue}
- Prior messages sent: ${ctx.priorMessages}
- Customer history: avg ${ctx.customerPaymentHistory.avgDaysToPay} days to pay, ${Math.round(ctx.customerPaymentHistory.paidRate * 100)}% paid rate
- Channel: ${ctx.channel}
- Tone: ${ctx.tone}
${ctx.brandVoice ? `- Brand voice: ${ctx.brandVoice}` : ''}

Write the message.`;

  try {
    if (ctx.channel === 'email') {
      const parsed = await callGeminiValidated(systemPrompt, userPrompt, emailMsgSchema);
      return { subject: parsed.subject, body: parsed.body };
    } else {
      const parsed = await callGeminiValidated(systemPrompt, userPrompt, smsMsgSchema);
      return { body: parsed.body };
    }
  } catch (e) {
    // Gemini unavailable / invalid key / schema mismatch — fall back to a deterministic template.
    console.error('[dunning] Gemini call failed, using fallback:', e instanceof Error ? e.message : e);
    return fallbackDunningMessage(ctx);
  }
}

export function fallbackDunningMessage(ctx: DunningContext): { subject?: string; body: string } {
  const link = `https://getcollectly.app/pay/${ctx.invoiceNumber}`;
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
  try {
    const systemPrompt = 'You predict the probability that a small business will pay an overdue invoice within the next 7 days.';
    const userPrompt = `Input: ${JSON.stringify(ctx)}\n\nOutput JSON: {"score": number 0-100, "reasoning": "one short sentence"}`;
    return await callGeminiValidated(systemPrompt, userPrompt, paymentLikelihoodSchema);
  } catch (e) {
    console.error('[dunning] predictPaymentLikelihood Gemini call failed:', e instanceof Error ? e.message : e);
    return { score: 50, reasoning: 'Unable to predict' };
  }
}

export async function generateCashFlowForecast(ctx: {
  openInvoices: Array<{ amount: number; dueDate: string; daysOverdue: number; customerPaidRate: number; customerAvgDays: number }>;
  monthlyBurn: number;
  currentCash: number;
}): Promise<{ week1: number; week2: number; week3: number; week4: number; confidence: 'low' | 'medium' | 'high'; narrative: string }> {
  try {
    const systemPrompt = 'You forecast weekly incoming cash for a small business over the next 4 weeks based on open invoices. Adjust for late payment probability (older invoices more likely to pay but lower amounts recoverable).';
    const userPrompt = `Input: ${JSON.stringify(ctx)}\n\nOutput JSON: {"week1": number, "week2": number, "week3": number, "week4": number, "confidence": "low"|"medium"|"high", "narrative": "one sentence"}`;
    return await callGeminiValidated(systemPrompt, userPrompt, cashFlowForecastSchema);
  } catch (e) {
    console.error('[dunning] generateCashFlowForecast Gemini call failed:', e instanceof Error ? e.message : e);
    return { week1: 0, week2: 0, week3: 0, week4: 0, confidence: 'low', narrative: 'Insufficient data' };
  }
}
