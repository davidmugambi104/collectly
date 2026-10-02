/** Re-save every stored integration token so it is written encrypted (needs INTEGRATION_TOKEN_KEY). Counts only, never a token. */
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { integrations } from '@/db/schema';

export async function reencryptAllTokens(): Promise<{ resaved: number; total: number }> {
  const rows = await db.select().from(integrations);
  let resaved = 0;
  for (const r of rows) {
    if (!r.accessToken && !r.refreshToken) continue;
    await db.update(integrations).set({ accessToken: r.accessToken, refreshToken: r.refreshToken }).where(eq(integrations.id, r.id));
    resaved++;
  }
  return { resaved, total: rows.length };
}
