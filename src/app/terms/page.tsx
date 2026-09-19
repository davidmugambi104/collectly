import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({
  title: 'Terms of Service — plain-English version of the legal bits',
  description:
    'The terms that govern your use of Mugavi. Plain-English summary ' +
    'of the legal agreements between us. Account rules, billing, refunds, ' +
    'and acceptable use.',
  path: '/terms',
  keywords: ['terms of service', 'SaaS terms', 'refund policy'],
});

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-ink-50">
      <div className="container-tight py-16 prose prose-ink max-w-none">
        <h1 className="text-4xl font-display font-bold">Terms of Service</h1>
        <p className="text-ink-500 text-sm">Last updated: July 13, 2026</p>
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
        <p>You may use Mugavi in accordance with these terms. You may not abuse the service, attempt to disrupt it, or use it to send spam. The Service is currently offered only in connection with genuine business-to-business commercial receivables — not personal, family, household, or other consumer debt.</p>
        <h2 className="font-display font-semibold text-xl mt-8">Billing</h2>
        <p>The 14-day trial requires no payment method and does not automatically convert to a paid subscription. Mugavi is currently in private beta: after the trial, continued use is billed by manual invoice (bank transfer, Wise, or PayPal) rather than automatic card charges — we do not have live self-serve Stripe subscription billing yet. Email david@getcollectly.app to change or cancel a plan; requests are handled within 12 hours.</p>
        <h2 className="font-display font-semibold text-xl mt-8">Private beta</h2>
        <p>The Service is a private-beta product. Beta features may be incomplete, changed, or discontinued, and available payment methods and integrations vary by account and jurisdiction — a feature is available to you only when it&apos;s shown as enabled in your account. This beta status does not limit our obligations around confidentiality, security, or data protection.</p>
        <h2 className="font-display font-semibold text-xl mt-8">Liability</h2>
        <p>The service is provided &quot;as is.&quot; We do our best to keep it running and your data safe, but we cannot guarantee uninterrupted service.</p>
      </div>
    </div>
  );
}
