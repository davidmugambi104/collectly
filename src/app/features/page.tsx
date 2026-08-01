import { MarketingHeader } from '@/components/marketing/header';
import { MarketingFooter } from '@/components/marketing/footer';
import { WaitlistForm } from '@/components/marketing/waitlist';
import { Bot, FileText, BarChart3, Clock, ShieldCheck, Globe2, Bell, TrendingUp, Users, Sparkles, Mail, MessageSquare, Wallet, Zap } from 'lucide-react';
import { pageMetadata, faqJsonLd } from '@/lib/seo';

export const metadata = pageMetadata({
  title: 'Features — tone-aware AR automation for small agencies',
  description:
    'All of Collectly\'s features: tone-aware AI reminders, reply-or-pay ' +
    'pause, promise-to-pay tracking, dispute classification, approval ' +
    'workflow, audit trail, Xero + QuickBooks sync, SMS in beta, and the ' +
    'AR worklist. Built for 5-30 person agencies and consultancies.',
  path: '/features',
  image: '/og-features.png',
  keywords: [
    'AR automation features',
    'Xero dunning',
    'tone-aware email',
    'promise to pay tracking',
    'invoice dispute workflow',
    'approval-based automation',
  ],
});

// FAQ JSON-LD: 5 questions people search before clicking a Features page.
// Targets 'Xero AR features', 'AI dunning features', 'promise-to-pay
// tracking' patterns.
const featuresJsonLd = JSON.stringify(
  faqJsonLd([
    {
      q: 'Does Collectly stop sending reminders when a customer replies?',
      a: 'Yes. Collectly detects replies via inbound email parsing, pauses the ' +
         'sequence immediately, and asks you (or a human on the team) to confirm ' +
         'what the customer said before resuming. Reply pause typically completes ' +
         'in under 5 minutes from when the reply hits your inbox.',
    },
    {
      q: 'Does Collectly track promises to pay automatically?',
      a: 'Yes. When a customer says "we will pay next Friday" or "net 30 from ' +
         'the invoice date," Collectly extracts the date and pauses future ' +
         'reminders until that date. If payment arrives, the sequence is ' +
         'cancelled. If it does not, the next reminder is queued (not auto-sent) ' +
         'on the day after, for your review.',
    },
    {
      q: 'Can I approve every message before it goes out?',
      a: 'Yes, in approval mode. Approval mode is on by default for every new ' +
         'Collectly account. Autopilot unlocks only after 25 reviewed messages ' +
         'with no unedited-send rate over a 14-day window. You can switch back ' +
         'to approval mode at any time from the dashboard.',
    },
    {
      q: 'How does Collectly classify disputes?',
      a: 'When a customer replies with phrases like "missing PO," "wrong ' +
         'amount," "invoice not received," or "pricing dispute," Collectly ' +
         'classifies the reply as a blocker and pauses reminders on that ' +
         'specific invoice. The blocker shows up in your disputes worklist for ' +
         'human follow-up. The customer does not receive another embarrassing ' +
         'generic chase.',
    },
    {
      q: 'Does Collectly integrate with QuickBooks as well as Xero?',
      a: 'Both are supported. Xero is in production today. QuickBooks Online ' +
         'OAuth is wired and tested in sandbox; production credentials pending ' +
         'the Intuit App Assessment Questionnaire review. Same workflow, same ' +
         'feature surface on both platforms.',
    },
    {
      q: 'Does Collectly send SMS as well as email?',
      a: 'Yes, SMS dunning is offered to founding customers as a pass-through ' +
         'add-on. Each SMS is sent via Twilio (pass-through cost). We do not ' +
         'mark up SMS; you see the carrier cost line-item on your invoice.',
    },
  ]),
);

const FEATURES = [
  { icon: Bot, color: 'text-brand-600', bg: 'bg-brand-50', title: 'AI dunning engine', body: 'Tone-aware email and SMS reminders, written by Gemini, optimized for probability of payment. Pause on reply. Pause on payment. Fully editable before send.', bullets: ['Friendly → Firm → Final tones', 'Per-customer timing rules', 'Gemini-written, regex-customizable', 'Auto-pause on reply or payment', 'A/B test subject lines'] },
  { icon: FileText, color: 'text-emerald-600', bg: 'bg-emerald-50', title: 'Branded payment portal', body: 'A clean, fast payment page branded with your business. ACH, card, wire, and local payment methods (GoCardless, SEPA, BACS, Apple Pay, Google Pay) supported out of the box.', bullets: ['Card, ACH, wire, BNPL', 'Apple Pay \u0026 Google Pay', 'Local rails (SEPA, BACS, AU Direct Debit)', 'Auto-receipts and confirmation emails', 'Mobile-optimized', 'Subdomain or path routing'] },
  { icon: BarChart3, color: 'text-purple-600', bg: 'bg-purple-50', title: 'Cash-flow forecast', body: 'Four-week projection of incoming cash, based on payment history, age of invoice, and customer risk score. Tells you when you can make payroll.', bullets: ['4-week rolling forecast', 'Confidence intervals', 'Payroll and bill sync (QBO, Xero)', 'Weekly email digest', 'Slack alerts for big swings'] },
  { icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50', title: 'AR aging dashboard', body: 'Real-time buckets — Current, 1–30, 31–60, 61–90, 90+. Drill into a customer, see exactly who owes what and how overdue.', bullets: ['Standard aging buckets', 'Customer-level drill-down', 'Invoice-level history', 'Export to CSV/PDF', 'Custom bucket definitions (Scale+)'] },
  { icon: ShieldCheck, color: 'text-indigo-600', bg: 'bg-indigo-50', title: 'Cash application AI', body: 'Auto-matches incoming payments to the right invoices, even with reference numbers, partial payments, and overpayments. Kills the month-end reconciliation grind.', bullets: ['Auto-match by amount, ref, customer', 'Handles partial payments', 'Overpayment and underpayment rules', 'Confidence scoring per match', 'Manual override UI'] },
  { icon: Globe2, color: 'text-rose-600', bg: 'bg-rose-50', title: 'Multi-currency + multi-entity', body: 'USD, GBP, AUD, CAD, EUR on day one. Local payment integrations for UK, EU, AU, CA, US, KE, NG, ZA. Growth supports multiple entities with consolidated reporting; Scale adds per-entity workflows.', bullets: ['USD, GBP, AUD, CAD, EUR (Growth)', 'KES, NGN, ZAR, INR (Scale)', 'Multi-entity support (Growth+)', 'Real-time FX', 'Multi-currency reporting', 'Local payment rails'] },
];

export default function FeaturesPage() {
  return (
    <div className="min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: featuresJsonLd }} />
      <MarketingHeader />
      <section className="container-page pt-16 pb-12 text-center max-w-3xl mx-auto">
        <p className="eyebrow">Features</p>
        <h1 className="mt-3 h1">Six things. Each one aimed at getting you paid faster.</h1>
        <p className="mt-5 lead">No 200-feature enterprise bloat. No "AI inside" stickers on things that don't need AI. Here's exactly what each one does, below — no marketing fog.</p>
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
          <h2 className="h2">Try it on your actual invoices, not a demo.</h2>
          <p className="mt-4 lead">14-day free trial. No credit card. Set up in 10 minutes.</p>
          <div className="mt-6 max-w-md mx-auto"><WaitlistForm /></div>
        </div>
      </section>
      <MarketingFooter />
    </div>
  );
}
