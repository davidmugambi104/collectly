import { MarketingHeader } from '@/components/marketing/header';
import { MarketingFooter } from '@/components/marketing/footer';
import { Lock, Server, KeyRound, Eye, FileCheck2, AlertTriangle, Globe2, CheckCircle2 } from 'lucide-react';
import { pageMetadata } from '@/lib/seo';
import { CONTACT } from '@/lib/site-contact';

export const metadata = pageMetadata({
  title: 'Security: infrastructure and access control',
  description:
    'How Mugavi protects your data, your customers, and your money. ' +
    'Encryption in transit, audit log, org-scoped data access, and ' +
    'what we do and do not hold today.',
  path: '/security',
  keywords: ['Mugavi security', 'data security', 'GDPR'],
});

const principles = [
  {
    icon: Lock,
    title: 'Encryption in transit',
    body: 'All traffic is TLS 1.2+ (HSTS enabled). Our managed Postgres provider runs the database backups.',
  },
  {
    icon: KeyRound,
    title: 'Least-privilege access control',
    body: 'Sign-in runs through Clerk. Your team members only see the organizations they belong to, and database queries are scoped by org_id at the application layer.',
  },
  {
    icon: Server,
    title: 'Hardened infrastructure',
    body: 'Mugavi runs on Vercel (compute) and managed Postgres (data). Secrets live in Vercel environment variables, not in the code or the client bundle.',
  },
  {
    icon: KeyRound,
    title: 'Connected accounting software',
    body: 'Connecting QuickBooks starts with a single-use, time-limited sign-in check tied to your session, so nobody can attach their books to your organization. Disconnect, from the Integrations page, asks Intuit to revoke our access and deletes the stored tokens.',
  },
  {
    icon: Eye,
    title: 'Audit logging',
    body: 'Key actions, such as reminders sent and integrations connected, are recorded in an events log scoped to your organization, and you can read it on the Activity page in your dashboard.',
  },
];

const controls = [
  { label: 'TLS 1.2+ everywhere', status: 'enforced' },
  { label: 'Database backups (managed Postgres provider)', status: 'enforced' },
  { label: 'Secrets in environment variables only', status: 'enforced' },
  { label: 'Queries scoped by organization in the application', status: 'enforced' },
  { label: 'Sign in with Google or email (via Clerk)', status: 'available' },
  { label: 'SOC 2 report: we do not have one', status: 'not yet' },
  { label: 'GDPR + UK GDPR + CCPA-aligned DPA', status: 'available' },
  { label: 'DPA on request', status: 'available' },
];

const statusClass: Record<string, string> = {
  enforced: 'badge-success',
  available: 'badge-neutral',
  'not yet': 'badge-warn',
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
          Mugavi sits between your books and your customers. That means we see customer names, balances,
          payment behavior, and the dunning messages you send. Here&apos;s exactly what we do (and don&apos;t do) with that access.
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
                  <h2 className="h3">{title}</h2>
                  <p className="mt-2 text-sm text-ink-600 leading-relaxed">{body}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* What we don't do */}
      <section className="container-page pb-20 max-w-3xl">
        <p className="eyebrow">What we don&apos;t do</p>
        <h2 className="mt-3 h2">Hard lines we don&apos;t cross.</h2>
        <ul className="mt-8 space-y-4 text-ink-700">
          <li className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
            <span><b>We never sell your data.</b> Not aggregated, not anonymized, not ever. Your customer list is your customer list.</span>
          </li>
          <li className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
            <span><b>We never train AI models on your data.</b> When we call Google Gemini to generate dunning copy, we send the invoice facts and the contact name needed to write one message, through the paid API, whose terms say prompts are not used for training.</span>
          </li>
          <li className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
            <span><b>We never share your data with third-party marketers.</b> PostHog is product analytics only. We run no ad scripts and no session recording inside the signed-in app.</span>
          </li>
          <li className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
            <span><b>We never auto-charge customers.</b> Every payment goes through your customer&apos;s explicit action on the branded portal or your payment processor&apos;s hosted checkout.</span>
          </li>
        </ul>
      </section>

      {/* Controls table */}
      <section className="container-page pb-20 max-w-3xl">
        <p className="eyebrow">Controls</p>
        <h2 className="mt-3 h2">Current security posture.</h2>
        <p className="mt-3 text-ink-600">
          Honest status as of today. &quot;Not yet&quot; means we do not have it and have not started an audit.
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
          We commit to notifying affected customers within 72 hours of becoming aware of a security incident that
          materially impacts their data, consistent with our DPA. You can reach the security team directly at{' '}
          <a href={`mailto:${CONTACT.security}`} className="link">{CONTACT.security}</a> for disclosure,
          responsible-vulnerability reports.
        </p>
        <div className="mt-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <p>
            <b>Bug bounty:</b> we don&apos;t have a paid program yet, but we acknowledge every responsible report within
            one business day and ship a fix on a negotiated timeline.
          </p>
        </div>
      </section>

      {/* Compliance / jurisdiction */}
      <section className="container-page pb-20 max-w-3xl">
        <p className="eyebrow">Compliance</p>
        <h2 className="mt-3 h2">Where the data lives, who can see it.</h2>
        <p className="mt-4 text-ink-600 leading-relaxed">
          Mugavi serves small businesses and bookkeeping practices in the United States and the United
          Kingdom. Accounts are processed in a single region (US). We act as the data processor for your customer data; you remain the data
          controller. Our Data Processing Agreement is available below.
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <div className="card text-center">
            <Globe2 className="mx-auto h-6 w-6 text-brand-600" />
            <div className="mt-2 text-sm font-semibold text-ink-900">GDPR & UK GDPR</div>
            <div className="text-xs text-ink-500">DPA + SCCs available on request</div>
          </div>
          <div className="card text-center">
            <FileCheck2 className="mx-auto h-6 w-6 text-brand-600" />
            <div className="mt-2 text-sm font-semibold text-ink-900">CCPA / CPRA</div>
            <div className="text-xs text-ink-500">No data sale, ever</div>
          </div>
        </div>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <a href="/dpa" className="btn-secondary">
            Read the DPA
          </a>
          <a href="/privacy" className="btn-ghost">
            Privacy policy
          </a>
          <a href={`mailto:${CONTACT.security}`} className="btn-ghost">
            Email the security team
          </a>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
