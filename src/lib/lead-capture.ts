/**
 * Store a lead and tell the founder, without losing it when one half fails.
 *
 * Before this, the public form routes did `db.insert(...)` with no handling
 * (a database error became a 400 carrying the raw driver message, and the
 * founder was never told) and treated the email as a courtesy. Now each half
 * is attempted independently and the caller is told what happened:
 *
 *   stored + notified   normal
 *   stored only         founder email failed; the row is the record
 *   notified only       database failed; the email carries every field
 *   neither             caller returns 503 so the form shows an error
 *
 * A second submission from an email that is already on the list (a playbook
 * download followed by an audit request, say) used to be dropped by
 * ON CONFLICT DO NOTHING, losing the richer answers. They are appended to the
 * existing row instead.
 */
import { eq, sql } from 'drizzle-orm';
import { db } from '@/db';
import { waitlist } from '@/db/schema';
import { nanoid } from '@/lib/utils';
import { sendLeadNotification } from '@/lib/lead-notify';
import type { LeadNotification } from '@/lib/lead-email';

export interface LeadRow {
  email: string;
  name?: string | null;
  company?: string | null;
  country?: string | null;
  teamSize?: string | null;
  painPoint?: string | null;
  source: string;
  referrer?: string | null;
}

export async function captureLead(
  row: LeadRow,
  notify: LeadNotification,
  /**
   * For a high-intent form (interview, audit, qualify): when the email is
   * already on the list from a lower-intent source, take over its `source` so
   * the lead shows up where the founder looks for that kind of lead (the
   * interviews admin page filters on source).
   */
  opts: { promote?: boolean } = {},
): Promise<{ stored: boolean; created: boolean; notified: boolean; id?: string }> {
  let stored = false;
  let created = false;
  let id: string | undefined;
  try {
    const [inserted] = await db
      .insert(waitlist)
      .values({ id: nanoid(), ...row })
      .onConflictDoNothing({ target: waitlist.email })
      .returning();
    stored = true;
    if (inserted) {
      created = true;
      id = inserted.id;
    } else if (row.painPoint) {
      const incoming = row.painPoint;
      // Skip an identical repeat (a double click) rather than append it twice.
      await db
        .update(waitlist)
        .set({
          painPoint: sql`CASE
            WHEN ${waitlist.painPoint} IS NULL OR ${waitlist.painPoint} = '' THEN ${incoming}
            WHEN position(${incoming} in ${waitlist.painPoint}) > 0 THEN ${waitlist.painPoint}
            ELSE left(${waitlist.painPoint} || chr(10) || chr(10) || '---' || chr(10) || ${incoming}, 8000)
          END`,
          name: sql`COALESCE(NULLIF(${waitlist.name}, ''), ${row.name ?? null})`,
          company: sql`COALESCE(NULLIF(${waitlist.company}, ''), ${row.company ?? null})`,
          ...(opts.promote ? { source: row.source } : {}),
        })
        .where(eq(waitlist.email, row.email));
    }
  } catch (e: unknown) {
    console.error(`[lead-capture] store FAILED for ${row.source} ${row.email}:`, e instanceof Error ? e.message : e);
  }
  const n = await sendLeadNotification(notify);
  return { stored, created, notified: n.ok, id };
}
