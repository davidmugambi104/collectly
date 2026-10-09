/** Dollar amount for running text: no cents on whole dollars, always two digits when there are cents ($4,905.50, not $4,905.5). */
export function moneyText(n: number): string {
  const whole = Number.isInteger(Math.round(n * 100) / 100) ;
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: 2 })}`;
}

/** Round to cents. Balances shown to the owner must match the invoice pages, so never round to whole dollars. */
export function roundCents(n: number): number {
  return Math.round(n * 100) / 100;
}
