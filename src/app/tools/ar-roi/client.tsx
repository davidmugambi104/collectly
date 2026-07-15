'use client';
import { useState, useMemo } from 'react';
import { Calculator, ArrowRight, TrendingUp, Clock, DollarSign, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { formatCurrency } from '@/lib/utils';

const CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
];

export function RoiCalculator() {
  const [ar, setAr] = useState(50_000);
  const [dso, setDso] = useState(45);
  const [targetDso, setTargetDso] = useState(14);
  const [revenue, setRevenue] = useState(1_500_000);
  const [margin, setMargin] = useState(15);
  const [costOfCapital, setCostOfCapital] = useState(8);
  const [currency, setCurrency] = useState('USD');

  const sym = CURRENCIES.find((c) => c.code === currency)?.symbol ?? '$';

  const result = useMemo(() => {
    const dsoDelta = Math.max(0, dso - targetDso);
    const arAsDays = revenue / 365;
    const freedUpAr = (dsoDelta / 365) * revenue;
    const annualCostOfSlowPay = freedUpAr * (costOfCapital / 100);
    // Lost revenue from cash-flow constraints: services biz can't take new work because cash is tied up
    const lostRevenue = arAsDays * dsoDelta * (margin / 100) * 0.4;
    // Write-off / bad-debt reduction
    const badDebtReduction = ar * 0.02;
    const total = annualCostOfSlowPay + lostRevenue + badDebtReduction;
    return {
      dsoDelta,
      freedUpAr: Math.round(freedUpAr),
      annualCost: Math.round(annualCostOfSlowPay),
      lostRevenue: Math.round(lostRevenue),
      badDebtReduction: Math.round(badDebtReduction),
      total: Math.round(total),
      // Collectly at $99/mo = $1188/yr
      roi: Math.round((total - 1188) / 1188 * 100),
    };
  }, [ar, dso, targetDso, revenue, margin, costOfCapital]);

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
          <Field label={`Outstanding A/R right now (${sym})`} hint="Total unpaid invoices, all ages.">
            <input type="number" min="0" step="1000" value={ar} onChange={(e) => setAr(Number(e.target.value))} className="input font-mono" />
            <input type="range" min="0" max="500000" step="5000" value={ar} onChange={(e) => setAr(Number(e.target.value))} className="w-full mt-2" />
          </Field>
          <Field label="Average days to get paid (DSO)" hint="From invoice sent → cash in bank.">
            <input type="number" min="0" max="180" value={dso} onChange={(e) => setDso(Number(e.target.value))} className="input font-mono" />
            <input type="range" min="7" max="120" value={dso} onChange={(e) => setDso(Number(e.target.value))} className="w-full mt-2" />
          </Field>
          <Field label="Target DSO with Collectly" hint="Industry best-in-class is 14 days for services.">
            <input type="number" min="7" max="60" value={targetDso} onChange={(e) => setTargetDso(Number(e.target.value))} className="input font-mono" />
            <input type="range" min="7" max="60" value={targetDso} onChange={(e) => setTargetDso(Number(e.target.value))} className="w-full mt-2" />
          </Field>
          <Field label={`Annual revenue (${sym})`}>
            <input type="number" min="0" step="50000" value={revenue} onChange={(e) => setRevenue(Number(e.target.value))} className="input font-mono" />
          </Field>
          <Field label="Operating margin %" hint="Net of cost of delivery.">
            <input type="number" min="0" max="80" value={margin} onChange={(e) => setMargin(Number(e.target.value))} className="input font-mono" />
          </Field>
          <Field label="Cost of capital %" hint="Rough APR on a line of credit or working-capital loan. 8% is average.">
            <input type="number" min="0" max="30" step="0.5" value={costOfCapital} onChange={(e) => setCostOfCapital(Number(e.target.value))} className="input font-mono" />
          </Field>
        </div>
      </div>

      <div className="space-y-4">
        <div className="card bg-gradient-to-br from-brand-600 to-brand-700 text-white">
          <div className="text-xs uppercase tracking-wider font-semibold text-brand-200">You could free up</div>
          <div className="mt-2 text-5xl font-display font-bold">{formatCurrency(result.total, currency)}</div>
          <div className="mt-1 text-sm text-brand-100">per year in cash + lost productivity</div>
          <div className="mt-5 grid grid-cols-3 gap-3 text-xs">
            <div>
              <div className="text-brand-200">Freed cash</div>
              <div className="mt-1 font-mono font-semibold text-lg">{formatCurrency(result.freedUpAr, currency)}</div>
            </div>
            <div>
              <div className="text-brand-200">Carry cost saved</div>
              <div className="mt-1 font-mono font-semibold text-lg">{formatCurrency(result.annualCost, currency)}</div>
            </div>
            <div>
              <div className="text-brand-200">Lost revenue recovered</div>
              <div className="mt-1 font-mono font-semibold text-lg">{formatCurrency(result.lostRevenue, currency)}</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Mini icon={<Clock className="h-4 w-4" />} label="Days faster" value={`${result.dsoDelta} days`} />
          <Mini icon={<DollarSign className="h-4 w-4" />} label="Bad-debt reduction" value={formatCurrency(result.badDebtReduction, currency)} />
          <Mini icon={<TrendingUp className="h-4 w-4" />} label="ROI on Collectly" value={`${result.roi.toLocaleString()}%`} accent="brand" />
          <Mini icon={<Sparkles className="h-4 w-4" />} label="Payback period" value="< 1 week" accent="brand" />
        </div>

        <div className="card">
          <h3 className="font-semibold text-ink-900">What you'd do with the extra cash</h3>
          <ul className="mt-3 space-y-2 text-sm text-ink-700">
            <li className="flex items-start gap-2">
              <span className="text-emerald-600 mt-0.5">→</span>
              Hire one more person 3 months sooner (paid for by freed-up A/R alone)
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-600 mt-0.5">→</span>
              Take 2-3 larger clients you've been turning down for cash-flow reasons
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-600 mt-0.5">→</span>
              Sleep through the month-end close (instead of refreshing bank accounts)
            </li>
          </ul>
          <Link href="/sign-up" className="mt-5 btn-brand w-full justify-center">
            Try Collectly free for 14 days <ArrowRight className="h-3.5 w-3.5" />
          </Link>
          <p className="mt-3 text-xs text-ink-500 text-center">No credit card. 10-minute setup. Cancel anytime.</p>
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
      <div className="flex items-center gap-1.5 text-xs text-ink-500"><div className={accent ? 'text-brand-600' : 'text-ink-400'}>{icon}</div>{label}</div>
      <div className={`mt-1 font-mono font-semibold ${accent ? 'text-brand-900' : 'text-ink-900'}`}>{value}</div>
    </div>
  );
}
