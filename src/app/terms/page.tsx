import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({
  title: 'Terms of Service — plain-English version of the legal bits',
  description:
    'The terms that govern your use of Collectly. Plain-English summary ' +
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
        <p className="lead">Placeholder terms. Replace with a real review by counsel before going to production.</p>
        <h2 className="font-display font-semibold text-xl mt-8">Use of the service</h2>
        <p>You may use Collectly in accordance with these terms. You may not abuse the service, attempt to disrupt it, or use it to send spam.</p>
        <h2 className="font-display font-semibold text-xl mt-8">Billing</h2>
        <p>Subscriptions are billed monthly via Stripe, with no annual contract. Cancel anytime from your billing settings.</p>
        <h2 className="font-display font-semibold text-xl mt-8">Liability</h2>
        <p>The service is provided "as is." We do our best to keep it running and your data safe, but we cannot guarantee uninterrupted service.</p>
      </div>
    </div>
  );
}
