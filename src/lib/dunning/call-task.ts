/**
 * A "call" step in a schedule is a task for the owner, not a message to the
 * customer: nothing is sent. This writes the note that tells them who to ring,
 * about what, and what the step's author wanted said.
 */
export function callTaskTitle(customerName: string, invoiceNumber: string): string {
  return `Call ${customerName} about invoice ${invoiceNumber}`;
}

export function callTaskNote(o: {
  customerName: string;
  invoiceNumber: string;
  /** Already formatted, e.g. "$1,200.00". */
  amount: string;
  /** Negative = not due yet. */
  daysOverdue: number;
  phone: string | null;
  notes: string | null;
}): string {
  const when = o.daysOverdue > 0
    ? `${o.daysOverdue} day${o.daysOverdue === 1 ? '' : 's'} past due`
    : o.daysOverdue === 0 ? 'due today' : `due in ${-o.daysOverdue} day${o.daysOverdue === -1 ? '' : 's'}`;
  const lines = [`Ring ${o.customerName} about invoice ${o.invoiceNumber}: ${o.amount} is ${when}.`];
  lines.push(o.phone?.trim() ? `Phone: ${o.phone.trim()}` : 'There is no phone number on file. Add one on the customer page.');
  if (o.notes?.trim()) lines.push(`Your notes: ${o.notes.trim()}`);
  return lines.join('\n');
}
