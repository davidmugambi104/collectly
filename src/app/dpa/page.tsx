import { MarketingHeader } from '@/components/marketing/header';
import { MarketingFooter } from '@/components/marketing/footer';
import { Mail, Globe2, Server, Users } from 'lucide-react';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({
  title: 'Data Processing Agreement (DPA) — GDPR + UK GDPR compliant',
  description:
    'The contract that governs how Collectly processes customer data on ' +
    'your behalf. GDPR-compliant, US data residency with EU available on ' +
    'enterprise request, and Standard Contractual Clauses available.',
  path: '/dpa',
  keywords: ['GDPR DPA', 'data processing agreement', 'UK GDPR', 'Standard Contractual Clauses'],
});

const sections = [
  {
    n: '1',
    title: 'Roles and scope',
    body: (
      <>
        <p>
          This Data Processing Agreement (&quot;DPA&quot;) forms part of the Collectly Terms of Service between you
          (&quot;Controller&quot;) and Collectly, Inc. (&quot;Processor&quot;). It applies to the extent that Collectly
          processes Personal Data on your behalf when you use the A/R automation service.
        </p>
        <p>
          Collectly processes two categories of data: (a) <b>Customer Data</b> — invoices, customer contact
          information, payment history, and dunning messages you provide or authorize us to pull from
          connected accounting systems; and (b) <b>Service Data</b> — telemetry, account information, and
          audit logs needed to operate the service.
        </p>
      </>
    ),
  },
  {
    n: '2',
    title: 'Processing instructions',
    body: (
      <>
        <p>
          Collectly processes Customer Data only on your documented instructions, including:
        </p>
        <ul className="mt-3 space-y-2 list-disc pl-5">
          <li>Syncing invoices, customers, and payments from connected systems (QuickBooks, Xero, Stripe, Square, Plaid).</li>
          <li>Generating dunning messages and cash-flow forecasts using Google Gemini under strict no-retention terms.</li>
          <li>Sending emails and SMS on your behalf through Resend and Twilio.</li>
          <li>Storing Customer Data encrypted at rest for as long as your account is active.</li>
        </ul>
      </>
    ),
  },
  {
    n: '3',
    title: 'Sub-processors',
    body: (
      <>
        <p>
          Collectly uses the following sub-processors. You can subscribe to changes at{' '}
          <a href="mailto:dpa@getcollectly.app" className="link">dpa@getcollectly.app</a>.
        </p>
        <ul className="mt-3 space-y-2 list-disc pl-5">
          <li><b>Vercel</b> — application hosting.</li>
          <li><b>DigitalOcean</b> — managed Postgres database.</li>
          <li><b>Clerk</b> — authentication and identity.</li>
          <li><b>Resend</b> — transactional email delivery.</li>
          <li><b>Twilio</b> — SMS delivery.</li>
          <li><b>Google (Gemini)</b> — AI message generation under no-retention API terms.</li>
          <li><b>PostHog</b> — product analytics (no customer data sent).</li>
          <li><b>Upstash</b> — Redis-backed rate limiting and caching.</li>
        </ul>
      </>
    ),
  },
  {
    n: '4',
    title: 'International transfers',
    body: (
      <>
        <p>
          Self-serve accounts are currently processed in a single region (US). EU-only data residency is
          available for enterprise agreements on request. For transfers from the EEA, UK, or Switzerland to a
          third country, Collectly relies on the European Commission&apos;s 2021 Standard Contractual Clauses
          (Module 2: Controller-to-Processor) and the UK International Data Transfer Addendum. A copy of the
          executed SCCs is available on request.
        </p>
      </>
    ),
  },
  {
    n: '5',
    title: 'Security of processing',
    body: (
      <>
        <p>
          Collectly implements technical and organizational measures to protect Customer Data, including:
          TLS 1.2+ in transit, AES-256 at rest, org-scoped queries, role-based access via Clerk, audit logging of
          all state changes, and quarterly access reviews. The current security posture is published on our{' '}
          <a href="/security" className="link">Security page</a>.
        </p>
      </>
    ),
  },
  {
    n: '6',
    title: 'Data subject requests',
    body: (
      <>
        <p>
          Collectly will assist you in responding to data-subject requests (access, rectification, deletion,
          portability, objection) within 10 business days. You can also export or delete your data at any time
          from <a href="/dashboard/settings" className="link">Settings → Data</a>, and we provide a one-click
          full-account deletion that purges all Customer Data within 30 days, with backups rotating out on the same 30-day cycle.
        </p>
      </>
    ),
  },
  {
    n: '7',
    title: 'Breach notification',
    body: (
      <>
        <p>
          Collectly will notify affected Controllers without undue delay, and in any case within 72 hours, after
          becoming aware of a Personal Data breach affecting Customer Data. Notification will include the
          information required by GDPR Article 33(3) to the extent available.
        </p>
      </>
    ),
  },
  {
    n: '8',
    title: 'Deletion on termination',
    body: (
      <>
        <p>
          On termination of your account, Collectly will delete all Customer Data within 30 days, except where
          retention is required by law (e.g. tax records, AML logs). Backups rotate on a 30-day cycle.
        </p>
      </>
    ),
  },
];

export default function DPAPage() {
  return (
    <div className="min-h-screen">
      <MarketingHeader />

      <section className="container-page pt-16 pb-12 max-w-3xl">
        <p className="eyebrow">Legal</p>
        <h1 className="mt-3 h1">Data Processing Agreement</h1>
        <p className="mt-6 lead">
          The contract that governs how Collectly processes your customer data on your behalf. Written
          in plain English, GDPR-compliant, available in English (US) and English (UK).
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-3 text-sm text-ink-500">
          <span>Effective: 13 July 2026</span>
          <span>·</span>
          <span>Version 1.0</span>
        </div>
      </section>

      {/* At-a-glance */}
      <section className="container-page pb-12 max-w-3xl">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="card text-center">
            <Globe2 className="mx-auto h-6 w-6 text-brand-600" />
            <div className="mt-2 text-sm font-semibold text-ink-900">US residency</div>
            <div className="text-xs text-ink-500">EU on enterprise request</div>
          </div>
          <div className="card text-center">
            <Server className="mx-auto h-6 w-6 text-brand-600" />
            <div className="mt-2 text-sm font-semibold text-ink-900">SCCs included</div>
            <div className="text-xs text-ink-500">Module 2 (C2P)</div>
          </div>
          <div className="card text-center">
            <Users className="mx-auto h-6 w-6 text-brand-600" />
            <div className="mt-2 text-sm font-semibold text-ink-900">8 sub-processors</div>
            <div className="text-xs text-ink-500">Listed below</div>
          </div>
        </div>
      </section>

      <section className="container-page pb-20 max-w-3xl">
        <div className="space-y-12">
          {sections.map((s) => (
            <article key={s.n}>
              <h2 className="h3 flex items-center gap-3">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-ink-900 text-xs font-semibold text-white">
                  {s.n}
                </span>
                {s.title}
              </h2>
              <div className="mt-4 text-ink-700 leading-relaxed space-y-3">{s.body}</div>
            </article>
          ))}
        </div>

        <div className="mt-16 rounded-2xl border border-ink-200 bg-ink-50 p-6">
          <h3 className="h3">Need this countersigned?</h3>
          <p className="mt-2 text-sm text-ink-600 leading-relaxed">
            We accept email-based DPA execution. Send a countersigned PDF to{' '}
            <a href="mailto:dpa@getcollectly.app" className="link">dpa@getcollectly.app</a> and we&apos;ll return a fully
            executed copy within one business day. No DocuSign loop required.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <a href="mailto:dpa@getcollectly.app" className="btn-primary">
              <Mail className="h-4 w-4" /> Request countersignature
            </a>
            <a href="/security" className="btn-ghost">
              Read the security page
            </a>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
