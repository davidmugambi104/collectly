import { AppShell } from '@/components/app/shell';
import { getAuth } from '@/lib/auth-helper';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/db';
import { dunningSequences } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { ensureDunningControlSchema } from '@/lib/dunning-control-schema';
import { isDefaultSequence, loadSenderContext } from '@/lib/dunning/org-settings';
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
  await ensureDunningControlSchema();
  const [seq] = await db.select().from(dunningSequences).where(and(eq(dunningSequences.orgId, orgId), isDefaultSequence)).limit(1);

  return (
    <AppShell title="Dunning sequence" subtitle="Edit each step's timing, channel, and tone.">
      {seq ? (
        <SequenceEditor initialSteps={seq.steps ?? []} sequenceId={seq.id} sender={await loadSenderContext(orgId)} />
      ) : (
        <div className="card text-center py-10">
          <p>You do not have a reminder schedule yet.</p>
          <p className="app-meta mt-1 font-normal">Pick a starter schedule on the Dunning page. Mugavi drafts your first reminders from it, and then you can edit every step here.</p>
          <Link href="/dashboard/dunning" className="btn-primary btn-sm mt-4 inline-flex">Choose a starter schedule</Link>
        </div>
      )}
    </AppShell>
  );
}
