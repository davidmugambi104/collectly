// Run: npx tsx scripts/selftest/membership-mismatch.ts
//
// Regression test for the "[auth] could not record membership" / FK 23503 report: a real user whose
// `users` row predates the Clerk-id-as-id convention has `clerk_id` = their Clerk id but a different
// `id`. memberships.user_id references users.id, so writing a membership for them with the raw Clerk
// id (instead of their row's real id) used to fail the foreign key, and separately it is the same
// shape of bug that could make a multi-org user's data look written to the wrong org if any path
// resolved "this user" to the wrong users.id.
//
// Checks, against a real in-memory Postgres (PGlite) with the full schema:
// 1. A legacy mismatched-id user can have a membership recorded by their Clerk id with no FK error.
// 2. The membership row stores their real users.id, not the Clerk id.
// 3. practice-load's cache (loadBooks/loadBookCount), which several pages read, resolves the same
//    legacy user correctly and lists exactly the orgs they belong to — not another org, not none.
// 4. A brand-new user (id === clerkId, the common case today) is unaffected.
process.env.USE_PGLITE = '1';
// practice-load's listBooks() calls Clerk directly except in the dev shim, where it trusts the
// memberships cache alone — exactly the cache this script is checking.
process.env.USE_DEV_AUTH = '1';
import { eq } from 'drizzle-orm';

async function main() {
  const { db } = await import('@/db');
  const { ensureBootstrapped } = await import('@/lib/bootstrap-db');
  const { organizations, users, memberships } = await import('@/db/schema');
  const { recordMembership, resolveUserRowId } = await import('@/lib/clerk-books');
  const { loadBooks, loadBookCount } = await import('@/lib/practice-load');
  await ensureBootstrapped();

  // --- Legacy user: generated row id, Clerk id lives only in clerk_id. ---
  const legacyRowId = 'row_legacy_abc123';
  const legacyClerkId = 'clerk_legacy_user_1';
  await db.insert(users).values({ id: legacyRowId, clerkId: legacyClerkId, email: 'legacy@example.test', name: 'Legacy' } as any).onConflictDoNothing();
  await db.insert(organizations).values({ id: 'org_legacy_1', name: 'Legacy Org', slug: 'org_legacy_1', ownerId: legacyRowId } as any).onConflictDoNothing();
  await db.insert(organizations).values({ id: 'org_legacy_2', name: 'Legacy Org Two', slug: 'org_legacy_2', ownerId: legacyRowId } as any).onConflictDoNothing();
  // Another org this legacy user must NOT end up a member of.
  await db.insert(organizations).values({ id: 'org_not_legacy', name: 'Not Legacy', slug: 'org_not_legacy', ownerId: legacyRowId } as any).onConflictDoNothing();

  // The call that used to throw FK 23503 when it inserted with userId = legacyClerkId directly.
  await recordMembership(legacyClerkId, 'org_legacy_1', 'owner');
  await recordMembership(legacyClerkId, 'org_legacy_2', 'owner');
  console.log('OK: recordMembership did not throw for a mismatched-id (legacy) user');

  const rows = await db.select().from(memberships).where(eq(memberships.userId, legacyRowId));
  if (rows.length !== 2) throw new Error(`expected 2 membership rows under the real row id, got ${rows.length}`);
  if (rows.some((r: any) => r.orgId === 'org_not_legacy')) throw new Error('membership leaked into an org the legacy user never joined');
  console.log('OK: membership rows stored under the real users.id, not the Clerk id, and only for the joined orgs');

  const resolved = await resolveUserRowId(legacyClerkId);
  if (resolved !== legacyRowId) throw new Error(`resolveUserRowId returned ${resolved}, expected ${legacyRowId}`);

  // Calling it again (as every getAuth() request does) must stay a no-op, not a duplicate or a crash.
  await recordMembership(legacyClerkId, 'org_legacy_1', 'owner');
  const again = await db.select().from(memberships).where(eq(memberships.userId, legacyRowId));
  if (again.length !== 2) throw new Error(`recordMembership was not idempotent: ${again.length} rows`);
  console.log('OK: recordMembership is idempotent on repeat calls');

  // practice-load reads memberships by the Clerk id (per 00-HANDOFF.md); confirm it resolves through
  // to the same real row and lists exactly this user's two books, nothing from org_not_legacy.
  const books = (await loadBooks(legacyClerkId)).map((b) => b.orgId).sort();
  if (JSON.stringify(books) !== JSON.stringify(['org_legacy_1', 'org_legacy_2'])) {
    throw new Error(`loadBooks for the legacy Clerk id returned ${JSON.stringify(books)}`);
  }
  const count = await loadBookCount(legacyClerkId);
  if (count !== 2) throw new Error(`loadBookCount returned ${count}, expected 2`);
  console.log('OK: practice-load resolves the legacy Clerk id to the right user and lists only their own books');

  // --- Modern user: id === clerkId (today's normal case) must still work unchanged. ---
  const modernId = 'user_modern_1';
  await db.insert(users).values({ id: modernId, clerkId: modernId, email: 'modern@example.test', name: 'Modern' } as any).onConflictDoNothing();
  await db.insert(organizations).values({ id: 'org_modern_1', name: 'Modern Org', slug: 'org_modern_1', ownerId: modernId } as any).onConflictDoNothing();
  await recordMembership(modernId, 'org_modern_1', 'owner');
  const modernRows = await db.select().from(memberships).where(eq(memberships.userId, modernId));
  if (modernRows.length !== 1) throw new Error('modern (id === clerkId) user membership regressed');
  console.log('OK: the common case (id === clerkId) is unaffected');

  console.log('ALL PASS');
  process.exit(0);
}
main().catch((e) => { console.error('FAILED', e); process.exit(1); });
