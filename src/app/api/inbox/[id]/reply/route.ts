import { NextRequest, NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { getAuth } from '@/lib/auth-helper';
import { db } from '@/db';
import { customers, inboxMessages, inboxReplies, organizations } from '@/db/schema';
import { ensureBootstrapped } from '@/lib/bootstrap-db';
import { ensureDunningControlSchema } from '@/lib/dunning-control-schema';
import { sendEmail, withUnsubscribeFooter, dunningListUnsubscribeHeaders, getDunningReplyToAddress } from '@/lib/infra';
import { resolveFrom } from '@/lib/dunning/org-settings';
import { rateLimit } from '@/lib/rate-limit';
import { recordEvent } from '@/lib/events';
import { cleanReplyBody, renderReplyHtml, replySubject, replyTarget } from '@/lib/inbox-reply';
import { errorMessage } from '@/lib/utils';
import { recordUsage } from '@/lib/usage-meter';

/**
 * POST { body } writes back to the customer who sent this message.
 *
 * Goes to the address they wrote from, from the org's own sending address, with
 * the dunning reply address as Reply-To so their answer lands back in the Inbox.
 * Refuses unsubscribed customers. If email is not configured nothing is sent and
 * nothing is recorded. A reply is only stored after the send succeeded.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await ensureBootstrapped();
  await ensureDunningControlSchema();
  const { orgId, userId } = await getAuth();
  if (!orgId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;

  const rl = await rateLimit(orgId, { max: 40, windowMs: 3_600_000, key: 'inbox-reply' });
  if (!rl.allowed) return NextResponse.json({ error: 'You have sent a lot of replies this hour. Try again shortly.' }, { status: 429 });

  let input: Record<string, unknown> = {};
  try { const p = await req.json(); if (p && typeof p === 'object') input = p as Record<string, unknown>; } catch { /* handled below */ }
  const body = cleanReplyBody(input.body);
  if (!body) return NextResponse.json({ error: 'Write a message first.' }, { status: 400 });

  const [message] = await db.select().from(inboxMessages).where(and(eq(inboxMessages.id, id), eq(inboxMessages.orgId, orgId))).limit(1);
  if (!message) return NextResponse.json({ error: 'not found' }, { status: 404 });
  if (message.channel !== 'email' && message.channel !== 'portal') return NextResponse.json({ error: 'Only email replies can be answered from here.' }, { status: 400 });

  const [customer] = message.customerId
    ? await db.select({ email: customers.email, dndAt: customers.dndAt }).from(customers).where(and(eq(customers.id, message.customerId), eq(customers.orgId, orgId))).limit(1)
    : [];
  const target = replyTarget({ fromAddress: message.fromAddress, customerEmail: customer?.email ?? null, unsubscribedAt: customer?.dndAt ?? null });
  if (!target.ok) return NextResponse.json({ error: target.reason }, { status: 409 });

  const [org] = await db.select({ name: organizations.name }).from(organizations).where(eq(organizations.id, orgId)).limit(1);
  const subject = replySubject(message.subject);
  const html = withUnsubscribeFooter(
    renderReplyHtml({ body, quotedFrom: message.fromName || message.fromAddress, quoted: message.body }),
    target.to,
  );

  let externalId: string | null = null;
  try {
    const sent = await sendEmail({
      to: target.to,
      subject,
      html,
      headers: dunningListUnsubscribeHeaders(target.to),
      from: await resolveFrom(orgId, org?.name),
      replyTo: getDunningReplyToAddress(),
    });
    if (sent.status === 'skipped') return NextResponse.json({ error: 'Email is not set up on this server, so nothing was sent.' }, { status: 502 });
    externalId = sent.id ?? null;
    await recordUsage({ orgId, kind: 'inbox_reply_email' });
  } catch (e: unknown) {
    return NextResponse.json({ error: `Could not send: ${errorMessage(e)}` }, { status: 502 });
  }

  await db.insert(inboxReplies).values({ orgId, messageId: id, toAddress: target.to, subject, body, sentBy: userId ?? null, externalId });
  if (message.status === 'new') {
    await db.update(inboxMessages).set({ status: 'handled', actionTaken: 'Replied', actionTakenAt: new Date(), actionTakenBy: userId ?? null }).where(eq(inboxMessages.id, id));
  }
  await recordEvent({ orgId, type: 'inbox.reply.sent', actorId: userId ?? undefined, payload: { messageId: id } });
  return NextResponse.json({ ok: true });
}
