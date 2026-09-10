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

// Nine bespoke coloured pills (`bg-*-100 text-*-700 border-*-200`, two of them
// on raw blue-*/purple-* with no token behind them) became nine walls of colour
// in a stacked list. These now map onto the system badges: a neutral chip whose
// hue survives only in the 6px dot, with the label always carrying the meaning.
const CLASSIFICATION_STYLE: Record<string, { label: string; className: string }> = {
  will_pay_date: { label: 'Will pay by date', className: 'badge-success' },
  already_paid: { label: 'Says already paid', className: 'badge-info' },
  disputed: { label: 'Disputed', className: 'badge-danger' },
  missing_po: { label: 'Needs PO / paperwork', className: 'badge-warn' },
  wrong_contact: { label: 'Wrong contact', className: 'badge-neutral' },
  needs_payment_plan: { label: 'Wants a payment plan', className: 'badge-info' },
  general_question: { label: 'General question', className: 'badge-neutral' },
  no_action: { label: 'No action needed', className: 'badge-neutral' },
  unclassified: { label: 'Unclassified', className: 'badge-neutral' },
};

export function InboxList({ items }: { items: InboxItem[] }) {
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
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
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
      {/* Real segmented control rather than four independently-bordered pills.
          aria-pressed carries the active state to assistive tech, which the
          colour-only treatment never did. */}
      <div className="segmented mb-5">
        {(['new', 'handled', 'dismissed', 'all'] as const).map((f) => (
          <button
            key={f}
            type="button"
            aria-pressed={filter === f}
            onClick={() => setFilter(f)}
            className="segmented-item capitalize"
          >
            {f} <span className="segmented-count">{counts[f]}</span>
          </button>
        ))}
      </div>

      {error && <div role="alert" className="mb-4 rounded-lg border border-danger-200 bg-danger-50 p-3 text-[13px] text-danger-700">{error}</div>}

      {filtered.length === 0 ? (
        <div className="card text-center py-12">
          <Mail className="h-8 w-8 mx-auto text-ink-300" />
          <h2 className="app-heading mt-3">No {filter === 'all' ? '' : filter} messages</h2>
          <p className="app-body mt-1">Replies to dunning emails will show up here automatically.</p>
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
                      <span className="app-label">{m.fromName || m.fromAddress || 'Unknown sender'}</span>
                      <span className={style.className}>{style.label}</span>
                      {m.customerName && m.customerId && (
                        <Link href={`/dashboard/customers/${m.customerId}`} className="link-quiet">
                          {m.customerName}{m.invoiceNumber ? ` · ${m.invoiceNumber}` : ''}
                        </Link>
                      )}
                    </div>
                    {m.subject && <div className="app-label mt-1 text-ink-700">{m.subject}</div>}
                    <div className="app-body mt-1 whitespace-pre-wrap line-clamp-3 text-ink-600">{m.body}</div>
                    {m.aiSummary && (
                      <div className="mt-2 rounded-lg border border-ink-200 bg-ink-50 p-2.5 text-2xs leading-4">
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
                    <div className="app-meta whitespace-nowrap">{formatDate(m.receivedAt)}</div>
                    {m.status === 'new' && (
                      <div className="flex gap-2 mt-2">
                        <button
                          disabled={actingId === m.id}
                          onClick={() => setStatus(m.id, 'handled')}
                          className="btn-secondary text-[13px]"
                          title="Mark handled"
                        >
                          {actingId === m.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />} Handled
                        </button>
                        <button
                          disabled={actingId === m.id}
                          onClick={() => setStatus(m.id, 'dismissed')}
                          className="btn-secondary text-[13px]"
                          title="Dismiss"
                        >
                          <X className="h-3.5 w-3.5" />
                          <span className="sr-only">Dismiss</span>
                        </button>
                      </div>
                    )}
                    {m.status !== 'new' && (
                      <span className="badge-neutral mt-2 capitalize">{m.status}</span>
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
