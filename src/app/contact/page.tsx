import { MarketingHeader } from '@/components/marketing/header';
import { MarketingFooter } from '@/components/marketing/footer';
import { WaitlistForm } from '@/components/marketing/waitlist';

export const metadata = { title: 'Contact' };
export default function ContactPage() {
  return (
    <div className="min-h-screen">
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
