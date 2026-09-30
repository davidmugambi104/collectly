/**
 * The database half of late fees. The rules are in late-fees.ts. Callers run
 * ensureDunningControlSchema first (the tables create themselves).
 *
 * Applying never trusts the browser: the caller names which proposals it wants,
 * and the amounts are recomputed here, inside a transaction that locks the
 * invoices, so two tabs cannot push a fee past its cap.
 */
import { and, asc, eq, inArray, sql } from 'drizzle-orm';
import { db } from '@/db';
import { customers, invoices, lateFeePolicy, lateFees, promisesToPay } from '@/db/schema';
import { DEFAULT_POLICY, FEE_ELIGIBLE_STATUSES, proposeFees, type DecidedFee, type FeePolicy, type ProposedFee } from '@/lib/late-fees';

type Exec = typeof db;

export async function loadPolicy(orgId: string, exec: Exec = db): Promise<FeePolicy> {
  const [row] = await exec.select().from(lateFeePolicy).where(eq(lateFeePolicy.orgId, orgId)).limit(1);
  if (!row) return DEFAULT_POLICY;
  return {
    enabled: row.enabled,
    kind: row.kind === 'flat' ? 'flat' : 'percent',
    value: Number(row.value),
    currency: row.currency,
    graceDays: Number(row.graceDays),
    repeatMonthly: row.repeatMonthly,
    capPercent: row.capPercent === null ? null : Number(row.capPercent),
  };
}

export type ProposalRow = ProposedFee & { customerId: string; customerName: string };

/**
 * Fees that are due under the policy and not yet decided. An invoice with an
 * active promise to pay is left alone until the promised date passes, like
 * reminders are. A disputed invoice is never proposed (see late-fees.ts).
 */
export async function loadProposals(orgId: string, asOf: Date, exec: Exec = db, only?: string[]): Promise<ProposalRow[]> {
  const policy = await loadPolicy(orgId, exec);
  if (!policy.enabled) return [];
  const rows = await exec
    .select({ invoice: invoices, customerId: customers.id, customerName: customers.name })
    .from(invoices)
    .innerJoin(customers, eq(customers.id, invoices.customerId))
    .where(and(
      eq(invoices.orgId, orgId),
      inArray(invoices.status, [...FEE_ELIGIBLE_STATUSES] as Array<'sent' | 'viewed' | 'overdue' | 'partial'>),
      only ? inArray(invoices.id, only) : sql`TRUE`,
      sql`NOT EXISTS (
        SELECT 1 FROM ${promisesToPay}
        WHERE ${promisesToPay.invoiceId} = ${invoices.id}
          AND ${promisesToPay.status} = 'active'
          AND ${promisesToPay.promisedDate} >= ${asOf}
      )`,
    ))
    .limit(5000);
  if (rows.length === 0) return [];
  const ids = rows.map((r: (typeof rows)[number]) => r.invoice.id);
  const decidedRows = await exec.select().from(lateFees).where(and(eq(lateFees.orgId, orgId), inArray(lateFees.invoiceId, ids)));
  const decided: DecidedFee[] = decidedRows.map((d: (typeof decidedRows)[number]) => ({
    invoiceId: d.invoiceId, period: Number(d.period), amountCents: Math.round(Number(d.amount) * 100), status: d.status as DecidedFee['status'],
  }));
  const who = new Map<string, { customerId: string; customerName: string }>(rows.map((r: (typeof rows)[number]) => [r.invoice.id, { customerId: r.customerId, customerName: r.customerName }]));
  return proposeFees(policy, rows.map((r: (typeof rows)[number]) => r.invoice), decided, asOf).map((p) => ({ ...p, ...who.get(p.invoiceId)! }));
}

export type Selection = { invoiceId: string; period: number };

/**
 * Record the chosen proposals as 'applied' (owed) or 'waived' (decided against).
 * Returns how many were recorded. A selection that is no longer a valid proposal
 * (paid since, cap reached, already decided) is skipped, never forced through.
 */
export async function decideFees(orgId: string, userId: string | null, selections: Selection[], as: 'applied' | 'waived', asOf: Date = new Date()): Promise<{ recorded: number; skipped: number }> {
  const invoiceIds = [...new Set(selections.map((s) => s.invoiceId))];
  if (invoiceIds.length === 0) return { recorded: 0, skipped: 0 };
  return db.transaction(async (tx: Exec) => {
    // Lock the invoices so a second tab waits, then sees what this one decided.
    await tx.execute(sql`SELECT id FROM ${invoices} WHERE ${inArray(invoices.id, invoiceIds)} AND ${invoices.orgId} = ${orgId} FOR UPDATE`);
    const proposals = await loadProposals(orgId, asOf, tx, invoiceIds);
    const wanted = new Set(selections.map((s) => `${s.invoiceId}:${s.period}`));
    let recorded = 0;
    for (const p of proposals) {
      if (!wanted.has(`${p.invoiceId}:${p.period}`)) continue;
      const inserted = await tx.insert(lateFees).values({
        orgId, invoiceId: p.invoiceId, period: p.period, amount: (p.amountCents / 100).toFixed(2), currency: p.currency, status: as, decidedBy: userId,
      }).onConflictDoNothing({ target: [lateFees.invoiceId, lateFees.period] }).returning({ id: lateFees.id });
      recorded += inserted.length;
    }
    return { recorded, skipped: wanted.size - recorded };
  });
}

/** Move an applied fee to 'waived' or 'paid'. Only an applied fee in this organisation; returns false otherwise. */
export async function resolveFee(orgId: string, feeId: string, to: 'waived' | 'paid'): Promise<boolean> {
  const done = await db.update(lateFees).set({ status: to, resolvedAt: new Date() })
    .where(and(eq(lateFees.id, feeId), eq(lateFees.orgId, orgId), eq(lateFees.status, 'applied')))
    .returning({ id: lateFees.id });
  return done.length > 0;
}

export type OwedFee = { id: string; invoiceId: string; invoiceNumber: string; customerId: string; customerName: string; amountCents: number; currency: string; period: number; decidedAt: Date };

/** Fees applied and not yet settled or waived, for one customer (statements and reminders) or the whole org. */
export async function loadOwedFees(orgId: string, customerId?: string): Promise<OwedFee[]> {
  const rows = await db
    .select({ fee: lateFees, number: invoices.number, customerId: invoices.customerId, customerName: customers.name })
    .from(lateFees)
    .innerJoin(invoices, eq(invoices.id, lateFees.invoiceId))
    .innerJoin(customers, eq(customers.id, invoices.customerId))
    .where(and(eq(lateFees.orgId, orgId), eq(lateFees.status, 'applied'), customerId ? eq(invoices.customerId, customerId) : sql`TRUE`))
    .orderBy(asc(lateFees.decidedAt))
    .limit(1000);
  return rows.map((r: (typeof rows)[number]) => ({
    id: r.fee.id, invoiceId: r.fee.invoiceId, invoiceNumber: r.number, customerId: r.customerId, customerName: r.customerName,
    amountCents: Math.round(Number(r.fee.amount) * 100), currency: r.fee.currency, period: Number(r.fee.period), decidedAt: r.fee.decidedAt,
  }));
}
