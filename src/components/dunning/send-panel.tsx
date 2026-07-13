'use client';
import { useState } from 'react';
import { DunningPreview } from './preview';
import { Mail, MessageSquare, Sparkles } from 'lucide-react';

export function DunningSendPanel({ invoiceId, customerName, amount, currency, daysOverdue, email, phone, preferredChannel }: { invoiceId: string; customerName: string; amount: string; currency: string; daysOverdue: number; email: string | null; phone: string | null; preferredChannel: string; }) {
  const [open, setOpen] = useState(false);
  const [channel, setChannel] = useState<'email' | 'sms'>(preferredChannel === 'sms' ? 'sms' : 'email');
  const [tone, setTone] = useState<'friendly' | 'firm' | 'final'>(daysOverdue > 30 ? 'final' : daysOverdue > 7 ? 'firm' : 'friendly');

  if (!open) {
    return (
      <div className="card">
        <h2 className="h3">Send a reminder</h2>
        <p className="text-sm text-ink-600 mt-1">Write and send a one-off reminder — or turn on the dunning sequence to do it automatically.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button onClick={() => setOpen(true)} className="btn-brand text-sm">
            <Sparkles className="h-3.5 w-3.5" />Send one-off reminder
          </button>
          <a href="/dashboard/dunning" className="btn-secondary text-sm">Manage sequences</a>
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
        onSent={() => setTimeout(() => setOpen(false), 1500)}
        onCancel={() => setOpen(false)}
      />
    </div>
  );
}
