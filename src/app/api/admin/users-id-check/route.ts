import { NextResponse } from 'next/server';
import { requireAdminEmail } from '@/lib/auth-helper';
import { pool } from '@/db';

export const dynamic = 'force-dynamic';

/**
 * GET: read-only check for users rows whose id is not their Clerk id, which is why
 * "[auth] could not record membership" fails (memberships.user_id references users.id,
 * and the rest of the app looks memberships up by the Clerk id).
 *
 * Admin allowlist only. Returns ids and counts, never an email or a name.
 */
export async function GET() {
  const admin = await requireAdminEmail();
  if (!admin.ok) return NextResponse.json({ error: 'not authorized' }, { status: 403 });
  let db;
  try {
    db = pool();
  } catch {
    return NextResponse.json({ error: 'needs the production database (not the dev database)' }, { status: 400 });
  }
  const rows = await db.query(
    `select u.id, u.clerk_id as "clerkId",
            (select count(*)::int from organizations o where o.owner_id = u.id) as "ownedOrgs",
            (select count(*)::int from memberships m where m.user_id = u.id) as "memberships",
            (u.email like '%@unknown.clerk.local') as "placeholderEmail"
       from users u order by u.created_at`,
  );
  const users = rows.rows as Array<{ id: string; clerkId: string | null; ownedOrgs: number; memberships: number; placeholderEmail: boolean }>;
  const mismatched = users.filter((u) => u.clerkId !== u.id);
  return NextResponse.json({
    total: users.length,
    mismatched: mismatched.length,
    // Which Clerk ids the failing warning names: users whose id and clerk_id differ, with what points at them.
    rows: mismatched,
    note: 'ids and counts only; no emails or names',
  });
}
