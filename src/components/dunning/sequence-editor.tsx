'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { Plus, Trash2, Mail, MessageSquare, Save, Loader2, Sparkles, RefreshCw, ChevronRight, CheckCircle2, AlertTriangle } from 'lucide-react';
import { MessageBubble } from './message-bubble';
import { RecipientCard } from './recipient-card';

type Step = { id: string; daysFromDue: number; channel: 'email' | 'sms'; tone: 'friendly' | 'firm' | 'final'; subject?: string; template: string };
type Recipient = { name: string; email: string | null; phone: string | null; invoiceNumber: string; amount?: string; currency?: string; daysOverdue?: number };
type Preview = { subject?: string; body: string; sample: boolean; recipient: Recipient | null };

/** A thin connector between flow nodes with a dot drifting along it — the
 * visual cue that this is one continuous pipeline, not a row of buttons. */
function FlowConnector({ delay = 0 }: { delay?: number }) {
  return (
    <div className="relative w-7 h-6 shrink-0 grid place-items-center">
      <div className="absolute inset-x-0 top-1/2 h-px bg-ink-200 -translate-y-1/2" />
      <motion.span
        className="absolute top-1/2 h-1.5 w-1.5 rounded-full bg-brand-400 -translate-y-1/2"
        initial={{ left: '0%', opacity: 0 }}
        animate={{ left: ['0%', '85%'], opacity: [0, 1, 1, 0] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut', delay }}
      />
      <ChevronRight className="h-3.5 w-3.5 text-ink-300 relative z-10 bg-white rounded-full" />
    </div>
  );
}

const TONE_BADGE: Record<Step['tone'], string> = {
  friendly: 'badge-success',
  firm: 'badge-warn',
  final: 'badge-danger',
};

export function SequenceEditor({ initialSteps, sequenceId }: { initialSteps: Step[]; sequenceId: string }) {
  const router = useRouter();
  const [steps, setSteps] = useState<Step[]>(initialSteps);
  const [activeIdx, setActiveIdx] = useState<number | null>(0);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(true);
  const [previewing, setPreviewing] = useState(false);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const active = activeIdx !== null ? steps[activeIdx] : null;

  function updateStep(idx: number, patch: Partial<Step>) {
    setSteps(steps.map((s, i) => i === idx ? { ...s, ...patch } : s));
    setSaved(false);
    setPreview(null);
  }

  function addStep() {
    const last = steps[steps.length - 1];
    const newStep: Step = { id: `s${Date.now()}`, daysFromDue: last ? last.daysFromDue + 7 : 7, channel: 'email', tone: 'firm', template: '' };
    setSteps([...steps, newStep]);
    setActiveIdx(steps.length);
    setSaved(false);
    setPreview(null);
  }

  function removeStep(idx: number) {
    const next = steps.filter((_, i) => i !== idx);
    setSteps(next);
    setActiveIdx(next.length === 0 ? null : Math.min(idx, next.length - 1));
    setSaved(false);
    setPreview(null);
  }

  async function save() {
    setSaving(true);
    try {
      await fetch('/api/sequences/' + sequenceId, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ steps }) });
      setSaved(true);
      router.refresh();
    } finally { setSaving(false); }
  }

  async function generatePreview() {
    if (!active) return;
    setPreviewing(true);
    setPreviewError(null);
    try {
      const res = await fetch('/api/dunning/preview', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ channel: active.channel, tone: active.tone, brandVoice: active.template || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? 'preview failed');
      setPreview({ subject: data.subject, body: data.body, sample: !!data.sample, recipient: data.recipient ?? null });
    } catch (e: any) {
      setPreviewError(e?.message ?? 'Preview failed');
    } finally {
      setPreviewing(false);
    }
  }

  return (
    <div>
      {/* Automation flow — a horizontal, clickable timeline so the sequence
          reads as a journey (day 1 -> day 7 -> ...) instead of a plain list.
          The connecting chevrons are the "direction" cue: click a node to
          edit what it sends, or the dashed node at the end to extend it. */}
      <div className="mb-2 flex items-center justify-between">
        <div className="text-xs font-semibold text-ink-700 uppercase tracking-wide">Automation flow</div>
        <div className="text-xs text-ink-500">Click a step to edit it</div>
      </div>
      <div
        data-tour="flow"
        className="flex items-stretch overflow-x-auto pb-3 pt-1 -mx-1 px-1 rounded-xl"
        style={{ perspective: 1000 }}
      >
        {/* Bookends make this read as one lifecycle — an invoice goes overdue,
            reminders escalate, the customer pays — instead of a disconnected
            row of steps with no start or end. */}
        <div className="shrink-0 flex flex-col items-center justify-center gap-1 w-[104px] rounded-full border border-dashed border-ink-300 bg-ink-50 text-ink-500 px-2 py-2">
          <AlertTriangle className="h-3.5 w-3.5" />
          <span className="text-[10px] font-medium text-center leading-tight">Invoice overdue</span>
        </div>
        <FlowConnector delay={0} />
        {steps.map((s, i) => {
          const isActive = activeIdx === i;
          return (
            <div key={s.id} className="flex items-center shrink-0">
              <motion.button
                type="button"
                onClick={() => { setActiveIdx(i); setPreview(null); }}
                whileHover={{ y: -4, rotateX: -8, scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                className={`relative w-[136px] rounded-xl border p-3 text-left transition-colors ${
                  isActive
                    ? 'border-brand-500 bg-white ring-2 ring-brand-100 shadow-[0_12px_28px_-12px_rgba(37,99,235,0.45)]'
                    : 'border-ink-200 bg-white/70 hover:border-ink-300 hover:bg-white shadow-sm'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`h-6 w-6 rounded-full grid place-items-center text-[11px] font-bold ${isActive ? 'bg-brand-600 text-white' : 'bg-ink-100 text-ink-700'}`}>{i + 1}</span>
                  {s.channel === 'sms' ? <MessageSquare className="h-3.5 w-3.5 text-ink-400" /> : <Mail className="h-3.5 w-3.5 text-ink-400" />}
                </div>
                <div className="mt-2 text-sm font-semibold text-ink-900">Day {s.daysFromDue}</div>
                <span className={`badge ${TONE_BADGE[s.tone]} text-[10px] capitalize mt-1`}>{s.tone}</span>
              </motion.button>
              <FlowConnector delay={(i + 1) * 0.25} />
            </div>
          );
        })}
        <motion.button
          type="button"
          onClick={addStep}
          whileHover={{ y: -4, rotateX: -8, scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          transition={{ type: 'spring', stiffness: 400, damping: 20 }}
          className="shrink-0 w-[110px] rounded-xl border-2 border-dashed border-ink-300 text-ink-400 hover:border-brand-400 hover:text-brand-600 hover:bg-brand-50/40 grid place-items-center gap-1 p-3"
        >
          <Plus className="h-4 w-4" />
          <span className="text-xs font-medium">Add step</span>
        </motion.button>
        <FlowConnector delay={(steps.length + 1) * 0.25} />
        <div className="shrink-0 flex flex-col items-center justify-center gap-1 w-[104px] rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700 px-2 py-2">
          <CheckCircle2 className="h-3.5 w-3.5" />
          <span className="text-[10px] font-medium text-center leading-tight">Customer pays</span>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {active ? (
          <motion.div
            key={active.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className="card space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-ink-900">Step {activeIdx! + 1}</h3>
              <button onClick={() => removeStep(activeIdx!)} className="btn-ghost text-xs text-red-600"><Trash2 className="h-3.5 w-3.5" />Delete</button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><label className="label">Days from due</label><input type="number" min="0" value={active.daysFromDue} onChange={(e) => updateStep(activeIdx!, { daysFromDue: Number(e.target.value) })} className="input" /></div>
              <div><label className="label">Channel</label><select value={active.channel} onChange={(e) => updateStep(activeIdx!, { channel: e.target.value as any })} className="input"><option value="email">Email</option><option value="sms">SMS</option></select></div>
              <div><label className="label">Tone</label><select value={active.tone} onChange={(e) => updateStep(activeIdx!, { tone: e.target.value as any })} className="input"><option value="friendly">Friendly</option><option value="firm">Firm</option><option value="final">Final</option></select></div>
            </div>
            <div>
              <label className="label">Style hint (optional)</label>
              <textarea
                value={active.template}
                onChange={(e) => updateStep(activeIdx!, { template: e.target.value })}
                rows={3}
                className="input font-mono text-xs"
                placeholder="e.g. mention we value the relationship, keep it short, sign off as 'the team' not a person"
              />
              <div className="mt-1 text-xs text-ink-500">
                Guides the AI&apos;s tone and content for this step. It does not get sent as-is — every message is
                still written fresh by Gemini using this hint, the actual invoice, and the customer&apos;s real payment
                history. Leave blank to let the AI write with no extra guidance.
              </div>
            </div>

            <div className="pt-2 border-t border-ink-100">
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs font-semibold text-ink-700 uppercase tracking-wide">Live preview</div>
                <button data-tour="generate-preview" onClick={generatePreview} disabled={previewing} className="btn-secondary text-xs">
                  {previewing ? <Loader2 className="h-3 w-3 animate-spin" /> : preview ? <RefreshCw className="h-3 w-3" /> : <Sparkles className="h-3 w-3" />}
                  {preview ? 'Regenerate' : 'Generate preview'}
                </button>
              </div>
              {previewError && <div className="text-xs text-red-600">{previewError}</div>}
              {preview && (
                <div className="space-y-2">
                  {preview.recipient && (
                    <RecipientCard
                      name={preview.recipient.name}
                      channel={active.channel}
                      contact={active.channel === 'email' ? preview.recipient.email : preview.recipient.phone}
                      invoiceNumber={preview.recipient.invoiceNumber}
                      amount={preview.recipient.amount}
                      currency={preview.recipient.currency}
                      daysOverdue={preview.recipient.daysOverdue}
                    />
                  )}
                  <MessageBubble channel={active.channel} subject={preview.subject} body={preview.body} />
                  <div className="flex items-center gap-2 text-xs text-ink-500">
                    {preview.sample
                      ? <span>Sample data — connect your books and sync invoices to preview against a real overdue invoice.</span>
                      : <span>Generated from one of your actual overdue invoices — this is a real customer, shown above.</span>}
                  </div>
                </div>
              )}
              {!preview && !previewError && (
                <div className="text-xs text-ink-500">No preview generated yet — click above to see what the AI would actually write for this step.</div>
              )}
            </div>
          </motion.div>
        ) : (
          <div className="card text-center text-ink-500 py-10">Click a step to edit, or add a new one.</div>
        )}
      </AnimatePresence>

      {/* Always-visible save action so a dirty sequence never gets lost by
          scrolling past it — the whole point of the earlier inline row was
          easy to miss once the editor card grew tall. */}
      <AnimatePresence>
        {!saved && (
          <motion.div
            initial={{ y: 72, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 72, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            className="fixed inset-x-0 bottom-0 z-30 border-t border-amber-200 bg-amber-50/95 backdrop-blur px-4 sm:px-8 py-3"
          >
            <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm text-amber-900">
                <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse-soft" />
                <span className="font-medium">Unsaved changes to this sequence</span>
              </div>
              <button onClick={save} disabled={saving} className="btn-primary text-sm">
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}Save sequence
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {saved && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mt-3 flex items-center gap-1.5 text-xs text-emerald-600"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />All changes saved
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
