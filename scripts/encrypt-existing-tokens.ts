// Run once, by the owner, after INTEGRATION_TOKEN_KEY is set in the environment:
//   INTEGRATION_TOKEN_KEY=... DATABASE_URL=... npx tsx scripts/encrypt-existing-tokens.ts
// Rewrites every stored integration token so it is saved encrypted. Safe to run twice: an encrypted value is
// not encrypted again. It prints counts only, never a token.
import { eq } from 'drizzle-orm';

async function main() {
  if (!process.env.INTEGRATION_TOKEN_KEY) { console.error('Set INTEGRATION_TOKEN_KEY first.'); process.exit(1); }
  const { db } = await import('@/db'); const { integrations } = await import('@/db/schema');
  const rows = await db.select().from(integrations);
  let n = 0;
  for (const r of rows) {
    if (!r.accessToken && !r.refreshToken) continue;
    await db.update(integrations).set({ accessToken: r.accessToken, refreshToken: r.refreshToken }).where(eq(integrations.id, r.id));
    n++;
  }
  console.log(`Re-saved ${n} of ${rows.length} integrations with encryption on.`);
  process.exit(0);
}
main().catch((e) => { console.error('FAILED', e instanceof Error ? e.message : e); process.exit(1); });
