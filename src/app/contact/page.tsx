import { MarketingHeader } from '@/components/marketing/header';
import { MarketingFooter } from '@/components/marketing/footer';
import { WaitlistForm } from '@/components/marketing/waitlist';
import { pageMetadata, webPageJsonLd } from '@/lib/seo';

export const metadata = pageMetadata({
  title: 'Contact — sales, support, partnerships, press',
  description:
    'Talk to the team behind Collectly. Sales inquiries, customer support, ' +
    'Xero + QuickBooks partnerships, and press. Replies within one business day.',
  path: '/contact',
  keywords: ['Collectly contact', 'small business AR support', 'partnerships'],
});

const contactJsonLd = JSON.stringify(
  webPageJsonLd({
    title: 'Contact Collectly',
    description:
      'Sales, support, partnerships, and press inquiries for Collectly. ' +
      'Replies within one business day.',
    path: '/contact',
    kind: 'ContactPage',
  }),
);

export default function ContactPage() {
  return (
    <div className="min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: contactJsonLd }} />
      <MarketingHeader />
      <section className="container-page pt-16 pb-20 max-w-xl">
        <p className="eyebrow">Contact</p>
        <h1 className="mt-3 h1">Get in touch.</h1>
        <p className="mt-4 lead">For sales, support, partnerships, or press: <a className="link" href="mailto:hello@getcollectly.app">hello@getcollectly.app</a></p>
        <div className="mt-10 card">
          <h2 className="h3">Join the waitlist</h2>
          <p className="mt-2 text-sm text-ink-600">Get early access and lock in the $49/mo founding-member price for life.</p>
          <div className="mt-4"><WaitlistForm /></div>
        </div>
      </section>
      <MarketingFooter />
    </div>
  );
}
