// QuickBooks Online query text. Kept apart from quickbooks.ts so it can be tested without the database or network.
// Both shapes below were rejected by QuickBooks on the first real sandbox sync (2026-10-06, code 4001).

// Customer.CurrencyRef is only a selectable property in multicurrency companies; naming it in the select list
// fails the whole query ("Property CurrencyRef not found for Entity Customer") in a single-currency company.
// SELECT * returns every property the company has, CurrencyRef included when it exists.
export function qboCustomersQuery(pageSize: number, startPosition?: number): string {
  return `SELECT * FROM Customer ORDERBY Id${startPosition ? ` STARTPOSITION ${startPosition}` : ''} MAXRESULTS ${pageSize}`;
}

/**
 * UnappliedAmt cannot be used in a WHERE clause ("property 'UnappliedAmt' is not queryable"), so payments are read
 * newest first and the unapplied ones are picked out in code (qboListCredits). If a company has more payments than
 * the page cap allows, the oldest are not read and the result is flagged truncated.
 */
export function qboPaymentsQuery(pageSize: number, startPosition: number): string {
  return `SELECT * FROM Payment ORDERBY TxnDate DESC STARTPOSITION ${startPosition} MAXRESULTS ${pageSize}`;
}
