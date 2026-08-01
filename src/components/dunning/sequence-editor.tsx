'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, Mail, MessageSquare, Save, Loader2, Sparkles, RefreshCw } from 'lucide-react';

type Step = { id: string; daysFromDue: number; channel: 'email' | 'sms'; tone: 'friendly' | 'firm' | 'final'; subject?: string; template: string };
type Preview = { subject?: string; body: string; sample: boolean };

export function SequenceEditor({ initialSteps, sequenceId }: { initialSteps: Step[]; sequenceId: string }) {
  const router = useRouter();
  const [steps, setSteps] = useState<Step[]>(initialSteps);
  const [activeIdx, setActiveIdx] = useState<number | null>(0);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
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
    const newStep: Step = { id: `s${Date.now()}`, daysFromDue: 7, channel: 'email', tone: 'firm', template: '' };
    setSteps([...steps, newStep]);
    setActiveIdx(steps.length);
    setSaved(false);
    setPreview(null);
  }

  function removeStep(idx: number) {
    setSteps(steps.filter((_, i) => i !== idx));
    setActiveIdx(null);
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
      setPreview({ subject: data.subject, body: data.body, sample: !!data.sample });
    } catch (e: any) {
      setPreviewError(e?.message ?? 'Preview failed');
    } finally {
      setPreviewing(false);
    }
  }

  return (
    <div className="grid lg:grid-cols-3 gap-4">
      <div className="lg:col-span-1 space-y-2">
        {steps.map((s, i) => (
          <button key={s.id} onClick={() => { setActiveIdx(i); setPreview(null); }} className={`w-full text-left rounded-lg border p-3 transition-colors ${activeIdx === i ? 'border-brand-500 bg-brand-50' : 'border-ink-200 hover:border-ink-300 bg-white'}`}>
            <div className="flex items-center gap-2">
              <span className="h-6 w-6 rounded-md bg-ink-100 grid place-items-center text-xs font-semibold text-ink-700">{i + 1}</span>
              <span className="text-sm font-medium text-ink-900">Day {s.daysFromDue}</span>
              <span className="badge-neutral text-[10px] capitalize">{s.channel}</span>
              <span className={`badge text-[10px] capitalize ${s.tone === 'final' ? 'badge-danger' : s.tone === 'firm' ? 'badge-warn' : 'badge-success'}`}>{s.tone}</span>
            </div>
          </button>
        ))}
        <button onClick={addStep} className="btn-secondary text-sm w-full"><Plus className="h-3.5 w-3.5" />Add step</button>
      </div>

      <div className="lg:col-span-2">
        {active ? (
          <div className="card space-y-4">
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
                Guides the AI's tone and content for this step. It does not get sent as-is — every message is
                still written fresh by Gemini using this hint, the actual invoice, and the customer's real payment
                history. Leave blank to let the AI write with no extra guidance.
              </div>
            </div>

            <div className="pt-2 border-t border-ink-100">
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs font-semibold text-ink-700 uppercase tracking-wide">Live preview</div>
                <button onClick={generatePreview} disabled={previewing} className="btn-secondary text-xs">
                  {previewing ? <Loader2 className="h-3 w-3 animate-spin" /> : preview ? <RefreshCw className="h-3 w-3" /> : <Sparkles className="h-3 w-3" />}
                  {preview ? 'Regenerate' : 'Generate preview'}
                </button>
              </div>
              {previewError && <div className="text-xs text-red-600">{previewError}</div>}
              {preview && (
                <div className="rounded-lg border border-ink-200 bg-ink-50 p-3 space-y-2">
                  <div className="flex items-center gap-2 text-xs text-ink-500">
                    {active.channel === 'email' ? <Mail className="h-3.5 w-3.5" /> : <MessageSquare className="h-3.5 w-3.5" />}
                    {preview.sample
                      ? <span>Sample data — connect your books and sync invoices to preview against a real overdue invoice.</span>
                      : <span>Generated from one of your actual overdue invoices.</span>}
                  </div>
                  {preview.subject && <div className="text-sm font-medium text-ink-900">{preview.subject}</div>}
                  <div className="text-sm text-ink-800 whitespace-pre-wrap">{preview.body}</div>
                </div>
              )}
              {!preview && !previewError && (
                <div className="text-xs text-ink-500">No preview generated yet — click above to see what the AI would actually write for this step.</div>
              )}
            </div>

            <div className="flex items-center justify-between pt-2">
              <div className="text-xs text-ink-500">{saved ? <span className="text-emerald-600">Saved</span> : 'Unsaved changes'}</div>
              <button onClick={save} disabled={saving} className="btn-primary text-sm">{saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}Save</button>
            </div>
          </div>
        ) : (
          <div className="card text-center text-ink-500 py-10">Click a step to edit, or add a new one.</div>
        )}
      </div>
    </div>
  );
}
