/**
 * Email a customer their statement, built from their invoices at this moment.
 * Shared by the Send button on the statement page and by approving a scheduled
 * statement draft, so both do exactly the same checks and the same send.
 */
import { and, eq } from 'drizzle-orm';
import { db } from '@/db';
import { customers, organizations, statementLog } from '@/db/schema';
import { sendEmail, withUnsubscribeFooter, dunningListUnsubscribeHeaders, getDunningReplyToAddress } from '@/lib/infra';
import { resolveFrom } from '@/lib/dunning/org-settings';
import { recordEvent } from '@/lib/events';
import { errorMessage } from '@/lib/utils';
import { loadStatement, loadStatementFooter } from '@/lib/statements-load';
import { renderStatementHtml, statementSubject } from '@/lib/statements';
import { statementTarget } from '@/lib/statement-target';
import { sendCopies } from '@/lib/recipients-send';

export type SendStatementResult = { ok: true } | { ok: false; status: number; error: string };

export async function sendStatementEmail(o: { orgId: string; userId: string | null; customerId: string; note?: string; scheduled?: boolean }): Promise<SendStatementResult> {
  const { orgId, customerId } = o;
  const [customer] = await db.select({ name: customers.name, email: customers.email, dndAt: customers.dndAt }).from(customers).where(and(eq(customers.id, customerId), eq(customers.orgId, orgId))).limit(1);
  if (!customer) return { ok: false, status: 404, error: 'not found' };
  const target = statementTarget({ email: customer.email, unsubscribedAt: customer.dndAt });
  if (!target.ok) return { ok: false, status: 409, error: target.reason };

  const statement = await loadStatement(orgId, customerId);
  if (statement.sections.length === 0) return { ok: false, status: 409, error: 'This customer owes nothing right now, so there is no statement to send.' };

  const [org] = await db.select({ name: organizations.name }).from(organizations).where(eq(organizations.id, orgId)).limit(1);
  const businessName = org?.name ?? 'Your team';
  const subject = statementSubject(businessName, statement.asOf);
  const baseHtml = renderStatementHtml({ customerName: customer.name, businessName, statement, note: o.note ?? '', footer: await loadStatementFooter(orgId) });
  const html = withUnsubscribeFooter(baseHtml, target.to);
  const fromLine = await resolveFrom(orgId, businessName);

  let externalId: string | null = null;
  try {
    const sent = await sendEmail({ to: target.to, subject, html, headers: dunningListUnsubscribeHeaders(target.to), from: fromLine, replyTo: getDunningReplyToAddress() });
    if (sent.status === 'skipped') return { ok: false, status: 502, error: 'Email is not set up on this server, so nothing was sent.' };
    externalId = sent.id ?? null;
  } catch (e: unknown) {
    return { ok: false, status: 502, error: `Could not send: ${errorMessage(e)}` };
  }

  // Extra recipients get their own copy. The statement is already sent; a copy that fails never undoes it.
  try { await sendCopies({ orgId, customerId, primaryEmail: target.to, subject, baseHtml, from: fromLine, replyTo: getDunningReplyToAddress() }); } catch (e) { console.error('[statement] copies failed:', errorMessage(e)); }
  const totals = statement.sections.map((s) => ({ currency: s.currency, totalCents: s.totalCents, overdueCents: s.overdueCents }));
  await db.insert(statementLog).values({ orgId, customerId, toAddress: target.to, subject, totals, sentBy: o.userId, externalId });
  await recordEvent({ orgId, type: 'statement.sent', actorId: o.userId ?? undefined, payload: { customerId, totals, scheduled: !!o.scheduled } });
  return { ok: true };
}
