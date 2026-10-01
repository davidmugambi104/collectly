export const dynamic = 'force-dynamic';
import { pageMetadata } from '@/lib/seo';
import { WaitlistForm } from '@/components/marketing/waitlist';

export const metadata = pageMetadata({
  title: 'Changelog: what we shipped, and when',
  description:
    'What we shipped, and when. Updates weekly. Real entries from a ' +
    'small product team, not a marketing roundup.',
  path: '/changelog',
  keywords: ['Mugavi changelog', 'product updates', 'release notes'],
});

export default function ChangelogPage() {
  return (
    <div className="min-h-screen bg-ink-50">
      <div className="container-page py-16 max-w-3xl">
        <h1 className="text-4xl font-display font-bold">Changelog</h1>
        <p className="mt-3 text-ink-600">What we shipped, and when. Updates weekly.</p>

        <div className="mt-10 space-y-8">
          {[
            {
              date: '2026-10-01',
              title: 'Statements, late fees, shared call tasks and more people on a customer',
              body: 'A customer statement you can view, print, download or email, with a 30-second Undo and your payment details at the bottom (sent by hand: nothing is scheduled). A late fee rule that lists the fees due and applies them only when you confirm; a fee is its own line on reminders and statements, and is not added to the payment page or written back to your accounting software. Call tasks can be given to a teammate and closed with a note on how the call went. A later reminder can be sent under a different name. A reminder to a customer with several overdue invoices now lists them with a total. Add other people at a customer, such as accounts payable, who get their own copy with their own unsubscribe link.',
            },
            {
              date: '2026-09-30',
              title: 'Control first: you approve, you can undo, and you can see why',
              body: 'Reminders wait for your approval by default, and a reminder you send by hand has a 30-second Undo. Ask why a reminder has not gone out and get a plain answer. Pause reminders for one customer. A reply pauses that invoice until you have read it, and you can answer from the Inbox. Customer groups with their own schedules, a guided first run, send windows, reminders before the due date, one reminder per customer per 7 days by default, and a minimum balance. An aged receivables report, saved views, and call tasks. On the payment page a customer can say when they will pay or that something is not right. Sending from your own domain is supported, but we have not yet proven it with a live domain.',
            },
            {
              date: '2026-07-13',
              title: 'Public launch: A/R ROI calculator + AI cash-flow forecast',
              body: 'New /tools/ar-roi public lead-gen tool. AI cash-flow forecast wired to /api/forecast with weighted fallback. New /api/lead-notify endpoint that emails the founder on every waitlist + interview submission (no more silent form-fills).',
            },
            {
              date: '2026-07-12',
              title: 'Beta: production-ready dashboard + integrations',
              body: '13-table Drizzle schema, 24 routes all 200 OK, AI dunning engine (Gemini tone-aware), QuickBooks OAuth, Stripe subscriptions, Resend email + Twilio SMS, PGlite in-memory dev mode for zero-setup local dev.',
            },
            {
              date: '2026-07-05',
              title: 'Beta: opening the founding cohort',
              body: 'Opened signups for the first 20 founding customers. No customers onboarded yet. This is day one of outreach.',
            },
            {
              date: '2026-06-20',
              title: 'Working prototype',
              body: 'First working version. QuickBooks + Xero + Stripe integrations, basic dunning, 4-week forecast.',
            },
          ].map((entry) => (
            <div key={entry.date} className="border-l-2 border-brand-500 pl-5">
              <div className="text-xs text-ink-500 font-mono">{entry.date}</div>
              <h2 className="mt-1 font-display font-semibold text-lg">{entry.title}</h2>
              <p className="mt-1 text-sm text-ink-600">{entry.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-16 p-6 rounded-xl bg-white border border-ink-200 text-center">
          <h3 className="font-semibold text-ink-900">Get the changelog by email</h3>
          <p className="mt-1 text-sm text-ink-600">One short email every Friday. Product updates, customer wins, and what we learned.</p>
          {/* Was a raw HTML form POSTing url-encoded data straight to
              /api/waitlist, which only accepts JSON (req.json()) — every
              real submission full-page-navigated to a bare JSON error
              blob instead of saving anything. Every other page on the
              site already goes through this shared client component. */}
          <div className="mt-4 max-w-md mx-auto">
            <WaitlistForm source="changelog-signup" compact />
          </div>
        </div>
      </div>
    </div>
  );
}
