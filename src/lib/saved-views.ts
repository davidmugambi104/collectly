/**
 * Saved table views: a name for a set of filters on a list page. A view is just
 * the query string, cleaned against what the page actually understands, so a
 * stale or hand-edited link can never smuggle in something the page ignores.
 */
export const HISTORY_STATUSES = ['scheduled', 'sent', 'delivered', 'opened', 'clicked', 'replied', 'paid', 'failed', 'cancelled'] as const;
export const INVOICE_BUCKETS = ['current', '1-30', '31-60', '61-90', '90+'] as const;

export const MAX_VIEW_NAME = 40;
export const MAX_VIEWS_PER_PAGE = 20;
const MAX_SEARCH = 100;

export type ViewPage = 'invoices' | 'history';

const PAGES: Record<ViewPage, { path: string; params: Record<string, readonly string[] | 'text'> }> = {
  invoices: { path: '/dashboard/invoices', params: { filter: ['overdue', 'paid'], bucket: INVOICE_BUCKETS, q: 'text' } },
  history: { path: '/dashboard/dunning/history', params: { status: HISTORY_STATUSES } },
};

export function isViewPage(v: unknown): v is ViewPage {
  return v === 'invoices' || v === 'history';
}

/**
 * Keep only the filters this page understands, with valid values, in a fixed
 * order. Returns '' for "no filters" (the default view), so two ways of
 * spelling the same view compare equal.
 */
export function cleanViewQuery(page: ViewPage, input: string | URLSearchParams | Record<string, string | undefined>): string {
  const src = typeof input === 'string' ? new URLSearchParams(input.replace(/^\?/, '')) : input instanceof URLSearchParams ? input : new URLSearchParams(Object.entries(input).filter((e): e is [string, string] => typeof e[1] === 'string'));
  const out = new URLSearchParams();
  for (const [key, allowed] of Object.entries(PAGES[page].params)) {
    let value = (src.get(key) ?? '').trim();
    if (!value) continue;
    if (allowed === 'text') value = value.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').slice(0, MAX_SEARCH);
    else if (!allowed.includes(value)) continue;
    if (value) out.set(key, value);
  }
  return out.toString();
}

export function viewHref(page: ViewPage, query: string): string {
  return query ? `${PAGES[page].path}?${query}` : PAGES[page].path;
}

/** Trim, collapse whitespace, strip control characters. Null if nothing usable is left. */
export function normalizeViewName(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const n = input.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
  return n ? n.slice(0, MAX_VIEW_NAME) : null;
}
