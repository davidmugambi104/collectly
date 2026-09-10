import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { fallbackDunningMessage, type DunningContext } from './dunning.ts';

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

describe('fallbackDunningMessage — payment link correctness', () => {
  // Regression test for the real production bug documented in dunning.ts:
  // the payment portal resolves by invoice.id, and an earlier version built
  // the link from invoice.number instead, shipping broken pay links to
  // every customer who got a fallback (Gemini-down) reminder.
  for (const tone of ['friendly', 'firm', 'final'] as const) {
    for (const channel of ['email', 'sms'] as const) {
      test(`${tone}/${channel}: link uses invoiceId, not invoiceNumber`, () => {
        const priorMessages = tone === 'final' ? 1 : 0; // final requires a prior touch
        const c = ctx({ tone, channel, priorMessages, invoiceId: 'unique_id_XYZ', invoiceNumber: 'INV-9999' });
        const { body } = fallbackDunningMessage(c);
        assert.ok(
          body.includes('https://getcollectly.app/pay/unique_id_XYZ'),
          `expected body to contain the pay link built from invoiceId, got: ${body}`,
        );
        assert.ok(
          !body.includes('https://getcollectly.app/pay/INV-9999'),
          'pay link must not be built from invoiceNumber',
        );
      });
    }
  }
});

describe('fallbackDunningMessage — blank invoice number', () => {
  // Regression test: real Xero/QuickBooks-synced invoices can have an
  // empty-string invoice number (upstream data quality + a `??` vs `||`
  // bug at the sync layer), which previously rendered as "Invoice #" with
  // nothing after it in real customer-facing emails.
  test('falls back to an id fragment instead of rendering a bare "#"', () => {
    const { body, subject } = fallbackDunningMessage(ctx({ invoiceNumber: '', invoiceId: 'abc123456789' }));
    assert.ok(!/invoice #?\s*(for|is|,|$)/i.test(body), `body should not render a blank invoice number, got: ${body}`);
    assert.ok(body.includes('ABC12345'), `expected id-fragment fallback in body, got: ${body}`);
    assert.ok(subject && !/invoice\s*$/i.test(subject.trim()), `subject should not end with a blank invoice number, got: ${subject}`);
  });
});

describe('fallbackDunningMessage — channel-specific formatting', () => {
  test('email includes a subject line', () => {
    const { subject } = fallbackDunningMessage(ctx({ channel: 'email' }));
    assert.ok(subject && subject.length > 0);
  });

  test('sms has no subject line', () => {
    const { subject } = fallbackDunningMessage(ctx({ channel: 'sms' }));
    assert.equal(subject, undefined);
  });

  test('sms body is capped at 320 characters', () => {
    const { body } = fallbackDunningMessage(ctx({
      channel: 'sms',
      businessName: 'A Really Long Business Name That Keeps Going And Going LLC',
      contactName: 'A Customer With An Extremely Long Full Legal Name Here',
      invoiceNumber: 'INV-000000000000012345',
      daysOverdue: 9999,
    }));
    assert.ok(body.length <= 320, `sms body was ${body.length} chars`);
  });

  test('email body respects the invoice amount and currency, formatted consistently with the AI path', () => {
    // Was asserting the raw, unformatted 'EUR 4321.55' — that was the bug
    // (no thousands separator, inconsistent with formatAmount() used on
    // the Gemini path) encoded as if it were the expected output. The
    // fallback now goes through the same formatAmount() the AI prompt
    // does, so this should look identical either way. Regex (not a plain
    // .includes) because Intl.NumberFormat with currencyDisplay:'code'
    // separates the code from the number with a non-breaking space
    // (U+00A0), not a regular one.
    const { body } = fallbackDunningMessage(ctx({ amount: '4321.55', currency: 'EUR' }));
    assert.match(body, /EUR\s4,321\.55/, `expected consistently-formatted amount in body, got: ${body}`);
  });
});

describe('fallbackDunningMessage — tone content', () => {
  test('friendly tone has no threat of collections/escalation', () => {
    const { body } = fallbackDunningMessage(ctx({ tone: 'friendly' }));
    assert.ok(!/collections|legal|escalat/i.test(body));
  });

  test('final tone mentions collections escalation', () => {
    const { body } = fallbackDunningMessage(ctx({ tone: 'final', priorMessages: 2 }));
    assert.match(body, /collections/i);
  });

  test('firm tone states the days overdue', () => {
    const { body } = fallbackDunningMessage(ctx({ tone: 'firm', daysOverdue: 23 }));
    assert.ok(body.includes('23 days past due'));
  });
});
