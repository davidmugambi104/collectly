'use client';

import Link from 'next/link';
import { MessageSquare, Mail, ChevronRight } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

type Row = {
  customerId: string;
  name: string;
  email?: string | null;
  riskScore: number;
  riskLevel: string;
  openInvoices: number;
  oldestInvoiceDays: number;
  recommendedChannel: 'sms' | 'email' | string;
  recommendedAction: string;
  predictedPayment7d: number;
  openBalance: number;
};

/* Same craft set as the invoices table — see the comment there for why each of
   these exists. Held identical on purpose: two lists that share a shape and
   differ by a few pixels feel like two products. */
/* Duplicated from invoices-table.tsx; belongs beside `.app-table` in
   globals.css, which another owner holds. */
/* The figure leads and the meter follows, both at a fixed width. With the number
   after a variable-length bar it landed at a different x on every row, so the
   one part of this cell you can actually compare was the part you had to hunt
   for. Now scores read as a numeric column and every bar starts on the same
   axis. The bar is the redundant channel, not the primary one — hence the
   single accessible name covering the pair. */
function RiskBar({ score, level }: { score: number; level: string }) {
  const fill = score > 60 ? 'bg-danger-500' : score > 30 ? 'bg-warn-500' : 'bg-success-500';
  return (
    <span className="inline-flex items-center gap-2" role="img" aria-label={`Risk score ${score} of 100, ${level}`}>
      <span className="num w-[18px] text-right text-2xs font-medium text-ink-700">{score}</span>
      <span aria-hidden="true" className="meter block h-1 w-14">
        <span className={`block ${fill}`} style={{ width: `${Math.min(100, Math.max(0, score))}%` }} />
      </span>
    </span>
  );
}

function ChannelBadge({ channel }: { channel: string }) {
  const Icon = channel === 'sms' ? MessageSquare : Mail;
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-2xs font-medium text-ink-600">
      <Icon aria-hidden="true" className="h-3 w-3 shrink-0 text-ink-400" />
      {channel === 'sms' ? 'SMS' : 'Email'}
    </span>
  );
}

export function CustomersTable({ insights, noDebt }: { insights: Row[]; noDebt: { name: string }[] }) {
  const paidUpNote = (
    <>
      <b className="num-strong">
        {noDebt.length} customer{noDebt.length === 1 ? '' : 's'}
      </b>{' '}
      paid up — {noDebt.slice(0, 3).map((c) => c.name).join(', ')}
      {noDebt.length > 3 ? `, +${noDebt.length - 3} more` : ''}
    </>
  );

  return (
    <>
      {/* Mobile: stacked cards */}
      <div className="md:hidden space-y-2.5">
        {insights.map((row) => (
          <Link
            key={row.customerId}
            href={`/dashboard/customers/${row.customerId}`}
            className="lift-row block p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="app-label truncate">{row.name}</div>
                {row.email && <div className="truncate text-2xs text-ink-500">{row.email}</div>}
              </div>
              <div className="shrink-0 text-right">
                <div className="num-strong text-[15px]">{formatCurrency(row.openBalance)}</div>
                <div className="app-meta">outstanding</div>
              </div>
            </div>
            <div className="mt-3 flex items-end justify-between gap-3">
              <div>
                <div className="app-meta">Risk</div>
                <div className="mt-1"><RiskBar score={row.riskScore} level={row.riskLevel} /></div>
              </div>
              <div className="text-right">
                <div className="app-meta">Channel</div>
                <div className="mt-1"><ChannelBadge channel={row.recommendedChannel} /></div>
              </div>
            </div>
            <div className="mt-3 rounded-lg border border-ink-200/70 bg-ink-50 p-2 text-2xs leading-4 text-ink-700 line-clamp-2">
              {row.recommendedAction}
            </div>
            <div className="app-meta mt-2 num">
              {row.openInvoices} inv · {row.oldestInvoiceDays}d oldest · 7d pay prob: {Math.round(row.predictedPayment7d * 100)}%
            </div>
          </Link>
        ))}
        {noDebt.length > 0 && (
          /* Not an alert, so not an alert-coloured box: a quiet note with a
             single success dot, matching how status reads everywhere else. */
          <div className="flex items-start gap-2 rounded-xl border border-ink-200/70 bg-ink-50 p-3 text-2xs leading-4 text-ink-600">
            <span aria-hidden="true" className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-success-500" />
            <span>{paidUpNote}</span>
          </div>
        )}
      </div>

      {/* Desktop: traditional table */}
      <div className="hidden md:block">
        <div className="panel">
          <div className="max-h-[calc(100vh-13rem)] overflow-auto">
            <table className="app-table head-lift">
              <caption className="sr-only">Customers with an open balance, highest risk first</caption>
              <thead>
                <tr>
                  <th scope="col">Customer</th>
                  <th scope="col" className="w-[132px]">Risk</th>
                  <th scope="col" className="w-[128px]">Open</th>
                  <th scope="col" className="w-[88px]">Channel</th>
                  {/* The AI recommendation was a full-width wall of prose that
                      made every row three lines tall and destroyed scanability.
                      It is capped to one line here and remains in full on the
                      customer record, where there is room to read it. */}
                  <th scope="col">Recommended action</th>
                  <th scope="col" className="col-num w-[136px]">Outstanding</th>
                </tr>
              </thead>
              <tbody>
                {insights.map((row) => {
                  // Severity as a left edge, with the quiet rows reserving the
                  // same 2px in transparent so the first column stays a column.
                  const urgency =
                    row.riskLevel === 'critical' || row.riskLevel === 'high'
                      ? 'row-urgent'
                      : row.riskLevel === 'medium'
                        ? 'row-warn'
                        : '';
                  return (
                    <tr key={row.customerId} className={`group ${urgency}`}>
                      <td className="max-w-[220px]">
                        <Link href={`/dashboard/customers/${row.customerId}`} className="flex items-center gap-1.5">
                          <span className="min-w-0">
                            <span className="block truncate text-[13px] font-medium leading-[18px] text-ink-950 transition-colors group-hover:text-brand-700">
                              {row.name}
                            </span>
                            {row.email && (
                              <span className="block truncate text-2xs leading-4 text-ink-400">{row.email}</span>
                            )}
                          </span>
                          <ChevronRight
                            aria-hidden="true"
                            className="h-3.5 w-3.5 shrink-0 text-ink-300 opacity-0 transition-opacity group-hover:opacity-100"
                          />
                        </Link>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <RiskBar score={row.riskScore} level={row.riskLevel} />
                          <span className="text-2xs capitalize text-ink-500">{row.riskLevel}</span>
                        </div>
                      </td>
                      {/* Units drop back so the digits carry the column. */}
                      <td className="whitespace-nowrap text-2xs text-ink-500">
                        <span className="num font-medium text-ink-700">{row.openInvoices}</span> inv ·{' '}
                        <span className="num font-medium text-ink-700">{row.oldestInvoiceDays}d</span> oldest
                      </td>
                      <td><ChannelBadge channel={row.recommendedChannel} /></td>
                      <td className="max-w-[24rem]">
                        <div className="truncate text-[13px] leading-[18px] text-ink-700" title={row.recommendedAction}>
                          {row.recommendedAction}
                        </div>
                        <div className="text-2xs leading-4 text-ink-400">
                          <span className="num">{Math.round(row.predictedPayment7d * 100)}%</span> chance of payment in 7d
                        </div>
                      </td>
                      <td className="col-num num-strong">{formatCurrency(row.openBalance)}</td>
                    </tr>
                  );
                })}
              </tbody>
              {noDebt.length > 0 && (
                /* A summary of rows that are NOT in this table is a footer, not a
                   row of it — putting it in <tfoot> stops it from reading as a
                   customer, and drops the full-width green wash that made the
                   quietest line on the page the loudest. */
                <tfoot>
                  <tr>
                    <td colSpan={6} className="border-t border-hair border-ink-200 bg-ink-50/80 px-5 py-2.5 text-2xs leading-4 text-ink-600">
                      <span aria-hidden="true" className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-success-500 align-middle" />
                      {paidUpNote}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
