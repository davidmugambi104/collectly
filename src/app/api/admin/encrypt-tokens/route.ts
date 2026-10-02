import { NextResponse } from 'next/server';
import { requireAdminEmail } from '@/lib/auth-helper';
import { ensureBootstrapped } from '@/lib/bootstrap-db';
import { parseKey } from '@/lib/secret-box';
import { reencryptAllTokens } from '@/lib/integrations/reencrypt';

/** POST: encrypt every stored integration token. Admin allowlist only, and only when the key is set and valid. */
export async function POST() {
  await ensureBootstrapped();
  const admin = await requireAdminEmail();
  if (!admin.ok) return NextResponse.json({ error: 'not authorized' }, { status: 403 });
  try {
    if (!parseKey(process.env.INTEGRATION_TOKEN_KEY)) return NextResponse.json({ error: 'INTEGRATION_TOKEN_KEY is not set' }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'invalid key' }, { status: 400 });
  }
  return NextResponse.json({ ok: true, ...(await reencryptAllTokens()) });
}
