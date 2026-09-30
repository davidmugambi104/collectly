import { NextResponse } from 'next/server';
import { getAuth } from '@/lib/auth-helper';
import { db } from '@/db';
import { dunningSenderDomains } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { recordEvent } from '@/lib/events';
import { getResend } from '@/lib/infra';
import { ensureBootstrapped } from '@/lib/bootstrap-db';
import { ensureDunningControlSchema } from '@/lib/dunning-control-schema';
import { mapProviderStatus, normalizeRecords } from '@/lib/email-domain';

/**
 * Ask the mail provider to re-check the customer's DNS records, then store what
 * it reports. DNS can take minutes to hours to propagate, so "still pending" is
 * a normal answer, not an error.
 */
export async function POST() {
  await ensureBootstrapped();
  await ensureDunningControlSchema();
  const { orgId, userId } = await getAuth();
  if (!orgId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: 'Email sending is not configured on this server.' }, { status: 503 });
  }

  const [row] = await db.select().from(dunningSenderDomains).where(eq(dunningSenderDomains.orgId, orgId)).limit(1);
  if (!row) return NextResponse.json({ error: 'No domain to verify.' }, { status: 404 });

  const resend = getResend();
  await resend.domains.verify(row.providerDomainId); // starts a check; the answer comes from get()
  const { data, error } = await resend.domains.get(row.providerDomainId);
  if (error || !data) {
    return NextResponse.json({ error: `Could not read the verification result: ${error?.message ?? 'unknown error'}` }, { status: 502 });
  }

  const status = mapProviderStatus(data.status);
  const records = normalizeRecords((data as { records?: unknown }).records);
  const now = new Date();
  await db
    .update(dunningSenderDomains)
    .set({
      status,
      records: records.length ? records : row.records,
      verifiedAt: status === 'verified' ? (row.verifiedAt ?? now) : null,
      updatedAt: now,
    })
    .where(eq(dunningSenderDomains.orgId, orgId));
  if (status === 'verified' && row.status !== 'verified') {
    await recordEvent({ orgId, type: 'dunning.domain.verified', actorId: userId ?? undefined, payload: { domain: row.domain } });
  }
  return NextResponse.json({ ok: true, status, records: records.length ? records : row.records });
}
