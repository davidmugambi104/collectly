'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, CheckCircle2, X, Mail } from 'lucide-react';
import { formatDate } from '@/lib/utils';

type InboxItem = {
  id: string;
  fromAddress: string | null;
  fromName: string | null;
  subject: string | null;
  body: string;
  classification: string;
  aiSummary: string | null;
  aiRecommendedAction: string | null;
  aiSuggestedPromiseDate: string | Date | null;
  status: string;
  receivedAt: string | Date;
  customerId: string | null;
  customerName: string | null;
  invoiceNumber: string | null;
};

const CLASSIFICATION_STYLE: Record<string, { label: string; className: string }> = {
  will_pay_date: { label: 'Will pay by date', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  already_paid: { label: 'Says already paid', className: 'bg-blue-100 text-blue-700 border-blue-200' },
  disputed: { label: 'Disputed', className: 'bg-red-100 text-red-700 border-red-200' },
  missing_po: { label: 'Needs PO / paperwork', className: 'bg-amber-100 text-amber-700 border-amber-200' },
  wrong_contact: { label: 'Wrong contact', className: 'bg-ink-100 text-ink-700 border-ink-200' },
  needs_payment_plan: { label: 'Wants a payment plan', className: 'bg-purple-100 text-purple-700 border-purple-200' },
  general_question: { label: 'General question', className: 'bg-ink-100 text-ink-700 border-ink-200' },
  no_action: { label: 'No action needed', className: 'bg-ink-100 text-ink-500 border-ink-200' },
  unclassified: { label: 'Unclassified', className: 'bg-ink-100 text-ink-500 border-ink-200' },
};

export function InboxList({ items, configured = true }: { items: InboxItem[]; configured?: boolean }) {
  const router = useRouter();
  const [filter, setFilter] = useState<'new' | 'handled' | 'dismissed' | 'all'>('new');
  const [actingId, setActingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filtered = filter === 'all' ? items : items.filter((m) => m.status === filter);

  async function setStatus(id: string, status: 'handled' | 'dismissed') {
    setActingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/inbox/${id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Failed');
      router.refresh();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setActingId(null);
    }
  }

  const counts = {
    new: items.filter((m) => m.status === 'new').length,
    handled: items.filter((m) => m.status === 'handled').length,
    dismissed: items.filter((m) => m.status === 'dismissed').length,
    all: items.length,
  };

  return (
    <div>
      {!configured && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3.5 text-sm text-amber-900 mb-5">
          <div className="font-medium">Reply capture isn't set up yet</div>
          <p className="mt-1 text-amber-800">
            This page is built and ready, but nothing will ever land here until a dedicated mailbox is connected for
            AR reply capture. Customers who reply to a dunning email still reach you — the reply just goes to your
            normal inbox instead of showing up here, classified, with a suggested next step.
          </p>
        </div>
      )}

      <div className="flex gap-2 mb-5">
        {(['new', 'handled', 'dismissed', 'all'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`text-xs px-3 py-1.5 rounded-lg border capitalize ${
              filter === f ? 'bg-brand-50 text-brand-900 border-brand-200 font-medium' : 'bg-white text-ink-600 border-ink-200 hover:bg-ink-50'
            }`}
          >
            {f} ({counts[f]})
          </button>
        ))}
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 mb-4">{error}</div>}

      {filtered.length === 0 ? (
        <div className="card text-center py-12">
          <Mail className="h-8 w-8 mx-auto text-ink-300" />
          <h3 className="mt-3 font-semibold text-ink-900">No {filter === 'all' ? '' : filter} messages</h3>
          <p className="mt-1 text-sm text-ink-600">
            {configured
              ? 'Replies to dunning emails will show up here automatically.'
              : 'Nothing to show until reply capture is set up (see above).'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((m) => {
            const style = CLASSIFICATION_STYLE[m.classification] ?? CLASSIFICATION_STYLE.unclassified;
            return (
              <div key={m.id} className="card">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-ink-900">{m.fromName || m.fromAddress || 'Unknown sender'}</span>
                      <span className={`badge border ${style.className}`}>{style.label}</span>
                      {m.customerName && m.customerId && (
                        <Link href={`/dashboard/customers/${m.customerId}`} className="text-xs text-brand-700 hover:underline">
                          {m.customerName}{m.invoiceNumber ? ` · ${m.invoiceNumber}` : ''}
                        </Link>
                      )}
                    </div>
                    {m.subject && <div className="text-sm text-ink-700 mt-1 font-medium">{m.subject}</div>}
                    <div className="text-sm text-ink-600 mt-1 whitespace-pre-wrap line-clamp-3">{m.body}</div>
                    {m.aiSummary && (
                      <div className="mt-2 bg-brand-50/60 border border-brand-100 rounded-lg p-2.5 text-xs">
                        <div className="text-ink-800"><span className="font-semibold">AI summary:</span> {m.aiSummary}</div>
                        {m.aiRecommendedAction && (
                          <div className="text-ink-700 mt-1"><span className="font-semibold">Recommended:</span> {m.aiRecommendedAction}</div>
                        )}
                        {m.aiSuggestedPromiseDate && (
                          <div className="text-ink-700 mt-1"><span className="font-semibold">Suggested date:</span> {formatDate(m.aiSuggestedPromiseDate)}</div>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-xs text-ink-500 whitespace-nowrap">{formatDate(m.receivedAt)}</div>
                    {m.status === 'new' && (
                      <div className="flex gap-2 mt-2">
                        <button
                          disabled={actingId === m.id}
                          onClick={() => setStatus(m.id, 'handled')}
                          className="btn-secondary text-xs"
                          title="Mark handled"
                        >
                          {actingId === m.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />} Handled
                        </button>
                        <button
                          disabled={actingId === m.id}
                          onClick={() => setStatus(m.id, 'dismissed')}
                          className="btn-secondary text-xs"
                          title="Dismiss"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                    {m.status !== 'new' && (
                      <span className="badge bg-ink-100 text-ink-600 border-ink-200 mt-2 inline-block capitalize">{m.status}</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
