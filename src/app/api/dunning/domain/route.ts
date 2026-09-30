import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@/lib/auth-helper';
import { db } from '@/db';
import { dunningSenderDomains } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { recordEvent } from '@/lib/events';
import { getResend } from '@/lib/infra';
import { ensureBootstrapped } from '@/lib/bootstrap-db';
import { ensureDunningControlSchema } from '@/lib/dunning-control-schema';
import { isBlockedDomain, mapProviderStatus, normalizeDomain, normalizeLocalPart, normalizeRecords } from '@/lib/email-domain';

/**
 * POST { domain, localPart? } registers a sending domain with the mail provider
 * and returns the DNS records the customer must add. Nothing is sent from it
 * until the provider reports it verified (see /verify).
 *
 * DELETE removes it and goes back to sending as "<Business> via Mugavi".
 */
export async function POST(req: NextRequest) {
  await ensureBootstrapped();
  await ensureDunningControlSchema();
  const { orgId, userId } = await getAuth();
  if (!orgId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: 'Email sending is not configured on this server.' }, { status: 503 });
  }

  let input: Record<string, unknown> = {};
  try {
    const parsed = await req.json();
    if (parsed && typeof parsed === 'object') input = parsed as Record<string, unknown>;
  } catch { /* handled below */ }

  const domain = normalizeDomain(input.domain);
  if (!domain) return NextResponse.json({ error: 'Enter a domain you own, like yourcompany.com.' }, { status: 400 });
  if (isBlockedDomain(domain)) {
    return NextResponse.json({ error: 'You can only send from a domain you control. Free mailbox domains like gmail.com are not allowed.' }, { status: 400 });
  }
  const localPart = normalizeLocalPart(input.localPart);
  if (!localPart) return NextResponse.json({ error: 'That address name is not allowed. Try billing or accounts.' }, { status: 400 });

  const [existing] = await db.select({ domain: dunningSenderDomains.domain }).from(dunningSenderDomains).where(eq(dunningSenderDomains.orgId, orgId)).limit(1);
  if (existing) {
    return NextResponse.json({ error: `You already have ${existing.domain} set up. Remove it first to use a different domain.` }, { status: 409 });
  }
  const [taken] = await db.select({ orgId: dunningSenderDomains.orgId }).from(dunningSenderDomains).where(eq(dunningSenderDomains.domain, domain)).limit(1);
  if (taken) return NextResponse.json({ error: 'That domain is already connected to another account.' }, { status: 409 });

  const { data, error } = await getResend().domains.create({ name: domain });
  if (error || !data) {
    return NextResponse.json({ error: `The mail provider refused the domain: ${error?.message ?? 'unknown error'}` }, { status: 502 });
  }

  const records = normalizeRecords(data.records);
  const now = new Date();
  try {
    await db.insert(dunningSenderDomains).values({
      orgId, domain, localPart, providerDomainId: data.id, status: mapProviderStatus(data.status), records, createdAt: now, updatedAt: now,
    });
  } catch (e) {
    // We could not save it, so do not leave an orphan registered with the provider.
    await getResend().domains.remove(data.id).catch(() => undefined);
    console.error('[sender-domain] save failed:', e instanceof Error ? e.message : e);
    return NextResponse.json({ error: 'Could not save the domain. Try again.' }, { status: 500 });
  }
  await recordEvent({ orgId, type: 'dunning.domain.added', actorId: userId ?? undefined, payload: { domain } });
  return NextResponse.json({ ok: true, domain, localPart, status: mapProviderStatus(data.status), records });
}

export async function DELETE() {
  await ensureBootstrapped();
  await ensureDunningControlSchema();
  const { orgId, userId } = await getAuth();
  if (!orgId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const [row] = await db.select().from(dunningSenderDomains).where(eq(dunningSenderDomains.orgId, orgId)).limit(1);
  if (!row) return NextResponse.json({ ok: true });

  // Best effort at the provider; the local row is what decides what we send from.
  if (process.env.RESEND_API_KEY) await getResend().domains.remove(row.providerDomainId).catch(() => undefined);
  await db.delete(dunningSenderDomains).where(eq(dunningSenderDomains.orgId, orgId));
  await recordEvent({ orgId, type: 'dunning.domain.removed', actorId: userId ?? undefined, payload: { domain: row.domain } });
  return NextResponse.json({ ok: true });
}
