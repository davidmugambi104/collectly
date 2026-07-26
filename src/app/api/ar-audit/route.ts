import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, name, company, country, tool, ar, dso, topPain } = body;

    if (!email || !name || !company || !tool || !topPain) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Forward to lead notification webhook/email handler if configured.
    const notifyUrl = process.env.INTERNAL_LEAD_WEBHOOK_URL;
    if (notifyUrl) {
      await fetch(notifyUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          type: 'ar_audit_request',
          email,
          name,
          company,
          country,
          tool,
          ar,
          dso,
          topPain,
          requestedAt: new Date().toISOString(),
        }),
      }).catch(() => {
        // Non-blocking: don't fail the user if notification fails.
      });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
