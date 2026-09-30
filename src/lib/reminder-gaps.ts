/**
 * Why a customer with an open balance cannot be reminded, in plain words. The
 * same facts the approval check and the explainer use, so the badge on the
 * customer list never disagrees with what happens at send time.
 */
export type GapCustomer = {
  email: string | null;
  phone: string | null;
  dndAt: Date | string | null;
  preferredChannel?: string | null;
};

export type ReminderGap = 'unsubscribed' | 'no_email' | 'no_phone';

export const GAP_LABEL: Record<ReminderGap, string> = {
  unsubscribed: 'Unsubscribed',
  no_email: 'No email',
  no_phone: 'No phone',
};

export function reminderGaps(c: GapCustomer): ReminderGap[] {
  // An unsubscribed customer is not reminded by anything else, so nothing else matters.
  if (c.dndAt) return ['unsubscribed'];
  const out: ReminderGap[] = [];
  if (!c.email?.trim()) out.push('no_email');
  if (c.preferredChannel === 'sms' && !c.phone?.trim()) out.push('no_phone');
  return out;
}
