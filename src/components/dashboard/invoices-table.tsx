'use client';

import Link from 'next/link';
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

export function InvoicesTable({ rows }: { rows: Row[] }) {
  if (rows.length === 0) return null;

  return (
    <>
      {/* Mobile: stacked cards */}
      <div className="md:hidden space-y-3">
        {rows.map((row) => {
          const { invoice, customer } = row;
          const days = daysFromDue(invoice.dueDate);
          const balance = Number(invoice.amount) - Number(invoice.amountPaid);
          return (
            <Link key={invoice.id} href={`/dashboard/invoices/${invoice.id}`} className="card block hover:bg-ink-50 transition-colors">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold text-ink-900 truncate">{customer.name}</div>
                  <div className="text-xs text-ink-500 font-mono mt-0.5">{invoice.number}</div>
                </div>
                <StatusBadge invoice={invoice} days={days} />
              </div>
              <div className="mt-3 flex items-center justify-between text-sm">
                <div>
                  <div className="text-xs text-ink-500">Due</div>
                  <div className="text-ink-700">{formatDate(invoice.dueDate)}</div>
                  {days > 0 && invoice.status !== 'paid' && (
                    <div className="text-xs text-danger-600 font-medium">{days} days overdue</div>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-xs text-ink-500">Balance</div>
                  <div className="font-mono font-semibold text-ink-950">{formatCurrency(balance, invoice.currency)}</div>
                  <div className="text-xs text-ink-500 font-mono">of {formatCurrency(invoice.amount, invoice.currency)}</div>
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
            <table className="app-table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Invoice</th>
                  <th>Status</th>
                  <th>Due</th>
                  <th className="col-num">Amount</th>
                  <th className="col-num">Balance</th>
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
                  // the left margin.
                  const urgency = settled ? '' : days > 60 ? 'row-urgent' : days > 0 ? 'row-warn' : '';
                  return (
                    <tr key={invoice.id} className={urgency}>
                      <td>
                        <Link href={`/dashboard/invoices/${invoice.id}`} className="block">
                          <div className="font-medium text-ink-950">{customer.name}</div>
                          <div className="text-2xs text-ink-500">{customer.email ?? customer.phone}</div>
                        </Link>
                      </td>
                      {/* Mono is reserved for identifiers now, not money. */}
                      <td className="font-mono text-2xs text-ink-500">{invoice.number}</td>
                      <td><StatusBadge invoice={invoice} days={days} /></td>
                      <td className="whitespace-nowrap text-ink-700">
                        {formatDate(invoice.dueDate)}
                        {days > 0 && !settled && (
                          <span className="ml-1.5 text-2xs font-medium tabular-nums text-danger-700">
                            {days}d
                          </span>
                        )}
                      </td>
                      <td className="col-num text-ink-600">{formatCurrency(invoice.amount, invoice.currency)}</td>
                      <td className="col-num font-medium text-ink-950">{formatCurrency(balance, invoice.currency)}</td>
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
