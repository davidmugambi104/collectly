import { NextRequest, NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { getAuth } from '@/lib/auth-helper';
import { db } from '@/db';
import { savedViews } from '@/db/schema';
import { ensureBootstrapped } from '@/lib/bootstrap-db';
import { ensureDunningControlSchema } from '@/lib/dunning-control-schema';
import { cleanViewQuery, isViewPage, normalizeViewName, MAX_VIEWS_PER_PAGE } from '@/lib/saved-views';
import { nanoid } from '@/lib/utils';

/** POST { page, name, query } saves the current filters under a name, for everyone in the organisation. */
export async function POST(req: NextRequest) {
  await ensureBootstrapped();
  await ensureDunningControlSchema();
  const { orgId, userId } = await getAuth();
  if (!orgId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  let input: Record<string, unknown> = {};
  try { const p = await req.json(); if (p && typeof p === 'object') input = p as Record<string, unknown>; } catch { /* handled below */ }
  if (!isViewPage(input.page)) return NextResponse.json({ error: 'Views are not available on that page.' }, { status: 400 });
  const name = normalizeViewName(input.name);
  if (!name) return NextResponse.json({ error: 'Give the view a name.' }, { status: 400 });
  const query = cleanViewQuery(input.page, typeof input.query === 'string' ? input.query : '');
  if (!query) return NextResponse.json({ error: 'Pick a filter first. A view with no filters is just the page.' }, { status: 400 });

  const existing = await db.select({ id: savedViews.id, name: savedViews.name }).from(savedViews).where(and(eq(savedViews.orgId, orgId), eq(savedViews.page, input.page)));
  if (existing.some((v: { name: string }) => v.name.toLowerCase() === name.toLowerCase())) {
    return NextResponse.json({ error: `You already have a view called "${name}".` }, { status: 409 });
  }
  if (existing.length >= MAX_VIEWS_PER_PAGE) {
    return NextResponse.json({ error: `You can keep ${MAX_VIEWS_PER_PAGE} views per page. Delete one to make room.` }, { status: 409 });
  }
  const id = nanoid();
  await db.insert(savedViews).values({ id, orgId, page: input.page, name, query, createdBy: userId ?? null });
  return NextResponse.json({ ok: true, id });
}
