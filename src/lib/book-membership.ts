/**
 * Which client books a person really belongs to.
 *
 * Clerk is the source of truth for membership. Our own `memberships` table is only
 * a cache: nothing used to fill it in production, so the Client books page was empty
 * and the book count was always 0. Two rules follow:
 *  - a book is listed only if Clerk says the person is a member right now, so someone
 *    removed from an organization stops seeing its money even if our cache is stale;
 *  - a Clerk organization we have no row for yet (never opened) is still a book,
 *    shown by name with nothing to report.
 *
 * The shim (USE_DEV_AUTH=1) has no Clerk, so there the cache is the truth.
 */
export type BookRef = { orgId: string; name: string };

/** Pure: the Clerk list wins; names prefer our row (the person may have renamed it in Mugavi). */
export function reconcileBooks(clerk: BookRef[] | null, cached: BookRef[]): { books: BookRef[]; unseen: BookRef[]; staleOrgIds: string[] } {
  if (clerk === null) return { books: cached, unseen: [], staleOrgIds: [] };
  const mine = new Map(cached.map((b) => [b.orgId, b]));
  const live = new Set(clerk.map((b) => b.orgId));
  const books = clerk.map((c) => mine.get(c.orgId) ?? c);
  const unseen = clerk.filter((c) => !mine.has(c.orgId));
  const staleOrgIds = cached.filter((b) => !live.has(b.orgId)).map((b) => b.orgId);
  return { books, unseen, staleOrgIds };
}
