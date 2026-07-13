'use client';
import { useState } from 'react';
import { Sparkles, Send, X, Loader2, Mail, MessageSquare, CheckCircle2, RefreshCw } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface PreviewProps {
  invoiceId: string;
  customerName: string;
  amount: string;
  currency: string;
  daysOverdue: number;
  channel: 'email' | 'sms';
  tone: 'friendly' | 'firm' | 'final';
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

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <div className="text-xs text-ink-500 mb-1">Channel</div>
          <div className="flex items-center gap-2 font-medium text-ink-900">
            {props.channel === 'email' ? <Mail className="h-4 w-4" /> : <MessageSquare className="h-4 w-4" />}
            <span className="capitalize">{props.channel}</span>
          </div>
        </div>
        <div>
          <div className="text-xs text-ink-500 mb-1">Tone</div>
          <div className="font-medium text-ink-900 capitalize">{props.tone}</div>
        </div>
        <div>
          <div className="text-xs text-ink-500 mb-1">Days overdue</div>
          <div className="font-medium text-ink-900">{props.daysOverdue}d</div>
        </div>
        <div>
          <div className="text-xs text-ink-500 mb-1">Amount</div>
          <div className="font-mono font-medium text-ink-900">{formatCurrency(props.amount, props.currency)}</div>
        </div>
      </div>

      {!content ? (
        <button onClick={generate} disabled={loading} className="btn-brand w-full">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          Generate with AI
        </button>
      ) : (
        <div className="space-y-3">
          {content.subject && (
            <div>
              <label className="label">Subject</label>
              <input value={content.subject} onChange={(e) => setContent({ ...content, subject: e.target.value })} className="input" />
            </div>
          )}
          <div>
            <label className="label">Body</label>
            <textarea value={content.body} onChange={(e) => setContent({ ...content, body: e.target.value })} rows={props.channel === 'sms' ? 4 : 8} className="input font-mono text-xs" />
            <div className="text-xs text-ink-500 mt-1 text-right">{content.body.length} chars</div>
          </div>
          <div className="flex gap-2">
            <button onClick={generate} disabled={loading} className="btn-secondary text-sm flex-1">
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}Regenerate
            </button>
            <button onClick={send} disabled={sending} className="btn-primary text-sm flex-1">
              {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}Send reminder
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
