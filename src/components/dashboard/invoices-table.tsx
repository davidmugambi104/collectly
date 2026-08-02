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

function StatusBadge({ invoice, days }: { invoice: Row['invoice']; days: number }) {
  if (invoice.status === 'paid') return <span className="badge-success">Paid</span>;
  if (invoice.status === 'written_off') return <span className="badge-neutral">Written off</span>;
  if (invoice.status === 'overdue' || days > 0) return <span className="badge-danger">Overdue</span>;
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
                    <div className="text-xs text-red-600 font-medium">{days} days overdue</div>
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

      {/* Desktop: traditional table */}
      <div className="hidden md:block card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-ink-500 text-xs uppercase tracking-wider">
              <th className="pb-2 pr-4">Customer</th>
              <th className="pb-2 px-4">Invoice</th>
              <th className="pb-2 px-4">Status</th>
              <th className="pb-2 px-4">Due</th>
              <th className="pb-2 px-4 text-right">Amount</th>
              <th className="pb-2 pl-4 text-right">Balance</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const { invoice, customer } = row;
              const days = daysFromDue(invoice.dueDate);
              const balance = Number(invoice.amount) - Number(invoice.amountPaid);
              return (
                <tr key={invoice.id} className="border-t border-ink-100 hover:bg-ink-50">
                  <td className="py-3 pr-4">
                    <Link href={`/dashboard/invoices/${invoice.id}`} className="block">
                      <div className="font-medium text-ink-900">{customer.name}</div>
                      <div className="text-xs text-ink-500">{customer.email ?? customer.phone}</div>
                    </Link>
                  </td>
                  <td className="py-3 px-4 font-mono text-xs text-ink-700">{invoice.number}</td>
                  <td className="py-3 px-4">
                    <StatusBadge invoice={invoice} days={days} />
                  </td>
                  <td className="py-3 px-4 text-ink-700">{formatDate(invoice.dueDate)}</td>
                  <td className="py-3 px-4 text-right font-mono">{formatCurrency(invoice.amount, invoice.currency)}</td>
                  <td className="py-3 pl-4 text-right font-mono font-semibold">{formatCurrency(balance, invoice.currency)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
