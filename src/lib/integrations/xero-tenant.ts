/**
 * Which Xero organisation did the person just connect?
 *
 * Xero's /connections lists EVERY organisation this user has ever authorised for the app.
 * Guessing "the newest of those" is how a connection can land on the wrong organisation (for
 * example Xero's Demo Company). The access token carries an authentication_event_id, and
 * /connections?authEventId=<id> returns only the organisations picked in that one consent.
 * Pure, no network or database, so it can be tested.
 */
export type XeroTenant = { tenantId: string; tenantName?: string; createdDateUtc?: string; updatedDateUtc?: string };

/** The authentication_event_id claim from the access token (a JWT), or null. Never throws. */
export function authEventIdFromToken(accessToken: string | null | undefined): string | null {
  try {
    const part = (accessToken ?? '').split('.')[1];
    if (!part) return null;
    const json = JSON.parse(Buffer.from(part.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
    const id = json?.authentication_event_id;
    return typeof id === 'string' && id ? id : null;
  } catch {
    return null;
  }
}

const stamp = (t: XeroTenant) => new Date(t.updatedDateUtc ?? t.createdDateUtc ?? 0).getTime();

/** The most recently authorised tenant, the fallback when the consent's own list is not available. */
export function newestTenant(tenants: XeroTenant[] | null | undefined): XeroTenant | null {
  const ok = (tenants ?? []).filter((t) => t?.tenantId);
  return ok.sort((a, b) => stamp(b) - stamp(a))[0] ?? null;
}

/** From this consent's own tenants if there are any, otherwise the newest of all. */
export function pickTenant(fromConsent: XeroTenant[] | null | undefined, all: XeroTenant[] | null | undefined): XeroTenant | null {
  return newestTenant(fromConsent) ?? newestTenant(all);
}
