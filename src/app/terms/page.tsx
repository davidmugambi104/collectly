import { pageMetadata } from '@/lib/seo';
import { CONTACT } from '@/lib/site-contact';
import { billingCopy } from '@/lib/billing-copy';
import { stripeBillingStatus } from '@/lib/stripe-billing-config';

export const metadata = pageMetadata({
  title: 'Terms of Service: plain-English version of the legal bits',
  description:
    'The terms that govern your use of Mugavi. Plain-English summary ' +
    'of the legal agreements between us. Account rules, billing, refunds, ' +
    'and acceptable use.',
  path: '/terms',
  keywords: ['terms of service', 'SaaS terms', 'refund policy'],
});

export default function TermsPage() {
  const billing = billingCopy(stripeBillingStatus(process.env).checkoutReady);
  return (
    <div className="min-h-screen bg-ink-50">
      <div className="container-tight py-16 prose prose-ink max-w-none">
        <h1 className="text-4xl font-display font-bold">Terms of Service</h1>
        <p className="text-ink-500 text-sm">Last updated: October 5, 2026</p>
        {/* This page used to open by calling itself a placeholder and "not yet
            a complete agreement". Two problems with that. It is the page a
            buyer opens immediately before paying, and telling them the terms
            are not real is not a small thing to read there. And a terms page
            that disclaims being an agreement is arguably doing the opposite of
            what a terms page is for. The substance below is a thousand words of
            actual, accurate terms — this now says what it is instead of
            apologising for what it is not. It still wants a lawyer's read. */}
        <p className="lead">Mugavi is in private beta. These terms describe how the service works today, including the manual invoicing arrangement below, and will be updated as it changes. Questions about any of it: <a href="/contact" className="underline underline-offset-2 transition-colors hover:text-ink-900">get in touch</a>.</p>
        <h2 className="font-display font-semibold text-xl mt-8">Use of the service</h2>
        <p>You may use Mugavi in accordance with these terms. You may not abuse the service, attempt to disrupt it, or use it to send spam. The Service is currently offered only in connection with genuine business-to-business commercial receivables, not personal, family, household, or other consumer debt.</p>
        <h2 className="font-display font-semibold text-xl mt-8">Billing</h2>
        <p>{billing.terms} To change or cancel a plan, use Cancel or change plan on the Billing page in the app, or email {CONTACT.david}. David confirms by email within one business day, and nothing changes until he does. There is no cancellation fee.</p>
        <h2 className="font-display font-semibold text-xl mt-8">Text messages and third-party costs</h2>
        <p>Email reminders and AI drafts are included in your plan. Text messages are sent only to customers who have opted in, and only when you turn them on. We pass the carrier cost of each text message on to you at cost, with no markup, and show the number of messages on your invoice. If a provider we depend on, such as an accounting-software provider, starts charging for access in a way that materially raises our cost, we will tell you at least 30 days before any change to your price, and you may cancel before it applies.</p>
        <h2 className="font-display font-semibold text-xl mt-8">Fair use</h2>
        <p>Plans do not set a published limit on invoices. They assume ordinary use for a business&apos;s own receivables. If your use is far beyond that, for example tens of thousands of reminders a month, we will contact you and agree a plan with you before we limit your use or charge anything extra.</p>
        <h2 className="font-display font-semibold text-xl mt-8">Private beta</h2>
        <p>The Service is a private-beta product. Beta features may be incomplete, changed, or discontinued, and available payment methods and integrations vary by account and jurisdiction: a feature is available to you only when it&apos;s shown as enabled in your account. This beta status does not limit our obligations around confidentiality, security, or data protection.</p>
        <h2 className="font-display font-semibold text-xl mt-8">Liability</h2>
        <p>The service is provided &quot;as is.&quot; We do our best to keep it running and your data safe, but we cannot guarantee uninterrupted service.</p>
      </div>
    </div>
  );
}
