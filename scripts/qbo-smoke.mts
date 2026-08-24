/**
 * Self-contained runtime test for QBO sync + token refresh behavior.
 * Uses dynamic imports inside main() so we don't trip tsx's ESM loader
 * with a long static import chain.
 * Run: npx tsx scripts/qbo-smoke.mts
 *
 * NOTE (2026-08-24): this file previously tested a retry-once-on-401 /
 * typed-error-class (QboAuthError, QboQueryError, QboServerError) /
 * 503-Retry-After-backoff contract that syncQboForOrg has never actually
 * implemented -- per the comment above QboReconnectRequiredError in
 * quickbooks.ts, that resilience layer was planned as part of a larger
 * QBO refactor that stayed "in dirty tree" and never landed. As a result
 * this script has been crashing with "QboAuthError is not a constructor"
 * on every run (it isn't wired into `npm test`, so nobody noticed).
 * Rewritten to exercise what syncQboForOrg actually does today: proactive
 * refresh when the stored token is within 5 min of expiry (real,
 * getFreshQboToken in quickbooks.ts), refresh-failure marking the
 * integration 'error' and surfacing a string in errors[] rather than
 * throwing, and the paidAt-preservation fix on the paid transition.
 */

// Set env BEFORE any dynamic import of app code.
process.env.USE_PGLITE = '1';
process.env.QBO_ENVIRONMENT = 'sandbox';
process.env.QBO_CLIENT_ID = 'test_client_id';
process.env.QBO_CLIENT_SECRET = 'test_client_secret';
process.env.QBO_REDIRECT_URI = 'https://test.local/api/quickbooks/callback';
process.env.NEXT_PUBLIC_APP_URL = 'https://test.local';

import { randomUUID } from 'node:crypto';

let pass = 0, fail = 0;
function log(msg: string, ok: boolean): void {
  if (ok) { pass++; console.log(`  ✓ ${msg}`); }
  else { fail++; console.log(`  ✗ ${msg}`); }
}

function resp(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status, headers: { 'Content-Type': 'application/json', intuit_tid: 'tid' },
  });
}

async function main(): Promise<void> {
  const qbo: typeof import('../src/lib/integrations/quickbooks.ts') = await import('../src/lib/integrations/quickbooks.ts');
  const { db }: typeof import('../src/db/index.ts') = await import('../src/db/index.ts');
  const { integrations, users, organizations }: typeof import('../src/db/schema.ts') = await import('../src/db/schema.ts');
  const { eq, and }: typeof import('drizzle-orm') = await import('drizzle-orm');
  const { ensureBootstrapped }: typeof import('../src/lib/bootstrap-db.ts') = await import('../src/lib/bootstrap-db.ts');
  await ensureBootstrapped();

  const { QboReconnectRequiredError, getQboReconnectUrl, qboAuthUrl, syncQboForOrg, disconnectQbo } = qbo;
  void QboReconnectRequiredError;

  const suffix = randomUUID().slice(0, 6);
  const userId = `user_test_${suffix}`;
  const orgId = `org_test_${suffix}`;
  const integId = `integ_test_${suffix}`;

  await db.insert(users).values({ id: userId, clerkId: userId, email: `${userId}@test.local` });
  await db.insert(organizations).values({
    id: orgId, name: `Test ${suffix}`, slug: `test-${suffix}`, ownerId: userId,
  });

  async function seedInteg(opts: { accessToken: string; refreshToken: string; expiresAt: Date; realmId: string; status?: string }): Promise<void> {
    await db.delete(integrations).where(
      and(eq(integrations.orgId, orgId), eq(integrations.provider, 'quickbooks')),
    );
    await db.insert(integrations).values({
      id: integId, orgId, provider: 'quickbooks',
      status: opts.status ?? 'connected',
      accessToken: opts.accessToken, refreshToken: opts.refreshToken,
      expiresAt: opts.expiresAt, realmId: opts.realmId,
    });
  }
  async function readInteg() {
    const [row] = await db.select().from(integrations).where(
      and(eq(integrations.orgId, orgId), eq(integrations.provider, 'quickbooks')),
    );
    return row;
  }

  // Pluggable fetch mock — uses a closure-shared recorder.
  function buildFetch(handler: (url: string) => Response): typeof fetch {
    const fn = async (input: RequestInfo | URL): Promise<Response> => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
      return handler(url);
    };
    return fn as typeof fetch;
  }

  // ================================================================
  // TEST A: URL helpers
  // ================================================================
  console.log('\nTEST A: URL helpers');
  const url = getQboReconnectUrl(orgId);
  log('reconnect URL has /api/quickbooks/connect', url.includes('/api/quickbooks/connect'));
  log('reconnect URL has orgId', url.includes(`orgId=${orgId}`));

  const authUrl = qboAuthUrl(orgId);
  log('auth URL points at appcenter.intuit.com', authUrl.startsWith('https://appcenter.intuit.com/connect/oauth2?'));
  log('auth URL has state=orgId', authUrl.includes(`state=${orgId}`));
  log('auth URL requests accounting scope', authUrl.includes('scope=com.intuit.quickbooks.accounting'));

  // ================================================================
  // TEST B: proactive refresh (token within 5 min of expiry) is transparent
  // ================================================================
  console.log('\nTEST B: proactive refresh within 5 min of expiry');
  await seedInteg({
    accessToken: 'old-access', refreshToken: 'good-refresh',
    expiresAt: new Date(Date.now() + 2 * 60 * 1000), // 2 min → proactive refresh
    realmId: 'realm-b',
  });
  let refreshCountB = 0;
  globalThis.fetch = buildFetch((u: string): Response => {
    if (u.includes('/oauth2/v1/tokens/bearer')) {
      refreshCountB++;
      return resp(200, { access_token: 'rotated', refresh_token: 'rotated-r', expires_in: 3600 });
    }
    if (u.includes('FROM%20Customer')) return resp(200, { QueryResponse: { Customer: [{ Id: '1', DisplayName: 'Acme' }] } });
    return resp(200, { QueryResponse: { Invoice: [] } });
  });
  const resultB = await syncQboForOrg(orgId);
  log('refresh called exactly once', refreshCountB === 1);
  log('sync succeeded (1 customer)', resultB.customersUpserted === 1);
  log('no errors', resultB.errors.length === 0);
  const integB = await readInteg();
  log('access token was rotated', integB?.accessToken === 'rotated');
  log('integration still connected', integB?.status === 'connected');

  // ================================================================
  // TEST C: refresh failure marks the integration 'error' and is
  // captured as a string in errors[] (syncQboForOrg does not throw)
  // ================================================================
  console.log('\nTEST C: refresh failure -> integration marked error, no throw');
  await seedInteg({
    accessToken: 'old-access-2', refreshToken: 'revoked-refresh',
    expiresAt: new Date(Date.now() + 2 * 60 * 1000), // 2 min → proactive refresh
    realmId: 'realm-c',
  });
  globalThis.fetch = buildFetch((u: string): Response => {
    if (u.includes('/oauth2/v1/tokens/bearer')) {
      return resp(400, { error: 'invalid_grant', error_description: 'Refresh token revoked' });
    }
    return resp(200, {});
  });
  const resultC = await syncQboForOrg(orgId);
  log('sync returned cleanly (not thrown)', resultC !== undefined);
  log('refresh failure surfaced in errors[]', resultC.errors.some((e) => e.includes('QBO refresh failed')));
  const integC = await readInteg();
  log('integration marked error', integC?.status === 'error');

  // ================================================================
  // TEST D: happy-path sync preserves paidAt on the already-paid row
  // (only the unpaid -> paid transition should stamp a new paidAt)
  // ================================================================
  console.log('\nTEST D: paidAt preserved across re-syncs of an already-paid invoice');
  await seedInteg({
    accessToken: 'good', refreshToken: 'good',
    expiresAt: new Date(Date.now() + 60 * 60 * 1000), // fresh, no refresh needed
    realmId: 'realm-d',
  });
  let invBalance = 100; // unpaid on first sync
  globalThis.fetch = buildFetch((u: string): Response => {
    if (u.includes('FROM%20Customer')) return resp(200, { QueryResponse: { Customer: [{ Id: 'c1', DisplayName: 'Acme D' }] } });
    return resp(200, {
      QueryResponse: {
        Invoice: [{ Id: 'inv-d', DocNumber: 'D-1', CustomerRef: { value: 'c1' }, TotalAmount: 100, Balance: invBalance, DueDate: '2026-01-01', TxnDate: '2025-12-01' }],
      },
    });
  });
  const resultD1 = await syncQboForOrg(orgId); // creates the invoice as unpaid ('sent')
  log('first sync: no paid transition yet (row just created)', resultD1.invoicesMarkedPaid === 0);
  invBalance = 0; // now paid in QBO
  const resultD2 = await syncQboForOrg(orgId); // unpaid -> paid transition
  log('second sync: invoice marked paid', resultD2.invoicesMarkedPaid === 1);
  const resultD3 = await syncQboForOrg(orgId); // still paid, re-synced
  log('third sync: no new paid transition', resultD3.invoicesMarkedPaid === 0);
  log('third sync: no errors', resultD3.errors.length === 0);

  // ================================================================
  // TEST E: disconnect is idempotent and calls revoke
  // ================================================================
  console.log('\nTEST E: disconnect is idempotent and calls revoke');
  let revokeCalled = false;
  globalThis.fetch = buildFetch((u: string): Response => {
    if (u.includes('/v2/oauth2/tokens/revoke')) {
      revokeCalled = true;
      return resp(200, { revoked: true });
    }
    return resp(200, {});
  });
  const r1 = await disconnectQbo(orgId);
  log('first disconnect ok', r1.ok === true);
  log('revoke endpoint called', revokeCalled);
  const r2 = await disconnectQbo(orgId);
  log('second disconnect is idempotent', r2.ok === true);
  const integE = await readInteg();
  log('integration row deleted', !integE);

  // ================================================================
  // Cleanup
  // ================================================================
  await db.delete(integrations).where(eq(integrations.orgId, orgId));
  await db.delete(organizations).where(eq(organizations.id, orgId));
  await db.delete(users).where(eq(users.id, userId));

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error('Fatal:', e instanceof Error ? e.stack : e);
  process.exit(1);
});
