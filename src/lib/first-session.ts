/**
 * What a new account should do next, worked out from real counts only.
 * Nothing here is a timer, a score or a guess: each step is done when the
 * database says it is, and the single next action points at the screen where
 * that step happens.
 */
export type FirstSessionState = {
  /** A QuickBooks or Xero connection is active. */
  booksConnected: boolean;
  /** That connection has finished at least one sync. */
  hasSynced: boolean;
  /** Invoices in Mugavi, from a sync or from sample data. */
  invoiceCount: number;
  /** Invoices past their due date and still open. */
  overdueCount: number;
  /** Reminders drafted and waiting for approval. */
  draftsWaiting: number;
  /** Reminders that have ever been drafted, whatever happened to them. */
  remindersEver: number;
  /** Reminders a person approved that were sent. */
  approvedCount: number;
  /** Reminders whose invoice was later paid. */
  paidAfterReminder: number;
};

export type ChecklistStep = { id: 'invoices' | 'drafted' | 'approved' | 'paid'; label: string; done: boolean; note: string };

export type NextAction = { label: string; href: string; detail: string } | null;

export type FirstSessionView = {
  steps: ChecklistStep[];
  doneCount: number;
  /** One obvious thing to do now, or null when nothing needs doing. */
  next: NextAction;
  /** Why there is no next action, when there is none. */
  idleNote: string | null;
  /** The setup card is only for accounts that have not approved a reminder yet. */
  showChecklist: boolean;
};

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export function firstSessionView(s: FirstSessionState): FirstSessionView {
  const hasInvoices = s.invoiceCount > 0;
  const drafted = s.remindersEver > 0;
  const approved = s.approvedCount > 0;
  const paid = s.paidAfterReminder > 0;

  const steps: ChecklistStep[] = [
    {
      id: 'invoices',
      label: 'Invoices are in Mugavi',
      done: hasInvoices,
      note: hasInvoices
        ? `${plural(s.invoiceCount, 'invoice')} imported${s.booksConnected ? ' from your books' : ''}.`
        : s.booksConnected && !s.hasSynced
          ? 'Your books are connected. The first sync has not run yet.'
          : 'Connect QuickBooks or Xero, or load sample data.',
    },
    {
      id: 'drafted',
      label: 'Reminders drafted',
      done: drafted,
      note: drafted ? 'Drafted for you to read. Nothing was sent.' : 'Pick a schedule and Mugavi drafts one for each overdue invoice.',
    },
    {
      id: 'approved',
      label: 'First reminder approved',
      done: approved,
      note: approved ? 'You approved it before it went out.' : 'You read it, press approve, and have 30 seconds to undo.',
    },
    {
      id: 'paid',
      label: 'An invoice paid after a reminder',
      done: paid,
      note: paid ? 'It shows under Recovered on the Dunning page.' : 'Ticks by itself when a chased invoice is paid. Nothing to do here.',
    },
  ];

  let next: NextAction = null;
  let idleNote: string | null = null;

  if (s.draftsWaiting > 0) {
    next = {
      label: `Review ${plural(s.draftsWaiting, 'reminder')} waiting`,
      href: '/dashboard/dunning#approvals',
      detail: 'Read each one. Nothing is sent until you approve it.',
    };
  } else if (!hasInvoices) {
    if (s.booksConnected && !s.hasSynced) {
      next = { label: 'Run your first sync', href: '/dashboard/integrations', detail: 'Press Sync now on your connected books to bring in customers and invoices.' };
    } else if (s.booksConnected) {
      idleNote = 'Your books are connected and synced, but no invoices came across. Check that the connected company has invoices.';
    } else {
      next = { label: 'Connect QuickBooks or Xero', href: '/dashboard/integrations', detail: 'Or load sample data there to look around first.' };
    }
  } else if (!drafted) {
    if (s.overdueCount > 0) {
      next = {
        label: `Draft reminders for ${plural(s.overdueCount, 'overdue invoice')}`,
        href: '/dashboard/dunning#starter-heading',
        detail: 'Pick a schedule. Reminders are drafted only. Nothing is sent.',
      };
    } else {
      idleNote = 'Nothing is overdue right now, so there is nothing to remind anyone about. Drafts appear here when an invoice goes past due.';
    }
  } else if (!approved) {
    idleNote = 'No reminders are waiting. New drafts appear after the next daily run.';
  }

  return { steps, doneCount: steps.filter((x) => x.done).length, next, idleNote, showChecklist: !approved };
}
