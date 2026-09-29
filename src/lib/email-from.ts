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

export function formatDunningFrom(businessName: string | null | undefined, baseFrom: string, platform = 'Mugavi'): string {
  const address = extractAddress(baseFrom);
  // If the base is unusable, hand it back untouched rather than invent an address.
  if (!address) return baseFrom;

  const biz = cleanName(businessName ?? '').slice(0, MAX_NAME).trim();
  const label = biz && biz.toLowerCase() !== platform.toLowerCase() ? `${biz} via ${platform}` : platform;
  const quoted = label.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  return `"${quoted}" <${address}>`;
}
