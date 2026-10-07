import Link from 'next/link';
import { MarketingHeader } from '@/components/marketing/header';
import { MarketingFooter } from '@/components/marketing/footer';
import { pageMetadata } from '@/lib/seo';
import { CONTACT } from '@/lib/site-contact';
import { HELP_PAGES, HELP_CATEGORIES } from './_lib/help-pages';

export const metadata = pageMetadata({
  title: 'Help center',
  description: 'Short, concrete answers for connecting your books, approving reminders, statements, late fees, billing and your data.',
  path: '/help',
  keywords: ['Mugavi help', 'Mugavi support', 'invoice reminder help'],
});

export default function Page() {
  return (
    <div className="min-h-screen">
      <MarketingHeader />
      <article className="container-page pt-16 pb-20 max-w-3xl">
        <p className="eyebrow">Help</p>
        <h1 className="mt-3 h1">Help center</h1>
        <p className="mt-6 lead">
          Short pages that match what the product does today. If something here is out of date, tell us, we would rather fix the page than
          leave you guessing.
        </p>

        {HELP_CATEGORIES.map((category) => (
          <section key={category} className="mt-12">
            <h2 className="h2">{category}</h2>
            <ul className="mt-4 space-y-3">
              {HELP_PAGES.filter((p) => p.category === category).map((p) => (
                <li key={p.slug} className="border-b border-ink-100 pb-3">
                  <Link href={`/help/${p.slug}`} className="font-medium text-ink-900 underline underline-offset-2 hover:text-brand-600">
                    {p.title}
                  </Link>
                  <p className="mt-1 text-sm text-ink-600">{p.summary}</p>
                </li>
              ))}
            </ul>
          </section>
        ))}

        <p className="mt-12 text-sm text-ink-600">
          Not here? Write to <a className="underline" href={`mailto:${CONTACT.hello}`}>{CONTACT.hello}</a>, replies within one business day.
        </p>
      </article>
      <MarketingFooter />
    </div>
  );
}
