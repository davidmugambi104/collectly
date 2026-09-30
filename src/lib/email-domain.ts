/**
 * Sending reminders from a customer's own domain.
 *
 * Pure validation and mapping, so the rules are testable without the mail
 * provider. The provider (Resend) does the real work: it issues the DNS
 * records, the customer adds them at their registrar, and only after the
 * provider reports the domain verified does Mugavi send from it.
 */

/** Domains that can never be a customer's own sending domain. */
const BLOCKED = new Set([
  // free mailboxes: nobody can add DNS records to these, and mail from them spoofs the provider
  'gmail.com', 'googlemail.com', 'outlook.com', 'hotmail.com', 'live.com', 'msn.com', 'yahoo.com', 'ymail.com',
  'icloud.com', 'me.com', 'mac.com', 'proton.me', 'protonmail.com', 'aol.com', 'mail.com', 'gmx.com', 'gmx.net',
  // ours and our providers'
  'mugavi.com', 'getcollectly.app', 'collectly.app', 'resend.com', 'resend.dev', 'vercel.app',
]);

const LABEL = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

/**
 * Accepts "acme.com", "https://www.acme.com/pricing", "billing@acme.com" and
 * returns "acme.com". A leading "www." is dropped. Returns null if it isn't a
 * plausible registrable domain. Subdomains are kept ("mail.acme.com").
 */
export function normalizeDomain(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  let d = input.trim().toLowerCase();
  if (!d) return null;
  d = d.replace(/^[a-z][a-z0-9+.-]*:\/\//, '');   // scheme
  d = d.replace(/^[^@/]*@/, '');                    // user@
  d = d.split(/[/?#:]/)[0];                         // path, query, port
  d = d.replace(/^www\./, '').replace(/\.$/, '');
  if (!d || d.length > 253) return null;
  const labels = d.split('.');
  if (labels.length < 2) return null;
  if (!labels.every((l) => LABEL.test(l))) return null;
  if (!/^[a-z]{2,}$|^xn--[a-z0-9-]+$/.test(labels[labels.length - 1])) return null;
  return d;
}

export function isBlockedDomain(domain: string): boolean {
  if (BLOCKED.has(domain)) return true;
  // a subdomain of a blocked domain is blocked too
  return [...BLOCKED].some((b) => domain.endsWith(`.${b}`));
}

const RESERVED_LOCAL = new Set(['postmaster', 'abuse', 'hostmaster', 'webmaster', 'root', 'admin', 'security', 'noreply', 'no-reply']);

/** The part before the @. Defaults to "billing". Returns null if unusable. */
export function normalizeLocalPart(input: unknown): string | null {
  if (input === undefined || input === null || input === '') return 'billing';
  if (typeof input !== 'string') return null;
  const l = input.trim().toLowerCase().replace(/@.*$/, '');
  if (!/^[a-z0-9][a-z0-9._+-]{0,63}$/.test(l)) return null;
  if (RESERVED_LOCAL.has(l)) return null;
  return l;
}

export type SenderDomainStatus = 'pending' | 'verified' | 'failed';

/** Collapse the provider's five states into the three the UI cares about. */
export function mapProviderStatus(status: string | null | undefined): SenderDomainStatus {
  if (status === 'verified') return 'verified';
  if (status === 'failed') return 'failed';
  return 'pending'; // pending, not_started, temporary_failure, anything unknown
}

export type DnsRecord = { kind: string; type: string; name: string; value: string; ttl: string; priority: number | null; status: SenderDomainStatus };

/** Provider records into the shape the settings screen shows and the table stores. */
export function normalizeRecords(records: unknown): DnsRecord[] {
  if (!Array.isArray(records)) return [];
  return records
    .filter((r): r is Record<string, unknown> => !!r && typeof r === 'object')
    .map((r) => ({
      kind: String(r.record ?? ''),
      type: String(r.type ?? ''),
      name: String(r.name ?? ''),
      value: String(r.value ?? ''),
      ttl: String(r.ttl ?? 'Auto'),
      priority: typeof r.priority === 'number' ? r.priority : null,
      status: mapProviderStatus(typeof r.status === 'string' ? r.status : null),
    }))
    .filter((r) => r.type && r.name && r.value);
}

/** May reminders go out from this domain right now? Only when it is verified. */
export function canSendFrom(row: { status: string; domain: string; localPart: string } | null | undefined): boolean {
  return !!row && row.status === 'verified' && !!row.domain && !!row.localPart;
}
