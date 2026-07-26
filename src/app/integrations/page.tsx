import { MarketingHeader } from '@/components/marketing/header';
import { MarketingFooter } from '@/components/marketing/footer';
import Link from 'next/link';
import { ArrowRight, CheckCircle2, Database, Banknote, ReceiptText, MessageSquare, BarChart3, Lock, Server } from 'lucide-react';

export const metadata = {
  title: 'Integrations',
  description: 'Connect your books, payments, and communications in 60 seconds. QuickBooks, Xero, Stripe, Square, Plaid, Resend, Twilio, and Paystack integration statuses.',
};

const categories = [
  {
    title: 'Accounting',
    description: 'Where your invoices, customers, and payments live. We sync from here.',
    items: [
      {
        name: 'QuickBooks Online',
        slug: 'quickbooks',
        status: 'sandbox',
        bullets: [
          'OAuth 2.0 connection route is built and tested',
          'Pull invoices, customers, payments, and aging reports',
          'Currently using sandbox keys; swap to production keys to go live',
        ],
      },
      {
        name: 'Xero',
        slug: 'xero',
        status: 'needs-credentials',
        bullets: [
          'OAuth 2.0 callback and token-refresh flow ready',
          'Sync contacts, invoices, and credit notes',
          'Production app credentials present but first connection must be verified',
        ],
      },
    ],
  },
  {
    title: 'Payments',
    description: 'Take money on the branded portal. No middleman fees beyond processor cost.',
    items: [
      {
        name: 'Stripe',
        slug: 'stripe',
        status: 'test-mode',
        bullets: [
          'ACH, card, and SEPA on the hosted portal',
          'Webhook reconciliation against invoices',
          'Swap to live keys when you are ready to collect real payments in US/UK/AU/CA',
        ],
      },
      {
        name: 'Square',
        slug: 'square',
        status: 'sandbox',
        bullets: [
          'Sandbox OAuth tested end-to-end',
          'Sync Square sales as paid invoices',
          'Production approval required from Square',
        ],
      },
      {
        name: 'Paystack',
        slug: 'paystack',
        status: 'live',
        bullets: [
          'Live keys verified; ready to process payments',
          'Best for Nigeria, Ghana, Kenya, and South Africa',
          'Card, bank transfer, and mobile money where supported',
        ],
      },
    ],
  },
  {
    title: 'Banking',
    description: 'Read-only bank feeds for cash-flow forecasting. We never move money.',
    items: [
      {
        name: 'Plaid',
        slug: 'plaid',
        status: 'live',
        bullets: [
          'Read-only access to balances and transactions',
          'Powers the 4-week cash-flow forecast',
          'Sandbox support for testing',
        ],
      },
    ],
  },
  {
    title: 'Communications',
    description: 'The dunning messages go out through these. Bring your own keys for full control.',
    items: [
      {
        name: 'Resend (email)',
        slug: 'resend',
        status: 'live',
        bullets: [
          'Transactional email delivery',
          'Open and click tracking on dunning emails',
          'Bring your own sending domain',
        ],
      },
      {
        name: 'Twilio (SMS)',
        slug: 'twilio',
        status: 'test-mode',
        bullets: [
          'SMS dunning route is built and ready',
          'Add a verified from-number and complete A2P registration for US sends',
          'Compliance with TCPA, GDPR, and AU spam laws',
        ],
      },
    ],
  },
  {
    title: 'Infrastructure',
    description: 'Reliability, analytics, and intelligence under the hood.',
    items: [
      {
        name: 'Upstash Redis',
        slug: 'upstash',
        status: 'live',
        bullets: [
          'Distributed rate limiting for public forms and API routes',
          'Low-latency caching for forecasts and session state',
          'Serverless-friendly REST client with automatic failover',
        ],
      },
      {
        name: 'PostHog',
        slug: 'posthog',
        status: 'live',
        bullets: [
          'Product analytics and event tracking',
          'Funnel and retention insights',
          'Self-hostable if you want data sovereignty later',
        ],
      },
      {
        name: 'OpenAI',
        slug: 'openai',
        status: 'live',
        bullets: [
          'Powers tone-aware dunning message generation',
          'No customer financial data is sent to the model',
          'Prompts are versioned and reviewable',
        ],
      },
    ],
  },
];

const statusBadge: Record<string, string> = {
  live: 'badge-success',
  beta: 'badge-warn',
  planned: 'badge-neutral',
  'needs-credentials': 'badge-warn',
  'test-mode': 'badge-warn',
  sandbox: 'badge-warn',
};

const statusLabel: Record<string, string> = {
  live: 'Live',
  beta: 'Beta',
  planned: 'Planned',
  'needs-credentials': 'Needs credentials',
  'test-mode': 'Test mode',
  sandbox: 'Sandbox',
};

export default function IntegrationsPage() {
  return (
    <div className="min-h-screen">
      <MarketingHeader />

      <section className="container-page pt-16 pb-12 max-w-3xl">
        <p className="eyebrow">Integrations</p>
        <h1 className="mt-3 h1">Plug into the tools you already use.</h1>
        <p className="mt-6 lead">
          Connect your books, payments, banking, and comms in 60 seconds. We read from your accounting system
          and write back payments. Everything else stays in the apps you already pay for.
        </p>
        <p className="mt-3 text-sm text-ink-500">
          Status means what is wired today. Some integrations need production credentials swapped in before they collect real money.
          Paystack is live for Nigeria, Ghana, Kenya, and South Africa. Stripe is test-mode for US/UK/AU/CA until live keys are added.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link href="/sign-up" className="btn-primary">
            Start free trial <ArrowRight className="h-4 w-4" />
          </Link>
          <Link href="/security" className="btn-ghost">
            Read security details
          </Link>
        </div>
      </section>

      {/* Trust strip */}
      <section className="container-page pb-12">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { icon: Lock, label: 'OAuth 2.0 everywhere' },
            { icon: Database, label: 'Read-only by default' },
            { icon: Server, label: 'Redis-backed rate limits' },
            { icon: Lock, label: 'No password storage' },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-2 rounded-lg border border-ink-200 bg-white px-3 py-2 text-xs text-ink-600">
              <Icon className="h-4 w-4 text-emerald-600" />
              <span>{label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Categories */}
      {categories.map((cat) => (
        <section key={cat.title} className="container-page pb-16">
          <div className="max-w-3xl">
            <h2 className="h2">{cat.title}</h2>
            <p className="mt-2 text-ink-600">{cat.description}</p>
          </div>
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            {cat.items.map((item) => (
              <div key={item.slug} className="card flex flex-col">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="h3">{item.name}</h3>
                    <span className={`mt-2 inline-block ${statusBadge[item.status]}`}>{statusLabel[item.status] ?? item.status}</span>
                  </div>
                </div>
                <ul className="mt-5 space-y-2 text-sm text-ink-700">
                  {item.bullets.map((b) => (
                    <li key={b} className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      ))}

      {/* How it works */}
      <section className="container-page pb-20 max-w-3xl">
        <p className="eyebrow">How it works</p>
        <h2 className="mt-3 h2">60 seconds to your first synced invoice.</h2>
        <ol className="mt-8 space-y-5 text-ink-700">
          {[
            { icon: Database, title: 'Pick a provider', body: 'Click Connect on any integration card. We open the provider\'s official OAuth flow — not a fake form.' },
            { icon: Lock, title: 'Authorize the scopes', body: 'You see exactly what we\'re asking for. Most providers let you scope to a single company or org.' },
            { icon: BarChart3, title: 'We pull a snapshot', body: 'Initial sync takes 10-30 seconds for typical A/R volumes. Older data is paginated in the background.' },
            { icon: MessageSquare, title: 'Dunning kicks in', body: 'New overdue invoices automatically enter your dunning sequence. You can pause, edit, or override anytime.' },
          ].map(({ icon: Icon, title, body }, i) => (
            <li key={title} className="flex items-start gap-4">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ink-900 text-sm font-semibold text-white">{i + 1}</span>
              <div>
                <h3 className="font-semibold text-ink-900">{title}</h3>
                <p className="mt-1 text-sm text-ink-600 leading-relaxed">{body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Request */}
      <section className="container-page pb-24 max-w-3xl">
        <div className="rounded-2xl border border-ink-200 bg-ink-50 p-8">
          <h2 className="h3">Don't see what you need?</h2>
          <p className="mt-2 text-sm text-ink-600 leading-relaxed">
            We ship integrations based on user votes. The top three most-requested right now are Sage, NetSuite, and MYOB.
            Tell us what's blocking you and we'll add it to the public roadmap.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <a href="mailto:hello@getcollectly.app?subject=Integration%20request" className="btn-primary">
              Request an integration
            </a>
            <Link href="/customers" className="btn-ghost">
              See who else uses Collectly
            </Link>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
