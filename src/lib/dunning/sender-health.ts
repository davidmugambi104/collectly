/**
 * Is this org's mail going out the way they think it is?
 *
 * Reviewers of the biggest competitor say their emails quietly fell back to the
 * tool's own mail server when the connection dropped, and they found out from
 * falling reply rates. This turns every case where reminders are NOT leaving from
 * the owner's own address, or are failing, into a plain notice they cannot miss.
 * Pure on purpose: the page loads the facts, this decides what to say.
 */
export type SenderFacts = {
  /** The org's own sending domain, if they set one up. */
  domain: { domain: string; status: string } | null;
  /** Reminders that failed to send in the last 14 days. */
  failedRecent: number;
  /** The most recent failure message, if any. */
  lastError?: string | null;
};

export type SenderNotice = {
  level: 'warn' | 'info';
  title: string;
  body: string;
  /** Where to fix it. */
  href?: string;
};

/** Notices to show, most urgent first. Empty when everything is as expected. */
export function senderNotices(f: SenderFacts): SenderNotice[] {
  const out: SenderNotice[] = [];

  if (f.failedRecent > 0) {
    const n = f.failedRecent;
    const err = f.lastError ? ` The latest error: ${f.lastError.slice(0, 160)}` : '';
    out.push({
      level: 'warn',
      title: n === 1 ? '1 reminder failed to send' : `${n} reminders failed to send`,
      body: `They did not reach your customers in the last 14 days.${err}`,
      href: '/dashboard/dunning/history',
    });
  }

  if (f.domain && f.domain.status !== 'verified') {
    out.push({
      level: 'warn',
      title: `${f.domain.domain} is not verified, so reminders are not coming from it`,
      body: 'Until the DNS records check out, every reminder goes from Mugavi\'s address with your business name on it. Finish the records to send from your own address.',
      href: '#send-settings',
    });
  }

  return out;
}
