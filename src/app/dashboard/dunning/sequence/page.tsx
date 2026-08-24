import { AppShell } from '@/components/app/shell';
import { getAuth } from '@/lib/auth-helper';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import { dunningSequences } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { SequenceEditor } from '@/components/dunning/sequence-editor';

export const dynamic = 'force-dynamic';

export default async function DunningSequencesPage() {
  const { userId, orgId } = await getAuth();
  if (!userId) redirect('/sign-in');
  if (!orgId) redirect('/sign-in');

  const [seq] = await db.select().from(dunningSequences).where(and(eq(dunningSequences.orgId, orgId), eq(dunningSequences.isActive, true))).limit(1);

  return (
    <AppShell title="Dunning sequence" subtitle="Edit each step's timing, channel, and tone.">
      {seq ? (
        <SequenceEditor initialSteps={(seq.steps ?? []) as any} sequenceId={seq.id} />
      ) : (
        <div className="card text-center py-10">No active sequence. The default sequence is created automatically when you turn on dunning.</div>
      )}
    </AppShell>
  );
}
