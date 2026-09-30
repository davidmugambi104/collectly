export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import { AppShell } from '@/components/app/shell';
import { LateFeesPanel, type ProposalItem, type OwedItem } from '@/components/dunning/late-fees-panel';
import { getAuth as auth } from '@/lib/auth-helper';
import { ensureDunningControlSchema } from '@/lib/dunning-control-schema';
import { describePolicy } from '@/lib/late-fees';
import { loadOwedFees, loadPolicy, loadProposals } from '@/lib/late-fees-load';
import { formatMoney, formatStatementDate } from '@/lib/statements';

export default async function LateFeesPage() {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) redirect('/sign-in');
  await ensureDunningControlSchema();

  const now = new Date();
  const policy = await loadPolicy(orgId);
  const proposals = await loadProposals(orgId, now);
  const owed = await loadOwedFees(orgId);

  const proposalItems: ProposalItem[] = proposals.map((p) => ({
    key: `${p.invoiceId}:${p.period}`, invoiceId: p.invoiceId, period: p.period, invoiceNumber: p.invoiceNumber, customerName: p.customerName,
    daysLate: p.daysLate, amountCents: p.amountCents, amountLabel: formatMoney(p.amountCents, p.currency), currency: p.currency, reason: p.reason, capped: p.capped,
  }));
  const owedItems: OwedItem[] = owed.map((f) => ({
    id: f.id, invoiceNumber: f.invoiceNumber, customerName: f.customerName, customerId: f.customerId, period: f.period,
    amountLabel: formatMoney(f.amountCents, f.currency), appliedLabel: formatStatementDate(f.decidedAt),
  }));

  return (
    <AppShell title="Late fees" subtitle={describePolicy(policy)}>
      <LateFeesPanel policy={policy} proposals={proposalItems} owed={owedItems} />
    </AppShell>
  );
}
