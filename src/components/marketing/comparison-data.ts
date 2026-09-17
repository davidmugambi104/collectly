/**
 * Competitor identity for the comparison matrix — deliberately NOT a
 * 'use client' module.
 *
 * comparison-table.tsx carries 'use client' (it renders interactive cells), so
 * anything exported from it is client-only: calling hasComparisonColumn() from
 * the server component in comparison-section.tsx failed the production build
 * with "Attempted to call hasComparisonColumn() from the server but
 * hasComparisonColumn is on the client". The dev server is more permissive and
 * did not catch it.
 *
 * The scope note that used to sit in comparison-table.tsx belongs with the data
 * rather than the rendering: this matrix covers the AR/invoicing tools an SMB
 * actually evaluates. Enterprise AR platforms — Gaviti, Growfin, HighRadius —
 * are excluded on purpose, because they sell to $50M+ ARR ERP-first
 * organisations rather than the 5-30 person agency this product is for.
 */
export type CompetitorKey = 'us' | 'chaser' | 'bill' | 'melio' | 'qb' | 'freshbooks';

export const COMPETITORS: Array<{ key: CompetitorKey; label: string; highlight?: boolean }> = [
  { key: 'us', label: 'Collectly', highlight: true },
  { key: 'chaser', label: 'Chaser' },
  { key: 'bill', label: 'BILL' },
  { key: 'melio', label: 'Melio' },
  { key: 'qb', label: 'QuickBooks AR' },
  { key: 'freshbooks', label: 'FreshBooks' },
];

/** Whether the matrix has a column for this competitor. */
export function hasComparisonColumn(key: string): key is CompetitorKey {
  return COMPETITORS.some((c) => c.key === key && !c.highlight);
}
