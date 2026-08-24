import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({
  title: 'Privacy Policy — plain English, not legalese',
  description:
    'How Collectly handles data: what we collect, how we use it, ' +
    'what we never do, and what choices you have. Plain-English privacy ' +
    'policy for a B2B accounts-receivable tool. Last updated July 13, 2026.',
  path: '/privacy',
  keywords: ['privacy policy', 'data handling', 'GDPR privacy', 'B2B SaaS privacy'],
});

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-ink-50">
      <div className="container-tight py-16 prose prose-ink max-w-none">
        <h1 className="text-4xl font-display font-bold">Privacy Policy</h1>
        <p className="text-ink-500 text-sm">Last updated: July 13, 2026</p>
        <p className="lead">Collectly is a business-to-business accounts-receivable tool. This policy describes the data we collect, how we use it, and the choices you have. It&apos;s written in plain English, not legalese — but it&apos;s a real policy, not a draft. If you have questions, email privacy@getcollectly.app.</p>
        <h2 className="font-display font-semibold text-xl mt-8">What we collect</h2>
        <p>Email, name, billing info, and the data you put in our platform (customers, invoices, payment records).</p>
        <h2 className="font-display font-semibold text-xl mt-8">How we use it</h2>
        <p>To provide the service. To send you transactional emails. To send you product updates if you opt in.</p>
        <h2 className="font-display font-semibold text-xl mt-8">What we never do</h2>
        <ul>
          <li>Sell your data</li>
          <li>Share customer data with third parties except those needed to provide the service (payment processors, Twilio, Resend, Gemini)</li>
          <li>Train AI models on your data</li>
        </ul>
        <h2 className="font-display font-semibold text-xl mt-8">Data deletion</h2>
        <p>You can delete your account at any time from Settings. We delete all associated data within 30 days.</p>
      </div>
    </div>
  );
}
