import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@/lib/auth-helper';
import { db } from '@/db';
import { dunningRuns, invoices, customers } from '@/db/schema';
import { and, eq, desc } from 'drizzle-orm';
import { ensureBootstrapped } from '@/lib/bootstrap-db';
import { toCsv } from '@/lib/csv';

const STATUSES = ['scheduled', 'sent', 'delivered', 'opened', 'clicked', 'replied', 'paid', 'failed', 'cancelled'] as const;

/** GET ?status=... downloads the org's reminder history as CSV (newest first, up to 5,000 rows). */
export async function GET(req: NextRequest) {
  await ensureBootstrapped();
  const { orgId } = await getAuth();
  if (!orgId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const status = req.nextUrl.searchParams.get('status');
  const filter = status && (STATUSES as readonly string[]).includes(status) ? eq(dunningRuns.status, status as (typeof STATUSES)[number]) : undefined;

  const rows = await db
    .select({ run: dunningRuns, customer: customers.name, number: invoices.number })
    .from(dunningRuns)
    .innerJoin(invoices, eq(invoices.id, dunningRuns.invoiceId))
    .innerJoin(customers, eq(customers.id, invoices.customerId))
    .where(filter ? and(eq(dunningRuns.orgId, orgId), filter) : eq(dunningRuns.orgId, orgId))
    .orderBy(desc(dunningRuns.createdAt))
    .limit(5000);

  const csv = toCsv(
    ['Created', 'Customer', 'Invoice', 'Channel', 'Step', 'Status', 'Sent at', 'Subject', 'Error'],
    rows.map((r: (typeof rows)[number]) => [r.run.createdAt, r.customer, r.number, r.run.channel, r.run.stepId, r.run.status, r.run.sentAt, r.run.subject, r.run.error]),
  );
  return new NextResponse(csv, { headers: { 'content-type': 'text/csv; charset=utf-8', 'content-disposition': 'attachment; filename="reminder-history.csv"' } });
}
