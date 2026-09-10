'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { daysOverdue, formatCurrency, formatDate } from '@/lib/utils';

function daysFromDue(dueDate: Date | string | null): number {
  if (!dueDate) return 0;
  return daysOverdue(dueDate);
}

type Row = {
  invoice: {
    id: string;
    number: string;
    status: string;
    dueDate: Date | string | null;
    amount: number | string;
    amountPaid: number | string;
    currency: string;
  };
  customer: { id: string; name: string; email?: string | null; phone?: string | null };
};

/* Table craft the `.app-table` token does not carry yet. Written as arbitrary
   variants on the <table> so it compiles into the utilities layer and outranks
   the component defaults without editing globals.css:

     · One rhythm — 44px rows, 36px header — whether a cell holds one line or
       two. A predictable row pitch is what lets the eye drop down a column
       instead of re-finding the next row each time.
     · The separator moves off ink-100, which is invisible against white, onto a
       true hairline. That is what makes zebra striping unnecessary: stripes are
       a crutch for rules you cannot see.
     · 20px optical margin on the first and last column, so a name never touches
       the panel edge and a figure never hangs off it.
     · Uppercase micro-labels in the header. At 11px it is the cheapest way to
       make a column heading unmistakably not-data.
     · A hover that is one warm step, not a highlight. Rows are hovered
       constantly while scanning; anything stronger flickers. */
// "Overdue" is derived from the due date, never read from invoice.status.
// The stored status is only authoritative for the terminal states below: it is
// written by the QBO/Xero sync and goes stale on its own, because an invoice
// crosses into overdue purely through the passage of time, with no sync to
// update it. Trusting it produced rows badged "Overdue" next to a due date
// weeks in the future, which reads as a plain bug to the one user who checks.
function StatusBadge({ invoice, days }: { invoice: Row['invoice']; days: number }) {
  if (invoice.status === 'paid') return <span className="badge-success">Paid</span>;
  if (invoice.status === 'written_off') return <span className="badge-neutral">Written off</span>;
  if (days > 0) return <span className="badge-danger">Overdue</span>;
  // Past-due status with a future due date means the stored value is stale;
  // fall back to the neutral open-invoice label rather than echoing it.
  if (invoice.status === 'overdue') return <span className="badge-neutral">Sent</span>;
  return <span className="badge-neutral capitalize">{invoice.status.replace(/_/g, ' ')}</span>;
}

/* Age carries two channels: the left row edge (severity, seen peripherally
   while scrolling) and this figure (the actual number, read when the eye
   stops). Graded to match the edge so the two never disagree. */
function DaysPastDue({ days }: { days: number }) {
  return (
    <span className={`ml-2 num text-2xs font-medium ${days > 60 ? 'text-danger-700' : 'text-warn-700'}`}>
      {days}d<span className="sr-only"> past due</span>
    </span>
  );
}

export function InvoicesTable({ rows }: { rows: Row[] }) {
  if (rows.length === 0) return null;

  return (
    <>
      {/* Mobile: stacked cards */}
      <div className="md:hidden space-y-2.5">
        {rows.map((row) => {
          const { invoice, customer } = row;
          const days = daysFromDue(invoice.dueDate);
          const balance = Number(invoice.amount) - Number(invoice.amountPaid);
          const settled = invoice.status === 'paid' || invoice.status === 'written_off';
          return (
            <Link
              key={invoice.id}
              href={`/dashboard/invoices/${invoice.id}`}
              className="lift-row block p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="app-label truncate">{customer.name}</div>
                  {/* Mono is reserved for identifiers. */}
                  <div className="mt-0.5 font-mono text-2xs text-ink-500">{invoice.number}</div>
                </div>
                <StatusBadge invoice={invoice} days={days} />
              </div>
              <div className="mt-3 flex items-end justify-between gap-3">
                <div>
                  <div className="app-meta">Due</div>
                  <div className="num mt-0.5 text-[13px] text-ink-700">
                    {formatDate(invoice.dueDate)}
                    {days > 0 && !settled && <DaysPastDue days={days} />}
                  </div>
                </div>
                <div className="text-right">
                  <div className="app-meta">Balance</div>
                  <div className="num-strong mt-0.5 text-[15px]">{formatCurrency(balance, invoice.currency)}</div>
                  <div className="num text-2xs text-ink-400">of {formatCurrency(invoice.amount, invoice.currency)}</div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Desktop table. Rendered in a `.panel` (a card with no padding) so the
          table runs edge to edge and its header can stick — inside the old
          `.card` with p-6 it threw away 48px of horizontal room and a sticky
          header was impossible. */}
      <div className="hidden md:block">
        <div className="panel">
          <div className="max-h-[calc(100vh-13rem)] overflow-auto">
            <table className="app-table head-lift">
              <caption className="sr-only">Invoices, earliest due date first</caption>
              <thead>
                <tr>
                  <th scope="col">Customer</th>
                  {/* Column widths are fixed rather than content-derived: a
                      table whose columns shift between filters cannot be
                      learned, and learning where a column sits is most of what
                      makes a list fast to read the hundredth time. */}
                  <th scope="col" className="w-[124px]">Invoice</th>
                  <th scope="col" className="w-[116px]">Status</th>
                  <th scope="col" className="w-[152px]">Due</th>
                  <th scope="col" className="col-num w-[128px]">Amount</th>
                  <th scope="col" className="col-num w-[140px]">Balance</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const { invoice, customer } = row;
                  const days = daysFromDue(invoice.dueDate);
                  const balance = Number(invoice.amount) - Number(invoice.amountPaid);
                  const settled = invoice.status === 'paid' || invoice.status === 'written_off';
                  // Urgency reads as an edge rather than a row fill, so the row
                  // itself stays legible while 90+ items remain scannable down
                  // the left margin. Quiet rows carry the same 2px edge in
                  // transparent — otherwise every urgent row shunts its text
                  // 2px right of its neighbours and the first column stops
                  // being a column.
                  const urgency = settled
                    ? ''
                    : days > 60
                      ? 'row-urgent'
                      : days > 0
                        ? 'row-warn'
                        : '';
                  return (
                    <tr key={invoice.id} className={`group ${urgency}`}>
                      <td className="max-w-[280px]">
                        <Link href={`/dashboard/invoices/${invoice.id}`} className="flex items-center gap-1.5">
                          <span className="min-w-0">
                            <span className="block truncate text-[13px] font-medium leading-[18px] text-ink-950 transition-colors group-hover:text-brand-700">
                              {customer.name}
                            </span>
                            <span className="block truncate text-2xs leading-4 text-ink-400">
                              {customer.email ?? customer.phone}
                            </span>
                          </span>
                          {/* The row is not clickable, only this cell is — the
                              chevron on hover is what says so. */}
                          <ChevronRight
                            aria-hidden="true"
                            className="h-3.5 w-3.5 shrink-0 text-ink-300 opacity-0 transition-opacity group-hover:opacity-100"
                          />
                        </Link>
                      </td>
                      <td className="font-mono text-2xs text-ink-500">{invoice.number}</td>
                      <td><StatusBadge invoice={invoice} days={days} /></td>
                      {/* Dates get tabular figures too: it is what keeps the
                          day and year digits in a column down the page. */}
                      <td className="num whitespace-nowrap text-ink-600">
                        {formatDate(invoice.dueDate)}
                        {days > 0 && !settled && <DaysPastDue days={days} />}
                      </td>
                      {/* Two money columns next to each other need a hierarchy
                          or the eye reads neither: the invoice total is context,
                          the balance is the number a bookkeeper is here for.
                          A settled row has nothing left to collect, so its zero
                          recedes instead of competing with live balances. */}
                      <td className="col-num text-ink-500">{formatCurrency(invoice.amount, invoice.currency)}</td>
                      <td className={`col-num ${settled ? 'text-ink-400' : 'num-strong'}`}>
                        {formatCurrency(balance, invoice.currency)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
