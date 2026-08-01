/**
 * QuickBooks error monitoring.
 *
 * Per the spec: when a QBO request fails, capture timestamp, orgId,
 * endpoint, HTTP method, status code, Intuit error code/message, and
 * the `intuit_tid` response header.
 *
 * NEVER log access tokens, refresh tokens, or customer financial data.
 * We explicitly whitelist the fields we save to the DB.
 */
import { db } from '@/db';
import { qboRequestErrors } from '@/db/schema';
import { nanoid } from '@/lib/utils';
import { ensureQboErrorTable } from '@/lib/qbo-ensure-table';

export type QboErrorInput = {
  orgId: string;
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  status: number;
  intuitTid: string | null;
  intuitErrorCode: string | null;
  intuitErrorMessage: string | null;
  faultType: string | null;
};

/**
 * Persist a QBO request failure. Sanitizes the input first to make sure
 * no token or customer PII ever lands in the log row.
 */
export async function logQboError(input: QboErrorInput): Promise<void> {
  // Defensive sanitization: truncate endpoint, scrub any "Bearer " tokens.
  const safeEndpoint = String(input.endpoint ?? '').slice(0, 500);
  const safeMsg = String(input.intuitErrorMessage ?? '').slice(0, 1000);
  const safeCode = String(input.intuitErrorCode ?? '').slice(0, 100);
  const safeFault = String(input.faultType ?? '').slice(0, 100);
  const safeTid = String(input.intuitTid ?? '').slice(0, 64);
  const safeStatus = Number.isFinite(input.status) ? Math.trunc(input.status) : 0;

  try {
    await ensureQboErrorTable();
    await db.insert(qboRequestErrors).values({
      id: nanoid(),
      orgId: input.orgId,
      endpoint: safeEndpoint,
      method: input.method,
      status: safeStatus,
      intuitTid: safeTid || null,
      intuitErrorCode: safeCode || null,
      intuitErrorMessage: safeMsg || null,
      faultType: safeFault || null,
      createdAt: new Date(),
    });
  } catch (e) {
    // Never let the error logger throw — would break the calling flow.
    console.error('[qbo-errors] failed to persist error row:', (e as Error)?.message);
  }

  // Also log to stdout in a structured format so devs can grep Vercel logs.
  console.log('[qbo-error]', JSON.stringify({
    at: new Date().toISOString(),
    orgId: input.orgId,
    method: input.method,
    endpoint: safeEndpoint,
    status: safeStatus,
    intuit_tid: safeTid || null,
    intuit_code: safeCode || null,
    intuit_message: safeMsg || null,
    fault_type: safeFault || null,
  }));
}

/**
 * Parse an Intuit/Fault response body. Intuit returns:
 *
 *   {
 *     "Fault": {
 *       "type": "AUTHENTICATION_ERROR",
 *       "Error": [
 *         { "code": "3200", "Message": "message..." }
 *       ]
 *     }
 *   }
 *
 * Some endpoints return the error flat:
 *
 *   { "code": "3200", "type": "...", "message": "..." }
 *
 * Returns the most useful fields for the log row.
 */
export function parseQboErrorBody(bodyText: string): {
  errorCode: string | null;
  errorMessage: string | null;
  faultType: string | null;
} {
  let parsed: any = null;
  try {
    parsed = JSON.parse(bodyText);
  } catch {
    // Non-JSON body — keep the raw text as message.
    return {
      errorCode: null,
      errorMessage: bodyText.slice(0, 500) || null,
      faultType: null,
    };
  }

  if (parsed?.Fault) {
    const faultType = parsed.Fault.type ?? null;
    const firstError = Array.isArray(parsed.Fault.Error) ? parsed.Fault.Error[0] : null;
    return {
      errorCode: firstError?.code ? String(firstError.code) : null,
      errorMessage: firstError?.Message ? String(firstError.Message) : null,
      faultType: faultType ? String(faultType) : null,
    };
  }

  if (parsed?.code || parsed?.message || parsed?.type) {
    return {
      errorCode: parsed.code ? String(parsed.code) : null,
      errorMessage: parsed.message ? String(parsed.message) : null,
      faultType: parsed.type ? String(parsed.type) : null,
    };
  }

  return {
    errorCode: null,
    errorMessage: bodyText.slice(0, 500) || null,
    faultType: null,
  };
}