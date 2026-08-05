'use client';

import Link from 'next/link';
import { MessageSquare, Mail, Sparkles } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { dunningComposeHref, canDunningCompose, type RiskLevel, type RecommendedChannel } from '@/lib/dunning/compose-link';

type Row = {
  customerId: string;
  name: string;
  email: string | null;
  phone: string | null;
  riskScore: number;
  riskLevel: RiskLevel;
  openInvoices: number;
  oldestInvoiceDays: number;
  recommendedChannel: RecommendedChannel;
  recommendedAction: string;
  predictedPayment7d: number;
  openBalance: number;
};

function RiskBar({ score, level }: { score: number; level: string }) {
  const color = score > 60 ? 'bg-red-500' : score > 30 ? 'bg-amber-500' : 'bg-emerald-500';
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
          <div key={row.customerId} className="card">
            <Link href={`/dashboard/customers/${row.customerId}`} className="block hover:opacity-80 transition-opacity">
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
                  <div className="text-[10px] text-ink-500 mt-0.5 capitalize">{row.riskLevel}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-ink-500">Channel</div>
                  <ChannelBadge channel={row.recommendedChannel} />
                </div>
              </div>
              <div className="mt-3 rounded-lg bg-ink-50 p-2 text-xs text-ink-700 line-clamp-2 leading-relaxed">{row.recommendedAction}</div>
              <div className="mt-2 text-[10px] text-ink-500">{row.openInvoices} inv · {row.oldestInvoiceDays}d oldest · 7d pay prob: {Math.round(row.predictedPayment7d * 100)}%</div>
            </Link>
            <div className="mt-3 pt-3 border-t border-ink-100">
              {canDunningCompose(row) ? (
                <Link href={dunningComposeHref(row)} className="btn-primary text-xs w-full justify-center">
                  <Sparkles className="h-3 w-3" />Send reminder
                </Link>
              ) : (
                <div className="text-center text-[10px] text-ink-400 py-1">No email or phone on file</div>
              )}
            </div>
          </div>
        ))}
        {noDebt.length > 0 && (
          <div className="card bg-emerald-50/50 border-emerald-200">
            <div className="text-xs text-emerald-800">
              <b>{noDebt.length} customer{noDebt.length === 1 ? '' : 's'}</b> paid up — {noDebt.slice(0, 3).map((c) => c.name).join(', ')}{noDebt.length > 3 ? `, +${noDebt.length - 3} more` : ''}
            </div>
          </div>
        )}
      </div>

      {/* Desktop: traditional table */}
      <div className="hidden md:block card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-ink-500 text-xs uppercase tracking-wider">
              <th className="pb-2 pr-4">Customer</th>
              <th className="pb-2 px-4">Risk</th>
              <th className="pb-2 px-4">Open</th>
              <th className="pb-2 px-4">Channel</th>
              <th className="pb-2 px-4">AI recommendation</th>
              <th className="pb-2 px-4 text-right">Outstanding</th>
              <th className="pb-2 pl-4"></th>
            </tr>
          </thead>
          <tbody>
            {insights.map((row) => (
              <tr key={row.customerId} className="border-t border-ink-100 hover:bg-ink-50">
                <td className="py-3 pr-4">
                  <Link href={`/dashboard/customers/${row.customerId}`} className="block group">
                    <div className="font-medium text-ink-900 group-hover:text-brand-700">{row.name}</div>
                    {row.email && <div className="text-xs text-ink-500">{row.email}</div>}
                  </Link>
                </td>
                <td className="py-3 px-4">
                  <RiskBar score={row.riskScore} level={row.riskLevel} />
                  <div className="text-[10px] text-ink-500 mt-0.5 capitalize">{row.riskLevel}</div>
                </td>
                <td className="py-3 px-4">
                  <div className="text-xs text-ink-600">{row.openInvoices} inv · {row.oldestInvoiceDays}d oldest</div>
                </td>
                <td className="py-3 px-4">
                  <ChannelBadge channel={row.recommendedChannel} />
                </td>
                <td className="py-3 px-4 max-w-md">
                  <div className="text-xs text-ink-700 line-clamp-2 leading-relaxed">{row.recommendedAction}</div>
                  <div className="text-[10px] text-ink-500 mt-0.5">7d payment prob: {Math.round(row.predictedPayment7d * 100)}%</div>
                </td>
                <td className="py-3 px-4 text-right font-mono font-semibold">{formatCurrency(row.openBalance)}</td>
                <td className="py-3 pl-4 text-right">
                  {canDunningCompose(row) ? (
                    <Link
                      href={dunningComposeHref(row)}
                      className="btn-primary text-xs whitespace-nowrap"
                      title="Draft and send a reminder to this customer"
                    >
                      <Sparkles className="h-3 w-3" />Send
                    </Link>
                  ) : (
                    <span className="text-[10px] text-ink-400 whitespace-nowrap" title="No email or phone on file">No contact</span>
                  )}
                </td>
              </tr>
            ))}
            {noDebt.length > 0 && (
              <tr className="bg-emerald-50/30">
                <td colSpan={7} className="py-3 px-4 text-xs text-emerald-700">
                  <b>{noDebt.length} customer{noDebt.length === 1 ? '' : 's'}</b> paid up — {noDebt.slice(0, 3).map((c) => c.name).join(', ')}{noDebt.length > 3 ? `, +${noDebt.length - 3} more` : ''}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
