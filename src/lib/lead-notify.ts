/**
 * Send the internal "a lead came in" email.
 *
 * The three public form routes used to reach this through an unawaited
 * `fetch()` to the app's own public URL, swallowing every error:
 *
 *     fetch(`${base}/api/lead-notify`, {...}).catch(() => {});
 *
 * Two ways that loses leads. The promise is never awaited, and a serverless
 * function is frozen once it returns its response -- so the request often died
 * before it was made. When it did run, any failure was discarded, so a lead
 * could submit a form, see a success state, and be seen by nobody. For a
 * product with no inbound to spare, a silently dropped lead is the most
 * expensive bug in the codebase.
 *
 * Calling this directly removes the network hop, the NEXT_PUBLIC_APP_URL
 * dependency, and the fire-and-forget.
 */
import { sendEmail } from '@/lib/infra';
import { buildLeadEmail, type LeadNotification } from '@/lib/lead-email';

export * from '@/lib/lead-email';

/**
 * Never throws: a notification failure must not fail the visitor's submission,
 * which is why the old caller swallowed errors in the first place. The
 * difference is that this one is awaited and returns what happened, so a
 * failure is visible in the function logs instead of vanishing.
 */
export async function sendLeadNotification(
  data: LeadNotification,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const { subject, html } = buildLeadEmail(data);
    const to = process.env.LEAD_NOTIFY_EMAIL ?? 'davie@getcollectly.app';
    await sendEmail({ to, subject, html });
    return { ok: true };
  } catch (e: unknown) {
    const error = e instanceof Error ? e.message : String(e);
    console.error(`[lead-notify] FAILED for ${data.type} ${data.email}:`, error);
    return { ok: false, error };
  }
}
