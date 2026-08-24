export const dynamic = 'force-dynamic';

import { AppShell } from '@/components/app/shell';
import { getAuth as auth } from '@/lib/auth-helper';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import { integrations, customers } from '@/db/schema';
import { eq, count } from 'drizzle-orm';
import { CheckCircle2, AlertCircle, BookOpen, Database, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { SampleDataButton } from './sample-data-button';
import { PlaidCard } from './plaid-card';
import { IntegrationControls } from './integration-controls';

const PROVIDER_LABELS: Record<string, string> = {
  quickbooks: 'QuickBooks Online',
  xero: 'Xero',
  stripe: 'Stripe',
  square: 'Square',
  plaid: 'Plaid',
};

export default async function IntegrationsPage(props: { searchParams?: Promise<{ ok?: string; err?: string; reason?: string }> }) {
  const { userId, orgId } = await auth();
  if (!userId) redirect('/sign-in');
  if (!orgId) redirect('/sign-in');

  const sp = (props.searchParams ? await props.searchParams : {}) as { ok?: string; err?: string; reason?: string };
  const connectedProvider = sp?.ok && PROVIDER_LABELS[sp.ok] ? sp.ok : null;
  const erroredProvider = sp?.err && PROVIDER_LABELS[sp.err] ? sp.err : null;

  const [list, customerCountRow] = await Promise.all([
    db.select().from(integrations).where(eq(integrations.orgId, orgId)),
    db.select({ n: count() }).from(customers).where(eq(customers.orgId, orgId)),
  ]);
  const customerCount = Number(customerCountRow[0]?.n ?? 0);
  const conn = (p: string) => list.find((i: typeof list[number]) => i.provider === p);

  // Detect which providers have production credentials configured.
  // Stripe Connect is intentionally excluded — we're not using it
  // (recorded in OPERATING-DIRECTIVE.md, 2026-07-23). Its env var
  // may still be set in Vercel for legacy reasons, so we don't
  // flag it as "needs setup".
  const providerStatus: Record<string, { ready: boolean; reason?: string }> = {
    quickbooks: {
      ready: !!process.env.QBO_CLIENT_ID && !!process.env.QBO_CLIENT_SECRET,
      reason: !process.env.QBO_CLIENT_ID ? 'QBO_CLIENT_ID not set in production env' : undefined,
    },
    xero: {
      ready: !!process.env.XERO_CLIENT_ID && !!process.env.XERO_CLIENT_SECRET,
      reason: !process.env.XERO_CLIENT_ID ? 'Xero developer app not yet configured' : undefined,
    },
    square: {
      ready: !!process.env.SQUARE_CLIENT_ID && !!process.env.SQUARE_CLIENT_SECRET,
      reason: !process.env.SQUARE_CLIENT_ID ? 'Square developer app not yet configured' : undefined,
    },
    plaid: {
      ready: !!process.env.PLAID_CLIENT_ID && !!process.env.PLAID_SECRET,
      reason: !process.env.PLAID_CLIENT_ID ? 'Plaid developer account not yet configured' : undefined,
    },
  };
  const needsSetup = Object.values(providerStatus).filter((s) => !s.ready).length;

  return (
    <AppShell title="Integrations" subtitle="Connect your accounting and payment tools. Setup takes 60 seconds.">
      {connectedProvider && (
        <div className="mb-6 card bg-emerald-50 border-emerald-200">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-700 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-emerald-900">
                <b>{PROVIDER_LABELS[connectedProvider]}</b> connected. Hit <b>Sync now</b> below to import your customers and invoices.
              </p>
            </div>
          </div>
        </div>
      )}
      {erroredProvider && (
        <div className="mb-6 card bg-red-50 border-red-200">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-700 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-red-900">
                <b>{PROVIDER_LABELS[erroredProvider]}</b> connection failed{sp?.reason ? `: ${sp.reason}` : '.'} Try again from the card below.
              </p>
            </div>
          </div>
        </div>
      )}

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

      {needsSetup > 0 && (
        <div className="mb-6 card bg-amber-50 border-amber-200">
          <div className="flex items-start gap-4">
            <div className="h-10 w-10 rounded-xl bg-amber-100 grid place-items-center shrink-0">
              <AlertCircle className="h-5 w-5 text-amber-700" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-display font-semibold text-ink-950 text-lg">{needsSetup} integration{needsSetup > 1 ? 's' : ''} need production setup</h2>
              <p className="mt-1 text-sm text-ink-700">These providers are wired in the code but their developer-app credentials aren&apos;t configured in this environment. OAuth won&apos;t complete until they&apos;re set.</p>
              <ul className="mt-3 space-y-1 text-xs text-ink-700">
                {Object.entries(providerStatus).filter(([, s]) => !s.ready).map(([k, s]) => (
                  <li key={k}><b className="capitalize">{k}:</b> {s.reason}</li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-ink-600">For the production app, each provider needs: (1) a developer app on the platform&apos;s site, (2) the prod callback URL registered, (3) the client ID/secret set as env vars on Vercel. <a className="link" href="mailto:hello@getcollectly.app?subject=Integrations%20setup%20help">Email Davie</a> if you need help.</p>
            </div>
          </div>
        </div>
      )}

      <div id="providers" className="grid md:grid-cols-2 gap-4">
        <IntegrationCard logo="QB" name="QuickBooks Online" description="Sync invoices, customers, and payments from your books." status={conn('quickbooks')?.status ?? 'disconnected'} connectHref={`/api/quickbooks/connect?orgId=${orgId}`} docsHref="#" provider="quickbooks" label="QuickBooks Online" lastSyncAt={conn('quickbooks')?.lastSyncAt as any} />
        <IntegrationCard logo="X" name="Xero" description="Pull invoices, customers, and aging reports from Xero." status={conn('xero')?.status ?? 'disconnected'} connectHref={`/api/xero/connect?orgId=${orgId}`} docsHref="#" provider="xero" label="Xero" lastSyncAt={conn('xero')?.lastSyncAt as any} />
        <IntegrationCard logo="S" name="Stripe" description="Payments processor. Paused — we use bank transfer / Wise for billing. Code is kept in case we re-enable." status="paused" connectHref="#" docsHref="#" ctaLabel="Paused" />
        <IntegrationCard logo="Sq" name="Square" description="Sync sales and invoice data for product businesses." status={conn('square')?.status ?? 'disconnected'} connectHref={`/api/square/connect?orgId=${orgId}`} docsHref="#" provider="square" label="Square" lastSyncAt={conn('square')?.lastSyncAt as any} />
        <PlaidCard status={conn('plaid')?.status ?? 'disconnected'} />
        <IntegrationCard logo="+" name="Need another?" description="Tell us what to integrate next. Most-requested: Sage, NetSuite, MYOB." status="pending" connectHref="mailto:hello@getcollectly.app?subject=Integration%20request" docsHref="#" ctaLabel="Request" />
      </div>

      <div className="mt-8 card">
        <h2 className="h3">How integrations work</h2>
        <ol className="mt-3 space-y-2 text-sm text-ink-600 list-decimal pl-5">
          <li>Click <b>Connect</b> on the provider you use.</li>
          <li>Authorize Collectly in the provider&apos;s OAuth flow.</li>
          <li>We pull your customer, invoice, and payment history (read-only, scoped to A/R).</li>
          <li>You can disconnect any time — we delete the tokens.</li>
        </ol>
        <p className="mt-4 text-xs text-ink-500">All integrations are encrypted at rest and in transit. We never modify your books without your explicit action.</p>
      </div>
    </AppShell>
  );
}

function IntegrationCard({ logo, name, description, status, connectHref, docsHref, ctaLabel, provider, label, lastSyncAt }: { logo: string; name: string; description: string; status: string; connectHref: string; docsHref: string; ctaLabel?: string; provider?: 'quickbooks' | 'xero' | 'square'; label?: string; lastSyncAt?: string | null }) {
  const connected = status === 'connected';
  const errored = status === 'error';
  const paused = status === 'paused';
  const showControls = connected && provider && (provider === 'quickbooks' || provider === 'xero' || provider === 'square');
  return (
    <div className={`card transition-colors ${connected ? 'border-emerald-200 bg-emerald-50/30' : errored ? 'border-red-200 bg-red-50/30' : paused ? 'border-ink-200 bg-ink-50/50 opacity-70' : ''}`}>
      <div className="flex items-start gap-3">
        <div className={`h-10 w-10 rounded-lg grid place-items-center font-display font-bold text-sm shrink-0 ${connected ? 'bg-emerald-600 text-white' : paused ? 'bg-ink-300 text-ink-600' : 'bg-ink-950 text-white'}`}>
          {logo}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-ink-900">{name}</h3>
            {connected && <span className="badge-success text-[10px]">Connected</span>}
            {errored && <span className="badge-danger text-[10px]">Error</span>}
            {paused && <span className="badge-neutral text-[10px]">Paused</span>}
            {!connected && !errored && !paused && <span className="badge-neutral text-[10px]">Not connected</span>}
          </div>
          <p className="mt-1 text-sm text-ink-600">{description}</p>
          <div className="mt-3 flex items-center gap-2">
            {paused ? (
              <span className="btn-secondary text-sm opacity-60 cursor-not-allowed" aria-disabled="true">Paused</span>
            ) : (
              <a href={connectHref} className={connected ? 'btn-secondary text-sm' : 'btn-primary text-sm'}>
                {connected ? 'Manage' : ctaLabel ?? 'Connect'}
              </a>
            )}
            {docsHref !== '#' && (
              <a href={docsHref} className="btn-ghost text-sm"><BookOpen className="h-3.5 w-3.5" />Docs</a>
            )}
          </div>
          {showControls && (
            <IntegrationControls provider={provider!} label={label!} lastSyncAt={lastSyncAt ?? null} />
          )}
        </div>
      </div>
    </div>
  );
}
