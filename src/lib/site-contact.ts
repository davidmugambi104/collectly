/**
 * Every public contact address, in one place. The visible mailto links, the form error
 * messages and the structured data all read from here.
 *
 * The mailboxes still live on the old domain. To move them to mugavi.com: create the
 * addresses (or forwards) at mugavi.com FIRST, send a test to each, then change
 * CONTACT_DOMAIN below. Changing it before the mailboxes exist would send leads, security
 * reports and DPA requests to addresses nobody reads.
 *
 * Imports nothing, so the node test runner and pure helpers can load it.
 */
export const CONTACT_DOMAIN = 'getcollectly.app';

const at = (name: string) => `${name}@${CONTACT_DOMAIN}`;

export const CONTACT = {
  hello: at('hello'),
  founders: at('founders'),
  security: at('security'),
  dpa: at('dpa'),
  privacy: at('privacy'),
  david: at('david'),
  // Where lead and upgrade notifications go when LEAD_NOTIFY_EMAIL is unset.
  notify: at('davie'),
} as const;

/**
 * Synthetic "customer email" stored on upgrade requests when an org has no real address.
 * Never mailed to; it only has to be a well-formed, unique-per-org string.
 */
export const placeholderEmail = (orgSlug: string) => at(orgSlug);

/** The dev-login prefill. Dev auth only. */
export const DEV_LOGIN_EMAIL = at('dev');
