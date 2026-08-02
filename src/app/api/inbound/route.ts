import { NextRequest } from 'next/server';
import { handleResendInboundWebhook } from '@/lib/outreach-inbound';

export async function POST(req: NextRequest) {
  return handleResendInboundWebhook(req);
}
