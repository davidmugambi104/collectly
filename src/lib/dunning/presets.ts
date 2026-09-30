/**
 * Starter reminder schedules for a new account. Plain data, so it can be tested
 * and shared by the dunning page and the first-run route.
 *
 * "standard" is the schedule every account has always started with; the page
 * used to hold it inline.
 */
export type PresetStep = {
  id: string;
  daysFromDue: number;
  channel: 'email' | 'sms';
  tone: 'friendly' | 'firm' | 'final';
  subject?: string;
  template: string;
};

export type Preset = { id: 'gentle' | 'headsup' | 'standard' | 'firm'; name: string; blurb: string; steps: PresetStep[] };

export const STANDARD_STEPS: PresetStep[] = [
  { id: 's1', daysFromDue: 1, channel: 'email', tone: 'friendly', subject: 'Quick reminder — Invoice {{number}}', template: 'Hi {{contact_name}}, just a quick nudge that Invoice {{number}} for {{amount}} was due on {{due_date}}. You can settle it here: {{payment_link}}' },
  { id: 's2', daysFromDue: 7, channel: 'email', tone: 'firm', subject: 'Invoice {{number}} is now 7 days past due', template: 'Hi {{contact_name}}, Invoice {{number}} for {{amount}} is now 7 days past due. Please review and settle at your earliest convenience: {{payment_link}}' },
  { id: 's3', daysFromDue: 14, channel: 'email', tone: 'firm', subject: 'Action required: Invoice {{number}}', template: 'Hi {{contact_name}}, our records show Invoice {{number}} for {{amount}} is 14 days overdue. Please confirm payment status or settle the balance: {{payment_link}}' },
  { id: 's4', daysFromDue: 30, channel: 'sms', tone: 'final', template: 'Final notice: Invoice {{number}} for {{amount}} is 30+ days overdue. Please reply or settle: {{payment_link}}' },
];

export const PRESETS: Preset[] = [
  {
    id: 'gentle',
    name: 'Gentle',
    blurb: 'Three emails, at 3, 14 and 30 days past due. No texts. For clients you want to keep on side.',
    steps: [
      { id: 's1', daysFromDue: 3, channel: 'email', tone: 'friendly', subject: 'A quick reminder about Invoice {{number}}', template: 'Hi {{contact_name}}, a friendly note that Invoice {{number}} for {{amount}} was due on {{due_date}}. It may have slipped through, and you can settle it here: {{payment_link}}' },
      { id: 's2', daysFromDue: 14, channel: 'email', tone: 'friendly', subject: 'Following up on Invoice {{number}}', template: 'Hi {{contact_name}}, following up on Invoice {{number}} for {{amount}}, now two weeks past due. If anything is holding it up, reply and let us know. Otherwise you can pay here: {{payment_link}}' },
      { id: 's3', daysFromDue: 30, channel: 'email', tone: 'firm', subject: 'Invoice {{number}} is 30 days overdue', template: 'Hi {{contact_name}}, Invoice {{number}} for {{amount}} is now 30 days overdue. Please settle it or tell us when we can expect payment: {{payment_link}}' },
    ],
  },
  {
    id: 'headsup',
    name: 'Heads-up first',
    blurb: 'Four emails: a heads-up 5 days before it is due, then 3, 10 and 21 days past due. No texts. For catching late payment before it starts.',
    steps: [
      { id: 's0', daysFromDue: -5, channel: 'email', tone: 'friendly', subject: 'Invoice {{number}} is due in 5 days', template: 'Hi {{contact_name}}, a friendly heads-up that Invoice {{number}} for {{amount}} is due on {{due_date}}. If it is already on its way, thank you. You can pay it here: {{payment_link}}' },
      { id: 's1', daysFromDue: 3, channel: 'email', tone: 'friendly', subject: 'A quick reminder about Invoice {{number}}', template: 'Hi {{contact_name}}, Invoice {{number}} for {{amount}} was due on {{due_date}}. It may have slipped through, and you can settle it here: {{payment_link}}' },
      { id: 's2', daysFromDue: 10, channel: 'email', tone: 'firm', subject: 'Invoice {{number}} is 10 days past due', template: 'Hi {{contact_name}}, Invoice {{number}} for {{amount}} is now 10 days past due. Please settle it or tell us when we can expect payment: {{payment_link}}' },
      { id: 's3', daysFromDue: 21, channel: 'email', tone: 'final', subject: 'Action required: Invoice {{number}}', template: 'Hi {{contact_name}}, Invoice {{number}} for {{amount}} is 21 days overdue. We need payment or a firm payment date this week: {{payment_link}}' },
    ],
  },
  {
    id: 'standard',
    name: 'Standard',
    blurb: 'Three emails at 1, 7 and 14 days past due, then a text at 30. Texts only go to customers who opted in.',
    steps: STANDARD_STEPS,
  },
  {
    id: 'firm',
    name: 'Firm and quick',
    blurb: 'Four emails, at 1, 5, 10 and 20 days past due, getting firmer each time. No texts. For late payers.',
    steps: [
      { id: 's1', daysFromDue: 1, channel: 'email', tone: 'firm', subject: 'Invoice {{number}} was due yesterday', template: 'Hi {{contact_name}}, Invoice {{number}} for {{amount}} was due on {{due_date}}. Please settle it today: {{payment_link}}' },
      { id: 's2', daysFromDue: 5, channel: 'email', tone: 'firm', subject: 'Invoice {{number}} is 5 days past due', template: 'Hi {{contact_name}}, Invoice {{number}} for {{amount}} is now 5 days past due. Please pay it now or tell us today when it will be paid: {{payment_link}}' },
      { id: 's3', daysFromDue: 10, channel: 'email', tone: 'final', subject: 'Action required: Invoice {{number}}', template: 'Hi {{contact_name}}, Invoice {{number}} for {{amount}} is 10 days overdue. We need payment or a firm payment date this week: {{payment_link}}' },
      { id: 's4', daysFromDue: 20, channel: 'email', tone: 'final', subject: 'Final notice: Invoice {{number}}', template: 'Hi {{contact_name}}, this is our final notice for Invoice {{number}}, {{amount}}, now 20 days overdue. Please settle it immediately: {{payment_link}}' },
    ],
  },
];

export function findPreset(id: unknown): Preset | undefined {
  return PRESETS.find((p) => p.id === id);
}
