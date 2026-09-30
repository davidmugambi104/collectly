/**
 * "Why hasn't a reminder gone out for this invoice?"
 *
 * Walks the same checks the scheduler makes, in the same order, and says which
 * one stops it. Pure: give it the facts, get a plain-English answer. The
 * database side is in explain-load.ts.
 *
 * If the scheduler's rules change, change this with them. The test file pins
 * the order.
 */
import { isWithinWindow, nextWindowOpen, type SendWindow } from './send-window.ts';
import { belowMinBalance } from './chase-rules.ts';
import { stepDayPhrase } from './step-timing.ts';

export type Step = { id: string; daysFromDue: number; channel: 'email' | 'sms' | 'phone' };

export type Facts = {
  now: Date;
  invoiceStatus: string;
  daysOverdue: number;
  customerName: string;
  customerUnsubscribed: boolean;
  hold: { heldUntil: Date | null } | null;
  promiseUntil: Date | null;
  unhandledReply: boolean;
  pauseOnReply: boolean;
  scheduleName: string;
  scheduleActive: boolean;
  steps: Step[];
  ranStepIds: string[];
  failedStepIds: string[];
  approvalRequired: boolean;
  window: SendWindow;
  hasEmail: boolean;
  hasPhone: boolean;
  smsAllowed: boolean;
  /** What is still owed on this invoice, and the owner's minimum. */
  balance: number;
  minBalance: number;
  /** The owner's per-customer gap in days, and when it ends if another invoice's reminder started it. */
  gapDays: number;
  gapBlockedUntil: Date | null;
};

export type Finding = { level: 'blocked' | 'waiting' | 'note' | 'ok'; text: string };
/**
 * `short` is the few-word version for a table cell ("Held", "In 3 days",
 * "Next run"). `headline` is the full sentence for the panel.
 */
export type Explanation = { willAct: boolean; short: string; headline: string; findings: Finding[] };

const OPEN = new Set(['sent', 'viewed', 'overdue', 'partial']);
const fmt = (d: Date) => d.toISOString().slice(0, 16).replace('T', ' ') + ' UTC';

export function explain(f: Facts): Explanation {
  const findings: Finding[] = [];
  const block = (text: string, short: string): Explanation => ({ willAct: false, short, headline: text, findings: [...findings, { level: 'blocked', text }] });

  if (!OPEN.has(f.invoiceStatus)) {
    const why = f.invoiceStatus === 'paid' ? 'It is paid.' : f.invoiceStatus === 'disputed' ? 'It is marked as disputed, and stays out of the schedule until the dispute is resolved.' : f.invoiceStatus === 'written_off' ? 'It is written off.' : `Its status is "${f.invoiceStatus}", which is not chased.`;
    return block(`Not chased. ${why}`, f.invoiceStatus === 'disputed' ? 'Disputed' : 'Not chased');
  }
  findings.push({ level: 'ok', text: `The invoice is open and ${f.daysOverdue > 0 ? `${f.daysOverdue} day${f.daysOverdue === 1 ? '' : 's'} overdue` : f.daysOverdue < 0 ? `not overdue yet (due in ${-f.daysOverdue} day${f.daysOverdue === -1 ? '' : 's'})` : 'not overdue yet'}.` });
  // A schedule can start before the due date. Only when it does not, an invoice
  // that is not late yet has nothing to explain.
  const startsBeforeOrOnDue = f.steps.some((s) => s.daysFromDue <= 0);
  if (f.daysOverdue <= 0 && !startsBeforeOrOnDue) return { willAct: false, short: 'Not due yet', headline: 'Nothing is due yet. Reminders start once the invoice is past its due date.', findings };

  if (f.customerUnsubscribed) return block(`${f.customerName} has unsubscribed, or their address bounced. Reminders are off for good and cannot be switched back on from here.`, 'Unsubscribed');
  if (f.hold && (f.hold.heldUntil === null || f.hold.heldUntil.getTime() > f.now.getTime())) {
    return block(f.hold.heldUntil ? `You paused reminders for ${f.customerName} until ${fmt(f.hold.heldUntil)}.` : `You paused reminders for ${f.customerName} until you resume them.`, 'Paused by you');
  }
  if (f.promiseUntil && f.promiseUntil.getTime() >= f.now.getTime()) {
    return block(`${f.customerName} promised to pay by ${fmt(f.promiseUntil)}. Reminders wait until then.`, 'Promised to pay');
  }
  if (f.unhandledReply && f.pauseOnReply) {
    return block(`${f.customerName} replied and the reply is still waiting in your inbox. Mark it handled and reminders can continue.`, 'Read their reply');
  }
  if (belowMinBalance(f.balance, f.minBalance)) {
    return block(`The balance, ${f.balance.toFixed(2)}, is below your minimum of ${f.minBalance.toFixed(2)}, so this invoice is not chased.`, 'Below minimum');
  }
  if (!f.scheduleActive) return block(`The schedule "${f.scheduleName}" is switched off.`, 'Schedule off');
  findings.push({ level: 'ok', text: `Following the schedule "${f.scheduleName}".` });

  const due = f.steps.filter((s) => s.daysFromDue <= f.daysOverdue).sort((a, b) => a.daysFromDue - b.daysFromDue);
  if (due.length === 0) {
    const next = [...f.steps].sort((a, b) => a.daysFromDue - b.daysFromDue)[0];
    const inDays = next ? next.daysFromDue - f.daysOverdue : 0;
    return { willAct: false, short: next ? `In ${inDays} day${inDays === 1 ? '' : 's'}` : 'No steps', headline: next ? `The first reminder is set for ${stepDayPhrase(next.daysFromDue)}, so nothing is due yet. That is in ${next.daysFromDue - f.daysOverdue} day${next.daysFromDue - f.daysOverdue === 1 ? '' : 's'}.` : 'This schedule has no steps.', findings };
  }
  const step = due[due.length - 1];
  if (f.ranStepIds.includes(step.id)) {
    const later = f.steps.filter((s) => s.daysFromDue > f.daysOverdue).sort((a, b) => a.daysFromDue - b.daysFromDue)[0];
    const laterIn = later ? later.daysFromDue - f.daysOverdue : 0;
    return { willAct: false, short: later ? `In ${laterIn} day${laterIn === 1 ? '' : 's'}` : 'All sent', headline: later ? `The step due now has already been handled. The next one is set for ${stepDayPhrase(later.daysFromDue)}.` : 'Every step of the schedule has already been handled for this invoice.', findings };
  }
  findings.push({ level: 'ok', text: `${step.channel === 'sms' ? 'A text message' : step.channel === 'phone' ? 'A call task' : 'An email'} step set for ${stepDayPhrase(step.daysFromDue)} is now due.` });
  if (f.failedStepIds.includes(step.id)) findings.push({ level: 'note', text: 'This step failed before. It will be tried again on the next run.' });

  // A call step is a task for the owner. Nothing is sent, so the customer's
  // email, phone, consent and the per-customer gap do not apply to it.
  if (step.channel === 'phone') {
    const text = 'A call task will be added to your Tasks list on the next run. Nothing is sent to the customer.';
    return { willAct: true, short: 'Call task next run', headline: text, findings: [...findings, { level: 'ok', text }] };
  }

  if (f.gapBlockedUntil && f.gapBlockedUntil.getTime() > f.now.getTime()) {
    const text = `${f.customerName} was sent a reminder about another invoice lately, and your rule allows one per ${f.gapDays} day${f.gapDays === 1 ? '' : 's'}. This one waits until ${fmt(f.gapBlockedUntil)}.`;
    return { willAct: false, short: `After ${f.gapBlockedUntil.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })}`, headline: text, findings: [...findings, { level: 'waiting', text }] };
  }

  if (step.channel === 'email' && !f.hasEmail) return block(`${f.customerName} has no email address, so this step will be cancelled.`, 'No email');
  if (step.channel === 'sms') {
    if (!f.hasPhone) return block(`${f.customerName} has no phone number, so this step will be cancelled.`, 'No phone');
    if (!f.smsAllowed) return block(`${f.customerName} has not opted in to texts, so this step will be cancelled.`, 'No text consent');
  }

  if (!isWithinWindow(f.now, f.window)) {
    const open = nextWindowOpen(f.now, f.window);
    return { willAct: false, short: 'Outside window', headline: open ? `Outside your send window. The next run inside it is after ${fmt(open)}.` : 'Outside your send window, and the window never opens.', findings: [...findings, { level: 'waiting', text: 'Your send window is closed right now.' }] };
  }

  const what = f.approvalRequired ? 'It will be drafted and held for your approval on the next run.' : 'It will be sent automatically on the next run.';
  return { willAct: true, short: f.approvalRequired ? 'Draft next run' : 'Sends next run', headline: what, findings: [...findings, { level: 'ok', text: what }] };
}
