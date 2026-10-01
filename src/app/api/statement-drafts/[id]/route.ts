import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@/lib/auth-helper';
import { ensureBootstrapped } from '@/lib/bootstrap-db';
import { decideStatementDraft } from '@/lib/statement-drafts';
import { rateLimit } from '@/lib/rate-limit';

/** POST { action: 'approve' | 'skip' } on a drafted monthly statement. Approving is what sends it. Scoped to the caller's organisation. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await ensureBootstrapped();
  const { orgId, userId } = await getAuth();
  if (!orgId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  let action: unknown;
  try { action = (await req.json())?.action; } catch { /* handled below */ }
  if (action !== 'approve' && action !== 'skip') return NextResponse.json({ error: "action must be 'approve' or 'skip'" }, { status: 400 });
  if (action === 'approve') {
    const rl = await rateLimit(orgId, { max: 100, windowMs: 3_600_000, key: 'statement-approve' });
    if (!rl.allowed) return NextResponse.json({ error: 'You have approved a lot of statements this hour. Try again shortly.' }, { status: 429 });
  }
  const result = await decideStatementDraft({ orgId, userId: userId ?? null, draftId: id, action });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ ok: true });
}
