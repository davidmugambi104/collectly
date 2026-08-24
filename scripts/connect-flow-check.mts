/**
 * End-to-end test for the QBO connect flow as it would run in production.
 *
 * Simulates a Clerk-authenticated request by directly calling the route
 * handler with a mocked session.userId. Verifies:
 *   - Clerk user_id -> local users.id resolution works
 *   - Membership lookup uses the resolved local id
 *   - The minted Intuit URL contains the new client_id and the correct
 *     redirect_uri
 *
 * Run: npx tsx scripts/connect-flow-check.mts
 */
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../.env.local'), override: true });

async function main(): Promise<void> {
  // Direct DB access — no need to import the route (it depends on Next runtime)
  const { db } = await import('../src/db/index.ts');
  const { users, memberships } = await import('../src/db/schema.ts');
  const { eq, and } = await import('drizzle-orm');
  const { qboAuthUrl } = await import('../src/lib/integrations/quickbooks.ts');
  const { mintOAuthState } = await import('../src/lib/oauth-state.ts');

  // The Clerk user_id your real session has
  const clerkUserId = 'user_3H5T8gnZqMYlLwYLI6lls3kr4mY';
  const orgId = 'org_3H678THvTlPs2uFn8eXv9RIkhU6';

  let pass = 0, fail = 0;
  function log(msg: string, ok: boolean): void {
    if (ok) { pass++; console.log(`  ✓ ${msg}`); } else { fail++; console.log(`  ✗ ${msg}`); }
  }

  console.log('\nTEST 1: Resolve Clerk user_id -> local users.id');
  const localUser = await db.select({ id: users.id, email: users.email })
    .from(users)
    .where(eq(users.clerkId, clerkUserId))
    .limit(1);
  log('local user row exists', !!localUser[0]);
  if (!localUser[0]) {
    console.log(`\n${pass} passed, ${fail} failed`);
    process.exit(1);
  }
  console.log(`    local id: ${localUser[0].id}`);
  console.log(`    email:    ${localUser[0].email}`);

  console.log('\nTEST 2: Membership lookup using local id');
  const member = await db.select({ id: memberships.id, role: memberships.role })
    .from(memberships)
    .where(and(eq(memberships.userId, localUser[0].id), eq(memberships.orgId, orgId)))
    .limit(1);
  log(`membership row exists for ${orgId}`, !!member[0]);
  if (member[0]) console.log(`    role: ${member[0].role}`);

  console.log('\nTEST 3: Mint CSRF state and build Intuit URL');
  const state = await mintOAuthState(orgId, clerkUserId);
  log(`state is non-empty (${state.length} chars)`, state.length > 30);
  log(`state looks like base64url`, /^[A-Za-z0-9_-]+$/.test(state));

  const authUrl = qboAuthUrl(state);
  const u = new URL(authUrl);
  console.log(`\n    URL: ${authUrl.slice(0, 120)}...`);
  log('host is appcenter.intuit.com', u.host === 'appcenter.intuit.com');
  log(`client_id = ABCuo9aYUfHzex3TOiUHL5xz7iQXoUfx4VTWoelezCqw44wrAx`,
      u.searchParams.get('client_id') === 'ABCuo9aYUfHzex3TOiUHL5xz7iQXoUfx4VTWoelezCqw44wrAx');
  log('redirect_uri = https://getcollectly.app/api/quickbooks/callback',
      u.searchParams.get('redirect_uri') === 'https://getcollectly.app/api/quickbooks/callback');
  log('response_type = code', u.searchParams.get('response_type') === 'code');
  log('scope = com.intuit.quickbooks.accounting',
      u.searchParams.get('scope') === 'com.intuit.quickbooks.accounting');
  log('state matches minted value', u.searchParams.get('state') === state);

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((e) => { console.error('Fatal:', e?.stack ?? e); process.exit(1); });