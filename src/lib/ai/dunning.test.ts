import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { fallbackDunningMessage, buildPromiseLink, PROMISE_LINE_LABEL, type DunningContext } from './dunning.ts';

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
          body.includes('https://mugavi.com/pay/unique_id_XYZ'),
          `expected body to contain the pay link built from invoiceId, got: ${body}`,
        );
        assert.ok(
          !body.includes('https://mugavi.com/pay/INV-9999'),
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

const THREATS = /suspend|legal|collections|credit report|penalt|lawyer|court|late fee|final notice/i;

describe('fallbackDunningMessage — tone content', () => {
  test('friendly tone has no threat of collections/escalation', () => {
    const { body } = fallbackDunningMessage(ctx({ tone: 'friendly' }));
    assert.ok(!/collections|legal|escalat/i.test(body));
  });

  test('final tone is plain and threat free', () => {
    const { body } = fallbackDunningMessage(ctx({ tone: 'final', priorMessages: 2 }));
    assert.match(body, /few reminders/i);
    assert.doesNotMatch(body, THREATS);
  });

  test('firm tone states the days overdue', () => {
    const { body } = fallbackDunningMessage(ctx({ tone: 'firm', daysOverdue: 23 }));
    assert.ok(body.includes('23 days past due'));
  });
});

describe('fallbackDunningMessage — heads-up before the due date', () => {
  const pre = (o: Partial<DunningContext> = {}) => ctx({ daysOverdue: -7, dueDate: '2026-10-08', ...o });

  test('never calls a not-yet-due invoice late', () => {
    for (const tone of ['friendly', 'firm'] as const) {
      const { subject, body } = fallbackDunningMessage(pre({ tone }));
      assert.doesNotMatch(`${subject}\n${body}`, /overdue|past due|final notice|collections|-7/i, tone);
      assert.match(subject ?? '', /due in 7 days/);
      assert.match(body, /due on 2026-10-08, in 7 days/);
    }
  });

  test('still carries the payment link, by email and by text', () => {
    assert.match(fallbackDunningMessage(pre()).body, /\/pay\/inv_nanoid_abc123/);
    const sms = fallbackDunningMessage(pre({ channel: 'sms' }));
    assert.match(sms.body, /due in 7 days/);
    assert.match(sms.body, /\/pay\/inv_nanoid_abc123/);
    assert.ok(sms.body.length <= 320);
  });

  test('one day out is singular', () => {
    assert.match(fallbackDunningMessage(pre({ daysOverdue: -1 })).subject ?? '', /due in 1 day$/);
  });

  test('an overdue invoice is unchanged', () => {
    assert.match(fallbackDunningMessage(ctx({ daysOverdue: 14, tone: 'firm' })).body, /14 days past due/);
  });
});

describe('fallbackDunningMessage - required facts, no threats, promise link', () => {
  const tones = ['friendly', 'firm', 'final'] as const;
  const channels = ['email', 'sms'] as const;
  const days = [-5, 3, 14, 75]; // heads-up, early, mid, very late

  for (const tone of tones) {
    for (const channel of channels) {
      for (const d of days) {
        const name = `${tone}/${channel}/${d}d`;
        const c = () => ctx({ tone, channel, daysOverdue: d, priorMessages: 2, invoiceNumber: 'INV-4242', amount: '980.50', dueDate: '2026-05-20' });

        test(`${name}: has invoice number, amount, due date and exactly one pay link`, () => {
          const { body } = fallbackDunningMessage(c());
          assert.ok(body.includes('INV-4242'), body);
          assert.match(body, /USD\s980\.50/, body);
          assert.ok(body.includes('2026-05-20'), body);
          const payLinks = body.match(/https:\/\/mugavi\.com\/pay\/inv_nanoid_abc123(?![?\w])/g) ?? [];
          assert.equal(payLinks.length, 1, body);
        });

        test(`${name}: no threat words, no dashes, no urgency`, () => {
          const { subject, body } = fallbackDunningMessage(c());
          const text = `${subject ?? ''}\n${body}`;
          assert.doesNotMatch(text, THREATS);
          assert.doesNotMatch(text, /[\u2013\u2014]/);
          assert.doesNotMatch(text, /act now|immediately|last chance|today only|hurry/i);
        });

        test(`${name}: promise link only where intended`, () => {
          const { body } = fallbackDunningMessage(c());
          const expected = channel === 'email' && d >= 0;
          assert.equal(body.includes(buildPromiseLink('inv_nanoid_abc123')), expected, body);
          assert.equal(body.includes(PROMISE_LINE_LABEL), expected, body);
          if (channel === 'sms') assert.ok(body.length <= 320);
        });
      }
    }
  }

  test('promise link points at the real pay route with the query and anchor the page reads', () => {
    assert.equal(buildPromiseLink('abc'), 'https://mugavi.com/pay/abc?promise=1#promise-to-pay');
  });

  test('sms with long names still keeps the pay link', () => {
    const { body } = fallbackDunningMessage(ctx({
      channel: 'sms', businessName: 'B'.repeat(200), contactName: 'C'.repeat(200), invoiceNumber: 'N'.repeat(100),
    }));
    assert.ok(body.length <= 320);
    assert.ok(body.includes('https://mugavi.com/pay/inv_nanoid_abc123'));
  });

  test('later tones escalate in wording, not in threats', () => {
    const f = fallbackDunningMessage(ctx({ tone: 'friendly' })).body;
    const m = fallbackDunningMessage(ctx({ tone: 'firm' })).body;
    const l = fallbackDunningMessage(ctx({ tone: 'final', priorMessages: 2 })).body;
    assert.notEqual(f, m);
    assert.notEqual(m, l);
    assert.match(f, /quick nudge/i);
    assert.match(l, /few reminders/i);
  });
});
