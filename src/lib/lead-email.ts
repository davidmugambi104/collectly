/**
 * Pure builders for the internal "a lead came in" email.
 *
 * Split from lead-notify.ts, which imports sendEmail through the `@/` path
 * alias -- the node test runner resolves neither the alias nor the Next
 * runtime, so the escaping below could not otherwise be tested. Same reason
 * src/lib/legacy-domain.ts is separate from middleware. Nothing here imports
 * anything.
 */
export type LeadType = 'waitlist' | 'interview' | 'dunning_test' | 'async_qualify';

export interface LeadNotification {
  type: LeadType;
  email: string;
  name?: string;
  company?: string;
  meta?: Record<string, unknown>;
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function leadSubject(data: LeadNotification): string {
  switch (data.type) {
    case 'waitlist': return `🌱 New waitlist signup — ${data.email}`;
    case 'interview': return `🎯 New interview — ${data.email} (${data.company ?? 'n/a'})`;
    case 'async_qualify': return `📋 Async qualify reply — ${data.email} (${data.company ?? 'n/a'})`;
    default: return `🧪 Dunning test from ${data.email}`;
  }
}

/**
 * Every field here arrives from an unauthenticated public form, so all of it is
 * attacker-controlled and lands in an HTML email the founder opens. Everything
 * interpolated below is escaped -- name, company and meta previously were not,
 * which allowed HTML injection into an internal email from a public form.
 */
export function buildLeadEmail(data: LeadNotification): { subject: string; html: string } {
  const subject = leadSubject(data);
  const dashboardUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3030';
  const cell = (label: string, value: string) =>
    `<tr><td style="padding:4px 8px;color:#6c6e76;font-size:12px">${escapeHtml(label)}</td><td style="padding:4px 8px;font-family:monospace;font-size:12px">${escapeHtml(value)}</td></tr>`;

  const metaRows = data.meta
    ? Object.entries(data.meta)
        .filter(([, v]) => v !== undefined && v !== null && v !== '')
        .map(([k, v]) => cell(k, String(v)))
        .join('')
    : '';

  const html = `<!doctype html><html><body style="font-family:-apple-system,system-ui,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#16171c">
<h2 style="margin:0 0 8px;font-size:18px">${escapeHtml(subject)}</h2>
<p style="margin:0 0 16px;color:#6c6e76;font-size:13px">Type: <b>${escapeHtml(data.type)}</b> · Source: Mugavi</p>
<table style="width:100%;border-collapse:collapse;margin:0 0 16px;border:1px solid #eeeef0;border-radius:6px;overflow:hidden">
  ${cell('Email', data.email)}
  ${data.name ? cell('Name', data.name) : ''}
  ${data.company ? cell('Company', data.company) : ''}
  ${metaRows}
</table>
<p style="margin:0;font-size:12px"><a href="${escapeHtml(dashboardUrl)}/dashboard">Open dashboard →</a></p>
</body></html>`;

  return { subject, html };
}
