import { bookOverage } from './book-overage.ts';

/**
 * The one sentence the Client books page says about money. It never claims an
 * automatic charge: billing is a manual invoice while card payments are not set up.
 */
export function practiceBillingNote(books: number, included: number, extraMonthly: number): string {
  const base = `The Practice plan covers ${included} client books, then $${extraMonthly} a month for each extra one. It is billed by manual invoice, nothing is charged automatically, and no book is ever blocked for going over.`;
  const o = bookOverage({ books, included, extraMonthly });
  if (o.kind !== 'extra') return base;
  return `${base} You have ${books}, so ${o.extra} ${o.extra === 1 ? 'is' : 'are'} extra: $${o.monthly} a month on your invoice.`;
}
