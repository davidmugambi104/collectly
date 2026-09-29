import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@/lib/auth-helper';
import { ensureBootstrapped } from '@/lib/bootstrap-db';
import { approveRun, skipRun } from '@/lib/dunning/deliver';

/**
 * POST { action: 'approve', subject?, body? } sends the drafted reminder, with
 * any edits. POST { action: 'skip' } discards it. Scoped to the caller's org.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ runId: string }> }) {
  await ensureBootstrapped();
  const { orgId, userId } = await getAuth();
  if (!orgId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { runId } = await params;
  let input: Record<string, unknown> = {};
  try {
    const parsed = await req.json();
    if (parsed && typeof parsed === 'object') input = parsed as Record<string, unknown>;
  } catch { /* fall through to the action check */ }

  if (input.action !== 'approve' && input.action !== 'skip') {
    return NextResponse.json({ error: "action must be 'approve' or 'skip'" }, { status: 400 });
  }

  const actorId = userId ?? undefined;
  const result = input.action === 'skip'
    ? await skipRun({ orgId, runId, actorId })
    : await approveRun({
        orgId, runId, actorId,
        edits: {
          subject: typeof input.subject === 'string' ? input.subject : undefined,
          body: typeof input.body === 'string' ? input.body : undefined,
        },
      });

  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ ok: true, status: result.status });
}
