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
  /** nanoid PK - used to build the payment portal link. Required. */
  invoiceId: string;
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
  friendly: 'Warm and plain. Assume the invoice slipped through, which is the most common reason. A quick nudge, no pressure, easy to act on. No mention of fees or consequences. Keep it brief and human.',
  firm: 'Direct, courteous and factual. State the invoice number, amount, due date and how many days it is past due, and ask for payment or a date. Offer help if something is wrong. Do not threaten and do not describe consequences. One short paragraph.',
  final: 'The last step in this sequence, so say plainly that earlier reminders have been sent and that you would like to sort it out directly. Matter-of-fact and respectful, never sharp. Ask for payment, or for a date they can pay, or to hear about any problem. Do not mention collections, legal action, fees, credit reporting or service suspension, and do not say what happens next.',
};



// Same portal link builder used everywhere else in the codebase (see
// infra.ts, quickbooks.ts) -- keeps NEXT_PUBLIC_APP_URL as the single
// source of truth instead of hardcoding the domain here too.
function buildPaymentLink(invoiceId: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'https://mugavi.com';
  return `${base}/pay/${invoiceId}`;
}

/**
 * Opens the "I will pay on a set day" form on the payment page. The page reads
 * `?promise=1` and the #promise-to-pay anchor (src/app/pay/[id]/page.tsx).
 */
export function buildPromiseLink(invoiceId: string): string {
  return `${buildPaymentLink(invoiceId)}?promise=1#promise-to-pay`;
}

export const PROMISE_LINE_LABEL = 'Cannot pay by this date? Tell us when you can:';

/** One plain line, email only, for reminders about an invoice that is already due. */
function promiseLine(invoiceId: string): string {
  return `${PROMISE_LINE_LABEL} ${buildPromiseLink(invoiceId)}`;
}

function clip(text: string, max: number): string {
  return text.length <= max ? text : text.slice(0, max).trimEnd();
}

/**
 * Models sometimes drop a required fact or reword the date. Rather than send a
 * message a person cannot act on, add one plain details line with the missing
 * pieces, written by us from the invoice record.
 */
function ensureRequiredFacts(body: string, label: string, formattedAmount: string, dueDate: string, channel: 'email' | 'sms'): string {
  const hasAmount = body.replace(/\u00a0/g, ' ').includes(formattedAmount.replace(/\u00a0/g, ' '));
  const missing: string[] = [];
  if (!body.includes(label)) missing.push(`invoice ${label}`);
  if (!hasAmount) missing.push(formattedAmount);
  if (!body.includes(dueDate)) missing.push(`due ${dueDate}`);
  if (missing.length === 0) return body;
  const line = `Details: ${missing.join(', ')}.`;
  return channel === 'sms' ? `${body} ${line}` : `${body}\n\n${line}`;
}

// Real invoices synced from Xero/QuickBooks can have an empty-string
// invoice number (upstream data quality issue, partially fixed at the sync
// layer but old rows may still have it). Falling back to a short id
// fragment beats handing the model (and the customer) a message that says
// "Invoice #" with nothing after it.
function resolveInvoiceLabel(ctx: DunningContext): string {
  return ctx.invoiceNumber?.trim() || ctx.invoiceId.slice(0, 8).toUpperCase();
}

// The reported failure mode: Gemini was told "include a payment link if
// natural" with no actual link in its context, so it invented placeholder
// syntax like "[payment_link]" and shipped that verbatim to a customer.
// This is a pure string fix, not another model call -- deliberately kept
// that way so fixing correctness doesn't cost extra tokens.
function ensurePaymentLink(body: string, paymentLink: string, channel: 'email' | 'sms'): string {
  // Only genuine placeholders are swapped: [payment link], {payment_link},
  // {{payment_link}} or a bare payment_link. The plain words "payment link" in a
  // sentence are left alone, otherwise "use our secure payment link https://..."
  // became "use our secure<url> <url>".
  const placeholder = /\[\s*payment[_ ]?link\s*\]|\{\{?\s*payment[_ ]?link\s*\}\}?|\bpayment_link\b/gi;
  const cleaned = body.includes(paymentLink)
    ? body.replace(placeholder, '').replace(/[ \t]+([.,;:!?])/g, '$1').replace(/[ \t]{2,}/g, ' ')
    : body.replace(placeholder, paymentLink);
  if (cleaned.includes(paymentLink)) return cleaned;
  const withLink = `${cleaned}${channel === 'email' ? '\n\n' : ' '}Pay here: ${paymentLink}`;
  return channel === 'sms' ? withLink.slice(0, 320) : withLink;
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
  } catch  {
    throw new Error(`LLM returned non-JSON: ${text.slice(0, 200)}`);
  }
  return schema.parse(parsed);
}

export async function generateDunningMessage(ctx: DunningContext): Promise<{ subject?: string; body: string }> {
  validateToneSequence(ctx.tone, ctx.priorMessages);
  const toneGuide = TONE_GUIDANCE[ctx.tone];
  const formattedAmount = formatAmount(ctx.amount, ctx.currency);
  const paymentLink = buildPaymentLink(ctx.invoiceId);
  const invoiceLabel = resolveInvoiceLabel(ctx);

  // A negative daysOverdue is a heads-up before the due date. It must never say "overdue".
  const preDue = ctx.daysOverdue < 0;
  const systemPrompt = `You write payment reminders on behalf of ${ctx.businessName}. Write a ${ctx.tone} ${ctx.channel === 'email' ? 'email' : 'SMS'} ${preDue ? 'heads-up that an invoice will be due soon. It is NOT overdue: never say or imply it is late' : 'reminder about an unpaid invoice'}. Tone: ${toneGuide}
Most late payment is forgetfulness, a slow internal process or tight cash, not bad faith. Assume good intent, be specific, make it easy to act today, and never shame the reader.
Output rules:
- ${ctx.channel === 'email' ? 'Email: subject line (max 60 chars), then body. Body max 600 chars.' : 'SMS only: max 320 characters. No subject.'}
- Always state all four facts: the invoice number "${invoiceLabel}", the amount, the due date exactly as given, and the one payment link. Never invent details not given in the context.
- Reference payment history only if it is relevant and kind (e.g. "We usually get this settled within a few days, so I wanted to make sure it did not slip through."). Never quote a paid rate or imply a bad record.
- No exclamation points. No emoji. No all-caps. No pleading. No em dashes or en dashes.
- Never threaten or hint at a consequence. Do not mention suspending services or accounts, legal action, collections, credit reporting, fees, penalties or interest. Do not create urgency that the context does not state.
- Use the exact payment link given below, once, verbatim. Never write a placeholder like "[payment link]" or invent your own URL.${ctx.channel === 'email' && !preDue ? '\n- Do not write a line about paying later or a promise date. One is added after your text.' : ''}
- Invite a reply if something about the invoice is not right.
- Currency formatting: the amount is pre-formatted for you as "${formattedAmount}". Use it verbatim.
- Sound like a thoughtful person at the business, not a debt collector.
- Output as ${ctx.channel === 'email' ? 'JSON: {"subject": "...", "body": "..."}' : 'JSON: {"body": "..."}'}`;

  const userPrompt = `Context:
- Business: ${ctx.businessName}
- Contact: ${ctx.contactName ?? 'Customer'}
- Invoice #${invoiceLabel}
- Amount: ${formattedAmount}
- Due date: ${ctx.dueDate}
- ${preDue ? `Days until due: ${-ctx.daysOverdue} (not yet overdue)` : `Days overdue: ${ctx.daysOverdue}`}
- Prior messages sent: ${ctx.priorMessages}
- Customer history: avg ${ctx.customerPaymentHistory.avgDaysToPay} days to pay, ${Math.round(ctx.customerPaymentHistory.paidRate * 100)}% paid rate
- Channel: ${ctx.channel}
- Tone: ${ctx.tone}
- Payment link: ${paymentLink}
${ctx.brandVoice ? `- Brand voice: ${ctx.brandVoice}` : ''}

Write the message.`;

  try {
    if (ctx.channel === 'email') {
      const parsed = await callGeminiValidated(systemPrompt, userPrompt, emailMsgSchema);
      let body = ensurePaymentLink(parsed.body, paymentLink, 'email');
      body = ensureRequiredFacts(body, invoiceLabel, formattedAmount, ctx.dueDate, 'email');
      if (!preDue && !body.includes(buildPromiseLink(ctx.invoiceId))) body = `${body}\n\n${promiseLine(ctx.invoiceId)}`;
      return { subject: parsed.subject, body };
    } else {
      const parsed = await callGeminiValidated(systemPrompt, userPrompt, smsMsgSchema);
      const body = ensurePaymentLink(ensureRequiredFacts(parsed.body, invoiceLabel, formattedAmount, ctx.dueDate, 'sms'), paymentLink, 'sms');
      // Too long to carry every fact and the link in one text: use the short template instead.
      if (body.length > 320 || !body.includes(paymentLink)) return fallbackDunningMessage(ctx);
      return { body };
    }
  } catch (e) {
    // Gemini unavailable / invalid key / schema mismatch: fall back to a deterministic template.
    console.error('[dunning] Gemini call failed, using fallback:', e instanceof Error ? e.message : e);
    return fallbackDunningMessage(ctx);
  }
}

export function fallbackDunningMessage(ctx: DunningContext): { subject?: string; body: string } {
  // The payment portal resolves by invoice.id (nanoid PK), NOT invoice.number
  // (a human-readable display string). Building the URL from invoiceNumber
  // was a bug: it shipped broken links to every paying customer. See
  // src/app/pay/[id]/page.tsx, which does `eq(invoices.id, id)`.
  const link = buildPaymentLink(ctx.invoiceId);
  const num = resolveInvoiceLabel(ctx);
  const amount = formatAmount(ctx.amount, ctx.currency);
  const who = ctx.contactName ?? 'there';
  const payBlock = `Pay here: ${link}`;
  // Email reminders about an invoice already due carry one plain line to the
  // promise form on the payment page. Heads-ups and texts do not.
  const promiseBlock = promiseLine(ctx.invoiceId);

  // SMS must keep every fact and the link inside 320 characters, so the free
  // text parts are clipped, never the link.
  if (ctx.channel === 'sms') {
    const name = ctx.contactName ? clip(ctx.contactName, 30) : 'Hi';
    const biz = clip(ctx.businessName, 40);
    const status = ctx.daysOverdue < 0
      ? `is due in ${-ctx.daysOverdue} day${ctx.daysOverdue === -1 ? '' : 's'} (${ctx.dueDate})`
      : `was due on ${ctx.dueDate} and is ${ctx.daysOverdue}d overdue`;
    return { body: `${name}, invoice ${clip(num, 40)} for ${amount} ${status}. Pay here: ${link} ${biz}`.slice(0, 320) };
  }

  if (ctx.daysOverdue < 0) {
    const inDays = -ctx.daysOverdue;
    const when = `${inDays} day${inDays === 1 ? '' : 's'}`;
    return {
      subject: `Invoice ${num} is due in ${when}`,
      body: `Hi ${who},\n\nA friendly heads-up that invoice ${num} for ${amount} is due on ${ctx.dueDate}, in ${when}. If it is already on its way, thank you.\n\n${payBlock}\n\n${ctx.businessName}`,
    };
  }

  const overdue = `${ctx.daysOverdue} day${ctx.daysOverdue === 1 ? '' : 's'}`;
  if (ctx.tone === 'friendly') {
    return {
      subject: `Quick reminder about invoice ${num}`,
      body: `Hi ${who},\n\nA quick nudge: invoice ${num} for ${amount} was due on ${ctx.dueDate}. These things slip through, so if it is already on its way, thank you.\n\n${payBlock}\n\n${promiseBlock}\n\nThanks,\n${ctx.businessName}`,
    };
  }
  if (ctx.tone === 'firm') {
    return {
      subject: `Invoice ${num} is ${overdue} past due`,
      body: `Hi ${who},\n\nInvoice ${num} for ${amount} was due on ${ctx.dueDate} and is now ${overdue} past due. Could you arrange payment soon? If something is not right with the invoice, reply and tell us, and we will look into it.\n\n${payBlock}\n\n${promiseBlock}\n\nThanks,\n${ctx.businessName}`,
    };
  }
  return {
    subject: `Following up on invoice ${num}`,
    body: `Hi ${who},\n\nWe have sent a few reminders about invoice ${num} for ${amount}, which was due on ${ctx.dueDate} and is now ${overdue} past due. We would like to sort it out with you directly. If you can pay now, the link is below. If something is not right with the invoice, reply and tell us.\n\n${payBlock}\n\n${promiseBlock}\n\nThanks,\n${ctx.businessName}`,
  };
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
