// Run: npx tsx scripts/selftest/token-encryption.ts
// The integrations token columns against an in-memory database: encrypted at rest, plain through the app,
// null columns fine, old plain rows still readable, the wrong key failing loudly.
process.env.USE_PGLITE = '1';
import { eq, sql } from 'drizzle-orm';

async function main() {
  const { db } = await import('@/db'); const { ensureBootstrapped } = await import('@/lib/bootstrap-db');
  const { organizations, integrations } = await import('@/db/schema');
  await ensureBootstrapped();
  const [org] = await db.select().from(organizations).limit(1);
  await db.delete(integrations).where(eq(integrations.orgId, org.id));
  const raw = async (id: string) => (await db.execute(sql`SELECT access_token, refresh_token FROM integrations WHERE id = ${id}`)).rows[0] as { access_token: string | null; refresh_token: string | null };

  // 1. No key: unchanged behaviour.
  delete process.env.INTEGRATION_TOKEN_KEY;
  const [a] = await db.insert(integrations).values({ orgId: org.id, provider: 'xero', status: 'connected', accessToken: 'plain-access', refreshToken: 'plain-refresh' }).returning();
  console.log('NO KEY  stored as plain:', (await raw(a.id)).access_token === 'plain-access');

  // 2. Key set: new write is encrypted, normal read is plain, the old plain row still reads.
  process.env.INTEGRATION_TOKEN_KEY = 'c'.repeat(64);
  const [b] = await db.insert(integrations).values({ orgId: org.id, provider: 'quickbooks', status: 'connected', accessToken: 'secret-access-AAA', refreshToken: null }).returning();
  const r = await raw(b.id);
  console.log('KEY SET stored encrypted:', r.access_token!.startsWith('enc:v1:') && !r.access_token!.includes('secret-access-AAA'), '| null column stays null:', r.refresh_token === null);
  const [bb] = await db.select().from(integrations).where(eq(integrations.id, b.id));
  console.log('KEY SET read back plain:', bb.accessToken === 'secret-access-AAA', '| null reads null:', bb.refreshToken === null);
  const [aa] = await db.select().from(integrations).where(eq(integrations.id, a.id));
  console.log('OLD ROW still reads:', aa.accessToken === 'plain-access' && aa.refreshToken === 'plain-refresh');

  // 3. An update re-encrypts an old plain row.
  await db.update(integrations).set({ accessToken: 'plain-access', refreshToken: 'plain-refresh-2' }).where(eq(integrations.id, a.id));
  const ra = await raw(a.id);
  console.log('OLD ROW encrypted after next write:', ra.access_token!.startsWith('enc:v1:') && ra.refresh_token!.startsWith('enc:v1:'));

  // 4. Wrong key fails loudly.
  process.env.INTEGRATION_TOKEN_KEY = 'd'.repeat(64);
  try { await db.select().from(integrations).where(eq(integrations.id, b.id)); console.log('WRONG KEY: did not fail (BAD)'); }
  catch (e) { console.log('WRONG KEY fails loudly:', /could not be decrypted/.test(String((e as Error).message) + String((e as { cause?: Error }).cause?.message))); }
  process.exit(0);
}
main().catch((e) => { console.error('FAILED', e); process.exit(1); });
