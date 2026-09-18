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
        {/* The consent banner links here, so this has to actually describe
            what the banner asks about. A policy that says nothing about
            cookies while a banner offers to set them is the gap regulators
            look for first. Keep this list and src/lib/consent.ts in step. */}
        <h2 className="font-display font-semibold text-xl mt-8">Cookies</h2>
        <p>
          Three groups, and you decide on two of them. The site works with none of the
          optional ones switched on.
        </p>
        <ul>
          <li>
            <b>Strictly necessary</b> — keeping you signed in, remembering your answer to the
            cookie banner, and a two-letter country code used to decide whether you are shown
            the banner at all. That country cookie holds nothing but the country. These cannot
            be switched off, and we do not ask about them.
          </li>
          <li>
            <b>Analytics</b> — PostHog, for which pages get read and where people get stuck,
            and Microsoft Clarity, which records the session and builds heatmaps. Clarity masks
            what you type into form fields.
          </li>
          <li>
            <b>Advertising</b> — Google AdSense, which sets cookies used to select and measure
            ads.
          </li>
        </ul>
        <p>
          In the UK, EU, EEA and Switzerland nothing in the second and third groups loads until
          you say yes — not as a blocked cookie, but as a script that is never added to the page.
          Elsewhere they load by default and we do not interrupt you to ask, but{' '}
          <b>Cookie preferences</b> in the footer works everywhere: switch something off from
          there, anywhere in the world, and we honour it. Turning analytics off stops collection
          rather than just stopping the asking.
        </p>
        <h2 className="font-display font-semibold text-xl mt-8">Data deletion</h2>
        <p>You can delete your account at any time from Settings. We delete all associated data within 30 days.</p>
      </div>
    </div>
  );
}
