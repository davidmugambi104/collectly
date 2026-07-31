import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/db';

/**
 * Resend inbound webhook handler for outreach replies.
 *
 * Resend POSTs a JSON payload when someone replies to davie@getcollectly.app.
 * We classify the reply and update the outreach contact state in Postgres.
 *
 * Expected payload shape:
 * {
 *   "from": "prospect@example.com",
 *   "to": ["davie@getcollectly.app"],
 *   "subject": "Re: AR follow-up...",
 *   "text": "Plain text body",
 *   "html": "<p>HTML body</p>",
 *   "headers": { ... }
 * }
 */

const AUTO_REPLY_PATTERNS = [
  /out of (?:the )?office/i,
  /automated response/i,
  /auto[- ]?reply/i,
  /no longer (?:at|with)/i,
  /this mailbox is not monitored/i,
  /i am away/i,
];

function isAutoReply(text: string, subject: string): boolean {
  const combined = `${text} ${subject}`.toLowerCase();
  return AUTO_REPLY_PATTERNS.some((p) => p.test(combined));
}

function classifyReply(text: string, subject: string): { state: string; nextStep: string; note: string } {
  const combined = `${text} ${subject}`.toLowerCase();

  if (isAutoReply(text, subject)) {
    return {
      state: 't1_sent',
      nextStep: 'ignore_auto_reply',
      note: 'Auto-reply detected; keep sequence running',
    };
  }

  const optOut = ['unsubscribe', 'remove me', "don't email", 'stop emailing', 'not interested'];
  if (optOut.some((x) => combined.includes(x))) {
    return { state: 'do_not_contact', nextStep: 'suppress', note: 'Opt-out request' };
  }

  const positive = ['book', 'calendar', 'demo', 'call', 'schedule', 'meet', ' interested', 'tell me more', 'pricing'];
  if (positive.some((x) => combined.includes(x))) {
    return { state: 'replied', nextStep: 'human_review_priority', note: 'Positive reply / buying signal' };
  }

  return { state: 'replied', nextStep: 'human_review', note: 'Reply received; needs human triage' };
}

async function ensureTables(client: any) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS outreach_contacts (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      prospect_id TEXT,
      email TEXT NOT NULL UNIQUE,
      first_name TEXT,
      last_name TEXT,
      company TEXT,
      title TEXT,
      source TEXT,
      status TEXT NOT NULL DEFAULT 'ready',
      last_contact_at TIMESTAMP WITH TIME ZONE,
      notes TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `);
  await client.query(`
    CREATE INDEX IF NOT EXISTS outreach_contacts_email_idx ON outreach_contacts(email)
  `);
  await client.query(`
    CREATE TABLE IF NOT EXISTS outreach_replies (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      contact_id TEXT NOT NULL REFERENCES outreach_contacts(id) ON DELETE CASCADE,
      subject TEXT,
      body TEXT NOT NULL,
      from_address TEXT,
      raw_payload JSONB,
      classification TEXT,
      next_step TEXT,
      status TEXT NOT NULL DEFAULT 'new',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `);
  await client.query(`
    CREATE INDEX IF NOT EXISTS outreach_replies_contact_idx ON outreach_replies(contact_id)
  `);
}

export async function POST(req: NextRequest) {
  // Optional: verify Resend webhook secret via a signature header if available.
  // Resend inbound webhooks currently authenticate by the URL secret; if you
  // want header verification, add it here later.

  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const fromAddress = String(payload.from || '').toLowerCase().trim();
  const subject = String(payload.subject || '');
  const text = String(payload.text || payload.html || '');

  if (!fromAddress) {
    return NextResponse.json({ error: 'Missing from address' }, { status: 400 });
  }

  const classification = classifyReply(text, subject);

  const client = await pool().connect();
  try {
    await ensureTables(client);

    // Upsert contact
    const contactResult = await client.query(
      `
      INSERT INTO outreach_contacts (email, source, status, last_contact_at, notes)
      VALUES ($1, $2, $3, NOW(), $4)
      ON CONFLICT (email) DO UPDATE SET
        status = EXCLUDED.status,
        last_contact_at = EXCLUDED.last_contact_at,
        notes = COALESCE(outreach_contacts.notes, '') || '\n' || EXCLUDED.notes,
        updated_at = NOW()
      RETURNING id
      `,
      [fromAddress, 'resend_inbound', classification.state, classification.note]
    );

    const contactId = contactResult.rows[0].id;

    // Insert reply
    await client.query(
      `
      INSERT INTO outreach_replies (contact_id, subject, body, from_address, raw_payload, classification, next_step, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'new')
      `,
      [contactId, subject, text, fromAddress, payload, classification.state, classification.nextStep]
    );

    // Notify founder
    const notifyEmail = process.env.LEAD_NOTIFY_EMAIL ?? 'davie@getcollectly.app';
    try {
      const { sendEmail } = await import('@/lib/infra');
      await sendEmail({
        to: notifyEmail,
        subject: `Outreach reply: ${fromAddress}`,
        html: `<p><b>${fromAddress}</b> replied to an outreach email.</p>
<p><b>Subject:</b> ${escapeHtml(subject)}</p>
<p><b>Classification:</b> ${classification.state}</p>
<p><b>Next step:</b> ${classification.nextStep}</p>
<hr/>
<pre style="white-space:pre-wrap">${escapeHtml(text.slice(0, 2000))}</pre>`,
      });
    } catch (e: any) {
      console.error('Failed to notify founder of reply:', e?.message);
    }

    return NextResponse.json({ ok: true, classification });
  } catch (e: any) {
    console.error('Inbound webhook error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  } finally {
    client.release();
  }
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => {
    const map: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    return map[c];
  });
}
