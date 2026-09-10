'use client';

import Link from 'next/link';
import { MessageSquare, Mail } from 'lucide-react';
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

function RiskBar({ score }: { score: number; level: string }) {
  const color = score > 60 ? 'bg-danger-500' : score > 30 ? 'bg-warn-500' : 'bg-success-500';
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 rounded-full bg-ink-100 overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs text-ink-600 font-mono">{score}</span>
    </div>
  );
}

function ChannelBadge({ channel }: { channel: string }) {
  return channel === 'sms' ? (
    <span className="inline-flex items-center gap-1 text-xs text-ink-600"><MessageSquare className="h-3 w-3" />SMS</span>
  ) : (
    <span className="inline-flex items-center gap-1 text-xs text-ink-600"><Mail className="h-3 w-3" />Email</span>
  );
}

export function CustomersTable({ insights, noDebt }: { insights: Row[]; noDebt: { name: string }[] }) {
  return (
    <>
      {/* Mobile: stacked cards */}
      <div className="md:hidden space-y-3">
        {insights.map((row) => (
          <Link key={row.customerId} href={`/dashboard/customers/${row.customerId}`} className="card block hover:bg-ink-50 transition-colors">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="font-semibold text-ink-900 truncate">{row.name}</div>
                {row.email && <div className="text-xs text-ink-500 truncate">{row.email}</div>}
              </div>
              <div className="text-right shrink-0">
                <div className="font-mono font-semibold text-ink-950">{formatCurrency(row.openBalance)}</div>
                <div className="text-xs text-ink-500">outstanding</div>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between gap-3">
              <div>
                <div className="text-xs text-ink-500">Risk</div>
                <RiskBar score={row.riskScore} level={row.riskLevel} />
                <div className="text-2xs text-ink-500 mt-0.5 capitalize">{row.riskLevel}</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-ink-500">Channel</div>
                <ChannelBadge channel={row.recommendedChannel} />
              </div>
            </div>
            <div className="mt-3 rounded-lg bg-ink-50 p-2 text-xs text-ink-700 line-clamp-2 leading-relaxed">{row.recommendedAction}</div>
            <div className="mt-2 text-2xs text-ink-500">{row.openInvoices} inv · {row.oldestInvoiceDays}d oldest · 7d pay prob: {Math.round(row.predictedPayment7d * 100)}%</div>
          </Link>
        ))}
        {noDebt.length > 0 && (
          <div className="card bg-success-50/50 border-success-200">
            <div className="text-xs text-success-800">
              <b>{noDebt.length} customer{noDebt.length === 1 ? '' : 's'}</b> paid up — {noDebt.slice(0, 3).map((c) => c.name).join(', ')}{noDebt.length > 3 ? `, +${noDebt.length - 3} more` : ''}
            </div>
          </div>
        )}
      </div>

      {/* Desktop: traditional table */}
      <div className="hidden md:block">
        <div className="panel">
          <div className="max-h-[calc(100vh-13rem)] overflow-auto">
            <table className="app-table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Risk</th>
                  <th>Open</th>
                  <th>Channel</th>
                  {/* The AI recommendation was a full-width wall of prose that
                      made every row three lines tall and destroyed scanability.
                      It is capped to one line here and remains in full on the
                      customer record, where there is room to read it. */}
                  <th>Recommended action</th>
                  <th className="col-num">Outstanding</th>
                </tr>
              </thead>
              <tbody>
                {insights.map((row) => {
                  const urgency =
                    row.riskLevel === 'critical' || row.riskLevel === 'high'
                      ? 'row-urgent'
                      : row.riskLevel === 'medium'
                        ? 'row-warn'
                        : '';
                  return (
                    <tr key={row.customerId} className={urgency}>
                      <td>
                        <Link href={`/dashboard/customers/${row.customerId}`} className="group block">
                          <div className="font-medium text-ink-950 group-hover:text-brand-700">{row.name}</div>
                          {row.email && <div className="text-2xs text-ink-500">{row.email}</div>}
                        </Link>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <RiskBar score={row.riskScore} level={row.riskLevel} />
                          <span className="text-2xs capitalize text-ink-500">{row.riskLevel}</span>
                        </div>
                      </td>
                      <td className="whitespace-nowrap text-2xs text-ink-600">
                        <span className="tabular-nums">{row.openInvoices}</span> inv ·{' '}
                        <span className="tabular-nums">{row.oldestInvoiceDays}d</span> oldest
                      </td>
                      <td><ChannelBadge channel={row.recommendedChannel} /></td>
                      <td className="max-w-[22rem]">
                        <div className="truncate text-[13px] text-ink-700" title={row.recommendedAction}>
                          {row.recommendedAction}
                        </div>
                        <div className="text-2xs text-ink-500">
                          <span className="tabular-nums">{Math.round(row.predictedPayment7d * 100)}%</span> chance of payment in 7d
                        </div>
                      </td>
                      <td className="col-num font-medium text-ink-950">{formatCurrency(row.openBalance)}</td>
                    </tr>
                  );
                })}
                {noDebt.length > 0 && (
                  <tr className="bg-success-50">
                    <td colSpan={6} className="text-2xs text-success-700">
                      <b className="tabular-nums">{noDebt.length} customer{noDebt.length === 1 ? '' : 's'}</b> paid up — {noDebt.slice(0, 3).map((c) => c.name).join(', ')}{noDebt.length > 3 ? `, +${noDebt.length - 3} more` : ''}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
