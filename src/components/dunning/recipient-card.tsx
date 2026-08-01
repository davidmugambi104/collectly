import { Mail, MessageSquare, Clock, Receipt } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

/**
 * The "who is this actually going to" card. Deliberately more structured
 * than a one-line summary — every field the AI used to write the message
 * (contact, invoice, balance, days overdue) is visible here, so nothing
 * about what's about to be sent is left implicit.
 */
export function RecipientCard({
  name,
  channel,
  contact,
  invoiceNumber,
  amount,
  currency = 'USD',
  daysOverdue,
  className = '',
}: {
  name: string;
  channel: 'email' | 'sms';
  contact: string | null | undefined;
  invoiceNumber?: string | null;
  amount?: string | number | null;
  currency?: string;
  daysOverdue?: number | null;
  className?: string;
}) {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('') || '?';
  const hasContact = !!contact;

  return (
    <div className={`animate-fade-in rounded-xl border border-ink-200 bg-white p-3.5 flex items-center gap-3 ${className}`}>
      <div className="h-10 w-10 rounded-full bg-brand-100 text-brand-700 grid place-items-center font-semibold text-sm shrink-0">
        {initials}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <div className="text-sm font-semibold text-ink-900 truncate">{name}</div>
          {daysOverdue !== undefined && daysOverdue !== null && (
            <span className="badge badge-warn text-[10px] shrink-0 inline-flex items-center gap-1">
              <Clock className="h-2.5 w-2.5" />{daysOverdue}d overdue
            </span>
          )}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-600">
          <span className={`inline-flex items-center gap-1 ${hasContact ? '' : 'text-red-600 font-medium'}`}>
            {channel === 'email' ? <Mail className="h-3 w-3 shrink-0" /> : <MessageSquare className="h-3 w-3 shrink-0" />}
            {contact ?? `no ${channel === 'email' ? 'email' : 'phone'} on file`}
          </span>
          {invoiceNumber && (
            <span className="inline-flex items-center gap-1">
              <Receipt className="h-3 w-3 shrink-0 text-ink-400" />Invoice {invoiceNumber}
            </span>
          )}
          {amount !== undefined && amount !== null && (
            <span className="font-mono font-medium text-ink-900">{formatCurrency(amount, currency)}</span>
          )}
        </div>
      </div>
    </div>
  );
}
