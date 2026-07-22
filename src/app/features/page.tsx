import { MarketingHeader } from '@/components/marketing/header';
import { MarketingFooter } from '@/components/marketing/footer';
import { WaitlistForm } from '@/components/marketing/waitlist';
import { Bot, FileText, BarChart3, Clock, ShieldCheck, Globe2, Bell, TrendingUp, Users, Sparkles, Mail, MessageSquare, Wallet, Zap } from 'lucide-react';

export const metadata = { title: 'Features' };

const FEATURES = [
  { icon: Bot, color: 'text-brand-600', bg: 'bg-brand-50', title: 'AI dunning engine', body: 'Tone-aware email and SMS reminders, written by Gemini, optimized for probability of payment. Pause on reply. Pause on payment. Fully editable before send.', bullets: ['Friendly → Firm → Final tones', 'Per-customer timing rules', 'Gemini-written, regex-customizable', 'Auto-pause on reply or payment', 'A/B test subject lines'] },
  { icon: FileText, color: 'text-emerald-600', bg: 'bg-emerald-50', title: 'Branded payment portal', body: 'A clean, fast payment page branded with your business. ACH, card, wire, and local payment methods (GoCardless, SEPA, BACS) supported out of the box.', bullets: ['Card, ACH, wire, BNPL', 'Local rails (SEPA, BACS, AU Direct Debit)', 'Auto-receipts and confirmation emails', 'Mobile-optimized', 'Subdomain or path routing'] },
  { icon: BarChart3, color: 'text-purple-600', bg: 'bg-purple-50', title: 'Cash-flow forecast', body: 'Four-week projection of incoming cash, based on payment history, age of invoice, and customer risk score. Tells you when you can make payroll.', bullets: ['4-week rolling forecast', 'Confidence intervals', 'Payroll and bill sync (QBO, Xero)', 'Weekly email digest', 'Slack alerts for big swings'] },
  { icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50', title: 'AR aging dashboard', body: 'Real-time buckets — Current, 1–30, 31–60, 61–90, 90+. Drill into a customer, see exactly who owes what and how overdue.', bullets: ['Standard aging buckets', 'Customer-level drill-down', 'Invoice-level history', 'Export to CSV/PDF', 'Custom bucket definitions (Scale+)'] },
  { icon: ShieldCheck, color: 'text-indigo-600', bg: 'bg-indigo-50', title: 'Cash application AI', body: 'Auto-matches incoming payments to the right invoices, even with reference numbers, partial payments, and overpayments. Kills the month-end reconciliation grind.', bullets: ['Auto-match by amount, ref, customer', 'Handles partial payments', 'Overpayment and underpayment rules', 'Confidence scoring per match', 'Manual override UI'] },
  { icon: Globe2, color: 'text-rose-600', bg: 'bg-rose-50', title: 'Multi-currency', body: 'USD, GBP, AUD, CAD, EUR on day one. Local payment integrations for UK, EU, AU, CA, US, KE, NG, ZA. Multi-currency reporting.', bullets: ['USD, GBP, AUD, CAD, EUR (Growth)', 'KES, NGN, ZAR, INR (Scale)', 'Real-time FX', 'Multi-currency reporting', 'Local payment rails'] },
];

export default function FeaturesPage() {
  return (
    <div className="min-h-screen">
      <MarketingHeader />
      <section className="container-page pt-16 pb-12 text-center max-w-3xl mx-auto">
        <p className="eyebrow">Features</p>
        <h1 className="mt-3 h1">Everything you need.<br/>Nothing you don't.</h1>
        <p className="mt-5 lead">A focused toolset for small businesses. No 200-feature enterprise bloat. No "AI inside" stickers. Just the things that actually move the needle on cash.</p>
      </section>

      <section className="container-page pb-20">
        <div className="space-y-6">
          {FEATURES.map((f, i) => {
            const Icon = f.icon;
            return (
              <div key={f.title} className={`card-lg grid lg:grid-cols-2 gap-8 items-center ${i % 2 ? 'lg:[&>:first-child]:order-2' : ''}`}>
                <div>
                  <div className={`h-11 w-11 rounded-lg ${f.bg} grid place-items-center mb-4`}><Icon className={`h-5 w-5 ${f.color}`} /></div>
                  <h2 className="h3">{f.title}</h2>
                  <p className="mt-3 text-ink-600 leading-relaxed">{f.body}</p>
                </div>
                <ul className="space-y-2.5">
                  {f.bullets.map((b) => (
                    <li key={b} className="flex items-start gap-2.5 text-sm text-ink-700">
                      <span className="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-500 flex-shrink-0" />{b}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </section>

      <section className="container-page pb-20">
        <div className="card-lg grad-mesh text-center">
          <h2 className="h2">See it in action</h2>
          <p className="mt-4 lead">14-day free trial. No credit card. Set up in 10 minutes.</p>
          <div className="mt-6 max-w-md mx-auto"><WaitlistForm /></div>
        </div>
      </section>
      <MarketingFooter />
    </div>
  );
}
