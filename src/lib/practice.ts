/**
 * The practice view: every client book (organization) a person belongs to, side by
 * side. Pure: the loader gathers per-book facts, this orders and totals them.
 *
 * Money is kept per currency and never added across currencies.
 */
export type Money = Record<string, { outstanding: number; overdue: number }>;

export type BookFacts = {
  orgId: string;
  name: string;
  openInvoices: number;
  overdueInvoices: number;
  money: Money;
  /** Days overdue of the oldest overdue invoice, 0 when none. */
  oldestOverdueDays: number;
  awaitingApproval: number;
  newReplies: number;
  lastSyncAt: Date | null;
  integrationError: boolean;
  hasIntegration: boolean;
  /** A Clerk organization Mugavi has no record of yet: nobody has opened it. */
  notOpenedYet?: boolean;
};

export type BookSummary = BookFacts & {
  /** Short reasons this book needs a look, most urgent first. */
  attention: string[];
};

const cents = (n: number) => Math.round(n * 100);

/** The largest overdue amount in any currency, used only to rank books. */
function overdueRank(m: Money): number {
  return Math.max(0, ...Object.values(m).map((v) => cents(v.overdue)));
}

export function attentionFor(b: BookFacts, now: Date = new Date()): string[] {
  const out: string[] = [];
  if (b.notOpenedYet) return ['Not opened yet. Open it once to set it up'];
  if (b.integrationError) out.push('Accounting connection needs to be reconnected');
  else if (!b.hasIntegration) out.push('Not connected to Xero or QuickBooks');
  else if (b.lastSyncAt && now.getTime() - b.lastSyncAt.getTime() > 3 * 86_400_000) out.push('Has not synced in over 3 days');
  if (b.newReplies > 0) out.push(`${b.newReplies} ${b.newReplies === 1 ? 'reply' : 'replies'} waiting`);
  if (b.awaitingApproval > 0) out.push(`${b.awaitingApproval} ${b.awaitingApproval === 1 ? 'reminder' : 'reminders'} waiting for approval`);
  return out;
}

/** Books that need a person first, then by how much is overdue, then by name. */
export function rankBooks(books: BookFacts[], now: Date = new Date()): BookSummary[] {
  return books
    .map((b) => ({ ...b, attention: attentionFor(b, now) }))
    .sort((a, b) =>
      (b.attention.length > 0 ? 1 : 0) - (a.attention.length > 0 ? 1 : 0)
      || overdueRank(b.money) - overdueRank(a.money)
      || a.name.localeCompare(b.name));
}

/** Totals across books, per currency, plus counts. */
export function totalBooks(books: BookFacts[]): { money: Money; openInvoices: number; overdueInvoices: number; awaitingApproval: number; newReplies: number } {
  const money: Money = {};
  let openInvoices = 0, overdueInvoices = 0, awaitingApproval = 0, newReplies = 0;
  for (const b of books) {
    openInvoices += b.openInvoices; overdueInvoices += b.overdueInvoices;
    awaitingApproval += b.awaitingApproval; newReplies += b.newReplies;
    for (const [cur, v] of Object.entries(b.money)) {
      const t = money[cur] ?? { outstanding: 0, overdue: 0 };
      money[cur] = { outstanding: (cents(t.outstanding) + cents(v.outstanding)) / 100, overdue: (cents(t.overdue) + cents(v.overdue)) / 100 };
    }
  }
  return { money, openInvoices, overdueInvoices, awaitingApproval, newReplies };
}
