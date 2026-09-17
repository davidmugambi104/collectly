export type FaqItem = { q: string; a: string };

/**
 * One FAQ array, rendered visibly AND emitted as FAQPage markup.
 *
 * Eleven pages were calling faqJsonLd() with 51 questions between them and
 * rendering none of them. Two separate problems with that. Google requires
 * FAQPage content to be visible on the page — markup describing answers a
 * visitor cannot read is a spam-policy violation, not a shortcut. And ~4,000
 * words of genuinely good long-tail answer copy ("what is a good DSO for a
 * small agency?", "how much time does chasing invoices actually take?") was
 * being hidden from the one system it was written for.
 *
 * Pricing showed how the two drift when they are separate sources: its JSON-LD
 * declared "Can I cancel anytime?" while the visible <details> asked four
 * entirely different questions.
 *
 * This component renders only; each page keeps emitting its own FAQPage markup
 * as it always did. The fix is that both now read the SAME array, so the
 * questions cannot diverge — rather than this component emitting a second
 * FAQPage entity describing the identical questions.
 */
export function FaqSection({
  items,
  title = 'Frequently asked',
  className = '',
}: {
  items: FaqItem[];
  title?: string;
  className?: string;
}) {
  if (items.length === 0) return null;

  return (
    <section className={`container-page pt-14 pb-16 sm:pt-16 sm:pb-20 ${className}`}>
      <h2 className="h2 max-w-2xl text-balance">{title}</h2>
      <dl className="mt-8 max-w-3xl divide-y divide-ink-200 border-t border-ink-200">
        {items.map((item) => (
          <div key={item.q} className="py-5">
            <dt className="font-display font-semibold text-ink-950">{item.q}</dt>
            {/* max-w on the answer, not the container: .container-page is
                1152px and unconstrained body copy was measuring past 120
                characters a line in several places. ~65ch is the readable
                ceiling. */}
            <dd className="mt-2 max-w-[38rem] text-sm leading-relaxed text-ink-600">
              {item.a}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
