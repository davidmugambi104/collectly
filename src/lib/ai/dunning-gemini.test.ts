// Tests for the Gemini-SUCCESS paths in dunning.ts: generateDunningMessage,
// predictPaymentLikelihood, generateCashFlowForecast.
//
// Mocking approach: dunning.ts talks to Gemini exclusively through
// `GenerativeModel.prototype.generateContent` (from @google/generative-ai).
// getModel() lazily constructs a GoogleGenerativeAI client and caches a
// GenerativeModel instance at module scope, but the *instance* is never
// exposed for dependency injection, and there's no reason to refactor
// production code just to thread a fake client through — the SDK boundary
// is already narrow (one prototype method) and stable, so we mock it there
// with node:test's built-in `t.mock.method`, which auto-restores after each
// test. GEMINI_API_KEY only needs to be *set* (getKey() just checks
// truthiness) — no real network call ever happens because generateContent
// is replaced before any test invokes the code under test.
import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';
import { GenerativeModel } from '@google/generative-ai';
import {
  generateDunningMessage,
  predictPaymentLikelihood,
  generateCashFlowForecast,
  fallbackDunningMessage,
  type DunningContext,
} from './dunning.ts';

before(() => {
  // getKey() only checks that this is truthy; no network call is ever made
  // because generateContent is mocked in every test below.
  process.env.GEMINI_API_KEY = 'test-key-for-unit-tests';
});

function ctx(overrides: Partial<DunningContext> = {}): DunningContext {
  return {
    invoiceId: 'inv_nanoid_abc123',
    businessName: 'Acme Studios',
    contactName: 'Jane Doe',
    invoiceNumber: 'INV-2370',
    amount: '1250.00',
    currency: 'USD',
    dueDate: '2026-06-01',
    daysOverdue: 14,
    tone: 'friendly',
    channel: 'email',
    priorMessages: 0,
    customerPaymentHistory: { avgDaysToPay: 20, paidRate: 0.85 },
    ...overrides,
  };
}

// Helper: mock generateContent to resolve with a given raw text body,
// mimicking the shape callGeminiValidated reads (`result.response.text()`).
function mockGeminiText(t: import('node:test').TestContext, text: string) {
  t.mock.method(GenerativeModel.prototype, 'generateContent', async () => ({
    response: { text: () => text },
  }));
}

function mockGeminiThrows(t: import('node:test').TestContext, err: unknown) {
  t.mock.method(GenerativeModel.prototype, 'generateContent', async () => {
    throw err;
  });
}

describe('generateDunningMessage — happy path (valid Gemini response)', () => {
  test('email: returns the parsed subject + body verbatim', async (t) => {
    mockGeminiText(t, JSON.stringify({ subject: 'Quick reminder', body: 'Hi Jane, invoice INV-2370 is due.' }));
    const result = await generateDunningMessage(ctx({ channel: 'email' }));
    assert.equal(result.subject, 'Quick reminder');
    assert.equal(result.body, 'Hi Jane, invoice INV-2370 is due.');
  });

  test('sms: returns only a body, no subject', async (t) => {
    mockGeminiText(t, JSON.stringify({ body: 'Invoice INV-2370 is due, please pay.' }));
    const result = await generateDunningMessage(ctx({ channel: 'sms' }));
    assert.equal(result.subject, undefined);
    assert.equal(result.body, 'Invoice INV-2370 is due, please pay.');
  });
});

describe('generateDunningMessage — Zod schema validation rejects malformed output', () => {
  test('email: missing body field falls back instead of returning bad data', async (t) => {
    mockGeminiText(t, JSON.stringify({ subject: 'Only a subject, no body' }));
    const result = await generateDunningMessage(ctx({ channel: 'email' }));
    // Falls back to the deterministic template — proof the malformed shape
    // never reached the caller as if it were valid.
    const fallback = fallbackDunningMessage(ctx({ channel: 'email' }));
    assert.equal(result.subject, fallback.subject);
    assert.ok(result.body.includes('INV-2370'));
  });

  test('email: subject exceeding max length (120 chars) is rejected, falls back', async (t) => {
    mockGeminiText(t, JSON.stringify({ subject: 'x'.repeat(121), body: 'valid body' }));
    const result = await generateDunningMessage(ctx({ channel: 'email' }));
    assert.notEqual(result.subject, 'x'.repeat(121));
    assert.ok(result.subject && result.subject.length < 121);
  });

  test('email: wrong types (number instead of string) rejected, falls back', async (t) => {
    mockGeminiText(t, JSON.stringify({ subject: 12345, body: 67890 }));
    const result = await generateDunningMessage(ctx({ channel: 'email' }));
    // Fallback subjects are always human-readable strings referencing the invoice.
    assert.ok(result.subject && result.subject.includes('INV-2370'));
  });

  test('sms: body missing entirely rejected, falls back', async (t) => {
    mockGeminiText(t, JSON.stringify({ notBody: 'wrong key' }));
    const result = await generateDunningMessage(ctx({ channel: 'sms' }));
    assert.ok(result.body.includes('INV-2370'));
    assert.ok(result.body.length <= 320);
  });

  test('non-JSON model output rejected, falls back rather than throwing', async (t) => {
    mockGeminiText(t, 'this is not json at all {{{');
    const result = await generateDunningMessage(ctx({ channel: 'email' }));
    assert.ok(result.body.includes('INV-2370'));
  });

  test('empty-string body (violates min(1)) rejected, falls back', async (t) => {
    mockGeminiText(t, JSON.stringify({ subject: 'Reminder', body: '' }));
    const result = await generateDunningMessage(ctx({ channel: 'email' }));
    const fallback = fallbackDunningMessage(ctx({ channel: 'email' }));
    assert.equal(result.subject, fallback.subject);
  });
});

describe('generateDunningMessage — tone-escalation guard (validateToneSequence)', () => {
  test('tone "final" with priorMessages=0 throws and never calls Gemini', async (t) => {
    const spy = t.mock.method(GenerativeModel.prototype, 'generateContent', async () => {
      throw new Error('generateContent should not have been called');
    });
    await assert.rejects(
      () => generateDunningMessage(ctx({ tone: 'final', priorMessages: 0 })),
      /Refusing to generate dunning message.*tone='final'/,
    );
    assert.equal(spy.mock.callCount(), 0, 'Gemini must not be called when the escalation guard rejects the request');
  });

  test('tone "final" with priorMessages=1 is allowed through to Gemini', async (t) => {
    mockGeminiText(t, JSON.stringify({ subject: 'Final notice', body: 'Please pay immediately.' }));
    const result = await generateDunningMessage(ctx({ tone: 'final', priorMessages: 1 }));
    assert.equal(result.subject, 'Final notice');
  });

  test('tone "friendly"/"firm" are unaffected by priorMessages=0', async (t) => {
    mockGeminiText(t, JSON.stringify({ subject: 'Reminder', body: 'Body text here.' }));
    const result = await generateDunningMessage(ctx({ tone: 'friendly', priorMessages: 0 }));
    assert.equal(result.subject, 'Reminder');
  });
});

describe('generateDunningMessage — Gemini failure falls back cleanly', () => {
  test('network/API error does not throw to the caller; returns fallback template', async (t) => {
    mockGeminiThrows(t, new Error('ECONNRESET: Gemini API unreachable'));
    const result = await generateDunningMessage(ctx({ channel: 'email' }));
    const fallback = fallbackDunningMessage(ctx({ channel: 'email' }));
    assert.equal(result.subject, fallback.subject);
    assert.equal(result.body, fallback.body);
  });

  test('fallback result still respects channel-specific shape (sms has no subject)', async (t) => {
    mockGeminiThrows(t, new Error('quota exceeded'));
    const result = await generateDunningMessage(ctx({ channel: 'sms' }));
    assert.equal(result.subject, undefined);
    assert.ok(result.body.length <= 320);
  });
});

describe('predictPaymentLikelihood', () => {
  const input = { avgDaysToPay: 12, paidRate: 0.9, daysOverdue: 5, priorMessages: 1, invoiceAmount: 500 };

  test('happy path: returns the parsed score + reasoning verbatim', async (t) => {
    mockGeminiText(t, JSON.stringify({ score: 72, reasoning: 'Consistent payer, moderately overdue.' }));
    const result = await predictPaymentLikelihood(input);
    assert.equal(result.score, 72);
    assert.equal(result.reasoning, 'Consistent payer, moderately overdue.');
  });

  test('score out of range (>100) rejected by schema, falls back to neutral default', async (t) => {
    mockGeminiText(t, JSON.stringify({ score: 150, reasoning: 'Overconfident model output' }));
    const result = await predictPaymentLikelihood(input);
    assert.equal(result.score, 50);
    assert.equal(result.reasoning, 'Unable to predict');
  });

  test('negative score rejected by schema, falls back', async (t) => {
    mockGeminiText(t, JSON.stringify({ score: -5, reasoning: 'Bad score' }));
    const result = await predictPaymentLikelihood(input);
    assert.equal(result.score, 50);
  });

  test('missing reasoning field rejected by schema, falls back', async (t) => {
    mockGeminiText(t, JSON.stringify({ score: 80 }));
    const result = await predictPaymentLikelihood(input);
    assert.equal(result.score, 50);
    assert.equal(result.reasoning, 'Unable to predict');
  });

  test('Gemini failure falls back to neutral score, never throws', async (t) => {
    mockGeminiThrows(t, new Error('Gemini down'));
    const result = await predictPaymentLikelihood(input);
    assert.equal(result.score, 50);
    assert.equal(result.reasoning, 'Unable to predict');
  });
});

describe('generateCashFlowForecast', () => {
  const input = {
    openInvoices: [{ amount: 1000, dueDate: '2026-06-01', daysOverdue: 10, customerPaidRate: 0.8, customerAvgDays: 15 }],
    monthlyBurn: 20000,
    currentCash: 50000,
  };

  test('happy path: returns the parsed forecast verbatim', async (t) => {
    mockGeminiText(t, JSON.stringify({
      week1: 500, week2: 300, week3: 200, week4: 100, confidence: 'medium', narrative: 'Steady inflow expected.',
    }));
    const result = await generateCashFlowForecast(input);
    assert.deepEqual(result, { week1: 500, week2: 300, week3: 200, week4: 100, confidence: 'medium', narrative: 'Steady inflow expected.' });
  });

  test('negative week amount rejected by schema (nonnegative), falls back to zeroed low-confidence result', async (t) => {
    mockGeminiText(t, JSON.stringify({
      week1: -50, week2: 300, week3: 200, week4: 100, confidence: 'medium', narrative: 'Negative is nonsensical.',
    }));
    const result = await generateCashFlowForecast(input);
    assert.deepEqual(result, { week1: 0, week2: 0, week3: 0, week4: 0, confidence: 'low', narrative: 'Insufficient data' });
  });

  test('invalid confidence enum value rejected by schema, falls back', async (t) => {
    mockGeminiText(t, JSON.stringify({
      week1: 1, week2: 1, week3: 1, week4: 1, confidence: 'extremely-high', narrative: 'Bogus enum value.',
    }));
    const result = await generateCashFlowForecast(input);
    assert.equal(result.confidence, 'low');
    assert.equal(result.narrative, 'Insufficient data');
  });

  test('Gemini failure falls back to zeroed low-confidence result, never throws', async (t) => {
    mockGeminiThrows(t, new Error('Gemini timeout'));
    const result = await generateCashFlowForecast(input);
    assert.deepEqual(result, { week1: 0, week2: 0, week3: 0, week4: 0, confidence: 'low', narrative: 'Insufficient data' });
  });
});
