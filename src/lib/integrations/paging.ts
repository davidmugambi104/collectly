/**
 * Read every page of a list endpoint, up to a limit. Used by the accounting
 * syncs, which used to stop after the first page and silently miss the rest.
 * Pure: the caller supplies how to fetch one page.
 */
export async function fetchAllPages<T>(
  getPage: (page: number) => Promise<T[]>,
  pageSize: number,
  maxPages: number,
): Promise<{ items: T[]; pages: number; truncated: boolean }> {
  const items: T[] = [];
  for (let page = 1; page <= maxPages; page++) {
    const batch = await getPage(page);
    items.push(...batch);
    // A short page is the last one. An empty page too.
    if (batch.length < pageSize) return { items, pages: page, truncated: false };
  }
  // Every page up to the limit was full: there may be more.
  return { items, pages: maxPages, truncated: true };
}

export function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}
