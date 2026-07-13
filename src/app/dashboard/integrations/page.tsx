export const dynamic = 'force-dynamic';

import { AppShell } from '@/components/app/shell';
import { getAuth as auth } from '@/lib/auth-helper';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import { integrations } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { Logo } from '@/components/brand/logo';
import { CheckCircle2, AlertCircle, ExternalLink, BookOpen, RefreshCw } from 'lucide-react';

export default async function IntegrationsPage() {
  const { userId, orgId } = await auth();
  if (!userId) redirect('/sign-in');
  if (!orgId) redirect('/sign-in');

  const list = await db.select().from(integrations).where(eq(integrations.orgId, orgId));
  const conn = (p: string) => list.find((i: typeof list[number]) => i.provider === p);

  return (
    <AppShell title="Integrations" subtitle="Connect your accounting and payment tools. Setup takes 60 seconds.">
      <div className="grid md:grid-cols-2 gap-4">
        <IntegrationCard
          logo="QB" name="QuickBooks Online" description="Sync invoices, customers, and payments from your books." status={conn('quickbooks')?.status ?? 'disconnected'} connectHref={`/api/quickbooks/connect?orgId=${orgId}`} docsHref="#" />
        <IntegrationCard
          logo="X" name="Xero" description="Pull invoices, customers, and aging reports from Xero." status={conn('xero')?.status ?? 'disconnected'} connectHref={`/api/xero/connect?orgId=${orgId}`} docsHref="#" />
        <IntegrationCard
          logo="S" name="Stripe" description="Auto-collect payments and reconcile transactions to invoices." status={conn('stripe')?.status ?? 'disconnected'} connectHref={`/api/stripe/connect?orgId=${orgId}`} docsHref="#" />
        <IntegrationCard
          logo="Sq" name="Square" description="Sync sales and invoice data for product businesses." status={conn('square')?.status ?? 'disconnected'} connectHref={`/api/square/connect?orgId=${orgId}`} docsHref="#" />
        <IntegrationCard
          logo="P" name="Plaid" description="Read-only bank feeds for cash-flow forecasting." status={conn('plaid')?.status ?? 'disconnected'} connectHref={`/api/plaid/connect?orgId=${orgId}`} docsHref="#" />
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
  const isConnected = status === 'connected';
  return (
    <div className="card">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-lg bg-ink-100 grid place-items-center font-display font-bold text-ink-700">{logo}</div>
          <div>
            <div className="font-semibold text-ink-900">{name}</div>
            <div className="text-sm text-ink-600 mt-0.5">{description}</div>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {isConnected ? <span className="badge-success"><CheckCircle2 className="h-3 w-3 mr-1" />Connected</span>
            : status === 'error' ? <span className="badge-danger"><AlertCircle className="h-3 w-3 mr-1" />Error</span>
            : <span className="badge-neutral">Not connected</span>}
        </div>
      </div>
      <div className="mt-4 flex items-center gap-2">
        <a href={connectHref} className={isConnected ? 'btn-secondary text-sm' : 'btn-primary text-sm'}>
          {isConnected ? <><RefreshCw className="h-3.5 w-3.5" />Re-sync</> : <>{ctaLabel ?? 'Connect'} <ExternalLink className="h-3.5 w-3.5" /></>}
        </a>
        <a href={docsHref} className="btn-ghost text-sm"><BookOpen className="h-3.5 w-3.5" />Docs</a>
      </div>
    </div>
  );
}
