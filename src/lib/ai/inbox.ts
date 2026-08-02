import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import { z } from 'zod';

let _genai: GoogleGenerativeAI | null = null;
let _model: GenerativeModel | null = null;

function getKey(): string {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error('GEMINI_API_KEY is not set. Inbox reply classification requires Google Gemini.');
  }
  return key;
}

function getModel(): GenerativeModel {
  if (!_genai) _genai = new GoogleGenerativeAI(getKey());
  if (!_model) {
    _model = _genai.getGenerativeModel({
      model: 'gemini-flash-lite-latest',
      generationConfig: { temperature: 0.2, responseMimeType: 'application/json' },
    });
  }
  return _model;
}

// Must match the live `reply_classification` Postgres enum exactly.
export const REPLY_CLASSIFICATIONS = [
  'will_pay_date',
  'already_paid',
  'disputed',
  'missing_po',
  'wrong_contact',
  'needs_payment_plan',
  'general_question',
  'no_action',
  'unclassified',
] as const;
export type ReplyClassification = (typeof REPLY_CLASSIFICATIONS)[number];

const classificationSchema = z.object({
  classification: z.enum(REPLY_CLASSIFICATIONS),
  confidence: z.number().min(0).max(1),
  summary: z.string().min(1).max(280),
  recommendedAction: z.string().min(1).max(280),
  suggestedPromiseDate: z.string().nullable(),
});

export type InboxClassification = {
  classification: ReplyClassification;
  confidence: number;
  summary: string;
  recommendedAction: string;
  suggestedPromiseDate: string | null;
};

export type ClassifyInboundReplyInput = {
  subject: string | null;
  body: string;
  customerName: string | null;
  businessName: string;
  invoiceNumber: string | null;
  amountDue: string | null;
  currency: string | null;
  dueDate: string | null;
};

const CLASSIFICATION_GUIDE = `
- will_pay_date: they commit to paying by a specific date (extract it if given).
- already_paid: they say they already paid, or ask you to check/confirm payment.
- disputed: they dispute the amount, the work, or say they were charged incorrectly.
- missing_po: they need a purchase order number, invoice copy, or other paperwork before they can pay.
- wrong_contact: they say this isn't their responsibility / wrong person / forward to someone else.
- needs_payment_plan: they ask for an installment plan or more time in general (no specific date given).
- general_question: any other question that isn't about payment status.
- no_action: acknowledgement, out-of-office, or anything not requiring a response.
- unclassified: use only if none of the above fit at all.
`.trim();

/**
 * Classify an inbound reply from an AR customer replying to a dunning
 * email. Mirrors the callGeminiValidated pattern in src/lib/ai/dunning.ts:
 * structured JSON output, zod-validated, graceful fallback so a Gemini
 * outage never blocks ingesting the reply itself (it just lands as
 * 'unclassified' for a human to triage).
 */
export async function classifyInboundReply(ctx: ClassifyInboundReplyInput): Promise<InboxClassification> {
  const fallback: InboxClassification = {
    classification: 'unclassified',
    confidence: 0,
    summary: ctx.body.slice(0, 200),
    recommendedAction: 'Review this reply manually.',
    suggestedPromiseDate: null,
  };

  try {
    const systemPrompt = `You triage inbound email replies for ${ctx.businessName}'s accounts-receivable inbox. A customer replied to a payment reminder. Classify the reply and recommend the next step.

Classification categories:
${CLASSIFICATION_GUIDE}

Output JSON: {"classification": one of [${REPLY_CLASSIFICATIONS.map((c) => `"${c}"`).join(', ')}], "confidence": number 0-1, "summary": "one short sentence describing what they said", "recommendedAction": "one short sentence telling the AR team what to do next", "suggestedPromiseDate": "YYYY-MM-DD" or null if classification is not will_pay_date or no date was given}`;

    const userPrompt = `Invoice: ${ctx.invoiceNumber ?? 'unknown'}${ctx.amountDue ? `, amount due ${ctx.currency ?? ''} ${ctx.amountDue}` : ''}${ctx.dueDate ? `, due ${ctx.dueDate}` : ''}
From: ${ctx.customerName ?? 'unknown contact'}
Subject: ${ctx.subject ?? '(no subject)'}
Reply body:
"""
${ctx.body.slice(0, 4000)}
"""

Today's date: ${new Date().toISOString().slice(0, 10)}. Classify this reply.`;

    const result = await getModel().generateContent({
      contents: [{ role: 'user', parts: [{ text: systemPrompt + '\n\n' + userPrompt }] }],
    });
    const text = result.response.text();
    const parsed = classificationSchema.parse(JSON.parse(text));
    return parsed;
  } catch (e) {
    console.error('[inbox] classifyInboundReply Gemini call failed, using fallback:', e instanceof Error ? e.message : e);
    return fallback;
  }
}
