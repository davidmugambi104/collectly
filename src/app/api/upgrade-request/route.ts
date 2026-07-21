import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { rateLimit, getIp } from '@/lib/rate-limit';
import { db } from '@/db';
import { upgradeRequests, organizations } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { sendEmail } from '@/lib/infra';
import { PLAN_PRICING } from '@/lib/utils';

const body = z.object({
  orgId: z.string(),
  plan: z.enum(['starter', 'growth', 'scale', 'enterprise']),
  customerName: z.string().optional(),
  country: z.string().length(2).optional(),   // ISO 3166-1 alpha-2
  notes: z.string().max(2000).optional(),
});

/**
 * Capture an "I want to upgrade to plan X" request.
 *
 * Why this exists: Stripe isn't available for the Kenya-based founder
 * (Stripe doesn't operate in KE; Stripe Atlas path is 2-4 weeks).
 * For the soft-launch window, we record the request in the DB, email
 * Davie, and show the customer a "we'll be in touch within 1 business
 * day with a manual invoice" confirmation.
 *
 * When Stripe Atlas / Paddle / direct Stripe is wired, replace this
 * with a real checkout redirect.
 */
export async function POST(req: NextRequest) {
  const rl = rateLimit(getIp(req), { max: 5 });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please wait a minute.' },
      { status: 429, headers: { 'retry-after': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } },
    );
  }

  let data: z.infer<typeof body>;
  try {
    data = body.parse(await req.json());
  } catch (e: any) {
    return NextResponse.json({ error: `invalid request: ${e.message}` }, { status: 400 });
  }

  // Load org for the business name and billing email
  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, data.orgId))
    .limit(1);

  if (!org) {
    return NextResponse.json({ error: 'organization not found' }, { status: 404 });
  }

  const planInfo = PLAN_PRICING[data.plan];
  if (!planInfo) {
    return NextResponse.json({ error: 'invalid plan' }, { status: 400 });
  }

  const customerEmail = `${org.slug}@getcollectly.app`;

  // Record the request
  const [created] = await db
    .insert(upgradeRequests)
    .values({
      orgId: data.orgId,
      plan: data.plan,
      customerEmail,
      customerName: data.customerName ?? null,
      businessName: org.name,
      country: data.country ?? null,
      notes: data.notes ?? null,
      status: 'pending',
    })
    .returning();

  // Notify Davie (best-effort — don't fail the request if email fails)
  try {
    await sendEmail({
      to: process.env.LEAD_NOTIFY_EMAIL ?? 'davie@getcollectly.app',
      subject: `[Upgrade request] ${org.name} → ${planInfo.name} ($${planInfo.monthly}/mo)`,
      html: [
        `<p><strong>New upgrade request.</strong></p>`,
        `<table style="border-collapse:collapse">`,
        `<tr><td style="padding:4px 12px 4px 0"><strong>Org</strong></td><td>${org.name} (${org.slug})</td></tr>`,
        `<tr><td style="padding:4px 12px 4px 0"><strong>Plan</strong></td><td>${planInfo.name} ($${planInfo.monthly}/mo)</td></tr>`,
        `<tr><td style="padding:4px 12px 4px 0"><strong>Email</strong></td><td>${customerEmail}</td></tr>`,
        `<tr><td style="padding:4px 12px 4px 0"><strong>Contact</strong></td><td>${data.customerName ?? 'n/a'}</td></tr>`,
        `<tr><td style="padding:4px 12px 4px 0"><strong>Country</strong></td><td>${data.country ?? 'n/a'}</td></tr>`,
        `</table>`,
        `<p><strong>Notes from customer:</strong><br/>${(data.notes ?? '(none)').replace(/</g, '&lt;').replace(/\n/g, '<br/>')}</p>`,
        `<p style="color:#666;font-size:12px">Request ID: ${created.id} — review at <a href="${process.env.NEXT_PUBLIC_APP_URL ?? 'https://getcollectly.app'}/admin/upgrade-requests">/admin/upgrade-requests</a></p>`,
      ].join('\n'),
    });
  } catch (e) {
    console.error('[upgrade-request] failed to notify Davie:', e instanceof Error ? e.message : e);
  }

  return NextResponse.json({
    ok: true,
    requestId: created.id,
    plan: planInfo.name,
    monthly: planInfo.monthly,
  });
}
