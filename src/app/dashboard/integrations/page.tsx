export const dynamic = 'force-dynamic';

import { AppShell } from '@/components/app/shell';
import { getAuth as auth } from '@/lib/auth-helper';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import { integrations, customers } from '@/db/schema';
import { eq, count } from 'drizzle-orm';
import { CheckCircle2, AlertCircle, ExternalLink, BookOpen, RefreshCw, Sparkles, Database, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { SampleDataButton } from './sample-data-button';

export default async function IntegrationsPage() {
  const { userId, orgId } = await auth();
  if (!userId) redirect('/sign-in');
  if (!orgId) redirect('/sign-in');

  const [list, customerCountRow] = await Promise.all([
    db.select().from(integrations).where(eq(integrations.orgId, orgId)),
    db.select({ n: count() }).from(customers).where(eq(customers.orgId, orgId)),
  ]);
  const customerCount = Number(customerCountRow[0]?.n ?? 0);
  const conn = (p: string) => list.find((i: typeof list[number]) => i.provider === p);

  return (
    <AppShell title="Integrations" subtitle="Connect your accounting and payment tools. Setup takes 60 seconds.">
      {customerCount === 0 && (
        <div className="mb-6 card bg-gradient-to-br from-brand-50 to-emerald-50 border-brand-200">
          <div className="flex items-start gap-4">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-brand-500 to-emerald-500 grid place-items-center shrink-0">
              <Database className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-display font-semibold text-ink-950 text-lg">No data yet</h2>
              <p className="mt-1 text-sm text-ink-700">Connect your accounting tool to import customers, invoices, and payment history. Or load sample data to explore the product with realistic A/R — every dashboard, every AI insight, every workflow.</p>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <SampleDataButton />
                <Link href="#providers" className="text-sm text-ink-600 hover:text-ink-900 inline-flex items-center gap-1">
                  Or connect a provider below <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      <div id="providers" className="grid md:grid-cols-2 gap-4">
        <IntegrationCard logo="QB" name="QuickBooks Online" description="Sync invoices, customers, and payments from your books." status={conn('quickbooks')?.status ?? 'disconnected'} connectHref={`/api/quickbooks/connect?orgId=${orgId}`} docsHref="#" />
        <IntegrationCard logo="X" name="Xero" description="Pull invoices, customers, and aging reports from Xero." status={conn('xero')?.status ?? 'disconnected'} connectHref={`/api/xero/connect?orgId=${orgId}`} docsHref="#" />
        <IntegrationCard logo="S" name="Stripe" description="Auto-collect payments and reconcile transactions to invoices." status={conn('stripe')?.status ?? 'disconnected'} connectHref={`/api/stripe/connect?orgId=${orgId}`} docsHref="#" />
        <IntegrationCard logo="Sq" name="Square" description="Sync sales and invoice data for product businesses." status={conn('square')?.status ?? 'disconnected'} connectHref={`/api/square/connect?orgId=${orgId}`} docsHref="#" />
        <IntegrationCard logo="P" name="Plaid" description="Read-only bank feeds for cash-flow forecasting." status={conn('plaid')?.status ?? 'disconnected'} connectHref={`/api/plaid/connect?orgId=${orgId}`} docsHref="#" />
        <IntegrationCard logo="+" name="Need another?" description="Tell us what to integrate next. Most-requested: Sage, NetSuite, MYOB." status="pending" connectHref="mailto:hello@collectly.app?subject=Integration%20request" docsHref="#" ctaLabel="Request" />
      </div>

      <div className="mt-8 card">
        <h2 className="h3">How integrations work</h2>
        <ol className="mt-3 space-y-2 text-sm text-ink-600 list-decimal pl-5">
          <li>Click <b>Connect</b> on the provider you use.</li>
          <li>Authorize Collectly in the provider's OAuth flow.</li>
          <li>We pull your customer, invoice, and payment history (read-only, scoped to A/R).</li>
          <li>You can disconnect any time — we delete the tokens.</li>
        </ol>
        <p className="mt-4 text-xs text-ink-500">All integrations are encrypted at rest and in transit. We never modify your books without your explicit action.</p>
      </div>
    </AppShell>
  );
}

function IntegrationCard({ logo, name, description, status, connectHref, docsHref, ctaLabel }: { logo: string; name: string; description: string; status: string; connectHref: string; docsHref: string; ctaLabel?: string }) {
  const connected = status === 'connected';
  const errored = status === 'error';
  return (
    <div className={`card transition-colors ${connected ? 'border-emerald-200 bg-emerald-50/30' : errored ? 'border-red-200 bg-red-50/30' : ''}`}>
      <div className="flex items-start gap-3">
        <div className={`h-10 w-10 rounded-lg grid place-items-center font-display font-bold text-sm shrink-0 ${connected ? 'bg-emerald-600 text-white' : 'bg-ink-950 text-white'}`}>
          {logo}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-ink-900">{name}</h3>
            {connected && <span className="badge-success text-[10px]">Connected</span>}
            {errored && <span className="badge-danger text-[10px]">Error</span>}
            {!connected && !errored && <span className="badge-neutral text-[10px]">Not connected</span>}
          </div>
          <p className="mt-1 text-sm text-ink-600">{description}</p>
          <div className="mt-3 flex items-center gap-2">
            <a href={connectHref} className={connected ? 'btn-secondary text-sm' : 'btn-primary text-sm'}>
              {connected ? 'Manage' : ctaLabel ?? 'Connect'}
            </a>
            {docsHref !== '#' && (
              <a href={docsHref} className="btn-ghost text-sm"><BookOpen className="h-3.5 w-3.5" />Docs</a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
