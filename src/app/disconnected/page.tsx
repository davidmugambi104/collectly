import Link from 'next/link';
import { Logo } from '@/components/brand/logo';
import { pageMetadata } from '@/lib/seo';
import { CONTACT } from '@/lib/site-contact';
import { TRADEMARK_NOTICE } from '@/lib/trademark';

export const dynamic = 'force-static';

export const metadata = pageMetadata({
  title: 'Your QuickBooks connection has ended',
  description: 'Mugavi no longer has access to your QuickBooks company. How to reconnect, and what stays and what is removed.',
  path: '/disconnected',
  noindex: true,
});

/**
 * Intuit's "Disconnect URL": a static page, no login, shown after the connection ends.
 * Deliberately self-contained (no site header or footer) so it names only QuickBooks.
 */
export default function DisconnectedPage() {
  return (
    <div className="min-h-screen bg-ink-50">
      <div className="container-tight py-16 prose prose-ink max-w-none">
        <Link href="/" className="not-prose inline-flex items-center gap-2.5 font-display font-bold text-ink-950">
          <Logo className="h-7 w-7" />
          <span>Mugavi</span>
        </Link>
        <h1 className="mt-8 text-4xl font-display font-bold">Your QuickBooks connection has ended</h1>
        <p className="lead">
          Mugavi no longer has access to your QuickBooks company. It will not read your QuickBooks data or write to it
          until you connect again.
        </p>

        <h2 className="font-display font-semibold text-xl mt-8">To reconnect</h2>
        <ol>
          <li><Link href="/sign-in">Sign in to Mugavi</Link>.</li>
          <li>Open Integrations from the dashboard.</li>
          <li>Choose <b>Connect to QuickBooks</b> and approve access in QuickBooks.</li>
        </ol>

        <h2 className="font-display font-semibold text-xl mt-8">What stays and what is removed</h2>
        <ul>
          <li><b>Removed:</b> the connection tokens Mugavi held for your company. Mugavi also asks QuickBooks to revoke its access when you disconnect from inside Mugavi.</li>
          <li><b>Stays:</b> customers and invoices already imported into Mugavi, and the reminder history, until you remove them from Integrations or delete your account.</li>
          <li><b>Your choice:</b> use the remove option on the Integrations page to delete the imported QuickBooks data now. Deleting your account deletes all of it. See the <Link href="/privacy">privacy policy</Link> for the detail.</li>
        </ul>
        <p>Nothing in your QuickBooks company is changed by disconnecting.</p>

        <p>Questions: <a href={`mailto:${CONTACT.privacy}`}>{CONTACT.privacy}</a></p>
        <p className="text-sm text-ink-500">{TRADEMARK_NOTICE}</p>
      </div>
    </div>
  );
}
