'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, GripVertical, Mail, MessageSquare, Save, Loader2, X } from 'lucide-react';

type Step = { id: string; daysFromDue: number; channel: 'email' | 'sms'; tone: 'friendly' | 'firm' | 'final'; subject?: string; template: string };

export function SequenceEditor({ initialSteps, sequenceId }: { initialSteps: Step[]; sequenceId: string }) {
  const router = useRouter();
  const [steps, setSteps] = useState<Step[]>(initialSteps);
  const [activeIdx, setActiveIdx] = useState<number | null>(0);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const active = activeIdx !== null ? steps[activeIdx] : null;

  function updateStep(idx: number, patch: Partial<Step>) {
    setSteps(steps.map((s, i) => i === idx ? { ...s, ...patch } : s));
    setSaved(false);
  }

  function addStep() {
    const newStep: Step = { id: `s${Date.now()}`, daysFromDue: 7, channel: 'email', tone: 'firm', subject: 'Invoice {{number}} past due', template: 'Hi {{contact_name}}, invoice {{number}} for {{amount}} is now past due. Please settle: {{payment_link}}' };
    setSteps([...steps, newStep]);
    setActiveIdx(steps.length);
    setSaved(false);
  }

  function removeStep(idx: number) {
    setSteps(steps.filter((_, i) => i !== idx));
    setActiveIdx(null);
    setSaved(false);
  }

  async function save() {
    setSaving(true);
    try {
      await fetch('/api/sequences/' + sequenceId, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ steps }) });
      setSaved(true);
      router.refresh();
    } finally { setSaving(false); }
  }

  return (
    <div className="grid lg:grid-cols-3 gap-4">
      <div className="lg:col-span-1 space-y-2">
        {steps.map((s, i) => (
          <button key={s.id} onClick={() => setActiveIdx(i)} className={`w-full text-left rounded-lg border p-3 transition-colors ${activeIdx === i ? 'border-brand-500 bg-brand-50' : 'border-ink-200 hover:border-ink-300 bg-white'}`}>
            <div className="flex items-center gap-2">
              <span className="h-6 w-6 rounded-md bg-ink-100 grid place-items-center text-xs font-semibold text-ink-700">{i + 1}</span>
              <span className="text-sm font-medium text-ink-900">Day {s.daysFromDue}</span>
              <span className="badge-neutral text-[10px] capitalize">{s.channel}</span>
              <span className={`badge text-[10px] capitalize ${s.tone === 'final' ? 'badge-danger' : s.tone === 'firm' ? 'badge-warn' : 'badge-success'}`}>{s.tone}</span>
            </div>
            <div className="mt-1.5 text-xs text-ink-600 truncate">{s.subject ?? '(no subject — SMS)'}</div>
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
            {active.channel === 'email' && (
              <div><label className="label">Subject</label><input value={active.subject ?? ''} onChange={(e) => updateStep(activeIdx!, { subject: e.target.value })} className="input" placeholder="Invoice {{number}} — action required" /></div>
            )}
            <div>
              <label className="label">Template</label>
              <textarea value={active.template} onChange={(e) => updateStep(activeIdx!, { template: e.target.value })} rows={8} className="input font-mono text-xs" />
              <div className="mt-1 text-xs text-ink-500">Variables: <code className="bg-ink-100 px-1 rounded">{'{{contact_name}}'}</code> <code className="bg-ink-100 px-1 rounded">{'{{number}}'}</code> <code className="bg-ink-100 px-1 rounded">{'{{amount}}'}</code> <code className="bg-ink-100 px-1 rounded">{'{{due_date}}'}</code> <code className="bg-ink-100 px-1 rounded">{'{{payment_link}}'}</code></div>
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
