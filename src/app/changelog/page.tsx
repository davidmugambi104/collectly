export const dynamic = 'force-dynamic';
export default function ChangelogPage() {
  return (
    <div className="min-h-screen bg-ink-50">
      <div className="container-page py-16 max-w-3xl">
        <h1 className="text-4xl font-display font-bold">Changelog</h1>
        <p className="mt-3 text-ink-600">What we shipped, and when.</p>

        <div className="mt-10 space-y-8">
          {[
            { date: '2026-07-13', title: 'Public launch', body: 'Marketing site, waitlist, dashboard, AI dunning engine, QuickBooks integration scaffold, multi-currency support.' },
            { date: '2026-07-05', title: 'Beta: 10 design partners', body: 'Onboarded 10 B2B service businesses for the closed beta. Iterating on dunning tone, cash-flow forecast, and payment portal.' },
            { date: '2026-06-20', title: 'Working prototype', body: 'First working version. QuickBooks + Xero + Stripe integrations, basic dunning, 4-week forecast.' },
          ].map((entry) => (
            <div key={entry.date} className="border-l-2 border-ink-300 pl-5">
              <div className="text-xs text-ink-500 font-mono">{entry.date}</div>
              <h2 className="mt-1 font-display font-semibold text-lg">{entry.title}</h2>
              <p className="mt-1 text-sm text-ink-600">{entry.body}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
