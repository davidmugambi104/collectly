import { billingCopy } from '@/lib/billing-copy';
import { stripeBillingStatus } from '@/lib/stripe-billing-config';
import { MarketingHeader } from '@/components/marketing/header';
import { MarketingFooter } from '@/components/marketing/footer';
import { StructuredBreadcrumbs } from '@/components/seo/structured-breadcrumbs';
import { pageMetadata, faqJsonLd, webPageJsonLd, softwareAppJsonLd } from '@/lib/seo';
import { FaqSection, type FaqItem } from '@/components/marketing/faq-section';
import { PLAN_PRICING, PRACTICE_INCLUDED_ORGS, PRACTICE_EXTRA_ORG_MONTHLY } from '@/lib/utils';
import { CheckCircle2, ArrowRight, MailCheck, Layers, Scale } from 'lucide-react';
import Link from 'next/link';
import { TrackView } from '@/components/marketing/track-view';

// Every claim on this page is one the marketing brief backs (file 15). The
// QuickBooks integration is in beta and says so; the limits section lists what
// is not built. Module-local, not exported: a Next.js page may only carry the
// framework's own named exports.
const billing = billingCopy(stripeBillingStatus(process.env).checkoutReady);
const FAQS: FaqItem[] = [
  {
    q: 'Will Mugavi email my clients’ customers without my say-so?',
    a: 'No. Approval mode is on by default: Mugavi drafts each reminder and nothing ' +
       'goes to a customer until a person approves it. Once you press send you get ' +
       'thirty seconds to undo it. You can switch a book to automatic sending yourself, ' +
       'and back again.',
  },
  {
    q: 'Does it work with QuickBooks Online?',
    a: 'Yes, and it is in beta. You connect QuickBooks Online with Intuit’s own ' +
       'sign-in. Mugavi reads customers, open invoices and credit memos, notices ' +
       'invoices that were paid or voided in QuickBooks, and records payments back. ' +
       'Treat it as a beta: connect one client book first and check what it shows ' +
       'before you add the rest.',
  },
  {
    q: 'What does a client’s customer actually receive?',
    a: 'An email that you have read and, if you like, rewritten before it goes. It ' +
       'comes under your client’s business name, can be sent from the client’s ' +
       'own address once that domain is verified, and carries an unsubscribe link. ' +
       'A customer who replies stops being chased while a person reads the reply.',
  },
  {
    q: 'How do I see all my client books at once?',
    a: 'There is a client books view: one table with what each book has outstanding and ' +
       'overdue, the oldest overdue invoice, and what needs you (a connection to ' +
       'renew, replies waiting, reminders waiting for approval). Books that need a ' +
       'person come first. It appears once you belong to more than one book.',
  },
  {
    q: 'What does it cost, and how do I pay?',
    a: `$${PLAN_PRICING.growth.monthly}/mo covers ${PRACTICE_INCLUDED_ORGS} client books, and ` +
       `each extra book is $${PRACTICE_EXTRA_ORG_MONTHLY}/mo. There are no per-invoice fees. ` +
       `Billing: ${billing.forPagesLine}.`,
  },
  {
    q: 'Does it write late fees back to QuickBooks?',
    a: 'Not yet. You set a late fee rule, Mugavi lists the invoices that are due a ' +
       'fee, and nothing is charged until you select them and confirm. Fees show as ' +
       'their own line on reminders and statements. They are not written back to ' +
       'QuickBooks, and they are not on the payment page.',
  },
];

export const metadata = pageMetadata({
  title: 'Invoice reminders for bookkeepers on QuickBooks Online',
  description:
    'Run overdue-invoice follow-up across your clients’ QuickBooks books, in one ' +
    'place. Reminders go out in your words, and wait for your approval by default. ' +
    `$${PLAN_PRICING.growth.monthly}/mo for ${PRACTICE_INCLUDED_ORGS} client books. QuickBooks Online integration is in beta.`,
  path: '/for/bookkeepers',
  keywords: [
    'invoice reminders for bookkeepers',
    'QuickBooks overdue invoice reminders',
    'accounts receivable for bookkeeping practices',
    'chase late invoices for clients',
    'fractional bookkeeper AR tool',
  ],
});

const jsonLd = JSON.stringify([
  webPageJsonLd({
    title: 'Invoice reminders for bookkeepers on QuickBooks',
    description:
      'How Mugavi lets a bookkeeping practice follow up on overdue invoices across client books, with approval before anything is sent.',
    path: '/for/bookkeepers',
  }),
  softwareAppJsonLd(),
  faqJsonLd(FAQS),
]);

export default function ForBookkeepersPage() {
  return (
    <div className="min-h-screen">
      <TrackView event="audience_page_view" eventProps={{ audience: 'bookkeepers' }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
      <StructuredBreadcrumbs
        items={[
          { name: 'Home', path: '/' },
          { name: 'For Bookkeepers', path: '/for/bookkeepers' },
        ]}
      />
      <MarketingHeader />
      <section className="container-page pt-16 pb-12 max-w-3xl">
        <p className="eyebrow">For bookkeepers</p>
        <h1 className="mt-3 h1">Chase late invoices for your clients, without sending anything unseen.</h1>
        <p className="mt-5 lead">
          Many clients on QuickBooks have overdue invoices and nobody following up. Mugavi drafts the
          reminders for each client book, you read and approve them, and only then do they go out. Your words,
          your client&apos;s name, nothing sent behind your back.
          ${PLAN_PRICING.growth.monthly}/mo for {PRACTICE_INCLUDED_ORGS} client books.
        </p>
        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <Link href="/ar-audit" className="btn-primary inline-flex items-center gap-1.5">
            Get a free A/R health audit <ArrowRight className="h-4 w-4" />
          </Link>
          <Link href="/pricing" className="btn-secondary inline-flex items-center gap-1.5">
            See pricing
          </Link>
        </div>
        <p className="mt-4 text-sm text-ink-600">QuickBooks Online integration is in beta.</p>
      </section>

      <section className="container-page pb-16">
        <div className="grid md:grid-cols-3 gap-5 max-w-5xl">
          <div className="card">
            <MailCheck className="h-6 w-6 text-brand-600" />
            <h2 className="mt-3 text-lg font-semibold text-ink-900">Approval is built in.</h2>
            <p className="mt-2 text-sm text-ink-600 leading-relaxed">
              By default Mugavi writes the reminder and waits. Edit it, skip it, or approve it, and after you press send
              you have thirty seconds to undo. Switching to automatic sending is your choice, per book.
            </p>
          </div>
          <div className="card">
            <Layers className="h-6 w-6 text-brand-600" />
            <h2 className="mt-3 text-lg font-semibold text-ink-900">All your client books in one table.</h2>
            <p className="mt-2 text-sm text-ink-600 leading-relaxed">
              Outstanding and overdue per book, the oldest overdue invoice, and what needs you, with the books
              that need a person listed first.
            </p>
          </div>
          <div className="card">
            <Scale className="h-6 w-6 text-brand-600" />
            <h2 className="mt-3 text-lg font-semibold text-ink-900">Priced per book, not per invoice.</h2>
            <p className="mt-2 text-sm text-ink-600 leading-relaxed">
              ${PLAN_PRICING.growth.monthly}/mo for {PRACTICE_INCLUDED_ORGS} books, then ${PRACTICE_EXTRA_ORG_MONTHLY} for each
              extra book. Past that, <Link href="/pricing" className="link">Practice Scale</Link> is cheaper.
              Comparing tools? Put your own client books and invoice volume into the <Link href="/vs-paidnice#cost" className="link">cost calculator</Link>, which shows where Paidnice is cheaper and where we are.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-ink-50 border-y border-ink-200">
        <div className="container-page py-16 max-w-3xl">
          <p className="eyebrow">What it does for a practice</p>
          <h2 className="mt-3 h2">Fewer chase emails you write by hand.</h2>
          <ul className="mt-6 space-y-3 text-sm text-ink-700">
            <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" /> One reminder per customer per week by default, listing their other overdue invoices, so nobody is nagged three times.</li>
            <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" /> Your client&apos;s relationship stays yours: hold any customer you are handling personally, and choose the days and hours reminders may be drafted, so nothing lands at midnight.</li>
            <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" /> A customer who holds credit that covers what they owe is not chased. Mugavi says why and tells you to apply the credit in QuickBooks.</li>
            <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" /> A reply pauses the chase and lands in your inbox with a suggested next step. Disputed invoices are left out.</li>
            <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" /> Statements you can print, download or email per customer, and an aged receivables report per book.</li>
            <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" /> A call step in the schedule puts a task on a person&apos;s list when a phone call is the right move.</li>
          </ul>
        </div>
      </section>

      <section className="container-page py-16 max-w-3xl">
        <p className="eyebrow">What it does not do yet</p>
        <h2 className="mt-3 h2">Be sure before you rely on it.</h2>
        <ul className="mt-6 space-y-3 text-sm text-ink-700">
          <li>QuickBooks Online is a beta integration. Start with one client book.</li>
          <li>Late fees are reviewed and applied by you. They are not automatic, not written back to QuickBooks and not on the payment page.</li>
          <li>There is no read-only team role: anyone you add has the same access you do.</li>
          <li>No payment plans, no tags on customers, and statements are sent by you, not on a schedule.</li>
          <li>{billing.checkoutReady ? 'Card and US bank (ACH) checkout is on. Accounts set up on a manual invoice stay on it until they ask to move.' : 'Billing is a manual invoice for everyone today. Card and US bank (ACH) checkout is built but not switched on yet.'}</li>
        </ul>
        <h2 className="mt-12 h2">Leaving is easy.</h2>
        <ul className="mt-6 space-y-3 text-sm text-ink-700">
          <li>14-day trial with no card taken. It does not turn into a paid plan by itself.</li>
          <li>Disconnecting a client book from QuickBooks or Xero is one click on Integrations. We ask Intuit or Xero to revoke our access and delete the stored tokens. What was already imported stays until you remove it: Integrations shows the counts, you confirm, and only rows from that provider go.</li>
          <li>Settings has one download, a ZIP of CSV files, with customers, invoices, reminders and what each customer owes. The owner or an admin can export.</li>
          <li>The account owner can delete a book from Settings. Its customers, invoices and reminder history go straight away, and backups roll off within 30 days.</li>
          <li>To cancel or change a plan, ask from Billing. David confirms by email and nothing changes until he does. No cancellation fee, no contract.</li>
        </ul>
        <div className="mt-8">
          <Link href="/ar-audit" className="btn-primary inline-flex items-center gap-1.5">
            Get a free A/R health audit <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
      <section className="container-page pb-16 max-w-3xl">
        <p className="eyebrow">Guides for practices</p>
        <h2 className="mt-3 h2">Read how it works in a practice.</h2>
        <ul className="mt-6 space-y-3 text-sm text-ink-700">
          <li><Link href="/blog/run-invoice-reminders-across-many-quickbooks-client-books" className="text-brand-700 underline underline-offset-2 hover:text-brand-800">Running invoice reminders across many QuickBooks client books: a pilot plan</Link></li>
          <li><Link href="/blog/bookkeeper-invoice-follow-up-service" className="text-brand-700 underline underline-offset-2 hover:text-brand-800">How a bookkeeper can sell invoice follow-up as a service</Link></li>
          <li><Link href="/blog/onboard-client-to-invoice-follow-up-first-week" className="text-brand-700 underline underline-offset-2 hover:text-brand-800">Onboard a client to invoice follow-up in the first week</Link></li>
          <li><Link href="/blog/accounts-receivable-month-end-checklist-quickbooks-online" className="text-brand-700 underline underline-offset-2 hover:text-brand-800">An accounts receivable month-end checklist for QuickBooks Online</Link></li>
        </ul>
      </section>
      <FaqSection items={FAQS} title="Bookkeeper questions" />
      <MarketingFooter />
    </div>
  );
}
