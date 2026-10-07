import Link from 'next/link';
import { MarketingHeader } from '@/components/marketing/header';
import { MarketingFooter } from '@/components/marketing/footer';
import { CONTACT } from '@/lib/site-contact';

/**
 * Shared shell for a help page: same header, same "Help" eyebrow, same
 * stuck-footer with the one-business-day reply promise. Keeps every help
 * page the same width and the same way out when the article does not answer
 * the question.
 */
export function HelpArticle({ title, lead, children }: { title: string; lead: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <MarketingHeader />
      <article className="container-page pt-16 pb-20 max-w-3xl">
        <p className="eyebrow">
          <Link href="/help" className="hover:underline">Help</Link>
        </p>
        <h1 className="mt-3 h1">{title}</h1>
        <p className="mt-6 lead">{lead}</p>
        {children}
        <p className="mt-12 text-sm text-ink-600">
          Stuck? Write to <a className="underline" href={`mailto:${CONTACT.hello}`}>{CONTACT.hello}</a>, replies within one business day.
          See <Link className="underline" href="/help">more help pages</Link> or <Link className="underline" href="/security">how we handle your data</Link>.
        </p>
      </article>
      <MarketingFooter />
    </div>
  );
}

export function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="mt-12 h2">{children}</h2>;
}

export function P({ children }: { children: React.ReactNode }) {
  return <p className="mt-4 text-ink-700">{children}</p>;
}
