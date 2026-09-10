import { MarketingHeader } from '@/components/marketing/header';
import { MarketingFooter } from '@/components/marketing/footer';
import { QualifyForm } from '@/components/marketing/qualify-form';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({
  title: 'Quick question about how you handle overdue invoices',
  description: 'Four short questions about how you currently chase late payments. No pitch.',
  path: '/qualify',
  keywords: ['Collectly qualify', 'AR workflow survey'],
});

export default async function QualifyPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; name?: string; company?: string }>;
}) {
  const { email, name, company } = await searchParams;

  return (
    <div className="min-h-screen">
      <MarketingHeader />
      <section className="container-tight py-16 max-w-xl">
        <p className="eyebrow">Quick question</p>
        <h1 className="mt-3 h1">How do you currently chase overdue invoices?</h1>
        <p className="mt-5 lead">Four short questions, no pitch. Takes under a minute.</p>

        <div className="mt-10 card-lg">
          <QualifyForm initialEmail={email ?? ''} initialName={name ?? ''} initialCompany={company ?? ''} />
        </div>

        <p className="mt-6 text-xs text-ink-500">Your answers are used only to understand how AR follow-up works for teams like yours. We never sell or share it.</p>
      </section>
      <MarketingFooter />
    </div>
  );
}
