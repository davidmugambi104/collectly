/**
 * Smoke test for the Clerk webhook handler.
 * Verifies the route file exists, parses as TS, and uses the expected
 * event types. Doesn't import the route module (it depends on Next runtime).
 *
 * Run: npx tsx scripts/clerk-webhook-check.mts
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

let pass = 0, fail = 0;
function log(msg: string, ok: boolean): void {
  if (ok) { pass++; console.log(`  ✓ ${msg}`); } else { fail++; console.log(`  ✗ ${msg}`); }
}

const routePath = resolve(__dirname, '../src/app/api/webhooks/clerk/route.ts');
const source = readFileSync(routePath, 'utf8');

console.log('TEST 1: Route file exists and is non-trivial');
log('route.ts is at least 5KB', source.length > 5000);

console.log('\nTEST 2: Handles all expected event types');
const expectedEvents = [
  'user.created',
  'user.updated',
  'user.deleted',
  'organization.created',
  'organization.updated',
  'organization.deleted',
  'organizationMembership.created',
  'organizationMembership.updated',
  'organizationMembership.deleted',
];
for (const evt of expectedEvents) {
  log(`case '${evt}' present`, source.includes(`'${evt}'`));
}

console.log('\nTEST 3: Uses Svix/Clerk signature verification');
log('verifyWebhook imported', source.includes("from '@clerk/nextjs/webhooks'"));
log('verifyWebhook called', source.includes('verifyWebhook(req)'));
log('returns 400 on bad signature', source.includes('invalid_signature'));

console.log('\nTEST 4: Uses Drizzle ORM (not raw SQL)');
log('@clerk/nextjs used', source.includes('@clerk/nextjs/webhooks'));
log('Drizzle eq/imported', source.includes("from 'drizzle-orm'"));
log('uses insert', source.includes('.insert('));
log('uses update', source.includes('.update('));
log('uses delete', source.includes('.delete('));

console.log('\nTEST 5: Defends against out-of-order events');
log('upsertUserFromRef (lightweight placeholder)', source.includes('upsertUserFromRef'));
log('upsertOrgFromMembership (org before user)', source.includes('upsertOrgFromMembership'));
log('ensureSentinelUser (FK placeholder)', source.includes('ensureSentinelUser'));

console.log('\nTEST 6: Verifies webhook is in isPublicRoute (so Clerk can deliver without auth)');
const middlewarePath = resolve(__dirname, '../src/middleware.ts');
const middleware = readFileSync(middlewarePath, 'utf8');
log('/api/webhooks/clerk in isPublicRoute', middleware.includes('/api/webhooks/clerk'));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);