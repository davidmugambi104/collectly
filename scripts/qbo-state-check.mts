/**
 * Smoke test for the OAuth state store. Mocks globalThis.fetch to
 * intercept Upstash REST calls so we exercise the full server-side
 * binding path end-to-end.
 *
 * Run: npx tsx scripts/qbo-state-check.mts
 */

process.env.USE_PGLITE = '1';
process.env.QBO_CLIENT_ID = 'test';
process.env.QBO_CLIENT_SECRET = '***';
process.env.QBO_REDIRECT_URI = 'https://test.local/api/quickbooks/callback';
process.env.NEXT_PUBLIC_APP_URL = 'https://test.local';
process.env.OAUTH_STATE_SECRET = 'test-secret-for-state-checking-only';
process.env.UPSTASH_REDIS_REST_URL = 'https://stub.upstash.io';
process.env.UPSTASH_REDIS_REST_TOKEN = 'stub-token';

import { randomUUID } from 'node:crypto';

// In-memory Upstash REST store. Intercept all fetches to upstash domains.
const _store = new Map<string, { value: string; expiresAt: number }>();

type UpstashCmd = [op: string, key?: string, value?: string, opts?: { ex?: number }];

const realFetch = globalThis.fetch;
globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
  if (url.includes('upstash.io')) {
    let body: unknown = {};
    try { body = JSON.parse((init?.body as string) ?? '{}'); } catch {}
    if (Array.isArray(body)) {
      // Upstash pipeline format: array of commands [ ["SET", k, v, {ex:t}], ["GET", k], ... ]
      const results: unknown[] = [];
      for (const cmd of body as UpstashCmd[]) {
        const op = String(cmd[0]).toUpperCase();
        if (op === 'SET') {
          const key = cmd[1]!;
          const value = String(cmd[2] ?? '');
          const ex = cmd[3]?.ex;
          _store.set(key, { value, expiresAt: ex ? Date.now() + ex * 1000 : Infinity });
          results.push('OK');
        } else if (op === 'GET') {
          const key = cmd[1]!;
          const e = _store.get(key);
          if (!e || e.expiresAt < Date.now()) { _store.delete(key); results.push(null); }
          else results.push(e.value);
        } else if (op === 'DEL') {
          results.push(_store.delete(cmd[1]!) ? 1 : 0);
        } else {
          results.push(null);
        }
      }
      return new Response(JSON.stringify(results.map(r => ({ result: r }))), { status: 200 });
    }
    return new Response('{"result":null}', { status: 200 });
  }
  return realFetch(input, init);
}) as typeof fetch;

async function main(): Promise<void> {
  const oauthState: typeof import('../src/lib/oauth-state.ts') = await import('../src/lib/oauth-state.ts');
  const { mintOAuthState, consumeOAuthState } = oauthState;

  let pass = 0, fail = 0;
  function log(msg: string, ok: boolean): void {
    if (ok) { pass++; console.log(`  ✓ ${msg}`); } else { fail++; console.log(`  ✗ ${msg}`); }
  }

  const userId = 'u_' + randomUUID().slice(0, 6);
  const orgId = 'o_' + randomUUID().slice(0, 6);

  console.log('\nTEST 1: state is random, not the orgId');
  const nonce1 = await mintOAuthState(orgId, userId, 'quickbooks');
  log('nonce is not orgId', nonce1 !== orgId);
  log('nonce is base64url', /^[A-Za-z0-9_-]+$/.test(nonce1));
  log('nonce has at least 32 bytes of entropy', nonce1.length >= 43);

  console.log('\nTEST 2: two mints produce different nonces');
  const nonce2 = await mintOAuthState(orgId, userId, 'quickbooks');
  log('nonces are unique', nonce1 !== nonce2);

  console.log('\nTEST 3: malformed nonce rejected');
  const c3 = await consumeOAuthState('', { orgId, userId }, 'quickbooks');
  log('empty nonce rejected', c3.ok === false && c3.reason === 'malformed');
  const c4 = await consumeOAuthState('short', { orgId, userId }, 'quickbooks');
  log('too-short nonce rejected', c4.ok === false && c4.reason === 'malformed');

  console.log('\nTEST 5: state is single-use (Redis row deleted on consume)');
  const ok = await consumeOAuthState(nonce2, { orgId, userId }, 'quickbooks');
  log('first consume succeeds', ok.ok === true);
  const ok2 = await consumeOAuthState(nonce2, { orgId, userId }, 'quickbooks');
  log('second consume fails (replay rejected)', ok2.ok === false);

  console.log('\nTEST 4b: wrong userId on fresh nonce rejected as mismatch');
  // Use a fresh nonce since nonce1 was consumed by the previous TEST 4 case.
  const freshNonce = await mintOAuthState(orgId, userId, 'quickbooks');
  const c7b = await consumeOAuthState(freshNonce, { orgId, userId: 'different-user' }, 'quickbooks');
  log('wrong userId rejected as mismatch', c7b.ok === false && c7b.reason === 'mismatch');

  console.log('\nTEST 6: bound orgId/userId returned on success');
  const ok3 = await consumeOAuthState(
    await mintOAuthState('org_xyz_999', 'user_abc_999', 'quickbooks'),
    { orgId: 'org_xyz_999', userId: 'user_abc_999' },
    'quickbooks',
  );
  log('consume returns bound orgId', ok3.ok === true && ok3.orgId === 'org_xyz_999');
  log('consume returns bound userId', ok3.ok === true && ok3.userId === 'user_abc_999');

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((e) => { console.error('Fatal:', e?.stack ?? e); process.exit(1); });
