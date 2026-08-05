import { AppShell } from '@/components/app/shell';
import { getAuth } from '@/lib/auth-helper';
import { redirect } from 'next/navigation';
import { db, schema } from '@/db';
import { dunningSequences } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { SequenceEditor } from '@/components/dunning/sequence-editor';

export const dynamic = 'force-dynamic';

export default async function DunningSequencesPage() {
  const { userId, orgId } = await getAuth();
  if (!userId) redirect('/sign-in');
  if (!orgId) redirect('/sign-in');

  // Was filtered to isActive=true — pausing dunning on the main page
  // (which only ever flips isActive, never deletes the row) made this
  // route claim "No active sequence... created automatically when you
  // turn on dunning" for an org that had a real sequence with real edited
  // steps, reachable from "View dunning sequence" on the customer page
  // and "Manage sequences" in the composer with no way back to it. The
  // main dunning page's own query has no such filter — matched here.
  const [seq] = await db.select().from(dunningSequences).where(eq(dunningSequences.orgId, orgId)).limit(1);

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
