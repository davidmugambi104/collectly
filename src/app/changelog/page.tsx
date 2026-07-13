export const dynamic = 'force-dynamic';
export default function ChangelogPage() {
  return (
    <div className="min-h-screen bg-ink-50">
      <div className="container-page py-16 max-w-3xl">
        <h1 className="text-4xl font-display font-bold">Changelog</h1>
        <p className="mt-3 text-ink-600">What we shipped, and when. Updates weekly.</p>

        <div className="mt-10 space-y-8">
          {[
            {
              date: '2026-07-13',
              title: 'Public launch — A/R ROI calculator + AI cash-flow forecast',
              body: 'New /tools/ar-roi public lead-gen tool. AI cash-flow forecast wired to /api/forecast with weighted fallback. New /api/lead-notify endpoint that emails the founder on every waitlist + interview submission (no more silent form-fills).',
            },
            {
              date: '2026-07-12',
              title: 'Beta: production-ready dashboard + integrations',
              body: '13-table Drizzle schema, 24 routes all 200 OK, AI dunning engine (GPT-4o tone-aware), QuickBooks OAuth, Stripe subscriptions, Resend email + Twilio SMS, PGlite in-memory dev mode for zero-setup local dev.',
            },
            {
              date: '2026-07-05',
              title: 'Beta: 10 design partners',
              body: 'Onboarded 10 B2B service businesses for the closed beta. Iterating on dunning tone, cash-flow forecast, and payment portal.',
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
          <form action="/api/waitlist" method="post" className="mt-4 flex max-w-md mx-auto gap-2">
            <input name="email" type="email" required placeholder="you@company.com" className="input flex-1" />
            <input type="hidden" name="source" value="changelog-signup" />
            <button type="submit" className="btn-primary">Subscribe</button>
          </form>
        </div>
      </div>
    </div>
  );
}
