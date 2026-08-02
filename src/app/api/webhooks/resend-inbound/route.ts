import { NextRequest } from 'next/server';
import { handleResendInboundWebhook } from '@/lib/outreach-inbound';

// Historical alias. Resend's dashboard may be configured to hit either this
// URL or /api/inbound — both delegate to the same handler so a reply is
// processed correctly regardless of which one is registered. This route
// used to have its own (broken) implementation that only logged to /tmp,
// which is wiped on every cold start and never actually recorded a reply.
export async function POST(req: NextRequest) {
  return handleResendInboundWebhook(req);
}
