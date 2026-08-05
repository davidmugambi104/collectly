'use client';
import { useState, useMemo } from 'react';
import { Calculator, ArrowRight, Clock, DollarSign, TrendingUp, Mail, Download } from 'lucide-react';
import Link from 'next/link';
import { formatCurrency } from '@/lib/utils';

const CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
];

export function ArCostCalculator() {
  const [avgInvoice, setAvgInvoice] = useState(5_000);
  const [lateDays, setLateDays] = useState(21);
  const [lateClients, setLateClients] = useState(5);
  const [chaseHours, setChaseHours] = useState(3);
  const [hourlyRate, setHourlyRate] = useState(75);
  const [currency, setCurrency] = useState('USD');
  const [email, setEmail] = useState('');
  const [showCapture, setShowCapture] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const sym = CURRENCIES.find((c) => c.code === currency)?.symbol ?? '$';

  const result = useMemo(() => {
    const annualRevenueAtRisk = avgInvoice * lateClients * (lateDays / 365) * 0.08;
    const monthlyTimeCost = chaseHours * hourlyRate * 4.3;
    const annualTimeCost = monthlyTimeCost * 12;
    const total = annualRevenueAtRisk + annualTimeCost;
    return {
      annualRevenueAtRisk: Math.round(annualRevenueAtRisk),
      monthlyTimeCost: Math.round(monthlyTimeCost),
      annualTimeCost: Math.round(annualTimeCost),
      total: Math.round(total),
    };
  }, [avgInvoice, lateDays, lateClients, chaseHours, hourlyRate]);

  async function sendReport() {
    if (!email.trim() || !email.includes('@')) {
      setSendError('Enter a valid email address.');
      return;
    }
    setSending(true);
    setSendError(null);
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          source: 'ar-cost-calculator',
          painPoint: `[AR cost calculator] annual drag ${formatCurrency(result.total, currency)} — avg invoice ${formatCurrency(avgInvoice, currency)}, ${lateDays}d late, ${lateClients} late clients, ${chaseHours}h/wk chasing at ${formatCurrency(hourlyRate, currency)}/hr`,
        }),
      });
      if (!res.ok) throw new Error('Something went wrong. Try again.');
      setSent(true);
    } catch (e: unknown) {
      setSendError(e instanceof Error ? e.message : 'Something went wrong. Try again.');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="mt-12 grid lg:grid-cols-2 gap-6">
      <div className="card">
        <div className="flex items-center gap-2 text-sm font-semibold text-ink-700">
          <Calculator className="h-4 w-4" /> Your numbers
        </div>
        <div className="mt-5 space-y-5">
          <Field label="Currency">
            <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="input">
              {CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.code} — {c.name}</option>)}
            </select>
          </Field>

          <Field label={`Average invoice size (${sym})`} hint="Typical size of a client invoice.">
            <input type="number" min="0" step="500" value={avgInvoice} onChange={(e) => setAvgInvoice(Number(e.target.value))} className="input font-mono" />
            <input type="range" min="500" max="50_000" step="500" value={avgInvoice} onChange={(e) => setAvgInvoice(Number(e.target.value))} className="w-full mt-2" />
          </Field>

          <Field label="Average days late" hint="How late typical invoices are paid.">
            <input type="number" min="0" max="120" value={lateDays} onChange={(e) => setLateDays(Number(e.target.value))} className="input font-mono" />
            <input type="range" min="0" max="90" value={lateDays} onChange={(e) => setLateDays(Number(e.target.value))} className="w-full mt-2" />
          </Field>

          <Field label="Clients with late invoices" hint="Number of active clients usually behind.">
            <input type="number" min="0" max="100" value={lateClients} onChange={(e) => setLateClients(Number(e.target.value))} className="input font-mono" />
            <input type="range" min="0" max="30" value={lateClients} onChange={(e) => setLateClients(Number(e.target.value))} className="w-full mt-2" />
          </Field>

          <Field label="Hours/week chasing payments" hint="Email, calls, follow-ups, reminders.">
            <input type="number" min="0" max="40" step="0.5" value={chaseHours} onChange={(e) => setChaseHours(Number(e.target.value))} className="input font-mono" />
            <input type="range" min="0" max="20" step="0.5" value={chaseHours} onChange={(e) => setChaseHours(Number(e.target.value))} className="w-full mt-2" />
          </Field>

          <Field label={`Hourly value of chaser (${sym})`} hint="Founder rate, ops rate, or bookkeeper rate.">
            <input type="number" min="0" max="500" step="5" value={hourlyRate} onChange={(e) => setHourlyRate(Number(e.target.value))} className="input font-mono" />
            <input type="range" min="15" max="300" step="5" value={hourlyRate} onChange={(e) => setHourlyRate(Number(e.target.value))} className="w-full mt-2" />
          </Field>
        </div>
      </div>

      <div className="space-y-4">
        <div className="card bg-gradient-to-br from-brand-600 to-brand-700 text-white">
          <div className="text-xs uppercase tracking-wider font-semibold text-brand-200">Estimated annual drag</div>
          <div className="mt-2 text-5xl font-display font-bold">{formatCurrency(result.total, currency)}</div>
          <div className="mt-1 text-sm text-brand-100">per year in revenue at risk + time cost</div>

          <div className="mt-5 grid grid-cols-2 gap-3 text-xs">
            <div>
              <div className="text-brand-200">Revenue at risk</div>
              <div className="mt-1 font-mono font-semibold text-lg">{formatCurrency(result.annualRevenueAtRisk, currency)}</div>
            </div>
            <div>
              <div className="text-brand-200">Time cost / year</div>
              <div className="mt-1 font-mono font-semibold text-lg">{formatCurrency(result.annualTimeCost, currency)}</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Mini icon={<Clock className="h-4 w-4" />} label="Late days" value={`${lateDays} days`} />
          <Mini icon={<DollarSign className="h-4 w-4" />} label="Time cost / month" value={formatCurrency(result.monthlyTimeCost, currency)} />
          <Mini icon={<TrendingUp className="h-4 w-4" />} label="Typical recovery" value="30–40%" accent="brand" />
          <Mini icon={<Download className="h-4 w-4" />} label="Save this report" value="Free" accent="brand" />
        </div>

        <div className="card">
          {sent ? (
            <>
              <h3 className="font-semibold text-ink-900">Sent — check your inbox</h3>
              <p className="mt-1 text-sm text-ink-600">The detailed breakdown and 5-step AR playbook are on their way to {email}.</p>
            </>
          ) : showCapture ? (
            <>
              <h3 className="font-semibold text-ink-900">Get the detailed breakdown + 5-step AR playbook</h3>
              <div className="mt-3 flex gap-2">
                <input
                  type="email"
                  placeholder="you@agency.com"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setSendError(null); }}
                  onKeyDown={(e) => e.key === 'Enter' && sendReport()}
                  className="input flex-1"
                />
                <button className="btn-primary whitespace-nowrap" onClick={sendReport} disabled={sending}>
                  <Mail className="h-4 w-4" /> {sending ? 'Sending…' : 'Send'}
                </button>
              </div>
              {sendError && <p className="mt-2 text-xs text-red-600">{sendError}</p>}
              <p className="mt-2 text-xs text-ink-500">No spam. Unsubscribe anytime.</p>
            </>
          ) : (
            <>
              <h3 className="font-semibold text-ink-900">Want to cut this number in half?</h3>
              <p className="mt-1 text-sm text-ink-600">
                Agencies that automate polite, persistent follow-up typically recover 30–40% of this drag in the first 90 days.
              </p>
              <div className="mt-4 flex flex-col sm:flex-row gap-3">
                <button onClick={() => setShowCapture(true)} className="btn-brand w-full justify-center">
                  Save my report <ArrowRight className="h-3.5 w-3.5" />
                </button>
                <Link href="/sign-up" className="btn-secondary w-full justify-center">
                  Try Collectly free
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-sm font-medium text-ink-900">{label}</label>
      {hint && <p className="text-xs text-ink-500 mt-0.5">{hint}</p>}
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

function Mini({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent?: 'brand' }) {
  return (
    <div className={`card ${accent ? 'border-brand-200 bg-brand-50' : ''}`}>
      <div className="flex items-center gap-1.5 text-xs text-ink-500">
        <div className={accent ? 'text-brand-600' : 'text-ink-400'}>{icon}</div>
        {label}
      </div>
      <div className={`mt-1 font-mono font-semibold ${accent ? 'text-brand-900' : 'text-ink-900'}`}>{value}</div>
    </div>
  );
}
