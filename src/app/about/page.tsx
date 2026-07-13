import { MarketingHeader } from '@/components/marketing/header';
import { MarketingFooter } from '@/components/marketing/footer';
import { Logo } from '@/components/brand/logo';

export const metadata = { title: 'About' };

export default function AboutPage() {
  return (
    <div className="min-h-screen">
      <MarketingHeader />
      <section className="container-page pt-16 pb-12 max-w-3xl">
        <p className="eyebrow">About</p>
        <h1 className="mt-3 h1">We're building the A/R tool we wish we had.</h1>
      </section>
      <section className="container-page pb-20 max-w-3xl prose prose-ink">
        <p className="lead">Collectly is an AI-native accounts-receivable platform built for the long tail of small businesses. The 5-50 person teams that account for the majority of the global economy, and the majority of overdue invoices.</p>
        <h2 className="h3 mt-10">Why we exist</h2>
        <p>The A/R automation market is $4-6B and growing. It's also dominated by tools priced for 500-person companies, plus a QuickBooks AR module so broken its own users call it "of no use." The 5-50 person segment — the heart of the SMB economy — has no good option.</p>
        <h2 className="h3 mt-10">What we believe</h2>
        <ul>
          <li><b>Small business owners are not stupid.</b> They're under-resourced, under-tooled, and overwhelmed. The right tool respects their time.</li>
          <li><b>AI is leverage, not magic.</b> The right AI removes the boring 80% of A/R work — the 6th reminder, the cash-flow projection, the cash application. It doesn't replace the owner.</li>
          <li><b>Honest pricing wins.</b> No per-invoice fees. No setup costs. No annual contracts. No "premium" support tiers.</li>
        </ul>
        <h2 className="h3 mt-10">Where we are</h2>
        <p>Collectly is built in Nairobi, used globally. The team is small, distributed, and shipping fast. We're backed by design partners in the US, UK, AU, and CA.</p>
        <h2 className="h3 mt-10">Who we serve</h2>
        <p>B2B service businesses with $500K-$20M revenue, 1-50 employees, and 5+ open invoices at any time. Agencies, consultancies, B2B SaaS, law firms, accounting practices, design studios, software companies, and similar.</p>
      </section>
      <MarketingFooter />
    </div>
  );
}
