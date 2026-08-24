'use client';
import { useState } from 'react';
import { DunningPreview } from './preview';
import { Sparkles, Phone } from 'lucide-react';

export function DunningSendPanel({
  invoiceId, customerName, amount, currency, daysOverdue, email, phone,
  riskLevel, recommendedAction, recommendedChannel, predictedPayment7d,
}: {
  invoiceId: string;
  customerName: string;
  amount: string;
  currency: string;
  daysOverdue: number;
  email: string | null;
  phone: string | null;
  preferredChannel: string;
  riskLevel?: 'low' | 'medium' | 'high' | 'critical';
  riskScore?: number;
  recommendedAction?: string;
  recommendedChannel?: 'email' | 'sms' | 'phone';
  predictedPayment7d?: number;
}) {
  const [open, setOpen] = useState(false);
  const [channel] = useState<'email' | 'sms'>(recommendedChannel === 'phone' ? (email ? 'email' : 'sms') : (recommendedChannel === 'sms' ? 'sms' : 'email'));
  const [tone] = useState<'friendly' | 'firm' | 'final'>(
    riskLevel === 'critical' || daysOverdue > 30 ? 'final' :
    riskLevel === 'high' || daysOverdue > 7 ? 'firm' :
    'friendly'
  );

  if (!open) {
    return (
      <div className="card">
        <h2 className="h3">Send a reminder</h2>
        <p className="text-sm text-ink-600 mt-1">Write and send a one-off reminder — or turn on the dunning sequence to do it automatically.</p>
        {recommendedAction && (
          <div className="mt-4 rounded-lg border border-brand-200 bg-brand-50/50 p-3 flex items-start gap-2.5">
            <Sparkles className="h-4 w-4 text-brand-600 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-brand-900 uppercase tracking-wider">AI recommendation</div>
              <p className="mt-1 text-sm text-brand-900 leading-relaxed">{recommendedAction}</p>
              {predictedPayment7d !== undefined && (
                <div className="mt-2 flex items-center gap-3 text-xs text-brand-800">
                  <span>7d payment probability: <b className="text-brand-900">{Math.round(predictedPayment7d * 100)}%</b></span>
                  {recommendedChannel && <span>Suggested channel: <b className="text-brand-900 capitalize">{recommendedChannel}</b></span>}
                </div>
              )}
            </div>
          </div>
        )}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button onClick={() => setOpen(true)} className="btn-brand text-sm">
            <Sparkles className="h-3.5 w-3.5" />
            {daysOverdue > 0 ? `Send a ${tone} reminder` : 'Send a reminder'}
          </button>
          {recommendedChannel === 'phone' && phone && (
            <a href={`tel:${phone}`} className="btn-secondary text-sm">
              <Phone className="h-3.5 w-3.5" />Call customer
            </a>
          )}
          <a href="/dashboard/dunning/sequence" className="btn-ghost text-sm">Manage sequences →</a>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <DunningPreview
        invoiceId={invoiceId}
        customerName={customerName}
        amount={amount}
        currency={currency}
        daysOverdue={daysOverdue}
        channel={channel}
        tone={tone}
        email={email}
        phone={phone}
        onSent={() => setTimeout(() => setOpen(false), 1500)}
        onCancel={() => setOpen(false)}
      />
    </div>
  );
}
