/**
 * Build the From header for reminders sent on a customer's behalf.
 *
 * Reminders go out through Mugavi's sending domain, not the customer's own
 * mailbox, so the honest thing is to make the sender legible: the recipient
 * should see the business they owe, with the platform named after it, not an
 * unexplained address. "Acme Studio via Mugavi <billing@...>".
 *
 * This changes the display name only. The address, SPF and DKIM are untouched,
 * so it cannot affect deliverability. Sending from the customer's own domain is
 * a separate, larger feature and is not implied by this.
 */

const MAX_NAME = 60;

/** Pull the bare address out of `Name <addr@host>` or accept a plain address. */
export function extractAddress(from: string): string | null {
  const angle = from.match(/<([^<>\s]+@[^<>\s]+)>/);
  if (angle) return angle[1];
  const plain = from.trim();
  return /^[^\s<>@]+@[^\s<>@]+$/.test(plain) ? plain : null;
}

/** Display names are quoted, so only the quote and backslash need escaping. */
function cleanName(name: string): string {
  return name
    .replace(/[\u0000-\u001f\u007f]/g, ' ') // no CR/LF: header injection
    .replace(/[<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export const MAX_SENDER_NAME = 40;

/**
 * A person or role a later reminder is sent "as", e.g. "Amina Otieno" or
 * "Accounts". Empty means none. Only the display name changes with it; see
 * the note at the top of this file.
 */
export function cleanSenderName(name: string | null | undefined): string {
  return cleanName(name ?? '').slice(0, MAX_SENDER_NAME).trim();
}

/** The words a recipient sees as the sender name, before quoting. Shared with the step editor's preview. */
export function fromLabel(businessName: string | null | undefined, senderName: string | null | undefined, opts: { ownDomain: boolean; domain?: string; platform?: string }): string {
  const platform = opts.platform ?? 'Mugavi';
  const biz = cleanName(businessName ?? '').slice(0, MAX_NAME).trim();
  const who = cleanSenderName(senderName);
  const org = opts.ownDomain
    ? biz || opts.domain || ''
    : biz && biz.toLowerCase() !== platform.toLowerCase() ? `${biz} via ${platform}` : platform;
  return who ? `${who} at ${org}` : org;
}

function quote(label: string): string {
  return label.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

export function formatDunningFrom(businessName: string | null | undefined, baseFrom: string, platform = 'Mugavi', senderName?: string | null): string {
  const address = extractAddress(baseFrom);
  // If the base is unusable, hand it back untouched rather than invent an address.
  if (!address) return baseFrom;
  return `"${quote(fromLabel(businessName, senderName, { ownDomain: false, platform }))}" <${address}>`;
}

/**
 * From header for a verified customer domain: "Acme Studio" <billing@acme.com>.
 * No "via Mugavi", because the domain is the customer's own. Only ever called
 * once the domain's DNS records have been verified with the mail provider.
 */
export function formatOwnDomainFrom(businessName: string | null | undefined, localPart: string, domain: string, senderName?: string | null): string {
  return `"${quote(fromLabel(businessName, senderName, { ownDomain: true, domain }))}" <${localPart}@${domain}>`;
}
