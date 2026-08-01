'use client';
import { useState } from 'react';
import { Sparkles, Send, X, Loader2, Mail, MessageSquare, CheckCircle2, RefreshCw } from 'lucide-react';
import { RecipientCard } from './recipient-card';

interface PreviewProps {
  invoiceId: string;
  customerName: string;
  amount: string;
  currency: string;
  daysOverdue: number;
  channel: 'email' | 'sms';
  tone: 'friendly' | 'firm' | 'final';
  email?: string | null;
  phone?: string | null;
  onSent?: () => void;
  onCancel?: () => void;
}

export function DunningPreview(props: PreviewProps) {
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [content, setContent] = useState<{ subject?: string; body: string } | null>(null);
  const [sent, setSent] = useState(false);

  async function generate() {
    setLoading(true);
    try {
      const res = await fetch('/api/dunning/preview', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          invoiceId: props.invoiceId,
          amount: props.amount,
          currency: props.currency,
          daysOverdue: props.daysOverdue,
          channel: props.channel,
          tone: props.tone,
        }),
      });
      const data = await res.json();
      setContent({ subject: data.subject, body: data.body });
    } finally {
      setLoading(false);
    }
  }

  async function send() {
    if (!content) return;
    setSending(true);
    try {
      await fetch('/api/dunning/send', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ invoiceId: props.invoiceId, channel: props.channel, tone: props.tone, subject: content.subject, body: content.body }),
      });
      setSent(true);
      props.onSent?.();
    } finally {
      setSending(false);
    }
  }

  if (sent) {
    return (
      <div className="text-center py-4">
        <CheckCircle2 className="h-8 w-8 mx-auto text-emerald-600" />
        <h3 className="mt-2 font-semibold text-ink-900">Reminder sent</h3>
        <p className="mt-1 text-sm text-ink-600">We'll pause any further reminders if they pay.</p>
        <button onClick={props.onCancel} className="mt-3 btn-secondary text-sm">Close</button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-ink-900">Generate reminder</h3>
          <p className="text-sm text-ink-600 mt-0.5">AI will write a {props.tone} {props.channel} reminder for {props.customerName}.</p>
        </div>
        <button onClick={props.onCancel} className="btn-ghost text-xs"><X className="h-3.5 w-3.5" /></button>
      </div>

      <RecipientCard
        name={props.customerName}
        channel={props.channel}
        contact={props.channel === 'email' ? props.email : props.phone}
        amount={props.amount}
        currency={props.currency}
        daysOverdue={props.daysOverdue}
      />

      <div className="flex items-center gap-4 text-xs text-ink-600">
        <span className="inline-flex items-center gap-1.5">
          {props.channel === 'email' ? <Mail className="h-3.5 w-3.5 text-ink-400" /> : <MessageSquare className="h-3.5 w-3.5 text-ink-400" />}
          <span className="capitalize font-medium text-ink-900">{props.channel}</span>
        </span>
        <span className={`badge text-[10px] capitalize ${props.tone === 'final' ? 'badge-danger' : props.tone === 'firm' ? 'badge-warn' : 'badge-success'}`}>{props.tone}</span>
      </div>

      {!content ? (
        <button onClick={generate} disabled={loading} className="btn-brand w-full">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          Generate with AI
        </button>
      ) : (
        <div className="space-y-3 animate-fade-in">
          <div className={`rounded-xl border border-ink-200 overflow-hidden shadow-[0_8px_24px_-10px_rgba(16,17,20,0.18)] ${props.channel === 'sms' ? 'bg-gradient-to-b from-ink-50 to-ink-100/60' : 'bg-white'}`}>
            <div className="flex items-center gap-1.5 px-3.5 py-2 bg-ink-50 border-b border-ink-200">
              <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
              <span className="ml-2 flex items-center gap-1 text-[11px] text-ink-400">
                {props.channel === 'sms' ? <MessageSquare className="h-3 w-3" /> : <Mail className="h-3 w-3" />}
                Editing what {props.customerName.split(' ')[0]} will see
              </span>
            </div>
            <div className="p-3.5 space-y-2.5">
              {content.subject && (
                <input
                  value={content.subject}
                  onChange={(e) => setContent({ ...content, subject: e.target.value })}
                  className="w-full text-sm font-semibold text-ink-900 bg-transparent border-0 border-b border-ink-100 pb-2 focus:outline-none focus:border-brand-400"
                  placeholder="Subject"
                />
              )}
              <textarea
                value={content.body}
                onChange={(e) => setContent({ ...content, body: e.target.value })}
                rows={props.channel === 'sms' ? 4 : 8}
                className="w-full text-sm text-ink-800 bg-transparent border-0 resize-none focus:outline-none leading-relaxed"
              />
            </div>
          </div>
          <div className="text-xs text-ink-500 text-right">{content.body.length} chars</div>
          <div className="flex gap-2">
            <button onClick={generate} disabled={loading} className="btn-secondary text-sm flex-1">
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}Regenerate
            </button>
            <button onClick={send} disabled={sending || !(props.channel === 'email' ? props.email : props.phone)} className="btn-primary text-sm flex-1">
              {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}Send reminder
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
