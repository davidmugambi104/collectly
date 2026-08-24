/**
 * Self-contained runtime test for QBO retry-once + reconnect behavior.
 * Uses dynamic imports inside main() so we don't trip tsx's ESM loader
 * with a long static import chain.
 * Run: npx tsx scripts/qbo-smoke.mts
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
  const qbo: any = await import('../src/lib/integrations/quickbooks.ts');
  const { db }: any = await import('../src/db/index.ts');
  const { integrations, users, organizations }: any = await import('../src/db/schema.ts');
  const { eq, and }: any = await import('drizzle-orm');
  const { ensureBootstrapped }: any = await import('../src/lib/bootstrap-db.ts');
  await ensureBootstrapped();

  const { QboAuthError, QboReconnectRequiredError, getQboReconnectUrl, qboAuthUrl, syncQboForOrg, disconnectQbo } = qbo;

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
  async function readInteg(): Promise<any> {
    const [row] = await db.select().from(integrations).where(
      and(eq(integrations.orgId, orgId), eq(integrations.provider, 'quickbooks')),
    );
    return row;
  }

  // Pluggable fetch mock — uses a closure-shared recorder.
  function buildFetch(handler: (url: string) => Response): typeof fetch {
    const fn = async (input: any): Promise<Response> => {
      const url = typeof input === 'string' ? input : input.url;
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
  // TEST B: error classes
  // ================================================================
  console.log('\nTEST B: error classes');
  const e1 = new QboAuthError('msg', 'invalid_grant');
  log('QboAuthError.code preserved', e1.code === 'invalid_grant');
  log('QboAuthError is Error', e1 instanceof Error);
  const e2 = new QboReconnectRequiredError('msg', 'detail');
  log('QboReconnectRequiredError.detail preserved', e2.detail === 'detail');
  log('QboReconnectRequiredError is Error', e2 instanceof Error);

  // ================================================================
  // TEST C: 401 retry-once on access-token expiry
  // ================================================================
  console.log('\nTEST C: 401 retry-once on access-token expiry');
  await seedInteg({
    accessToken: 'stale-access', refreshToken: 'good-refresh',
    expiresAt: new Date(Date.now() + 60 * 60 * 1000), realmId: 'realm-1',
  });
  let refreshCount = 0;
  let customers401Seen = false;
  globalThis.fetch = buildFetch((u: string): Response => {
    if (u.includes('/oauth2/v1/tokens/bearer')) {
      refreshCount++;
      return resp(200, { access_token: 'fresh', refresh_token: 'rotated', expires_in: 3600 });
    }
    if (!customers401Seen) {
      customers401Seen = true;
      return resp(401, { Fault: { type: 'AUTHENTICATION_ERROR', Error: [{ code: '3200', Message: 'Token expired' }] } });
    }
    return resp(200, { QueryResponse: { Customer: [{ Id: '1', DisplayName: 'Acme' }] } });
  });

  const resultC = await syncQboForOrg(orgId);
  log('refresh called exactly once', refreshCount === 1);
  log('sync succeeded (1 customer)', resultC.customersUpserted === 1);
  log('no reconnect required', !resultC.reconnectRequired);
  const integC = await readInteg();
  log('integration still connected', integC?.status === 'connected');
  log('access token was rotated', integC?.accessToken === 'fresh');

  // ================================================================
  // TEST D: invalid_grant from refresh → reconnect required
  // ================================================================
  console.log('\nTEST D: invalid_grant from refresh → reconnect required');
  customers401Seen = false;
  refreshCount = 0;
  await seedInteg({
    accessToken: 'stale-access-2', refreshToken: 'revoked-refresh',
    expiresAt: new Date(Date.now() + 60 * 60 * 1000), realmId: 'realm-2',
  });
  globalThis.fetch = buildFetch((u: string): Response => {
    if (u.includes('/oauth2/v1/tokens/bearer')) {
      refreshCount++;
      return resp(400, { error: 'invalid_grant', error_description: 'Refresh token revoked' });
    }
    if (!customers401Seen) {
      customers401Seen = true;
      return resp(401, { Fault: { type: 'AUTHENTICATION_ERROR', Error: [{ code: '3200' }] } });
    }
    return resp(200, {});
  });

  const resultD = await syncQboForOrg(orgId);
  log('returned reconnectRequired=true', resultD.reconnectRequired === true);
  log('returned reconnectUrl', typeof resultD.reconnectUrl === 'string' && resultD.reconnectUrl!.includes('/api/quickbooks/connect?orgId='));
  const integD = await readInteg();
  log('integration marked errored', integD?.status === 'error');

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
  // TEST F: proactive refresh (within 5 min of expiry) is transparent
  // ================================================================
  console.log('\nTEST F: proactive refresh within 5 min of expiry');
  await seedInteg({
    accessToken: 'old-access', refreshToken: 'good-refresh-3',
    expiresAt: new Date(Date.now() + 2 * 60 * 1000), // 2 min → proactive
    realmId: 'realm-3',
  });
  let refreshCountF = 0;
  globalThis.fetch = buildFetch((u: string): Response => {
    if (u.includes('/oauth2/v1/tokens/bearer')) {
      refreshCountF++;
      return resp(200, { access_token: 'rotated', refresh_token: 'rotated-r', expires_in: 3600 });
    }
    return resp(200, { QueryResponse: { Customer: [{ Id: '9', DisplayName: 'Pre' }] } });
  });
  const resultF = await syncQboForOrg(orgId);
  log('refresh called exactly once', refreshCountF === 1);
  log('no reconnect required', !resultF.reconnectRequired);

  // ================================================================
  // TEST G: 400 ValidationFault → QboQueryError, integration stays connected
  // ================================================================
  console.log('\nTEST G: 400 ValidationFault → QboQueryError');
  const { QboQueryError } = qbo as any;
  await seedInteg({
    accessToken: 'good', refreshToken: 'good',
    expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    realmId: 'realm-g',
  });
  globalThis.fetch = buildFetch((): Response => {
    return resp(400, {
      Fault: {
        type: 'ValidationFault',
        Error: [{ code: '6000', Message: 'Invalid query — field NotAField not found' }],
      },
    });
  });
  const resultG = await syncQboForOrg(orgId);
  log('sync completes gracefully (returns result, no throw)', resultG !== undefined);
  log('error pushed to errors[] with clean message', resultG.errors.some((e: string) => e.startsWith('customers: QuickBooks rejected the GET')));
  log('integration still marked connected', (await readInteg())?.status === 'connected');
  log('QboQueryError class exists', typeof QboQueryError === 'function');
  const qeG = new QboQueryError('test', 400, 'ValidationFault', '6000');
  log('QboQueryError carries faultType', qeG.faultType === 'ValidationFault');
  log('QboQueryError carries errorCode', qeG.errorCode === '6000');
  log('QboQueryError is an Error', qeG instanceof Error);

  // ================================================================
  // TEST H: 400 InvalidQuery → QboQueryError
  // ================================================================
  console.log('\nTEST H: 400 InvalidQuery → QboQueryError');
  await seedInteg({
    accessToken: 'good', refreshToken: 'good',
    expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    realmId: 'realm-h',
  });
  globalThis.fetch = buildFetch((): Response => {
    return resp(400, {
      Fault: {
        type: 'InvalidQuery',
        Error: [{ code: '4000', Message: 'Query syntax error near SELECT' }],
      },
    });
  });
  const resultH = await syncQboForOrg(orgId);
  log('InvalidQuery handled gracefully', resultH !== undefined);
  // Clean message means: no URL-encoded percent-sequences that come from a raw URL.
  log('error has clean message (no URL-encoded chars from raw URL)', resultH.errors.some((e: string) => e.includes('QuickBooks rejected') && !e.includes('%20')));
  log('integration still connected', (await readInteg())?.status === 'connected');

  // ================================================================
  // TEST I: 500 retry succeeds on second attempt
  // ================================================================
  console.log('\nTEST I: 500 → retry → 200');
  await seedInteg({
    accessToken: 'good', refreshToken: 'good',
    expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    realmId: 'realm-i',
  });
  let customerAttemptsI = 0;
  globalThis.fetch = buildFetch((u: string): Response => {
    if (u.includes('/oauth2/v1/tokens/bearer')) return resp(200, { access_token: 'a', refresh_token: 'r', expires_in: 3600 });
    // Only the Customer endpoint (ends with MAXRESULTS 1000, has Customer but not CustomerRef).
    if (u.includes('/query?') && u.includes('FROM%20Customer')) {
      customerAttemptsI++;
      if (customerAttemptsI === 1) {
        return resp(500, { Fault: { type: 'SystemFault', Error: [{ code: '3000', Message: 'Internal server error' }] } });
      }
      return resp(200, { QueryResponse: { Customer: [{ Id: '1', DisplayName: 'After500' }] } });
    }
    return resp(200, { QueryResponse: { Invoice: [] } });
  });
  const resultI = await syncQboForOrg(orgId);
  log('customer endpoint hit twice (initial + retry)', customerAttemptsI === 2);
  log('sync succeeded after retry', resultI.customersUpserted === 1);
  log('no reconnect required', !resultI.reconnectRequired);
  log('integration still connected', (await readInteg())?.status === 'connected');

  // ================================================================
  // TEST J: 503 with Retry-After: 2 → retries after ~2s, fails clean
  // ================================================================
  console.log('\nTEST J: 503 with Retry-After → typed QboServerError after retry');
  const { QboServerError } = qbo as any;
  await seedInteg({
    accessToken: 'good', refreshToken: 'good',
    expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    realmId: 'realm-j',
  });
  let customerAttemptsJ = 0;
  let observedWaitMs = 0;
  globalThis.fetch = buildFetch((u: string): Response => {
    if (u.includes('/oauth2/v1/tokens/bearer')) return resp(200, { access_token: 'a', refresh_token: 'r', expires_in: 3600 });
    if (u.includes('/query?') && u.includes('FROM%20Customer')) {
      customerAttemptsJ++;
      // Always return 503 with a short Retry-After — both the initial and the retry fail.
      return new Response(JSON.stringify({ Fault: { type: 'SystemFault', Error: [{ code: '3000', Message: 'Service unavailable' }] } }), {
        status: 503,
        headers: { 'Content-Type': 'application/json', 'Retry-After': '1' },
      });
    }
    return resp(200, { QueryResponse: { Invoice: [] } });
  });
  // Monkey-patch setTimeout for this test to capture the requested wait without actually sleeping.
  const realSetTimeout = globalThis.setTimeout;
  (globalThis as any).setTimeout = (cb: any, ms?: number) => { observedWaitMs = Math.max(observedWaitMs, ms ?? 0); return realSetTimeout(cb, 1); };
  const t0J = Date.now();
  const resultJ = await syncQboForOrg(orgId);
  const elapsedJ = Date.now() - t0J;
  (globalThis as any).setTimeout = realSetTimeout;
  log('customer endpoint hit twice (initial + retry)', customerAttemptsJ === 2);
  log('Retry-After honored (observed setTimeout with ~1000ms)', observedWaitMs >= 900 && observedWaitMs <= 1100);
  log('sync completed quickly (real elapsed < 200ms)', elapsedJ < 200);
  log('sync returned cleanly (not thrown)', resultJ !== undefined);
  log('error reflects QboServerError message', resultJ.errors.some((e: string) => e.includes('failed after retry') || e.includes('Service unavailable') || e.includes('503')));
  log('QboServerError class exists', typeof QboServerError === 'function');
  const se = new QboServerError('test', 503, 1000);
  log('QboServerError carries status', se.status === 503);
  log('QboServerError carries retryAfterMs', se.retryAfterMs === 1000);
  log('integration still connected (5xx is transient, not an auth issue)', (await readInteg())?.status === 'connected');

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
  console.error('Fatal:', e?.stack ?? e);
  process.exit(1);
});
