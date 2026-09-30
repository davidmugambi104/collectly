import { asc, and, eq } from 'drizzle-orm';
import { db } from '@/db';
import { savedViews } from '@/db/schema';
import { ensureDunningControlSchema } from '@/lib/dunning-control-schema';
import { cleanViewQuery, viewHref, type ViewPage } from '@/lib/saved-views';

export type ViewChip = { id: string; name: string; query: string; href: string };

/**
 * The organisation's saved views for one page. Never throws: if the table cannot
 * be read the page loses its views strip, not the list underneath it.
 */
export async function loadViews(orgId: string, page: ViewPage): Promise<ViewChip[]> {
  try {
    await ensureDunningControlSchema();
    const rows = await db.select().from(savedViews).where(and(eq(savedViews.orgId, orgId), eq(savedViews.page, page))).orderBy(asc(savedViews.createdAt));
    return rows.map((r: { id: string; name: string; query: string }) => {
      const query = cleanViewQuery(page, r.query);
      return { id: r.id, name: r.name, query, href: viewHref(page, query) };
    });
  } catch (e) {
    console.error('[saved views] load failed:', e instanceof Error ? e.message : e);
    return [];
  }
}
