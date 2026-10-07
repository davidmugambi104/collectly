import Link from 'next/link';
import { MarketingHeader } from '@/components/marketing/header';
import { MarketingFooter } from '@/components/marketing/footer';
import { pageMetadata } from '@/lib/seo';
import { CONTACT } from '@/lib/site-contact';

export const metadata = pageMetadata({
  title: 'Your connection shows an error, or you need to reconnect',
  description:
    'What it means when QuickBooks or Xero shows an Error badge or a connection failed message in Mugavi, and how to fix it.',
  path: '/help/connection-shows-an-error-or-reconnect',
  keywords: ['QuickBooks connection error Mugavi', 'Xero connection error Mugavi', 'reconnect QuickBooks Xero'],
});

export default function Page() {
  return (
    <div className="min-h-screen">
      <MarketingHeader />
      <article className="container-page pt-16 pb-20 max-w-3xl">
        <p className="eyebrow">Help</p>
        <h1 className="mt-3 h1">Your connection shows an error, or you need to reconnect</h1>
        <p className="mt-6 lead">
          There is no separate &quot;Reconnect&quot; button in Mugavi. If a connection breaks, you fix it the same way
          you made it the first time: press the Connect button again on the Integrations page.
        </p>

        <h2 className="mt-12 h2">What an error looks like</h2>
        <ul className="mt-4 list-disc pl-5 space-y-2 text-ink-700">
          <li>
            <b>A red &quot;Error&quot; badge on the QuickBooks or Xero card</b> on Dashboard, then Integrations. This
            means a sync attempt failed, usually because the stored access was rejected by the provider.
          </li>
          <li>
            <b>A red banner at the top of Integrations right after you tried to connect,</b> reading something like
            &quot;QuickBooks connection failed: [reason]. Try again from the card below.&quot; This means the
            authorization itself did not finish.
          </li>
        </ul>

        <h2 className="mt-12 h2">How to fix it</h2>
        <ol className="mt-4 list-decimal pl-5 space-y-2 text-ink-700">
          <li>Open Dashboard, then Integrations.</li>
          <li>On the card with the error, press <b>Connect to QuickBooks</b> or <b>Connect to Xero</b> again.</li>
          <li>Sign in and authorize Mugavi again, picking the right company or organisation.</li>
          <li>Once the card shows Connected, press <b>Sync now</b>.</li>
        </ol>
        <p className="mt-4 text-ink-700">
          This replaces the old, broken connection with a fresh one. You do not lose customers or invoices already
          imported; the next sync simply updates them.
        </p>

        <h2 className="mt-12 h2">If disconnecting also showed a warning</h2>
        <p className="mt-4 text-ink-700">
          When you disconnect, Mugavi asks the provider to revoke its access. If the provider does not confirm that it
          removed the access, Mugavi tells you in an alert after you disconnect. To finish the job, open Connected apps
          in Xero, or your apps list in Intuit&apos;s account, and remove Mugavi there yourself (it may still be listed
          under an older app name for a while). This does not affect reconnecting; you can still press Connect again
          at any time.
        </p>

        <h2 className="mt-12 h2">Common causes</h2>
        <ul className="mt-4 list-disc pl-5 space-y-2 text-ink-700">
          <li>You removed Mugavi&apos;s access from inside QuickBooks or Xero directly, instead of from Mugavi.</li>
          <li>The authorization was cancelled partway, or took too long and the one-time link expired.</li>
          <li>Your QuickBooks or Xero password or company access changed since you connected.</li>
        </ul>

        <p className="mt-12 text-sm text-ink-600">
          Still stuck after reconnecting? Write to <a className="underline" href={`mailto:${CONTACT.hello}`}>{CONTACT.hello}</a>, and mention which provider and
          what the error said. Replies within one business day. See also <Link href="/help/connect-quickbooks-or-xero" className="underline">connecting QuickBooks or Xero</Link>.
        </p>
      </article>
      <MarketingFooter />
    </div>
  );
}
