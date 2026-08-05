/**
 * Shared with src/app/dashboard/customers/[id]/page.tsx (FollowUpPanel) and
 * src/components/dashboard/customers-table.tsx so both "send a reminder"
 * entry points build the exact same /dashboard/dunning composer URL from a
 * customer's risk level + recommended channel.
 */
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type RecommendedChannel = 'email' | 'sms' | 'phone';

export function dunningComposeHref(opts: {
  customerId: string;
  riskLevel: RiskLevel;
  recommendedChannel: RecommendedChannel;
}): string {
  const tone = opts.riskLevel === 'critical' ? 'final' : opts.riskLevel === 'high' ? 'firm' : 'friendly';
  // The composer only understands email/sms — "phone" (call) isn't a
  // channel it can draft for, so it falls back to email.
  const channel = opts.recommendedChannel === 'phone' ? 'email' : opts.recommendedChannel;
  return `/dashboard/dunning?customerId=${opts.customerId}&tone=${tone}&channel=${channel}`;
}

/**
 * Whether there's any contact info at all to compose to. Deliberately not
 * "does this customer have the specific recommended channel's contact" —
 * the dunning composer already explains a channel/contact mismatch clearly
 * on its own page, so hiding the button entirely on that same condition
 * would just relocate the same information behind an extra click for no
 * reason.
 */
export function canDunningCompose(opts: { email: string | null; phone: string | null }): boolean {
  return !!opts.email || !!opts.phone;
}
