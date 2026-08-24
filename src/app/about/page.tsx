import { MarketingHeader } from '@/components/marketing/header';
import { MarketingFooter } from '@/components/marketing/footer';
import { pageMetadata, personJsonLd, webPageJsonLd } from '@/lib/seo';

export const metadata = pageMetadata({
  title: 'About — built by a founder, not a Series-B committee',
  description:
    'Collectly is built by Davie in Nairobi for small agencies and ' +
    'consultancies on Xero and QuickBooks. Read about the founding story, ' +
    'why we focus on the 5-30 person business long tail, and what we\'re ' +
    'not doing.',
  path: '/about',
  keywords: ['Collectly team', 'Collectly founder', 'AR automation story', 'Nairobi startup'],
});

// E-E-A-T page: Person schema for the founder + AboutPage schema. Helps
// Google build a Knowledge Panel for the founder / company and rank the
// about page for branded query "Collectly founder" / "who built Collectly".
const aboutJsonLd = JSON.stringify([
  webPageJsonLd({
    title: 'About Collectly — built in Nairobi for small agencies',
    description:
      'The founding story behind Collectly: a small SaaS built for the ' +
      '5-30 person agency and consultancy long tail on Xero and QuickBooks.',
    path: '/about',
    kind: 'AboutPage',
  }),
  personJsonLd(),
]);

export default function AboutPage() {
  return (
    <div className="min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: aboutJsonLd }} />
      <MarketingHeader />
      <section className="container-page pt-16 pb-12 max-w-3xl">
        <p className="eyebrow">About</p>
        <h1 className="mt-3 h1">We&apos;re building the A/R tool we wish we had.</h1>
      </section>
      <section className="container-page pb-20 max-w-3xl prose prose-ink">
        <p className="lead">Collectly is being built for 5–30 person agencies and consultancies using Xero, where a founder or operations lead still manages overdue invoices manually.</p>
        <h2 className="h3 mt-10">Why we exist</h2>
        <p>The A/R automation market is $4-6B and growing. It&apos;s also dominated by tools priced for 500-person companies. QuickBooks and Xero now cover the invoicing and reminders basics — what&apos;s missing for the 5-30 person agency segment is relationship-aware follow-up: reading a reply, tracking a promise to pay, and knowing when to pause.</p>
        <h2 className="h3 mt-10">What we believe</h2>
        <ul>
          <li><b>Small business owners are not stupid.</b> They&apos;re under-resourced, under-tooled, and overwhelmed. The right tool respects their time.</li>
          <li><b>AI is leverage, not magic.</b> The right AI removes the boring 80% of A/R work — the 6th reminder, the cash-flow projection, the cash application. It doesn&apos;t replace the owner.</li>
          <li><b>Honest pricing wins.</b> No per-invoice fees. No setup costs. No annual contracts. No &quot;premium&quot; support tiers.</li>
        </ul>
        <h2 className="h3 mt-10">Where we are</h2>
        <p>Collectly is built in Nairobi. The team is small and shipping fast. We&apos;re pre-launch, recruiting our first founding cohort from agencies and consultancies in the US, UK, AU, and CA.</p>
        <h2 className="h3 mt-10">Who we serve</h2>
        <p>5-30 person agencies and consultancies on Xero with 5+ open invoices at any time and no full-time credit controller. We&apos;re starting narrow on purpose — accountants and bookkeepers are a future distribution channel, not today&apos;s primary customer.</p>
      </section>
      <MarketingFooter />
    </div>
  );
}
