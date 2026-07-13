'use client';
import { useState } from 'react';
import { Sparkles, Loader2, Mail, MessageSquare, RefreshCw, Check } from 'lucide-react';

type Tone = 'friendly' | 'firm' | 'final';

export function DunningDemo() {
  const [amount, setAmount] = useState('12500');
  const [days, setDays] = useState(35);
  const [tone, setTone] = useState<Tone>('firm');
  const [channel, setChannel] = useState<'email' | 'sms'>('email');
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState<{ subject?: string; body: string } | null>(null);

  async function generate() {
    setLoading(true);
    try {
      // Use the public preview endpoint — we just need the fallback template
      const res = await fetch('/api/dunning/public-demo', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ amount, daysOverdue: days, tone, channel }),
      });
      const data = await res.json();
      setOutput({ subject: data.subject, body: data.body });
    } catch (e) {
      setOutput({ body: 'Error generating message.' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid lg:grid-cols-2 gap-6 items-start">
      <div className="card">
        <div className="flex items-center gap-2 text-sm font-semibold text-ink-700">
          <Sparkles className="h-4 w-4 text-brand-600" /> Try our AI
        </div>
        <p className="mt-1 text-sm text-ink-600">Pick a tone. See what we send. No signup.</p>
        <div className="mt-5 space-y-4">
          <div>
            <label className="text-xs font-semibold text-ink-700 uppercase tracking-wider">Invoice amount (USD)</label>
            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="input mt-1 font-mono" />
          </div>
          <div>
            <label className="text-xs font-semibold text-ink-700 uppercase tracking-wider">Days overdue: <span className="text-brand-600">{days}</span></label>
            <input type="range" min="1" max="120" value={days} onChange={(e) => setDays(Number(e.target.value))} className="w-full mt-2" />
          </div>
          <div>
            <label className="text-xs font-semibold text-ink-700 uppercase tracking-wider">Tone</label>
            <div className="mt-1.5 grid grid-cols-3 gap-2">
              {(['friendly', 'firm', 'final'] as Tone[]).map((t) => (
                <button key={t} onClick={() => setTone(t)} className={`px-3 py-2 rounded-lg text-sm font-medium capitalize border transition-colors ${tone === t ? 'border-brand-500 bg-brand-50 text-brand-900' : 'border-ink-200 hover:border-ink-300'}`}>
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-ink-700 uppercase tracking-wider">Channel</label>
            <div className="mt-1.5 grid grid-cols-2 gap-2">
              <button onClick={() => setChannel('email')} className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 border transition-colors ${channel === 'email' ? 'border-brand-500 bg-brand-50 text-brand-900' : 'border-ink-200 hover:border-ink-300'}`}>
                <Mail className="h-4 w-4" /> Email
              </button>
              <button onClick={() => setChannel('sms')} className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 border transition-colors ${channel === 'sms' ? 'border-brand-500 bg-brand-50 text-brand-900' : 'border-ink-200 hover:border-ink-300'}`}>
                <MessageSquare className="h-4 w-4" /> SMS
              </button>
            </div>
          </div>
          <button onClick={generate} disabled={loading} className="btn-brand w-full justify-center">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {loading ? 'Generating…' : 'Generate message'}
          </button>
        </div>
      </div>

      <div className="card min-h-[400px]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-ink-700">
            {channel === 'email' ? <Mail className="h-4 w-4" /> : <MessageSquare className="h-4 w-4" />}
            {channel === 'email' ? 'Email preview' : 'SMS preview'}
          </div>
          {output && (
            <button onClick={generate} disabled={loading} className="btn-ghost text-xs">
              <RefreshCw className="h-3 w-3" /> Regenerate
            </button>
          )}
        </div>
        {!output ? (
          <div className="mt-8 text-center text-ink-500 text-sm">
            <Sparkles className="h-8 w-8 mx-auto text-ink-300 mb-3" />
            <p>Click "Generate message" to see what Collectly sends.</p>
            <p className="mt-1 text-xs text-ink-400">No data is stored. No signup required.</p>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {output.subject && (
              <div>
                <div className="text-xs text-ink-500 mb-1">Subject</div>
                <div className="font-semibold text-ink-900">{output.subject}</div>
              </div>
            )}
            <div>
              <div className="text-xs text-ink-500 mb-1">{channel === 'email' ? 'Body' : 'Message'}</div>
              <div className={`rounded-lg bg-ink-50 border border-ink-200 p-3 text-sm text-ink-800 whitespace-pre-wrap font-sans ${channel === 'sms' ? 'font-mono text-xs' : ''}`}>
                {output.body}
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-emerald-600">
              <Check className="h-3.5 w-3.5" /> Auto-pause if customer replies or pays
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
