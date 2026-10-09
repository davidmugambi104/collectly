import { test } from 'node:test';
import assert from 'node:assert/strict';
import { explain, type Facts } from './explain.ts';
import { DEFAULT_WINDOW } from './send-window.ts';

const NOW = new Date('2026-10-01T14:00:00Z');
const base: Facts = {
  now: NOW, invoiceStatus: 'overdue', daysOverdue: 10, customerName: 'Acme',
  customerUnsubscribed: false, hold: null, promiseUntil: null, unhandledReply: false, pauseOnReply: true,
  scheduleName: 'Default', scheduleActive: true,
  steps: [{ id: 's1', daysFromDue: 1, channel: 'email' }, { id: 's2', daysFromDue: 7, channel: 'email' }, { id: 's3', daysFromDue: 30, channel: 'sms' }],
  ranStepIds: ['s1'], failedStepIds: [], approvalRequired: true, window: DEFAULT_WINDOW,
  hasEmail: true, hasPhone: true, smsAllowed: false,
  balance: 100, minBalance: 0, gapDays: 7, gapBlockedUntil: null,
};

test('the happy path says what will happen next, in approval mode and in automatic mode', () => {
  const a = explain(base);
  assert.equal(a.willAct, true);
  assert.match(a.headline, /drafted and held for your approval/);
  assert.match(explain({ ...base, approvalRequired: false }).headline, /sent automatically/);
});

test('paid, disputed and written-off invoices are not chased, with the right reason', () => {
  assert.match(explain({ ...base, invoiceStatus: 'paid' }).headline, /paid/);
  assert.match(explain({ ...base, invoiceStatus: 'disputed' }).headline, /dispute/);
  assert.match(explain({ ...base, invoiceStatus: 'written_off' }).headline, /written off/);
});

test('an invoice that is not overdue yet is not due', () => {
  const e = explain({ ...base, daysOverdue: 0 });
  assert.equal(e.willAct, false);
  assert.match(e.headline, /past its due date/);
});

test('an unsubscribe comes before everything else after status', () => {
  const e = explain({ ...base, customerUnsubscribed: true, hold: { heldUntil: null }, unhandledReply: true });
  assert.match(e.headline, /unsubscribed/);
});

test('holds, promises and unhandled replies each block, in that order', () => {
  assert.match(explain({ ...base, hold: { heldUntil: null } }).headline, /until you resume/);
  assert.match(explain({ ...base, hold: { heldUntil: new Date('2026-10-05T00:00:00Z') } }).headline, /until 2026-10-05/);
  assert.equal(explain({ ...base, hold: { heldUntil: new Date('2026-09-30T00:00:00Z') } }).willAct, true, 'an expired hold no longer blocks');
  assert.match(explain({ ...base, promiseUntil: new Date('2026-10-09T00:00:00Z') }).headline, /promised to pay/);
  assert.match(explain({ ...base, unhandledReply: true }).headline, /replied/);
  assert.equal(explain({ ...base, unhandledReply: true, pauseOnReply: false }).willAct, true, 'reply-pause can be switched off');
});

test('a switched-off schedule blocks', () => {
  assert.match(explain({ ...base, scheduleActive: false }).headline, /switched off/);
});

test('before the first step is due it counts the days', () => {
  const e = explain({ ...base, daysOverdue: 2, steps: [{ id: 's1', daysFromDue: 5, channel: 'email' }], ranStepIds: [] });
  assert.match(e.headline, /in 3 days/);
});

test('a step already handled points at the next one', () => {
  const e = explain({ ...base, daysOverdue: 8, ranStepIds: ['s1', 's2'] });
  assert.equal(e.willAct, false);
  assert.match(e.headline, /next one is set for 30 days past due/);
  assert.match(explain({ ...base, daysOverdue: 40, ranStepIds: ['s1', 's2', 's3'] }).headline, /Every step/);
});

test('a failed step is called out as retried', () => {
  const e = explain({ ...base, ranStepIds: ['s1'], failedStepIds: ['s2'] });
  assert.ok(e.findings.some((f) => /tried again/.test(f.text)));
});

test('missing contact details and missing SMS consent are named', () => {
  assert.match(explain({ ...base, hasEmail: false }).headline, /no email/);
  const sms = { ...base, daysOverdue: 40, ranStepIds: ['s1', 's2'] };
  assert.match(explain({ ...sms, hasPhone: false }).headline, /no phone/);
  assert.match(explain({ ...sms, smsAllowed: false }).headline, /not opted in/);
  assert.equal(explain({ ...sms, smsAllowed: true }).willAct, true);
});

test('outside the send window it says when the window opens', () => {
  const win = { enabled: true, startHour: 9, endHour: 17, days: 31, timezone: 'Australia/Sydney' };
  const e = explain({ ...base, window: win });
  assert.equal(e.willAct, false);
  assert.match(e.headline, /Outside your send window.*2026-10-01 23:00 UTC/);
});

test('a balance under the owner minimum is not chased, and says why', () => {
  const e = explain({ ...base, balance: 4.5, minBalance: 10 });
  assert.equal(e.willAct, false);
  assert.match(e.headline, /below your minimum of 10\.00/);
  assert.equal(explain({ ...base, balance: 10, minBalance: 10 }).willAct, true);
});

test('another invoice\'s recent reminder holds this one back until the gap ends', () => {
  const until = new Date('2026-10-05T14:00:00Z');
  const e = explain({ ...base, gapBlockedUntil: until });
  assert.equal(e.willAct, false);
  assert.match(e.headline, /another invoice/);
  assert.match(e.headline, /one per 7 days/);
  assert.match(e.headline, /2026-10-05/);
  assert.equal(e.findings.at(-1)?.level, 'waiting');
  assert.equal(explain({ ...base, gapBlockedUntil: new Date('2026-09-30T00:00:00Z') }).willAct, true, 'a gap that already ended does not block');
});

test('the gap only matters once a new step is actually due', () => {
  // s1 already ran and nothing newer is due: the gap must not be what the owner is told.
  const e = explain({ ...base, daysOverdue: 3, gapBlockedUntil: new Date('2026-10-05T14:00:00Z') });
  assert.doesNotMatch(e.headline, /another invoice/);
});

test('every outcome carries a short label for a table cell', () => {
  assert.equal(explain(base).short, 'Draft next run');
  assert.equal(explain({ ...base, approvalRequired: false }).short, 'Sends next run');
  assert.equal(explain({ ...base, daysOverdue: 0 }).short, 'Not due yet');
  assert.equal(explain({ ...base, customerUnsubscribed: true }).short, 'Unsubscribed');
  assert.equal(explain({ ...base, hold: { heldUntil: null } }).short, 'Paused by you');
  assert.equal(explain({ ...base, unhandledReply: true }).short, 'Read their reply');
  assert.equal(explain({ ...base, balance: 1, minBalance: 5 }).short, 'Below minimum');
  assert.equal(explain({ ...base, hasEmail: false, steps: [{ id: 's1', daysFromDue: 1, channel: 'email' }], ranStepIds: [] }).short, 'No email');
  assert.equal(explain({ ...base, gapBlockedUntil: new Date('2026-10-05T14:00:00Z') }).short, 'After Oct 5');
  assert.equal(explain({ ...base, daysOverdue: 3 }).short, 'In 4 days');
  assert.equal(explain({ ...base, invoiceStatus: 'paid' }).short, 'Not chased');
  assert.equal(explain({ ...base, invoiceStatus: 'disputed' }).short, 'Disputed');
});

test('a schedule that starts before the due date explains an invoice that is not late yet', () => {
  const early = { ...base, daysOverdue: -5, ranStepIds: [], steps: [{ id: 'p0', daysFromDue: -7, channel: 'email' as const }, { id: 's1', daysFromDue: 1, channel: 'email' as const }] };
  const e = explain(early);
  assert.equal(e.willAct, true);
  assert.equal(e.short, 'Draft next run');
  assert.match(e.findings.map((x) => x.text).join(' '), /not overdue yet \(due in 5 days\)/);
  assert.match(e.findings.map((x) => x.text).join(' '), /step set for 7 days before the due date is now due/);
});

test('a heads-up that has already gone out says when the next one is', () => {
  const e = explain({ ...base, daysOverdue: -5, ranStepIds: ['p0'], steps: [{ id: 'p0', daysFromDue: -7, channel: 'email' }, { id: 's1', daysFromDue: 1, channel: 'email' }] });
  assert.equal(e.willAct, false);
  assert.equal(e.short, 'In 6 days');
  assert.match(e.headline, /next one is set for 1 day past due/);
});

test('before the first pre-due step, it says how long until then', () => {
  const e = explain({ ...base, daysOverdue: -20, ranStepIds: [], steps: [{ id: 'p0', daysFromDue: -7, channel: 'email' }] });
  assert.equal(e.willAct, false);
  assert.equal(e.short, 'In 13 days');
  assert.match(e.headline, /first reminder is set for 7 days before the due date/);
});

test('a schedule with no pre-due step still ignores an invoice that is not late', () => {
  const e = explain({ ...base, daysOverdue: -3 });
  assert.equal(e.short, 'Not due yet');
});

test('a call step makes a task, and is not blocked by a missing email, a missing phone or the gap rule', () => {
  const call = { ...base, hasEmail: false, hasPhone: false, smsAllowed: false, ranStepIds: [], gapBlockedUntil: new Date('2026-10-09T00:00:00Z'), steps: [{ id: 'c1', daysFromDue: 5, channel: 'phone' as const }] };
  const e = explain(call);
  assert.equal(e.willAct, true);
  assert.equal(e.short, 'Call task next run');
  assert.match(e.headline, /Tasks list/);
  assert.match(e.headline, /Nothing is sent to the customer/);
});

test('unapplied credit that covers what they owe stops the chase and says to apply it', () => {
  const e = explain({ ...base, unappliedCredit: 250, customerOwed: 200 });
  assert.equal(e.willAct, false);
  assert.equal(e.short, 'Has credit');
  assert.match(e.headline, /250\.00 of unapplied credit/);
  assert.match(e.headline, /Apply it in your books/);
});

test('credit that does not cover it is ignored, and a hold still comes first', () => {
  assert.equal(explain({ ...base, unappliedCredit: 50, customerOwed: 200 }).willAct, true);
  assert.match(explain({ ...base, unappliedCredit: 250, customerOwed: 200, hold: { heldUntil: null } }).headline, /paused reminders/);
});

test('a drafted reminder that is waiting is not described as sent, even when a later text step was skipped', () => {
  const e = explain({ ...base, daysOverdue: 60, ranStepIds: ['s2', 's3'], waitingStepIds: ['s2'] });
  assert.equal(e.willAct, false);
  assert.equal(e.short, 'Waiting for you');
  assert.ok(!/sent/i.test(e.short));
  assert.equal(explain({ ...base, daysOverdue: 60, ranStepIds: ['s1', 's2', 's3'] }).short, 'Up to date');
});
