import { MarketingHeader } from '@/components/marketing/header';
import { MarketingFooter } from '@/components/marketing/footer';
import { StructuredBreadcrumbs } from '@/components/seo/structured-breadcrumbs';
import { pageMetadata, faqJsonLd, webPageJsonLd, softwareAppJsonLd } from '@/lib/seo';
import { CheckCircle2, ArrowRight, Clock, Calculator, TrendingDown, FileText } from 'lucide-react';

// Free tool — DSO calculator + benchmark explainer. SEO target:
// "DSO calculator", "calculate days sales outstanding", "DSO formula",
// "average DSO for agencies", "DSO benchmark". The page also includes
// worked examples for agencies, consultancies, and SaaS — three of the
// industries Collectly targets.

export const metadata = pageMetadata({
  title: 'DSO calculator + benchmark for small agencies and consultancies',
  description:
    'Calculate your Days Sales Outstanding (DSO) instantly and compare ' +
    'to UK, US, AU, and CA benchmarks for small agencies and consultancies. ' +
    'Formula explained, worked examples included, and a free A/R audit ' +
    'to find what is slowing your cash flow.',
  path: '/tools/dso-calculator',
  image: '/og-ar-audit.png',
  keywords: [
    'DSO calculator',
    'days sales outstanding formula',
    'calculate DSO',
    'small business DSO benchmark',
    'agency DSO average',
    'consultancy DSO',
    'UK SMB late payment',
  ],
});

const dsoJsonLd = JSON.stringify([
  webPageJsonLd({
    title: 'DSO calculator + benchmark for small agencies and consultancies',
    description:
      'Calculate DSO and compare to industry benchmarks for small agencies ' +
      'and consultancies.',
    path: '/tools/dso-calculator',
  }),
  softwareAppJsonLd(),
  faqJsonLd([
    {
      q: 'How is DSO calculated?',
      a: 'DSO = (Accounts Receivable ÷ Total Credit Sales) × Number of Days. ' +
         'For a monthly view: DSO = (AR ÷ Monthly Revenue) × 30. For an ' +
         'annualized view: DSO = (AR ÷ Annual Revenue) × 365. Lower is better.',
    },
    {
      q: 'What is a good DSO for a small agency?',
      a: 'A 5-30 person agency on net-30 terms should aim for DSO under 30 ' +
         'days. The UK national average across Xero SMBs is 29 days, but ' +
         'most agencies operate on payment terms that put the realistic ' +
         'target closer to 21-25 days.',
    },
    {
      q: 'What is the DSO for UK small businesses?',
      a: 'Per Xero\'s analysis of 440,000 UK small businesses in early 2026, ' +
         'invoices take on average 29 days to be paid, which is 8.2 days ' +
         'past their due date. Total late-payment debt held by UK SMBs at ' +
         'any given time is approximately £26 billion.',
    },
    {
      q: 'How do I reduce DSO without losing customers?',
      a: 'Use a 3-step consistent follow-up sequence (friendly → firm → ' +
         'final) that pauses the moment a customer replies. Pair this with ' +
         'a frictionless pay link in every reminder. Collectly automates ' +
         'both — see the free AR audit for a personalised analysis.',
    },
    {
      q: 'What is the difference between DSO and DPO?',
      a: 'DSO measures how fast you collect. DPO (Days Payable Outstanding) ' +
         'measures how fast you pay your own suppliers. Healthy SMBs keep ' +
         'DSO low and DPO moderate — chasing customers late while paying ' +
         'suppliers early is the worst cash combination.',
    },
    {
      q: 'Does DSO vary by industry?',
      a: 'Yes. Agencies and consultancies typically run 30-50 days. Retail ' +
         'runs 5-10 days. Software / SaaS runs 45-75 days (annual contracts ' +
         'with monthly invoicing). Manufacturing runs 45-60 days. The ' +
         'benchmark for your specific industry is the comparison that ' +
         'actually matters — not the all-industry average.',
    },
  ]),
]);

const BENCHMARKS = [
  { region: 'United Kingdom', dso: 29, days: 'early 2026', source: 'Xero SMB analysis' },
  { region: 'United States', dso: 39, days: '2025', source: 'Atradius payment practices' },
  { region: 'Australia', dso: 26, days: '2025', source: 'Xero Australia SMB data' },
  { region: 'Canada', dso: 31, days: '2024', source: 'Sage Canada report' },
  { region: 'Kenya / East Africa', dso: 51, days: '2024', source: 'FSD Africa SMB survey' },
];

const FORMULA_BREAKDOWN = [
  {
    symbol: 'AR',
    name: 'Accounts Receivable',
    description:
      'The total dollar value of invoices you have issued that have not yet ' +
      'been paid. Pull this from your Xero or QuickBooks balance sheet.',
    example: '$120,000',
  },
  {
    symbol: 'Revenue (period)',
    name: 'Total credit sales',
    description:
      'Total sales over the same period the AR covers. For an annual DSO, ' +
      'use trailing 12 months. For monthly DSO, use the current month.',
    example: '$1,200,000 (trailing 12 months)',
  },
  {
    symbol: 'Days',
    name: 'Period in days',
    description: '365 for annual, 30 for monthly, 90 for quarterly.',
    example: '365',
  },
];

export default function DsoCalculatorPage() {
  return (
    <div className="min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: dsoJsonLd }} />
      <StructuredBreadcrumbs
        items={[
          { name: 'Home', path: '/' },
          { name: 'Free tools', path: '/tools/dso-calculator' },
        ]}
      />
      <MarketingHeader />
      <section className="container-page pt-16 pb-12 max-w-3xl">
        <p className="eyebrow">Free tool</p>
        <h1 className="mt-3 h1">DSO calculator + benchmarks by region.</h1>
        <p className="mt-5 lead">
          Days Sales Outstanding (DSO) is the single most useful number for
          understanding your cash-collection speed. Calculate yours in 30
          seconds, compare to a regional benchmark, and find what is slowing
          your cash flow.
        </p>
        <ul className="mt-6 space-y-2 text-sm text-ink-700">
          <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" /> Free, no email gate, runs in your browser.</li>
          <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" /> Benchmarked against actual SMB data for UK, US, AU, CA, and East Africa.</li>
          <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" /> Worked examples for agencies, consultancies, and SaaS businesses.</li>
        </ul>
      </section>
      <section className="container-page pb-12">
        <div className="card-lg max-w-4xl">
          <div className="flex items-center gap-3">
            <Calculator className="h-5 w-5 text-brand-600" />
            <h2 className="text-xl font-semibold text-ink-900">The DSO formula</h2>
          </div>
          <p className="mt-3 text-sm text-ink-700">
            <span className="font-mono bg-ink-50 px-2 py-1 rounded">DSO = (Accounts Receivable ÷ Total Credit Sales) × Days</span>
          </p>
          <div className="mt-6 grid md:grid-cols-3 gap-4">
            {FORMULA_BREAKDOWN.map((f) => (
              <div key={f.symbol} className="border border-ink-200 rounded-lg p-4">
                <p className="font-mono font-semibold text-brand-700">{f.symbol}</p>
                <p className="mt-1 text-sm font-semibold text-ink-900">{f.name}</p>
                <p className="mt-2 text-sm text-ink-600">{f.description}</p>
                <p className="mt-2 text-xs font-mono text-ink-500">Example: {f.example}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="bg-ink-50 border-y border-ink-200">
        <div className="container-page py-16 max-w-4xl">
          <div className="flex items-center gap-3">
            <TrendingDown className="h-5 w-5 text-brand-600" />
            <h2 className="h2">DSO benchmarks by region</h2>
          </div>
          <p className="mt-3 lead">
            Where does your business sit? Lower is better — every day past your
            payment terms is working capital you do not have.
          </p>
          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-sm border border-ink-200 rounded-lg overflow-hidden">
              <thead className="bg-white text-ink-500 text-xs uppercase tracking-wider">
                <tr>
                  <th className="text-left font-semibold py-3 px-4">Region</th>
                  <th className="text-right font-semibold py-3 px-4">Avg DSO</th>
                  <th className="text-left font-semibold py-3 px-4">Period</th>
                  <th className="text-left font-semibold py-3 px-4">Source</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-200 bg-white">
                {BENCHMARKS.map((b) => (
                  <tr key={b.region}>
                    <td className="py-3 px-4 font-medium text-ink-900">{b.region}</td>
                    <td className="py-3 px-4 text-right font-mono font-semibold text-ink-900">{b.dso} days</td>
                    <td className="py-3 px-4 text-ink-600">{b.days}</td>
                    <td className="py-3 px-4 text-ink-600 text-xs">{b.source}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-xs text-ink-500">
            Benchmarks sourced from published SMB analyses. See methodology
            notes at the bottom of the page.
          </p>
        </div>
      </section>
      <section className="container-page py-16 max-w-4xl">
        <h2 className="h2">Worked examples by industry</h2>
        <div className="mt-6 space-y-6">
          <div className="card-lg">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-brand-600" />
              <h3 className="text-lg font-semibold text-ink-900">5-30 person agency on Xero</h3>
            </div>
            <p className="mt-3 text-sm text-ink-700">
              AR (open invoices): $90,000. Trailing-12-month revenue: $1,200,000.
              Days: 365.
            </p>
            <p className="mt-3 font-mono bg-ink-50 px-3 py-2 rounded text-sm text-ink-900">
              DSO = ($90,000 ÷ $1,200,000) × 365 = 27.4 days
            </p>
            <p className="mt-3 text-sm text-ink-600">
              <strong>What this means:</strong> This agency collects, on
              average, 27 days after sending an invoice. With net-30 terms
              and a 29-day UK SMB average, this is in the healthy range. A
              small improvement to 21 days would free up about $24,000 in
              working capital.
            </p>
          </div>
          <div className="card-lg">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-brand-600" />
              <h3 className="text-lg font-semibold text-ink-900">10-person consultancy on net-60</h3>
            </div>
            <p className="mt-3 text-sm text-ink-700">
              AR (open invoices): $160,000. Trailing-12-month revenue:
              $900,000. Days: 365.
            </p>
            <p className="mt-3 font-mono bg-ink-50 px-3 py-2 rounded text-sm text-ink-900">
              DSO = ($160,000 ÷ $900,000) × 365 = 64.9 days
            </p>
            <p className="mt-3 text-sm text-ink-600">
              <strong>What this means:</strong> This consultancy is running 5
              days past their stated 60-day payment terms. With retainer-heavy
              cash flow, a 5-day improvement would unlock roughly $13,500 of
              working capital without changing the customer roster.
            </p>
          </div>
        </div>
      </section>
      <section className="bg-brand-600 text-white">
        <div className="container-page py-12 max-w-3xl">
          <h2 className="h2">Now cut it.</h2>
          <p className="mt-4 lead text-brand-100">
            Most small-business A/R processes operate 5-15 days slower than
            what they should. A free 24-hour audit shows you the three
            specific things slowing your cash flow.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <a href="/ar-audit" className="btn-primary inline-flex items-center gap-1.5">
              Get a free A/R health audit <ArrowRight className="h-4 w-4" />
            </a>
            <a href="/playbook" className="btn-secondary inline-flex items-center gap-1.5">
              Download the 5-step playbook
            </a>
          </div>
        </div>
      </section>
      <MarketingFooter />
    </div>
  );
}
