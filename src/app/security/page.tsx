import { MarketingHeader } from '@/components/marketing/header';
import { MarketingFooter } from '@/components/marketing/footer';
import { Logo } from '@/components/brand/logo';
import { ShieldCheck, Lock, Server, KeyRound, Eye, FileCheck2, AlertTriangle, Globe2, CheckCircle2 } from 'lucide-react';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({
  title: 'Security — encryption, infrastructure, and access control',
  description:
    'How Collectly protects your data, your customers, and your money. ' +
    'Encryption in transit + at rest, audit log, role-based access, and ' +
    'the compliance posture we hold today and what we are building toward.',
  path: '/security',
  keywords: ['Collectly security', 'encryption at rest', 'SOC 2', 'data security', 'GDPR'],
});

const principles = [
  {
    icon: Lock,
    title: 'Encryption in transit and at rest',
    body: 'All traffic is TLS 1.2+ (HSTS enabled). Data is encrypted at rest using AES-256 on managed Postgres volumes. Backups are encrypted with provider-managed KMS keys and retained for 30 days.',
  },
  {
    icon: KeyRound,
    title: 'Least-privilege access control',
    body: 'Role-based access via Clerk. Your team only sees the orgs they belong to. No service accounts with standing admin access. Every database query is scoped by org_id at the application layer.',
  },
  {
    icon: Server,
    title: 'Hardened infrastructure',
    body: 'Collectly runs on Vercel (compute) and managed Postgres (data). All secrets live in Vercel environment variables — never in code, never in the client bundle. No SSH access is provisioned.',
  },
  {
    icon: Eye,
    title: 'Audit logging',
    body: 'Every state-changing action (dunning send, invoice update, payment mark, integration connect) writes to an immutable events table scoped by org. You can export your full audit log at any time.',
  },
];

const controls = [
  { label: 'TLS 1.2+ everywhere', status: 'enforced' },
  { label: 'AES-256 at rest', status: 'enforced' },
  { label: 'Quarterly access reviews', status: 'enforced' },
  { label: 'Encrypted backups (30-day retention)', status: 'enforced' },
  { label: 'Secrets in environment variables only', status: 'enforced' },
  { label: 'Org-scoped queries (no cross-tenant reads)', status: 'enforced' },
  { label: 'SSO via Clerk (Google, Microsoft, GitHub)', status: 'available' },
  { label: 'SOC 2 Type II', status: 'in progress' },
  { label: 'GDPR + UK GDPR + CCPA compliant', status: 'enforced' },
  { label: 'DPA on request', status: 'available' },
];

const statusClass: Record<string, string> = {
  enforced: 'badge-success',
  available: 'badge-neutral',
  'in progress': 'badge-warn',
};

export default function SecurityPage() {
  return (
    <div className="min-h-screen">
      <MarketingHeader />

      {/* Hero */}
      <section className="container-page pt-16 pb-12 max-w-3xl">
        <p className="eyebrow">Security</p>
        <h1 className="mt-3 h1">Your invoices are sensitive. We treat them that way.</h1>
        <p className="mt-6 lead">
          Collectly sits between your books and your customers. That means we see customer names, balances,
          payment behavior, and the dunning messages you send. Here's exactly what we do — and don't do — with that access.
        </p>
      </section>

      {/* Principles */}
      <section className="container-page pb-20">
        <div className="grid gap-6 md:grid-cols-2">
          {principles.map(({ icon: Icon, title, body }) => (
            <div key={title} className="card">
              <div className="flex items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-700">
                  <Icon className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="h3">{title}</h3>
                  <p className="mt-2 text-sm text-ink-600 leading-relaxed">{body}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* What we don't do */}
      <section className="container-page pb-20 max-w-3xl">
        <p className="eyebrow">What we don't do</p>
        <h2 className="mt-3 h2">Hard lines we don't cross.</h2>
        <ul className="mt-8 space-y-4 text-ink-700">
          <li className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
            <span><b>We never sell your data.</b> Not aggregated, not anonymized, not ever. Your customer list is your customer list.</span>
          </li>
          <li className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
            <span><b>We never train AI models on your data.</b> When we call Google Gemini to generate dunning copy, we send the minimum context needed and never ask the provider to retain it.</span>
          </li>
          <li className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
            <span><b>We never share your data with third-party marketers.</b> PostHog is product analytics only. We don't run ad pixels in the app.</span>
          </li>
          <li className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
            <span><b>We never auto-charge customers.</b> Every payment goes through your customer's explicit action on the branded portal or your payment processor's hosted checkout.</span>
          </li>
        </ul>
      </section>

      {/* Controls table */}
      <section className="container-page pb-20 max-w-3xl">
        <p className="eyebrow">Controls</p>
        <h2 className="mt-3 h2">Current security posture.</h2>
        <p className="mt-3 text-ink-600">
          Honest status as of today. "In progress" means we have a target date within the next two quarters.
        </p>
        <div className="mt-8 card overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead className="bg-ink-50 text-left text-xs uppercase tracking-wider text-ink-500">
              <tr>
                <th className="px-5 py-3 font-medium">Control</th>
                <th className="px-5 py-3 font-medium text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {controls.map((c) => (
                <tr key={c.label} className="border-t border-ink-100">
                  <td className="px-5 py-3 text-ink-800">{c.label}</td>
                  <td className="px-5 py-3 text-right">
                    <span className={statusClass[c.status] ?? 'badge-neutral'}>{c.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Incident response */}
      <section className="container-page pb-20 max-w-3xl">
        <p className="eyebrow">Incident response</p>
        <h2 className="mt-3 h2">If something goes wrong.</h2>
        <p className="mt-4 text-ink-600 leading-relaxed">
          We commit to notifying affected customers within 72 hours of confirming a security incident that
          materially impacts their data. You can reach the security team directly at{' '}
          <a href="mailto:security@getcollectly.app" className="link">security@getcollectly.app</a> for disclosure,
          responsible-vulnerability reports, or to request our latest penetration-test summary.
        </p>
        <div className="mt-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <p>
            <b>Bug bounty:</b> we don't have a paid program yet, but we acknowledge every responsible report within
            one business day and ship a fix on a negotiated timeline.
          </p>
        </div>
      </section>

      {/* Compliance / jurisdiction */}
      <section className="container-page pb-20 max-w-3xl">
        <p className="eyebrow">Compliance</p>
        <h2 className="mt-3 h2">Where the data lives, who can see it.</h2>
        <p className="mt-4 text-ink-600 leading-relaxed">
          Collectly is built for small businesses in the US, UK, EU, Australia, and Canada. Self-serve accounts are
          currently processed in a single region (US); EU-only data residency is available for enterprise
          agreements on request. We act as the data processor for your customer data; you remain the data
          controller. Our Data Processing Agreement is available below.
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="card text-center">
            <Globe2 className="mx-auto h-6 w-6 text-brand-600" />
            <div className="mt-2 text-sm font-semibold text-ink-900">GDPR & UK GDPR</div>
            <div className="text-xs text-ink-500">Full DPA + SCCs</div>
          </div>
          <div className="card text-center">
            <FileCheck2 className="mx-auto h-6 w-6 text-brand-600" />
            <div className="mt-2 text-sm font-semibold text-ink-900">CCPA / CPRA</div>
            <div className="text-xs text-ink-500">No data sale, ever</div>
          </div>
          <div className="card text-center">
            <ShieldCheck className="mx-auto h-6 w-6 text-brand-600" />
            <div className="mt-2 text-sm font-semibold text-ink-900">Privacy Act (AU)</div>
            <div className="text-xs text-ink-500">APP-aligned</div>
          </div>
        </div>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <a href="/dpa" className="btn-secondary">
            Read the DPA
          </a>
          <a href="/privacy" className="btn-ghost">
            Privacy policy
          </a>
          <a href="mailto:security@getcollectly.app" className="btn-ghost">
            Email the security team
          </a>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
