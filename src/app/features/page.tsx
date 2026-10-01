import { MarketingHeader } from '@/components/marketing/header';
import { MarketingFooter } from '@/components/marketing/footer';
import { WaitlistForm } from '@/components/marketing/waitlist';
import { Bot, FileText, BarChart3, Clock, ShieldCheck, Globe2 } from 'lucide-react';
import { pageMetadata, faqJsonLd } from '@/lib/seo';
import { FaqSection, type FaqItem } from '@/components/marketing/faq-section';

// Module-local, not exported: a Next.js page may only carry the
// framework's own named exports. Both the FAQPage markup below and the
// visible <FaqSection> read this one array.
const FAQS: FaqItem[] = [
    {
      q: 'Does Mugavi stop sending reminders when a customer replies?',
      a: 'Yes. When a customer replies to a reminder, Mugavi records the reply, ' +
         'classifies it, and pauses further reminders for that invoice until ' +
         'you have read it and marked it handled or dismissed. This is on by ' +
         'default and is a setting on the sequence. Replies are matched by the ' +
         'email thread, so it depends on your reply inbox being connected.',
    },
    {
      q: 'Does Mugavi track promises to pay?',
      a: 'Yes. When a customer says they will pay on a given date, Mugavi ' +
         'suggests the date from their reply and you confirm it. Once a promise ' +
         'is logged, reminders for that invoice stay paused until the promised ' +
         'date. If the invoice is paid, reminders stop for good. If the date ' +
         'passes unpaid, the next reminder is drafted for your approval.',
    },
    {
      q: 'Can I approve every message before it goes out?',
      a: 'Yes, and it is the default. Mugavi drafts each reminder and holds it ' +
         'in an approval queue. You can edit the subject and message, approve ' +
         'it, or skip it, and you get an email when drafts are waiting. You can ' +
         'switch an account to automatic sending from the dunning page and back ' +
         'again at any time. You can also pause any single customer.',
    },
    {
      q: 'How does Mugavi classify disputes?',
      a: 'Replies are classified as a promise to pay, already paid, a dispute, ' +
         'a missing PO, the wrong contact and so on, with a short summary and a ' +
         'suggested next step. Any reply pauses reminders for that invoice ' +
         'until you handle it, and an invoice you mark as disputed stays out ' +
         'of the reminder schedule until the dispute is resolved.',
    },
    {
      q: 'Does Mugavi integrate with QuickBooks as well as Xero?',
      a: 'Xero is in production today. QuickBooks Online is in beta while we ' +
         'complete Intuit\'s production review, and is available on request ' +
         'for founding customers. The reminder workflow is the same on both.',
    },
    {
      q: 'Does Mugavi send SMS as well as email?',
      a: 'Yes, SMS dunning is offered to founding customers as a pass-through ' +
         'add-on. Each SMS is sent via Twilio (pass-through cost). We do not ' +
         'mark up SMS; you see the carrier cost line-item on your invoice.',
    },
];

export const metadata = pageMetadata({
  title: 'Features: tone-aware AR automation for small agencies',
  description:
    'All of Mugavi\'s features: AI-drafted reminders you approve before ' +
    'they send, pause on reply, payment or promise, pause any customer, ' +
    'promise-to-pay tracking, dispute handling, Xero sync (QuickBooks in ' +
    'beta), a 4-week cash forecast and an AR aging dashboard.',
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
  faqJsonLd(FAQS),
);

// One accent, six features. Each card previously carried its own hue (brand,
// then emerald, purple, amber, indigo, rose) with no semantic meaning behind
// any of the five departures from brand -- a decorative rainbow, which is
// both a recognisable AI tell on its own and a direct break of the one-accent
// rule the rest of this pass enforces. Six equal-weight features read as one
// coherent product in one tone; the icon shape and the copy differentiate
// them now, not the hue.
const FEATURES = [
  { icon: Bot, color: 'text-brand-600', bg: 'bg-brand-50', title: 'AI dunning engine', body: 'Tone-aware email and SMS reminders, drafted by Gemini. You approve each one before it goes out, unless you switch that off. Reminders pause on a reply, a payment, a promised date or a dispute.', bullets: ['Friendly, firm and final tones, set at each step', 'Approve, edit or skip every draft', 'Pause any customer until a date, or until you resume', 'Stops on a reply, payment, promise or dispute', 'Every send logged and emailed to you', 'Send windows: only act in your business hours, in your timezone', 'Send from your own domain, once you verify it', 'Unsubscribes and bounces are never overridden'] },
  { icon: FileText, color: 'text-brand-600', bg: 'bg-brand-50', title: 'Branded payment portal', body: 'A payment page for each invoice with your business name on it. Paystack payments are recorded against the invoice automatically. Which payment methods you can offer depends on your region and provider approval.', bullets: ['Paystack (NG, GH, KE, ZA)', 'Card and bank payment where your provider supports it', 'Payment link included in reminders'] },
  { icon: BarChart3, color: 'text-brand-600', bg: 'bg-brand-50', title: 'Cash-flow forecast', body: 'A four-week projection of incoming cash, built from due dates, promised payment dates and how each customer has paid you before. It shows which weeks are solid and which are hope.', bullets: ['4-week rolling view', 'Separates promised, likely and uncertain money', 'Uses promised dates you have confirmed'] },
  { icon: Clock, color: 'text-brand-600', bg: 'bg-brand-50', title: 'AR aging dashboard', body: 'Buckets for current, 1-30, 31-60, 61-90 and 90+ days. Drill into a customer and see exactly who owes what and how overdue it is.', bullets: ['Standard aging buckets', 'Customer-level drill-down', 'Invoice-level history'] },
  { icon: ShieldCheck, color: 'text-brand-600', bg: 'bg-brand-50', title: 'Promises and disputes', body: 'Log what a customer says they will pay and when, or open a dispute when they push back. Either one takes the invoice out of the reminder schedule, so nobody gets chased over a settled arrangement.', bullets: ['Promised amount and date per invoice', 'Reminders resume only if the date passes unpaid', 'Dispute reasons: already paid, missing PO, wrong amount and more', 'Replies classified with a suggested next step'] },
  { icon: Globe2, color: 'text-brand-600', bg: 'bg-brand-50', title: 'Multiple currencies', body: 'Each invoice keeps its own currency, and reminders show the right amount in it.', bullets: ['Invoices in their own currency', 'Reminders show currency and amount'] },
];

export default function FeaturesPage() {
  return (
    <div className="min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: featuresJsonLd }} />
      <MarketingHeader />
      <section className="container-page pt-16 pb-12 text-center max-w-3xl mx-auto">
        <p className="eyebrow">Features</p>
        <h1 className="mt-3 h1">Six things. Each one aimed at getting you paid faster.</h1>
        <p className="mt-5 lead">No 200-feature enterprise bloat. No &quot;AI inside&quot; stickers on things that don&apos;t need AI. Here&apos;s exactly what each one does, below. No marketing fog.</p>
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
          <p className="mt-4 lead">14-day free trial. No credit card. Connect Xero or QuickBooks and start in one sitting.</p>
          <div className="mt-6 max-w-md mx-auto"><WaitlistForm /></div>
        </div>
      </section>
      <FaqSection items={FAQS} title="Frequently asked" />
      <MarketingFooter />
    </div>
  );
}
