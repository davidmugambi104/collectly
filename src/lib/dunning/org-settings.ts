/**
 * Database-bound helpers the scheduler and the approval path share: an org's
 * send window, and the From line to use for its reminders.
 */
import { db } from '@/db';
import { dunningSettings, dunningSenderDomains, organizations } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getDefaultFrom } from '@/lib/infra';
import { formatDunningFrom, formatOwnDomainFrom } from '@/lib/email-from';
import { canSendFrom } from '@/lib/email-domain';
import { DEFAULT_WINDOW, isValidTimezone, type SendWindow } from '@/lib/dunning/send-window';

/** The org's send window, in the owner's timezone. Off unless they turned it on. */
export async function loadSendWindow(orgId: string): Promise<SendWindow> {
  const [row] = await db
    .select({
      enabled: dunningSettings.sendWindowEnabled,
      start: dunningSettings.sendWindowStart,
      end: dunningSettings.sendWindowEnd,
      days: dunningSettings.sendDays,
      tz: dunningSettings.sendTimezone,
    })
    .from(dunningSettings)
    .where(eq(dunningSettings.orgId, orgId))
    .limit(1);
  if (!row) return DEFAULT_WINDOW;

  let tz = row.tz;
  if (!isValidTimezone(tz)) {
    const [org] = await db.select({ tz: organizations.timezone }).from(organizations).where(eq(organizations.id, orgId)).limit(1);
    tz = isValidTimezone(org?.tz) ? org!.tz : 'UTC';
  }
  return { enabled: row.enabled, startHour: row.start, endHour: row.end, days: row.days, timezone: tz as string };
}

/**
 * The From header for this org's reminders. From the customer's own domain when
 * it is verified with the mail provider, otherwise from Mugavi's address with the
 * business name on it. Never from a domain that has not verified.
 */
export async function resolveFrom(orgId: string, businessName: string | null | undefined): Promise<string> {
  const [row] = await db
    .select({ status: dunningSenderDomains.status, domain: dunningSenderDomains.domain, localPart: dunningSenderDomains.localPart })
    .from(dunningSenderDomains)
    .where(eq(dunningSenderDomains.orgId, orgId))
    .limit(1);
  if (canSendFrom(row)) return formatOwnDomainFrom(businessName, row!.localPart, row!.domain);
  return formatDunningFrom(businessName, getDefaultFrom());
}
